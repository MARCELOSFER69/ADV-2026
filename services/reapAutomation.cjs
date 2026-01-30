const { spawn } = require('child_process');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { uploadLocalFileToR2 } = require('./storageServiceBackend.cjs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Executa o robô de REAP para um cliente
 * @param {string} clientId ID do cliente
 * @param {string} cpf CPF
 * @param {string} senha Senha Gov.br
 * @param {boolean} headless Modo oculto
 * @param {function} onLog Callback de logs
 * @param {Array} fishingData Dados de pesca mensais (opcional)
 */
async function runReapProcess(clientId, cpf, senha, headless = false, onLog = null, fishingData = null) {
    // Busca nome real do cliente para o assistente
    const { data: clientObj } = await supabase.from('clients').select('nome_completo, rgp_localidade').eq('id', clientId).single();
    const nomeReal = clientObj?.nome_completo || 'Pescador';
    const municipio = clientObj?.rgp_localidade || 'Buriticupu';

    return new Promise((resolve, reject) => {
        const pythonPath = 'python';
        let scriptPath = path.join(__dirname, '..', 'robos', 'robo reap', 'robo_reap.py');

        // Handle Electron asar
        if (scriptPath.includes('app.asar') && !scriptPath.includes('app.asar.unpacked')) {
            scriptPath = scriptPath.replace('app.asar', 'app.asar.unpacked');
        }

        // Prepara JSON da Task com fishing_data
        const taskObj = {
            clients: [
                {
                    id: clientId,
                    nome_completo: nomeReal,
                    cpf_cnpj: cpf,
                    senha_gov: senha,
                    municipio: municipio,
                    fishing_data: fishingData || [] // Dados de pesca vindos do frontend
                }
            ]
        };

        const jsonTask = Buffer.from(JSON.stringify(taskObj)).toString('base64');
        const downloadDir = path.join(process.cwd(), 'downloads');
        if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

        const args = [scriptPath, '--json_task', jsonTask, '--download_dir', downloadDir];

        // REAP geralmente requer interação (assistente), então visível é melhor.
        // Mas respeitamos o parâmetro.

        console.log(`🤖 [REAP] Iniciando processo para CPF ${cpf}...`);
        if (onLog) onLog(`🚀 Iniciando robô de REAP para CPF ${cpf}...`);

        const botProcess = spawn(pythonPath, args, { cwd: path.dirname(scriptPath) });

        let stdoutData = '';
        let stderrData = '';
        let finalResult = null;
        let stdoutBuffer = '';
        botProcess.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdoutBuffer += chunk;

            let lines = stdoutBuffer.split('\n');
            stdoutBuffer = lines.pop(); // Mantém a última linha incompleta no buffer

            lines.forEach(line => {
                if (line.includes('RESULT_START')) {
                    try {
                        const jsonStr = line.match(/RESULT_START(\{.*\})RESULT_END/);
                        if (jsonStr) {
                            finalResult = JSON.parse(jsonStr[1]);
                            if (onLog) onLog(`🤖 Dados estruturados recebidos do robô.`);
                            console.log("📊 [REAP] JSON Capturado:", finalResult);
                        }
                    } catch (e) {
                        console.error("Erro ao parsear RESULT_START:", e);
                    }
                } else if (line.trim()) {
                    if (onLog) onLog(line.trim());
                    console.log(`[REAP STDOUT] ${line.trim()}`);
                }
            });
        });

        let stderrBuffer = '';
        botProcess.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrBuffer += chunk;

            let lines = stderrBuffer.split('\n');
            stderrBuffer = lines.pop();

            lines.forEach(line => {
                if (line.trim()) {
                    console.error(`[REAP STDERR] ${line.trim()}`);
                    stderrData += line + '\n';
                }
            });
        });

        botProcess.on('close', async (code) => {
            console.log(`🤖 [REAP] Processo finalizado com código ${code}`);

            if (finalResult) {
                // Atualiza o banco com o resultado
                try {
                    const updateData = {
                        reap_status: finalResult.success ? 'Regular' : 'Pendente Anual',
                        reap_ano_base: parseInt(finalResult.ano_base) || new Date().getFullYear()
                    };

                    if (onLog) onLog(`🤖 Resultado recebido: ${updateData.reap_status} (Ano: ${updateData.reap_ano_base})`);

                    // SEGURANÇA: Usa APENAS o caminho do PDF reportado pelo robô
                    // NÃO faz fallback para evitar anexar PDF de outro cliente
                    const robotPdfPath = finalResult.pdf;
                    console.log(`🤖 [REAP] Robô reportou caminho do PDF: ${robotPdfPath}`);

                    if (robotPdfPath && fs.existsSync(robotPdfPath)) {
                        try {
                            const fileName = path.basename(robotPdfPath);
                            if (onLog) onLog(`📄 Arquivo localizado: ${fileName}`);
                            if (onLog) onLog(`🌐 Enviando para nuvem...`);

                            const upload = await uploadLocalFileToR2(robotPdfPath, clientId);

                            if (upload && upload.url) {
                                if (onLog) onLog(`✅ Upload concluído! Registrando no perfil do cliente...`);

                                // Busca documentos atuais para não sobrescrever
                                const { data: currentClient, error: fetchErr } = await supabase
                                    .from('clients')
                                    .select('documentos')
                                    .eq('id', clientId)
                                    .single();

                                if (fetchErr) {
                                    console.error("Erro ao buscar documentos do cliente:", fetchErr);
                                }

                                let documentos = Array.isArray(currentClient?.documentos) ? currentClient.documentos : [];

                                const clientName = finalResult.nome || 'Cliente';
                                const reportYear = updateData.reap_ano_base || new Date().getFullYear();
                                const newDoc = {
                                    id: `reap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                    nome: `${clientName} - REAP ${reportYear}`,
                                    tipo: 'REAP',
                                    data_upload: new Date().toISOString(),
                                    url: upload.url,
                                    path: upload.path
                                };

                                documentos.push(newDoc);
                                updateData.documentos = documentos;
                                if (onLog) onLog(`📎 Comprovante anexado: ${newDoc.nome}`);
                            }
                        } catch (uploadErr) {
                            console.error("Erro ao processar upload do PDF:", uploadErr);
                            if (onLog) onLog(`⚠️ Falha no salvamento do PDF: ${uploadErr.message}`);
                        }
                    } else {
                        if (onLog) onLog(`⚠️ Robô terminou mas o arquivo PDF não foi localizado para upload.`);
                    }

                    if (onLog) onLog(`💾 Salvando alterações para o cliente ${clientId}...`);

                    if (onLog) onLog(`💾 Salvando alterações para o cliente ${clientId}...`);

                    // Update Seguro: Tenta o update completo, se falhar por causa das colunas novas, tenta sem elas
                    try {
                        const { error: dbError } = await supabase.from('clients').update(updateData).eq('id', clientId);
                        if (dbError) {
                            console.warn("⚠️ [REAP] Erro no update primário:", dbError.message);
                            if (dbError.message.includes('reap_status') || dbError.message.includes('reap_ano_base')) {
                                if (onLog) onLog("⚠️ Colunas REAP não encontradas. Salvando apenas o documento...");
                                delete updateData.reap_status;
                                delete updateData.reap_ano_base;
                                const { error: dbErrorRetry } = await supabase.from('clients').update(updateData).eq('id', clientId);
                                if (dbErrorRetry) throw dbErrorRetry;
                            } else {
                                throw dbError;
                            }
                        }
                        if (onLog) onLog(finalResult.success ? `✨ REAP concluído com sucesso e status atualizado!` : `❌ REAP finalizado com ressalvas: ${finalResult.message}`);
                    } catch (finalDbErr) {
                        console.error("❌ [REAP] Erro fatal no banco:", finalDbErr);
                        if (onLog) onLog(`❌ Erro ao atualizar banco: ${finalDbErr.message}`);
                    }

                    return resolve({ success: finalResult.success, data: finalResult });
                } catch (e) {
                    console.error("Erro final no REAP:", e);
                    if (onLog) onLog(`❌ Erro ao atualizar sistema: ${e.message}`);
                    return resolve({ success: false, error: e.message });
                }
            }

            if (code !== 0 && !finalResult) {
                const errorMsg = `Processo falhou com código ${code}. Erro: ${stderrData.substring(0, 100)}`;
                // Atualiza o banco mesmo em falha para evitar status infinito de carregamento
                // Tenta status, se falhar, ignora (schema incompleto)
                supabase.from('clients').update({
                    reap_status: 'Pendente Anual'
                }).eq('id', clientId).then(({ error }) => {
                    if (error) console.warn("⚠️ [REAP] Falha ao atualizar status de erro (schema incompleto).");
                });
                return resolve({ success: false, error: errorMsg });
            }

            if (!finalResult) {
                supabase.from('clients').update({
                    reap_status: 'Pendente Anual'
                }).eq('id', clientId).then(({ error }) => {
                    if (error) console.warn("⚠️ [REAP] Falha ao atualizar status nulo (schema incompleto).");
                });
            }

            return resolve({ success: false, error: "Robô parou sem retornar resultado estruturado." });
        });

        botProcess.on('error', (err) => {
            if (onLog) onLog(`❌ Erro: ${err.message}`);
            return resolve({ success: false, error: err.message });
        });
    });
}

module.exports = { runReapProcess };
