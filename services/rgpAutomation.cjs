const { spawn } = require('child_process');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuração Supabase (Importado do .env via caller ou hardcoded se necessário)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Executa o robô Python para um CPF específico e atualiza o Supabase
 * @param {string} clientId ID do cliente no banco
 * @param {string} cpf CPF limpo
 * @param {boolean} headless Modo oculto
 * @param {function} onLog Callback para receber logs em tempo real (opcional)
 */
async function runRgpConsultation(clientId, cpf, headless = true, onLog = null) {
    return new Promise((resolve, reject) => {
        const pythonPath = 'python'; // Assumindo que python está no PATH
        let scriptPath = path.join(__dirname, '..', 'robos', 'robo_pesqbrasil_consulta.py');

        // Handle Electron asar unpacking
        if (scriptPath.includes('app.asar') && !scriptPath.includes('app.asar.unpacked')) {
            scriptPath = scriptPath.replace('app.asar', 'app.asar.unpacked');
        }
        const headlessFlag = headless ? '--headless' : '';

        // Usar spawn para streaming de logs
        const args = [scriptPath, '--cpf', cpf];
        if (headless) args.push('--headless'); // Python script espera --headless como flag booleana (store_true)

        console.log(`🤖 [RGP] Iniciando consulta (Spawn) para CPF ${cpf}...`);
        if (onLog) onLog(`🚀 Iniciando motor de consulta para CPF ${cpf}...`);
        console.log("🚀 [RGP AUTOMATION v2.0] Script loaded with DB Fix (No updated_at) and New Regex.");

        const botProcess = spawn(pythonPath, args);

        let stdoutData = '';
        let stderrData = '';

        botProcess.stdout.on('data', (data) => {
            const lines = data.toString();
            stdoutData += lines;
            // Envia logs limpos para o callback
            if (onLog) {
                // Filtra linhas vazias
                lines.split('\n').forEach(line => {
                    if (line.trim()) onLog(line.trim());
                });
            }
            // Log no console do servidor também
            console.log(`[RGP STDOUT] ${lines.trim()}`);
        });

        botProcess.stderr.on('data', (data) => {
            const text = data.toString();
            stderrData += text;
            if (onLog) onLog(`⚠️ ${text.trim()}`);
            console.error(`[RGP STDERR] ${text.trim()}`);
        });

        botProcess.on('close', async (code) => {
            console.log(`🤖 [RGP] Processo finalizado com código ${code}`);

            if (code !== 0) {
                const errorMsg = `Processo falhou com código ${code}. Erro: ${stderrData}`;
                if (onLog) onLog(`❌ ERRO CRÍTICO: ${errorMsg}`);
                return resolve({ success: false, error: errorMsg });
            }

            try {
                // Tenta encontrar o JSON no output acumulado
                // Melhoria: Procurar por última ocorrência de JSON válido caso existam logs misturados
                const jsonMatches = stdoutData.match(/\{.*\}/g);
                if (!jsonMatches) {
                    throw new Error(`JSON de retorno não encontrado. Output bruto: ${stdoutData.substring(0, 200)}...`);
                }
                const jsonMatch = jsonMatches[jsonMatches.length - 1]; // Pega o último JSON encontrado

                const result = JSON.parse(jsonMatch);
                console.log("📊 JSON Parseado:", result);

                if (result.success && result.data) {
                    const { data: d } = result;
                    if (onLog) onLog(`✅ MUNICÍPIO IDENTIFICADO: ${d.MUNICIPIO}`);
                    if (onLog) onLog(`✅ DATA 1º RGP: ${d.DATA_PRIMEIRO_RGP}`);
                    if (onLog) onLog(`💾 Salvando dados no banco...`);

                    const updateData = {
                        rgp_localidade: d.MUNICIPIO,
                        rgp_status: d.SITUACAO_RGP,
                        rgp_numero: d.NUMERO_RGP,
                        rgp_local_exercicio: d.LOCAL_DE_EXERCICIO,
                        rgp_data_primeiro: d.DATA_PRIMEIRO_RGP
                        // updated_at: new Date().toISOString() // Removido pois estava causando erro de schema
                    };

                    if (onLog) onLog(`💾 Tentando salvar: ${JSON.stringify(updateData)}`);
                    console.log(`[RGP DEBUG] Update Payload for ${clientId}:`, updateData);

                    // Check if values are valid
                    if (d.MUNICIPIO === "Não encontrado" && d.DATA_PRIMEIRO_RGP === "Não encontrado") {
                        const warn = "⚠️ ALERTA: Dados cruciais não foram extraídos. Verifique o HTML.";
                        console.warn(warn);
                        if (onLog) onLog(warn);
                    }

                    const { data: savedData, error: dbError } = await supabase
                        .from('clients')
                        .update(updateData)
                        .eq('id', clientId)
                        .select();

                    if (dbError) {
                        const dbErrMsg = `Erro ao salvar no banco: ${dbError.message}`;
                        console.error(`[RGP DB ERROR]`, dbError);
                        if (onLog) onLog(`❌ ${dbErrMsg}`);
                        return resolve({ success: false, error: dbError.message });
                    }

                    console.log(`[RGP DB SUCCESS] Saved row:`, savedData);

                    if (!savedData || savedData.length === 0) {
                        // Verifica se o cliente existe
                        const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true }).eq('id', clientId);
                        const warning = count === 0
                            ? `❌ ERRO: Cliente ID ${clientId} não existe no banco!`
                            : `⚠️ AVISO: Update rodou mas não retornou dados (RLS ou sem mudanças).`;

                        console.warn(`[RGP DB WARNING]`, warning);
                        if (onLog) onLog(warning);
                    } else {
                        if (onLog) onLog(`✅ Dados salvos com sucesso no banco!`);
                    }

                    if (onLog) onLog(`✨ Consulta finalizada com sucesso!`);
                    return resolve({ success: true, data: d });
                } else {
                    const logErr = result.error || "Erro desconhecido no robô.";
                    if (onLog) onLog(`❌ Falha na consulta: ${logErr}`);

                    // ATUALIZAÇÃO DE FALHA NO BANCO
                    // Fundamental para o frontend parar de carregar
                    await supabase.from('clients').update({
                        rgp_status: 'Não Encontrado',
                        rgp_numero: 'Inexistente', // Limpa ou marca como inexistente
                        rgp_localidade: null,
                        rgp_data_primeiro: null
                    }).eq('id', clientId);

                    return resolve({ success: false, error: logErr });
                }
            } catch (err) {
                if (onLog) onLog(`❌ Erro ao processar retorno: ${err.message}`);
                return resolve({ success: false, error: err.message });
            }
        });

        botProcess.on('error', (err) => {
            const errMsg = `Falha ao iniciar processo: ${err.message}`;
            if (onLog) onLog(`❌ ${errMsg}`);
            return resolve({ success: false, error: errMsg });
        });
    });
}

module.exports = { runRgpConsultation };
