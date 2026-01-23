require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cron = require('node-cron');
const dns = require('node:dns');
const { startGovBrRecovery } = require('./services/govbrAutomation.cjs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
        - OUTRO (saudações como 'oi', 'olá', endereços, ou dúvidas gerais)

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

    // A. Garantir que a tabela existe (Auto-migração)
    try {
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS system_settings (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value JSONB DEFAULT '{}'::jsonb,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `;
        const { error: sqlError } = await supabase.rpc('run_sql', { sql: createTableSql });
        if (sqlError) console.warn('⚠️ Aviso ao criar tabela (pode já existir ou sem permissão):', sqlError.message);
        else console.log('✅ Tabela system_settings verificada/criada.');
    } catch (err) {
        console.warn('⚠️ Erro ao tentar criar tabela system_settings:', err.message);
    }

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
            console.error('❌ Erro Conexão Heartbeat:', e.message);
        }
    }, 30000);

    // 2. Escutar Comandos (Realtime)
    supabase.channel('bot-commands')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings', filter: `key=eq.${BOT_CONTROL_KEY}` }, payload => {
            const cmd = payload.new.value?.command;
            if (cmd === 'restart') {
                console.log('🔄 Recebido comando de REINICIAR via painel!');
                exec('pm2 restart clara-bot', (err) => {
                    if (err) console.error('Erro ao reiniciar via PM2:', err);
                });
            } else if (cmd === 'stop') {
                console.log('🛑 Recebido comando de PARAR via painel!');
                exec('pm2 stop clara-bot', (err) => {
                    if (err) console.error('Erro ao parar via PM2:', err);
                });
            }

            // Capturar atualizações de configuração
            if (payload.new.value?.config) {
                botConfig = { ...botConfig, ...payload.new.value.config };
                console.log('⚙️ Configuração do bot atualizada:', botConfig);
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
            console.error('❌ Erro Conexão Logs:', e.message);
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
    session: 'adv-bot',
    headless: true,
    logQR: true,
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
        if (intencao) console.log(`🧠 IA classificou para ${chatAtivo?.client_name}: ${intencao}`);

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

        // --- 2. VERIFICAÇÃO DE PENDÊNCIA PROATIVA (DISPARO INICIAL) ---
        if (chatAtivo?.client_id) {
            console.log(`🔍 Verificando pendências para ID: ${chatAtivo.client_id}`);
            const { data: cliente } = await supabase.from('clients').select('pendencias').eq('id', chatAtivo.client_id).single();
            console.log(`📋 Pendências encontradas:`, cliente?.pendencias);

            if (cliente?.pendencias?.some(p => p.toLowerCase().includes('senha')) && !isAprovacao && !isSolicitacaoNubank) {
                const responsePendencia = `Olá, *${chatAtivo.client_name}*! ⚖️ Notei aqui que ainda temos aquela pendência da sua *senha do gov.br*.\n\nVocê teria um momento agora para resolvermos? Se você tiver conta no *Nubank*, eu consigo gerar um link para você recuperar rapidinho pelo celular.`;
                await client.sendText(userPhone, responsePendencia);
                await sincronizarComPainel(userPhone, responsePendencia, 'user', 'Clara (Bot)');
                return; // Interrompe para focar na pendência
            }
        }

        // --- 3. LÓGICA DE RESPOSTAS AUTOMÁTICAS (Menu Simples) ---
        let response = "";

        if (['oi', 'ola', 'olá', 'bom dia', 'boa tarde'].some(t => textLower.startsWith(t))) {
            response = `⚖️ *Olá! Sou a Clara, assistente do Escritório Noleto & Macedo.*\n\nComo posso ajudar você hoje?\n\n1️⃣ *Consultar Processo*\n2️⃣ Falar com Advogado\n3️⃣ Nossos Endereços\n\n_Dica: Se quiser consultar seu processo, basta digitar seu CPF aqui mesmo._`;
        } else if (textLower === '1' || intencao === 'CONSULTAR_PROCESSO') {
            response = `🏛️ *Consulta Processual*\n\nPara ver o status atual de seus processos em tempo real, acesse:\n🔗 ${SITE_URL}/consulta\n\n_Ou digite seu CPF aqui no chat agora mesmo para uma busca rápida._`;
        } else if (textLower === '2' || textLower === 'falar com advogado' || intencao === 'FALAR_ADVOGADO') {
            response = '👨‍⚖️ Perfeito. Notifiquei um de nossos advogados sobre seu contato. Por favor, aguarde o retorno por aqui em breve.';
        } else if (textLower === '3' || textLower.includes('endereço')) {
            response = '📍 *Nossa Localização:*\n\n🏢 *Matriz Santa Inês:*\nRua do Comércio, 123 - Centro\n\n🕒 *Horário:* Segunda a Sexta, 08h às 18h.';
        } else if (textLower.replace(/\D/g, '').length === 11) {
            // DETECTOU CPF (11 dígitos)
            const cpfLimpo = textLower.replace(/\D/g, '');
            const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

            await client.sendText(userPhone, `🔍 Consultando processos para o CPF ${cpfFormatado}...`);

            try {
                // Busca cliente pelo CPF
                let { data: clients } = await supabase.from('clients').select('id, nome_completo').ilike('cpf_cnpj', `%${cpfLimpo.slice(0, 3)}%`).limit(1);
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
function iniciarAgendadores(client) {
    // Relatório Financeiro Matinal (08:00)
    cron.schedule('0 8 * * *', async () => {
        await enviarRelatorioFinanceiro(client);
    });

    // Cobrança de documentos pendentes (Segunda a Sexta às 10h, 14h e 16h)
    cron.schedule('0 10,14,16 * * 1-5', async () => {
        await cobrarPendenciasClientes(client);
    });
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
