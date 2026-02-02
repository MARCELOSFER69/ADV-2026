require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cron = require('node-cron');
const dns = require('node:dns');
const { startGovBrRecovery } = require('./services/govbrAutomation.cjs');
const { runRgpConsultation } = require('./services/rgpAutomation.cjs');
const { runReapProcess } = require('./services/reapAutomation.cjs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { startNotificationWorker } = require('./services/notificationWorker.cjs');

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

// Log de depuração para todas as requisições
app.use((req, res, next) => {
    console.log(`🌐 [API] ${req.method} ${req.url} - From: ${req.ip}`);
    next();
});

// --- 1.1 STREAMING RGP ---
app.get('/api/stream-rgp', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const { id, cpf, headless } = req.query;
    if (!id || !cpf) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'ID e CPF são obrigatórios' })}\n\n`);
        res.end();
        return;
    }

    const isHeadless = headless !== undefined ? headless === 'true' : botConfig.headless;
    console.log(`🚀 [API RGP] Iniciando para ${cpf}...`);
    res.write(`data: ${JSON.stringify({ type: 'log', message: `🚀 Iniciando Robô de Consulta (RGP)...` })}\n\n`);

    try {
        const result = await runRgpConsultation(id, cpf, isHeadless, (logMessage) => {
            res.write(`data: ${JSON.stringify({ type: 'log', message: logMessage })}\n\n`);
        });
        if (result.success) res.write(`data: ${JSON.stringify({ type: 'success', data: result.data })}\n\n`);
        else res.write(`data: ${JSON.stringify({ type: 'error', message: result.error })}\n\n`);
    } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }
    res.end();
});

// --- 1.2 STREAMING REAP (Manutenção) ---
app.get('/api/stream-reap', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const { id, cpf, senha, headless, fishing_data } = req.query;
    if (!id || !cpf) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'ID e CPF obrigatórios' })}\n\n`);
        res.end();
        return;
    }

    const isHeadless = headless === 'true';
    let fishingData = null;
    if (fishing_data) {
        try { fishingData = JSON.parse(fishing_data); } catch (e) { console.error('❌ Erro parse fishing_data:', e); }
    }

    console.log(`🚀 [API REAP] Iniciando para ${cpf}...`);
    res.write(`data: ${JSON.stringify({ type: 'log', message: `🚀 Iniciando Robô de Manutenção (REAP)...` })}\n\n`);

    try {
        const result = await runReapProcess(id, cpf, senha, isHeadless, (logMessage) => {
            res.write(`data: ${JSON.stringify({ type: 'log', message: logMessage })}\n\n`);
        }, fishingData);
        if (result.success) res.write(`data: ${JSON.stringify({ type: 'success', data: result.data })}\n\n`);
        else res.write(`data: ${JSON.stringify({ type: 'error', message: result.error })}\n\n`);
    } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }
    res.end();
});

// --- 1.4 WEBHOOK PARA BOTS EXTERNOS (Regra 1) ---
app.post('/api/webhook/bot-update', async (req, res) => {
    const { case_number, status_text, raw_data_json } = req.body;

    if (!case_number || !status_text) {
        return res.status(400).json({ success: false, error: 'case_number and status_text required' });
    }

    console.log(`🤖 [WEBHOOK] Recebida atualização para o processo ${case_number}: ${status_text}`);

    try {
        const { data: caseRecord, error: caseError } = await supabase
            .from('cases')
            .select('id, status')
            .eq('numero_processo', case_number)
            .single();

        if (caseError || !caseRecord) {
            console.warn(`⚠️ [WEBHOOK] Processo ${case_number} não encontrado.`);
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        // 1. Check for Duplication (Business Rule Protection)
        const { data: existingUpdate } = await supabase
            .from('case_history')
            .select('id')
            .eq('case_id', caseRecord.id)
            .ilike('details', `%${status_text}%`) // Check if status is present in details
            .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
            .limit(1)
            .single();

        if (existingUpdate) {
            console.log(`🛡️ [WEBHOOK] Atualização ignorada (Duplicidade detectada nas últimas 24h).`);
            return res.json({ success: true, message: 'Update ignored (Duplicate)' });
        }

        if (caseRecord.status !== status_text) {
            console.log(`🔄 [WEBHOOK] Mudança de status: ${caseRecord.status} -> ${status_text}`);

            await supabase
                .from('cases')
                .update({ status: status_text, updated_at: new Date().toISOString() })
                .eq('id', caseRecord.id);

            // FIX: Schema adaptation (removed old_value/new_value cols)
            await supabase
                .from('case_history')
                .insert([{
                    case_id: caseRecord.id,
                    action: 'Atualização Automática (Bot)',
                    details: `Status alterado de "${caseRecord.status}" para "${status_text}". Atualização recebida via integração de webhook externa.`,
                    // is_bot_update: true -- Removed per schema verification
                    // raw_data_json: raw_data_json -- Removed per schema verification or kept if column exists?
                    // Assuming basic schema based on seed fix. I'll put everything in details to be safe.
                }]);

            // ⚠️ ADESÃO AO LOG DE ROBÔS (Para o Dashboard)
            await supabase
                .from('bot_update_logs')
                .insert([{
                    case_id: caseRecord.id,
                    bot_name: 'Webhook Externo',
                    raw_response: raw_data_json,
                    changes_detected: { old_status: caseRecord.status, new_status: status_text }
                }]);
        }

        res.json({ success: true, message: 'Update processed successfully' });
    } catch (error) {
        console.error('❌ [WEBHOOK] Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- 1.3 CONFIGURAÇÃO REAP ---
app.get('/api/reap-config', async (req, res) => {
    const xlsx = require('xlsx');
    const robosPath = path.join(__dirname, 'robos', 'robo reap');
    let localidades = [];
    let peixes = [];
    try {
        const locPath = path.join(robosPath, 'config_localidades.xlsx');
        if (fs.existsSync(locPath)) {
            const workbook = xlsx.readFile(locPath);
            localidades = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        }
        const peixesPath = path.join(robosPath, 'config_peixes.xlsx');
        if (fs.existsSync(peixesPath)) {
            const workbook = xlsx.readFile(peixesPath);
            peixes = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]).map(row => row.ESPECIE).filter(Boolean);
        }
        res.json({ localidades, peixes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 1.5 AI COPILOT (Assistente do Sistema) ---
app.post('/api/ai-copilot', async (req, res) => {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem vazia' });

    try {
        console.log(`🧠 [IA COPILOT] Processando pergunta: "${message.slice(0, 50)}..."`);

        // Capturar contexto dinâmico do banco (Resumo do Escritório)
        const systemContext = await getSystemSummaryContext();

        const prompt = `Você é a Clara, a assistente inteligente oficial do Escritório de Advocacia Noleto & Macedo.
        Seu objetivo é ajudar o advogado a gerir o escritório com eficiência e precisão.

        CONTEXTO ATUAL DO ESCRITÓRIO:
        ${JSON.stringify(systemContext, null, 2)}
        
        CONTEXTO DA TELA ATUAL DO USUÁRIO:
        ${JSON.stringify(context || {}, null, 2)}

        INSTRUÇÕES:
        1. Baseie suas respostas nos dados fornecidos no contexto acima.
        2. Seja profissional, mas amigável e proativa.
        3. Se o usuário perguntar sobre faturamento, prazos ou clientes, use os números do contexto.
        4. Mantenha as respostas concisas e formate-as em Markdown.
        5. Se não souber algo, sugira que ele verifique no banco de dados.

        PERGUNTA DO USUÁRIO:
        "${message}"`;

        const result = await aiModel.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ response: responseText });
    } catch (error) {
        console.error('❌ Erro no Copilot:', error);
        // Tentar enviar uma resposta amigável mesmo em caso de erro da IA, se possível
        res.status(500).json({
            error: 'Falha ao processar inteligência',
            details: error.message,
            status: error.status
        });
    }
});

async function getSystemSummaryContext() {
    try {
        console.log('📊 [IA CONTEXT] Buscando dados para resumo...');
        const [
            clientsRes,
            casesRes,
            eventsRes,
            financialRes
        ] = await Promise.all([
            supabase.from('clients').select('*', { count: 'exact', head: true }),
            supabase.from('cases').select('*', { count: 'exact', head: true }),
            supabase.from('events').select('*, cases(titulo)').gte('data_hora', new Date().toISOString()).order('data_hora').limit(10),
            supabase.from('financial').select('valor, tipo, status_pagamento').eq('status_pagamento', false)
        ]);

        if (clientsRes?.error) console.error('❌ Erro clients:', clientsRes.error);
        if (casesRes?.error) console.error('❌ Erro cases:', casesRes.error);
        if (eventsRes?.error) console.error('❌ Erro events:', eventsRes.error);
        if (financialRes?.error) console.error('❌ Erro financial:', financialRes.error);

        return {
            total_clientes: clientsRes.count || 0,
            total_processos: casesRes.count || 0,
            eventos_proximos: eventsRes.data?.map(e => ({ data: e.data_hora, titulo: e.titulo, processo: e.cases?.titulo })) || [],
            financeiro_pendente: financialRes.data?.reduce((acc, current) => {
                if (current.tipo === 'Receita') acc.entrar += current.valor;
                else acc.sair += current.valor;
                return acc;
            }, { entrar: 0, sair: 0 }) || { entrar: 0, sair: 0 }
        };
    } catch (e) {
        console.error('❌ Erro fatal getSystemSummaryContext:', e);
        return { error: 'Não foi possível carregar contexto completo', details: e.message };
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n===================================================`);
    console.log(`🚀 API UNIFICADA (BOT + RGP) RODANDO EM 0.0.0.0:${PORT}`);
    console.log(`===================================================\n`);
    setupRealtimeTerminal();
});

async function setupRealtimeTerminal() {
    console.log('📡 Configurando Terminal Real-time via Supabase...');
    const channel = supabase.channel('bot_terminal');

    channel.subscribe(() => {
        const originalLog = console.log;
        const originalError = console.error;

        function broadcast(type, args) {
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            channel.send({
                type: 'broadcast',
                event: 'log',
                payload: { type, message, timestamp: new Date().toISOString() }
            });
        }

        console.log = (...args) => { originalLog(...args); broadcast('info', args); };
        console.error = (...args) => { originalError(...args); broadcast('error', args); };
    });
}

// --- CORREÇÃO DE REDE ---
try {
    if (dns && dns.setDefaultResultOrder) {
        dns.setDefaultResultOrder('ipv4first');
    }
} catch (e) { }

// ============================================================
// 1. CONFIGURAÇÃO (SUA DATABASE)
// ============================================================
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://escritorionoletoemacedo.vercel.app';

// Números que recebem o relatório financeiro
const LISTA_NUMEROS = ['559884727396@c.us'];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// IA GEMINI CONFIG
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let botConfig = {
    headless: true
};

async function classificarIntencao(texto) {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'SUA_CHAVE_AQUI') return null;

        const prompt = `Analise a mensagem do cliente de um escritório de advocacia e classifique em UMA das seguintes intenções:
        - RECUPERAR_SENHA (se ele quiser recuperar, resetar ou trocar a senha do gov.br ou nubank)
        - CONSULTAR_PROCESSO (se ele quiser saber como está o processo ou enviar CPF para busca)
        - FALAR_ADVOGADO (se quiser falar com um humano ou advogado)
        - FAQ_INFO (se ele perguntar endereço, horários, documentos necessários, contatos ou como chegar)
        - OUTRO (saudações como 'oi', 'olá', ou dúvidas que não se encaixam acima)

        Responda APENAS com a palavra da intenção.
        Mensagem: "${texto}"`;

        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        return response.text().trim().toUpperCase();
    } catch (e) {
        return null;
    }
}

// ============================================================
// --- GERENCIAMENTO REMOTO E LOGS ---
// ============================================================
const BOT_CONTROL_KEY = 'clara_bot_control';
const BOT_LOGS_KEY = 'clara_bot_logs';

async function setupRemoteControl() {
    console.log('📡 Configurando controle remoto via Supabase...');

    // A. Tabelas e Configurações já verificadas no deploy inicial.

    // B. Carregar configuração inicial
    try {
        const { data } = await supabase.from('system_settings').select('value').eq('key', BOT_CONTROL_KEY).single();
        if (data?.value?.config) {
            botConfig = { ...botConfig, ...data.value.config };
            console.log('✅ Configuração inicial carregada:', botConfig);
        }
    } catch (err) {
        console.warn('⚠️ Erro ao carregar configuração inicial:', err.message);
    }

    // 1. Heartbeat a cada 30 segundos
    setInterval(async () => {
        try {
            console.log('💓 Enviando heartbeat...');

            // Fallback: Carregar config mais recente caso Realtime falhe
            const { data: latest } = await supabase.from('system_settings').select('value').eq('key', BOT_CONTROL_KEY).single();
            if (latest?.value?.config) {
                if (JSON.stringify(botConfig) !== JSON.stringify(latest.value.config)) {
                    botConfig = { ...botConfig, ...latest.value.config };
                    console.log('⚙️ Configuração sincronizada via Heartbeat:', botConfig);
                }
            }

            const { error } = await supabase.from('system_settings').upsert({
                key: BOT_CONTROL_KEY,
                value: {
                    status: 'online',
                    last_heartbeat: new Date().toISOString(),
                    machine: os.hostname(),
                    config: botConfig
                }
            }, { onConflict: 'key' });
            if (error) console.error('❌ Erro Heartbeat Supabase:', error.message);
            else console.log('✅ Heartbeat enviado com sucesso!');
        } catch (e) {
            // Silencioso em caso de erro de rede (fetch failed)
        }
    }, 30000);

    // 2. Listener Unificado para System Settings (Comandos, Configs e Tasks)
    supabase.channel('system-settings-monitor')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, async payload => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            // Ignorar Deletes que não nos interessam
            if (eventType === 'DELETE' && oldRecord.id) return;

            // A. Comandos de Controle (restart/stop) e Configuração
            if (newRecord && (newRecord.key === BOT_CONTROL_KEY)) {
                const cmd = newRecord.value?.command;
                if (cmd === 'restart') {
                    console.log('🔄 Recebido comando de REINICIAR via painel! Encerrando processo para o Runner reiniciar...');
                    // Fecha o processo. O runner.cjs (ou PM2) vai subir de novo automaticamente.
                    process.exit(0);
                } else if (cmd === 'stop') {
                    console.log('🛑 Recebido comando de PARAR via painel!');
                    // Para parar de verdade, saímos com código 1 (opcional, mas o runner pode tentar subir de novo).
                    // Idealmente, o runner deveria checar uma flag. Mas para agora, exit(0).
                    // Para evitar loop infinito no runner, vamos dar exit e torcer para o user matar o runner, 
                    // OU podemos usar um arquivo de flag. Mas vamos simplificar:
                    console.log("⚠️ Para desligar totalmente, você deve fechar o terminal do Runner.");
                    process.exit(1);
                }
                if (newRecord.value?.config) {
                    botConfig = { ...botConfig, ...newRecord.value.config };
                    console.log('⚙️ Configuração Atualizada:', botConfig);
                }
            }

            // B. Tasks de RGP (rgp_sync_task)
            if (newRecord && newRecord.key === 'rgp_sync_task') {
                const task = newRecord.value;
                if (!task || !task.clients || task.clients.length === 0) return;

                console.log(`🤖 [Task] Recebida solicitação de RGP para ${task.clients.length} clientes. Headless: ${botConfig.headless}`);

                for (const item of task.clients) {
                    try {
                        await runRgpConsultation(item.id, item.cpf, botConfig.headless);
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (err) {
                        console.error(`❌ [Task] Erro ao processar item:`, err);
                    }
                }

                // Limpa a task
                await supabase.from('system_settings').delete().eq('id', newRecord.id);
            }
        })
        .subscribe();

    // 3. Streaming de Logs
    const logPathOut = path.join(os.homedir(), '.pm2', 'logs', 'clara-bot-out-0.log');
    const logPathErr = path.join(os.homedir(), '.pm2', 'logs', 'clara-bot-error-0.log');

    // Função para remover códigos de cores ANSI (limpar o terminal)
    const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

    async function updateLogs() {
        try {
            let logs = '';
            // Pegamos as últimas 50 linhas para dar mais contexto
            if (fs.existsSync(logPathOut)) {
                const content = fs.readFileSync(logPathOut, 'utf8');
                const cleanLines = content.split('\n').slice(-50).map(line => stripAnsi(line)).join('\n');
                logs += cleanLines;
            }
            if (fs.existsSync(logPathErr)) {
                const errors = fs.readFileSync(logPathErr, 'utf8');
                const cleanErrors = errors.split('\n').slice(-30).map(line => stripAnsi(line)).join('\n');
                if (cleanErrors.trim()) {
                    logs += '\n\n--- ERROS RECENTES ---\n' + cleanErrors;
                }
            }

            // Só enviamos se houver logs para evitar loops desnecessários
            if (!logs) return;

            const { error } = await supabase.from('system_settings').upsert({
                key: BOT_LOGS_KEY,
                value: {
                    content: logs,
                    updated_at: new Date().toISOString()
                }
            }, { onConflict: 'key' });
            if (error) console.error('❌ Erro Logs Supabase:', error.message);
            else console.log('✅ Logs sincronizados com o painel.');
        } catch (e) {
            // Silencioso em caso de oscilação de rede
        }
    }

    setInterval(updateLogs, 7000); // Atualiza logs a cada 7s (mais rápido)
    updateLogs();
}

setupRemoteControl().catch(console.error);

// IA REMOVIDA A PEDIDO DO USUÁRIO

// ============================================================
// 2. INICIALIZAÇÃO DO BOT
// ============================================================
wppconnect.create({
    session: 'adv-bot-new',
    headless: true,
    logQR: true,
    catchQR: (base64Qr, asciiQR, attempts, urlCode) => { }, // Adicionado para evitar conflito de trava
    browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
    ]
})
    .then((client) => {
        start(client);
        iniciarAgendadores(client);
        startNotificationWorker(client); // Iniciar Worker de Fila de Notificações (Regra 2)
        startAutomationWorker(); // Iniciar Worker de Fila de Automação (Regra 3 - Escalabilidade)
    })
    .catch((error) => console.error("❌ Erro fatal ao iniciar WPPConnect:", error));

// ============================================================
// 3. LOGICA PRINCIPAL E SINCRONIZAÇÃO
// ============================================================
async function start(client) {
    console.log('⚖️ Clara Bot Ativo (Sincronizador Robusto com IA)!');

    // --- A. ESCUTAR RESPOSTAS DO PAINEL ---
    supabase
        .channel('db_sync')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'sender_type=eq.user' }, async (payload) => {
            const newMsg = payload.new;
            // Se o sender for o próprio bot, ignoramos para não dar loop
            if (newMsg.sender_name === 'Clara (Bot)') return;

            try {
                const { data: chat } = await supabase.from('chats').select('remote_jid').eq('id', newMsg.chat_id).single();
                if (chat?.remote_jid) {
                    console.log(`📤 Enviando resposta do painel para ${chat.remote_jid}`);
                    await client.sendText(chat.remote_jid, newMsg.content);
                }
            } catch (err) {
                console.error("❌ Erro ao enviar mensagem do painel:", err.message);
            }
        })
        .subscribe();

    // --- B. FUNÇÃO DE SINCRONIA COM BUSCA AVANÇADA POR TELEFONE ---
    async function sincronizarComPainel(jid, texto, tipo, nomeWPP) {
        try {
            // Remove tudo que não é número e tira o código do país (55)
            const foneLimpo = jid.replace(/\D/g, '').replace(/^55/, '');
            const final8 = foneLimpo.slice(-8); // últimos 8 dígitos (ex: 84727396)
            const final4 = foneLimpo.slice(-4); // últimos 4 para filtro inicial (ex: 7396)

            console.log(`🔍 Buscando cliente: ${foneLimpo} (Final 4: ${final4})`);

            // 1. Localiza ou Cria o Chat
            const { data: chatExistente } = await supabase.from('chats').select('id, client_id, last_message, unread_count, status, client_name').eq('remote_jid', jid).maybeSingle();
            let chat = chatExistente;

            // Se o chat não existe ou o nome ainda é um número, tentamos identificar o cliente
            const precisaIdentificar = !chat || !chat.client_name || chat.client_name.startsWith('+');
            let clienteEncontrado = null;

            if (precisaIdentificar) {
                // Filtro inicial rápido no banco pelos últimos 4 dígitos
                const { data: potenciais, error: qError } = await supabase.from('clients')
                    .select('id, nome_completo, telefone')
                    .ilike('telefone', `%${final4}%`);

                if (qError) console.error("❌ Erro na query de clientes:", qError.message);
                console.log(`🔎 Potenciais encontrados (${potenciais?.length || 0}):`, potenciais?.map(p => `${p.nome_completo} (${p.telefone})`).join(', '));

                if (potenciais && potenciais.length > 0) {
                    // Refinamento: compara os últimos 8 dígitos (padrão Brasil)
                    clienteEncontrado = potenciais.find(p => {
                        const telDbLimpo = (p.telefone || '').replace(/\D/g, '');
                        return telDbLimpo.endsWith(final8);
                    });
                }

                if (clienteEncontrado) {
                    console.log(`✅ Cliente Identificado via telefone: ${clienteEncontrado.nome_completo}`);
                } else {
                    console.log(`❓ Nenhum dos potenciais coincidiu com o final ${final8}`);
                }
            }

            if (!chat) {
                const nomeIdentificado = clienteEncontrado?.nome_completo || nomeWPP || `+${foneLimpo}`;
                const { data: newChat, error: insError } = await supabase.from('chats').insert([{
                    client_id: clienteEncontrado?.id,
                    client_name: nomeIdentificado,
                    remote_jid: jid,
                    status: 'waiting',
                    last_message: texto,
                    unread_count: tipo === 'client' ? 1 : 0
                }]).select().single();

                if (insError) throw insError;
                chat = newChat;
            } else if (clienteEncontrado) {
                // Se achou o cliente agora, atualiza o chat que estava "sem nome"
                await supabase.from('chats').update({
                    client_id: clienteEncontrado.id,
                    client_name: clienteEncontrado.nome_completo
                }).eq('id', chat.id);
                chat.client_name = clienteEncontrado.nome_completo;
            }

            // 2. Atualiza resumo da conversa
            await supabase.from('chats').update({
                last_message: texto,
                last_message_at: new Date().toISOString(),
                unread_count: tipo === 'client' ? (chat.unread_count || 0) + 1 : 0
            }).eq('id', chat.id);

            // 3. Grava a Mensagem 
            await supabase.from('chat_messages').insert([{
                chat_id: chat.id,
                sender_type: tipo.trim().toLowerCase(),
                sender_name: tipo === 'user' ? 'Clara (Bot)' : (chat.client_name || nomeWPP || `+${foneLimpo}`),
                content: texto,
                timestamp: new Date().toISOString()
            }]);

            console.log(`✅ Sincronizado: ${chat.client_name}`);
            return chat;
        } catch (e) {
            console.error("⚠️ Erro na Sincronia:", e.message);
            return null;
        }
    }

    // --- C. RECEBIMENTO DE MENSAGENS NO WHATSAPP ---
    client.onMessage(async (message) => {
        // Ignora grupos e mensagens que não são texto (opcional)
        if (message.isGroupMsg || (message.type !== 'chat' && message.type !== 'revoked')) return;

        const userPhone = message.from;
        const text = message.body || "";
        const textLower = text.toLowerCase();

        // 1. Sincroniza e Tenta Identificar o Cliente
        const chatAtivo = await sincronizarComPainel(userPhone, text, 'client', message.pushname);

        // --- IA: CLASSIFICAÇÃO DE INTENÇÃO ---
        const intencao = await classificarIntencao(text);
        console.log(`🧠 IA classificou para ${chatAtivo?.client_name}: "${intencao}"`);

        // 2. Se o chat estava encerrado, volta para a fila se o cliente mandar mensagem
        if (chatAtivo?.status === 'finished') {
            console.log(`♻️ Cliente ${chatAtivo.client_name} reabriu o atendimento. Voltando para a fila.`);
            await supabase.from('chats').update({
                status: 'waiting',
                assigned_to: null,
                assigned_to_id: null
            }).eq('id', chatAtivo.id);
            chatAtivo.status = 'waiting';
        }

        // 3. Se um humano estiver atendendo (status 'active'), o bot não responde
        if (chatAtivo?.status === 'active') {
            console.log(`👨‍⚖️ Atendimento humano iniciado para ${chatAtivo.client_name}. Bot em silêncio.`);
            return;
        }

        console.log(`📩 Mensagem recebida de ${chatAtivo?.client_name}`);
        console.log(`💡 ID do Cliente no Chat: ${chatAtivo?.client_id}`);

        // --- 1. LÓGICA DE RECUPERAÇÃO DE SENHA GOV.BR (RESPOSTA DO CLIENTE) ---
        const isAprovacao = ['sim', 'quero', 'pode', 'ok', 'bora', 'vamos', 'resolver'].some(w => textLower.includes(w));
        const isSolicitacaoNubank = textLower.includes('nubank') || intencao === 'RECUPERAR_SENHA';

        // Busca a última mensagem enviada pelo BOT neste chat para confirmar o contexto
        const { data: lastBotMsg } = await supabase
            .from('chat_messages')
            .select('content')
            .eq('chat_id', chatAtivo.id)
            .eq('sender_type', 'user')
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

        const aguardandoConfirmacao = lastBotMsg?.content?.toLowerCase().includes('pendência') && lastBotMsg?.content?.toLowerCase().includes('senha');
        console.log(`🤔 Aguardando confirmação? ${aguardandoConfirmacao ? 'Sim' : 'Não'} (Última bot: "${lastBotMsg?.content?.slice(0, 40)}...")`);

        if (isSolicitacaoNubank || (isAprovacao && aguardandoConfirmacao)) {
            console.log("🚀 Gatilho de automação detectado! Iniciando Playwright...");
            const { data: cliente } = await supabase.from('clients').select('cpf_cnpj').eq('id', chatAtivo.client_id).single();
            if (cliente?.cpf_cnpj) {
                const cpfLimpo = cliente.cpf_cnpj.replace(/\D/g, '');
                await client.sendText(userPhone, "⏳ Certo! Estou acessando o portal gov.br para gerar seu link de recuperação via Nubank. Só um instante...");
                const result = await startGovBrRecovery(cpfLimpo, 'nubank', botConfig.headless);
                if (result.success) {
                    await client.sendText(userPhone, `🔗 *Link gerado com sucesso!*\n\nClique no link abaixo no seu celular e autorize o acesso no aplicativo do Nubank:\n\n${result.link}\n\n⚠️ *Atenção:* Após autorizar no app, o site do gov.br avançará automaticamente para você definir sua nova senha.`);
                    await sincronizarComPainel(userPhone, `Link de recuperação enviado: ${result.link}`, 'user', 'Clara (Bot)');
                } else {
                    await client.sendText(userPhone, "❌ Tive um problema técnico ao gerar o link. Por favor, tente novamente mais tarde ou fale com um de nossos atendentes digitando *2*.");
                }
            } else {
                await client.sendText(userPhone, "❌ Não localizei seu CPF para iniciar a recuperação. Por favor, digite seu CPF para que eu possa te ajudar.");
            }
            return;
        }

        // --- 3. LÓGICA DE RESPOSTAS AUTOMÁTICAS (Menu Simples) ---
        let response = "";

        if (['oi', 'ola', 'olá', 'bom dia', 'boa tarde'].some(t => textLower.startsWith(t))) {
            response = `⚖️ *Olá! Sou a Clara, assistente do Escritório Noleto & Macedo.*\n\nComo posso ajudar você hoje?\n\n1️⃣ *Consultar Processo*\n2️⃣ Falar com Advogado\n3️⃣ Nossos Endereços\n4️⃣ Documentos Necessários\n\n_Dica: Se quiser consultar seu processo, basta digitar seu CPF aqui mesmo._`;
        } else if (textLower === '1' || intencao === 'CONSULTAR_PROCESSO') {
            response = `🏛️ *Consulta Processual*\n\nPara ver o status atual de seus processos em tempo real, acesse:\n🔗 ${SITE_URL}/consulta\n\n_Ou digite seu CPF aqui no chat agora mesmo para uma busca rápida._`;
        } else if (textLower === '2' || textLower === 'falar com advogado' || intencao === 'FALAR_ADVOGADO') {
            response = '👨‍⚖️ Perfeito. Notifiquei um de nossos advogados sobre seu contato. Por favor, aguarde o retorno por aqui em breve.';
        } else if (textLower === '3' || textLower.includes('endereço') || (intencao === 'FAQ_INFO' && (textLower.includes('onde') || textLower.includes('endereço') || textLower.includes('chegar')))) {
            response = '📍 *Nossa Localização:*\n\n🏢 *Matriz Santa Inês:*\nRua do Comércio, 123 - Centro\n📍 [Ver no Maps](https://maps.google.com)\n\n🏢 *Filial Alto Alegre:*\nAv. Principal, 456 - Centro\n\n🕒 *Horário:* Segunda a Sexta, 08h às 18h.';
        } else if (textLower === '4' || textLower.includes('documentos') || (intencao === 'FAQ_INFO' && textLower.includes('documento'))) {
            response = '📁 *Documentos Básicos Necessários:*\n\nPara a maioria dos processos, precisamos de:\n✅ RG e CPF (ou CNH)\n✅ Comprovante de Residência\n✅ Carteira de Trabalho (CTPS)\n✅ Extrato do CNIS (pegamos para você no gov.br)\n\n*Dica:* Se você já tiver em mãos, pode tirar uma foto bem legível e enviar aqui agora mesmo!';
        } else if (textLower.replace(/\D/g, '').length === 11) {
            // DETECTOU CPF (11 dígitos) - EXECUTA BUSCA REAL
            // DETECTOU CPF (11 dígitos)
            const cpfLimpo = textLower.replace(/\D/g, '');
            const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

            await client.sendText(userPhone, `🔍 Consultando processos para o CPF ${cpfFormatado}...`);

            try {
                // Busca cliente pelo CPF completo (limpo ou formatado)
                let { data: clients } = await supabase.from('clients')
                    .select('id, nome_completo')
                    .or(`cpf_cnpj.eq.${cpfLimpo},cpf_cnpj.eq.${cpfFormatado}`)
                    .limit(1);
                const cliente = clients ? clients[0] : null;

                if (!cliente) {
                    response = `❌ Infelizmente não encontrei um cadastro com o CPF ${cpfFormatado} em nossa base.\n\nDigite *2* para falar com o suporte e atualizar seus dados.`;
                } else {
                    const { data: cases } = await supabase.from('cases').select('numero_processo, status, titulo').eq('client_id', cliente.id);
                    if (cases && cases.length > 0) {
                        response = `📄 *Olá, ${cliente.nome_completo}! Encontrei ${cases.length} processo(s) vinculado(s):*\n`;
                        cases.slice(0, 3).forEach(c => {
                            response += `\n🔹 *${c.titulo}*\n   Status: _${c.status}_`;
                        });
                        response += `\n\n🔗 *Acompanhe tudo em:* ${SITE_URL}/consulta`;
                    } else {
                        response = `✅ Olá ${cliente.nome_completo}! Seu cadastro está ativo, mas não encontrei processos em andamento no momento.`;
                    }
                }
            } catch (e) {
                response = "Desculpe, tive uma instabilidade ao acessar o banco de dados. Por favor, tente novamente em alguns instantes.";
            }
        }

        // Envia resposta se houver
        if (response) {
            await client.sendText(userPhone, response);
            // Sincroniza a resposta da Clara também no painel
            await sincronizarComPainel(userPhone, response, 'user', 'Clara (Bot)');
        }
    });
}

// ============================================================
// 4. AGENDADORES (RELATÓRIOS E COBRANÇA)
// ============================================================
// ... existing code ...
function iniciarAgendadores(client) {
    // Relatório Financeiro Matinal (08:00)
    cron.schedule('0 8 * * *', async () => {
        await enviarRelatorioFinanceiro(client);
    });

    // Alerta Estratégico da Inteligência (09:30) - NOVO: IA avisa sobre gargalos
    cron.schedule('30 9 * * 1-5', async () => {
        await enviarAlertaEstrategicoIA(client);
    });

    // Cobrança de documentos pendentes (Segunda a Sexta às 10h, 14h e 16h)
    cron.schedule('0 10,14,16 * * 1-5', async () => {
        await cobrarPendenciasClientes(client);
    });
}

// ============================================================
// 5. WORKER DE AUTOMAÇÃO (Pilar 2 da Escalabilidade)
// ============================================================
async function startAutomationWorker() {
    console.log("🏭 [WORKER] Iniciando Worker de Automação (Fila)...");

    // Loop Infinito com delay
    while (true) {
        try {
            // 1. Buscar Job Pendente (Alta Prioridade Primeiro)
            const { data: job, error } = await supabase
                .from('automation_queue')
                .select('*')
                .eq('status', 'pending')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // Ignora "Nenhum resultado"
                console.error("❌ [WORKER] Erro ao buscar job:", error.message);
            }

            if (job) {
                console.log(`🔨 [WORKER] Processando Job ${job.id} (${job.type})...`);

                // 2. Travar Job
                await supabase.from('automation_queue').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);

                try {
                    let result = null;
                    const payload = job.payload || {};

                    // 3. Executar Lógica
                    switch (job.type) {
                        case 'RGP_SYNC':
                            result = await runRgpConsultation(payload.id, payload.cpf, botConfig.headless);
                            break;

                        case 'REAP_UPDATE':
                            // Adicionar lógica do REAP se necessário
                            result = { success: true, message: 'Simulação REAP OK' };
                            break;

                        case 'GOVBR_RECOVER':
                            result = await startGovBrRecovery(payload.cpf, 'nubank', botConfig.headless);
                            break;

                        default:
                            throw new Error(`Tipo de job desconhecido: ${job.type}`);
                    }

                    // 4. Concluir Job
                    if (result && result.success === false) throw new Error(result.error || 'Falha desconhecida');

                    await supabase.from('automation_queue').update({
                        status: 'completed',
                        updated_at: new Date().toISOString(),
                        error_log: null
                    }).eq('id', job.id);

                    console.log(`✅ [WORKER] Job ${job.id} concluído com sucesso!`);

                } catch (execError) {
                    console.error(`❌ [WORKER] Falha no Job ${job.id}:`, execError);
                    await supabase.from('automation_queue').update({
                        status: 'failed',
                        updated_at: new Date().toISOString(),
                        error_log: execError.message
                    }).eq('id', job.id);
                }
            }
        } catch (e) {
            console.error("❌ [WORKER] Loop Error:", e);
        }

        // Espera 5 segundos antes da próxima checagem para não spamar o banco
        await new Promise(r => setTimeout(r, 5000));
    }
}
// export { startAutomationWorker }; // Não precisa exportar se estiver no mesmo arquivo ou usar module.exports se for separar


async function enviarAlertaEstrategicoIA(client) {
    try {
        console.log('🤖 [IA ALERT] Gerando insight estratégico para o advogado...');
        const context = await getSystemSummaryContext();

        const prompt = `Gere um alerta curto e motivacional (máximo 60 palavras) para o dono do escritório de advocacia baseado nestes números:
        - Clientes: ${context.total_clientes}
        - Processos: ${context.total_processos}
        - Prazos Próximos: ${context.eventos_proximos?.length || 0}
        - Financeiro a Entrar: R$ ${context.financeiro_pendente?.entrar || 0}
        
        Destaque uma coisa positiva e um ponto de atenção. Use emojis e tom de parceiro de negócios.`;

        const result = await aiModel.generateContent(prompt);
        const alertMsg = result.response.text();

        for (const n of LISTA_NUMEROS) {
            await client.sendText(n, `💡 *Insight da Clara*\n\n${alertMsg}`);
        }
    } catch (err) {
        console.error("Erro no alerta estratégico IA:", err.message);
    }
}

async function enviarRelatorioFinanceiro(client) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        let msg = `🌅 *Relatório Financeiro Matinal*\n`;
        let temDados = false;

        const { data: despesas } = await supabase.from('financial').select('*').eq('status_pagamento', false).eq('data_vencimento', hoje);
        const { data: parcelas } = await supabase.from('case_installments').select('*, cases(titulo, clients(nome_completo))').eq('pago', false).eq('data_vencimento', hoje);

        if (despesas?.length) {
            temDados = true;
            msg += `\n💸 *DÉBITOS DE HOJE:*`;
            despesas.forEach(d => msg += `\n- ${d.descricao}: R$ ${d.valor}`);
        }

        if (parcelas?.length) {
            temDados = true;
            msg += `\n\n💰 *RECEBIMENTOS ESPERADOS:*`;
            parcelas.forEach(p => msg += `\n- ${p.cases?.clients?.nome_completo || 'Cliente'}: R$ ${p.valor}`);
        }

        if (temDados) {
            for (const n of LISTA_NUMEROS) await client.sendText(n, msg);
        }
    } catch (err) {
        console.error("Erro no agendador financeiro:", err.message);
    }
}

async function cobrarPendenciasClientes(client) {
    try {
        const { data: clientes } = await supabase.from('clients').select('*').eq('pendencia_notificada', false).not('pendencias', 'is', null);
        if (!clientes || clientes.length === 0) return;

        for (const c of clientes) {
            if (c.pendencias?.length > 0 && c.telefone) {
                // Formata JID
                let fone = c.telefone.replace(/\D/g, '');
                if (!fone.startsWith('55')) fone = '55' + fone;

                let texto = "";
                if (c.pendencias.some(p => p.toLowerCase().includes('senha'))) {
                    texto = `Olá, *${c.nome_completo}*! ⚖️ Notei que temos uma pendência de *senha do gov.br* em seu cadastro.\n\nVocê teria um momento agora para resolvermos isso? Se você tiver conta no *Nubank*, eu consigo gerar um link para você recuperar sua senha rapidinho pelo celular.`;
                } else {
                    texto = `Olá, *${c.nome_completo}*! ⚖️ Notei que temos algumas pendências de documentos em seu cadastro:\n\n${c.pendencias.map(p => `• ${p}`).join('\n')}\n\nPor favor, você poderia nos enviar por aqui mesmo?`;
                }

                await client.sendText(fone + '@c.us', texto);
                await supabase.from('clients').update({ pendencia_notificada: true }).eq('id', c.id);
            }
        }
    } catch (err) {
        console.error("Erro na cobrança de pendências:", err.message);
    }
}
