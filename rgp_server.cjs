const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const { runRgpConsultation } = require('./services/rgpAutomation.cjs');
const { runReapProcess } = require('./services/reapAutomation.cjs');
const { exec } = require('child_process');
const express = require('express');
const cors = require('cors');
const os = require('os');

// ===================================
// CONFIGURAÇÃO
// ===================================
const app = express();
const PORT = 3001; // Porta do Servidor de Robôs

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());

let botConfig = {
    headless: true
};

// ===================================
// 1. API DE STREAMING (Onde o site conecta)
// ===================================
app.get('/api/stream-rgp', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const { id, cpf, headless } = req.query;

    if (!id || !cpf) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'ID e CPF obrigatórios' })}\n\n`);
        res.end();
        return;
    }

    const isHeadless = headless !== undefined ? headless === 'true' : botConfig.headless;

    console.log(`🚀 [API] Iniciando consulta para ${cpf}...`);
    res.write(`data: ${JSON.stringify({ type: 'log', message: `🚀 Iniciando consulta...` })}\n\n`);

    try {
        const result = await runRgpConsultation(id, cpf, isHeadless, (logMessage) => {
            res.write(`data: ${JSON.stringify({ type: 'log', message: logMessage })}\n\n`);
        });

        if (result.success) {
            res.write(`data: ${JSON.stringify({ type: 'success', data: result.data })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: result.error })}\n\n`);
        }
    } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }

    res.end();
});

// ===================================
// 1.2 STREAMING REAP (Novo para Manutenção)
// ===================================
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

    // REAP geralmente precisa de assistente, então headless=false por padrão
    const isHeadless = headless === 'true';

    // Parse fishing_data se fornecido
    let fishingData = null;
    if (fishing_data) {
        try {
            fishingData = JSON.parse(fishing_data);
            console.log(`🐟 [API] Recebidos ${fishingData.length} registros de pesca do frontend`);
        } catch (e) {
            console.error('❌ Erro ao parsear fishing_data:', e);
        }
    }

    console.log(`🚀 [API] Iniciando REAP para ${cpf}...`);
    res.write(`data: ${JSON.stringify({ type: 'log', message: `🚀 Iniciando Robô de Manutenção (REAP)...` })}\n\n`);

    try {
        const result = await runReapProcess(id, cpf, senha, isHeadless, (logMessage) => {
            res.write(`data: ${JSON.stringify({ type: 'log', message: logMessage })}\n\n`);
        }, fishingData);

        if (result.success) {
            res.write(`data: ${JSON.stringify({ type: 'success', data: result.data })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: result.error })}\n\n`);
        }
    } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }

    res.end();
});

// ===================================
// 1.3 STOP REAP (Cancelar Robô)
// ===================================
app.post('/api/stop-reap', async (req, res) => {
    console.log('🛑 [API] Solicitação para parar robô REAP recebida.');
    try {
        // Mata processos Python que possam estar rodando o robo_reap.py
        if (os.platform() === 'win32') {
            exec('taskkill /F /IM python.exe /T', (err) => {
                if (err) console.warn('⚠️ Nenhum processo Python encontrado ou erro ao matar:', err.message);
            });
            // Também mata o Chrome controlado pelo Selenium (atenção: mata TODOS os chrome)
            exec('taskkill /F /IM chromedriver.exe /T', (err) => {
                if (err) console.warn('⚠️ Nenhum ChromeDriver encontrado:', err.message);
            });
        } else {
            exec('pkill -f robo_reap.py', (err) => {
                if (err) console.warn('⚠️ pkill falhou:', err.message);
            });
        }
        res.json({ success: true, message: 'Comando de parada enviado.' });
    } catch (error) {
        console.error('❌ Erro ao parar robô:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================================
// 1.4 REAP CONFIG (Ler planilhas de configuração)
// ===================================
app.get('/api/reap-config', async (req, res) => {
    const xlsx = require('xlsx');
    const robosPath = path.join(__dirname, 'robos', 'robo reap');

    let localidades = [];
    let peixes = [];

    try {
        // Ler config_localidades.xlsx
        const locPath = path.join(robosPath, 'config_localidades.xlsx');
        if (require('fs').existsSync(locPath)) {
            const workbook = xlsx.readFile(locPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            localidades = xlsx.utils.sheet_to_json(sheet);
            console.log(`📍 [CONFIG] Carregadas ${localidades.length} localidades`);
        }

        // Ler config_peixes.xlsx
        const peixesPath = path.join(robosPath, 'config_peixes.xlsx');
        if (require('fs').existsSync(peixesPath)) {
            const workbook = xlsx.readFile(peixesPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(sheet);
            peixes = data.map(row => row.ESPECIE).filter(Boolean);
            console.log(`🐟 [CONFIG] Carregadas ${peixes.length} espécies de peixes`);
        }

        res.json({ localidades, peixes });
    } catch (error) {
        console.error('❌ Erro ao carregar config REAP:', error);
        res.status(500).json({ error: error.message, localidades: [], peixes: [] });
    }
});

// ===================================
// 1.1 API DE SYNC EM MASSA (Task)
// ===================================
app.post('/api/rgp-sync', async (req, res) => {
    const { clients } = req.body;

    if (!clients || !Array.isArray(clients)) {
        return res.status(400).json({ error: 'Lista de clientes inválida' });
    }

    console.log(`🤖 [API] Recebida tarefa de massa: ${clients.length} clientes.`);
    res.json({ message: 'Processamento iniciado em segundo plano.' });

    // Processamento Async
    (async () => {
        for (const item of clients) {
            try {
                // Pequeno delay entre requisições para estabilidade
                await new Promise(r => setTimeout(r, 1000));
                console.log(`🔄 Processando ${item.cpf}...`);
                await runRgpConsultation(item.id, item.cpf, botConfig.headless);
            } catch (err) {
                console.error(`❌ Erro no cliente ${item.cpf}:`, err);
            }
        }
        console.log("✅ Tarefa de massa finalizada.");
    })();
});

app.post('/api/reap-sync', async (req, res) => {
    const { clients } = req.body;
    if (!clients || !Array.isArray(clients)) return res.status(400).json({ error: 'Lista inválida' });

    console.log(`🤖 [API] Recebida tarefa de REAP em massa: ${clients.length} clientes.`);
    res.json({ message: 'Processamento de REAP iniciado.' });

    (async () => {
        for (const item of clients) {
            try {
                await new Promise(r => setTimeout(r, 1000));
                console.log(`🔄 Fazendo REAP de ${item.cpf}...`);
                // No sync em massa, usamos headless false para que o assistente apareça
                await runReapProcess(item.id, item.cpf, item.senha_gov, false);
            } catch (err) {
                console.error(`❌ Erro no REAP de ${item.cpf}:`, err);
            }
        }
        console.log("✅ Tarefa de REAP finalizada.");
    })();
});

// ===================================
// 2. TERMINAL REAL-TIME
// ===================================
async function setupRealtimeTerminal() {
    const channel = supabase.channel('bot_terminal');

    // Escutar Comandos do Site
    channel
        .on('broadcast', { event: 'command' }, async (payload) => {
            const cmd = payload.payload?.cmd;
            if (!cmd) return;

            console.log(`💻 [TERMINAL] Comando recebido: ${cmd}`);

            if (cmd === 'help') {
                console.log("ℹ️  COMANDOS DO MÓDULO RGP:");
                console.log("   • status   -> Verifica conexão");
                console.log("   • config   -> Mostra configurações atuais");
                return;
            }
            if (cmd === 'status') {
                console.log(`✅ RGP WORKER ONLINE | Headless: ${botConfig.headless}`);
                return;
            }

            // Execução de Shell (Cuidado em produção!)
            exec(cmd, (error, stdout, stderr) => {
                if (stdout) console.log(stdout.trim());
                if (stderr) console.error(stderr.trim());
            });
        })
        .subscribe(() => console.log("📡 Terminal Conectado ao Painel."));

    // Hook no Console para Enviar Logs
    const originalLog = console.log;
    const originalError = console.error;

    function broadcastLog(type, args) {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        channel.send({
            type: 'broadcast',
            event: 'log',
            payload: { type, message: msg, timestamp: new Date().toISOString() }
        });
    }

    console.log = function (...args) {
        originalLog.apply(console, args);
        broadcastLog('info', args);
    };

    console.error = function (...args) {
        originalError.apply(console, args);
        broadcastLog('error', args);
    };
}

// ===================================
// 3. LISTENERS DE TAREFAS (SUPABASE)
// ===================================
async function startWorkers() {
    console.log("🛠️  Iniciando Worker RGP...");

    // Heartbeat
    setInterval(async () => {
        await supabase.from('system_settings').upsert({
            key: 'clara_bot_control',
            value: {
                status: 'online',
                last_heartbeat: new Date().toISOString(),
                machine: os.hostname(),
                module: 'RGP_SERVER',
                config: botConfig
            }
        });
    }, 10000);

    // Verificação de Tarefas Pendentes ao Iniciar (Persistência Offline)
    async function checkPendingTasks() {
        console.log("🔍 Verificando tarefas pendentes no banco...");
        const { data: pendingTask } = await supabase.from('system_settings').select('*').eq('key', 'rgp_sync_task').single();

        if (pendingTask && pendingTask.value && pendingTask.value.clients) {
            console.log(`📥 [RECOVERY] Encontrada tarefa pendente com ${pendingTask.value.clients.length} clientes.`);
            const task = pendingTask.value;

            for (const item of task.clients) {
                try {
                    await runRgpConsultation(item.id, item.cpf, botConfig.headless);
                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    console.error(`❌ Erro no cliente ${item.cpf}:`, err);
                }
            }

            // Limpa a task
            await supabase.from('system_settings').delete().eq('key', 'rgp_sync_task');
            console.log("✅ Tarefa pendente processada e removida.");
        } else {
            console.log("✅ Nenhuma tarefa pendente.");
        }
    }

    // Executa verificação inicial
    checkPendingTasks();

    // Escutar Novas Tasks
    supabase.channel('rgp-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, async payload => {
            const { new: newRecord } = payload;

            // Configuração
            if (newRecord && newRecord.key === 'clara_bot_control' && newRecord.value?.config) {
                botConfig = { ...botConfig, ...newRecord.value.config };
                if (newRecord.value.command === 'restart') {
                    console.log("🔄 Reiniciando Worker RGP...");
                    process.exit(0);
                }
            }

            // Tarefa de Consulta em Massa
            if (newRecord && newRecord.key === 'rgp_sync_task') {
                const task = newRecord.value;
                if (!task || !task.clients) return;

                console.log(`🤖 [TASK] Processando ${task.clients.length} clientes...`);

                for (const item of task.clients) {
                    try {
                        await runRgpConsultation(item.id, item.cpf, botConfig.headless);
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (err) {
                        console.error(`❌ Erro no cliente ${item.cpf}:`, err);
                    }
                }

                // Limpa a task
                // Usa key em vez de ID para garantir
                await supabase.from('system_settings').delete().eq('key', 'rgp_sync_task');
            }
            // Tarefa de REAP em Massa
            if (newRecord && newRecord.key === 'reap_sync_task') {
                const task = newRecord.value;
                if (!task || !task.clients) return;

                console.log(`🤖 [TASK] Processando REAP para ${task.clients.length} clientes...`);

                for (const item of task.clients) {
                    try {
                        await runReapProcess(item.id, item.cpf, item.senha_gov, false);
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (err) {
                        console.error(`❌ Erro no REAP:`, err);
                    }
                }

                await supabase.from('system_settings').delete().eq('key', 'reap_sync_task');
            }
        })
        .subscribe();
}

// INICIALIZAÇÃO
app.listen(PORT, () => {
    console.log(`\n===================================================`);
    console.log(`🚀 RGP SERVER (SISTEMA) RODANDO NA PORTA ${PORT}`);
    console.log(`===================================================\n`);
    setupRealtimeTerminal();
    startWorkers();
});
