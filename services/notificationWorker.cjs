const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Notification Worker Service (Rule 2)
 * Polls the notification_queue for pending messages and sends them via WhatsApp.
 */
async function startNotificationWorker(client) {
    console.log('👷 [WORKER] Iniciando Worker de Notificações...');

    setInterval(async () => {
        try {
            // 1. Buscar notificações pendentes
            const { data: pending, error } = await supabase
                .from('notification_queue')
                .select('*')
                .eq('status', 'pendente')
                .lte('scheduled_for', new Date().toISOString())
                .order('created_at', { ascending: true })
                .limit(5);

            if (error) throw error;
            if (!pending || pending.length === 0) return;

            console.log(`📭 [WORKER] Processando ${pending.length} notificações pendentes...`);

            for (const item of pending) {
                try {
                    // 2. Buscar telefone do cliente
                    const { data: clientRecord } = await supabase
                        .from('clients')
                        .select('telefone')
                        .eq('id', item.client_id)
                        .single();

                    const phone = clientRecord?.telefone?.replace(/\D/g, '');
                    if (!phone) {
                        throw new Error('Cliente sem telefone cadastrado');
                    }

                    const jid = `55${phone}@c.us`; // Formato padrão para o WPPConnect no Brasil

                    // 3. Simular/Enviar via WhatsApp
                    console.log(`📤 [WORKER] Enviando para ${jid}: "${item.message.slice(0, 30)}..."`);

                    // placeholder do usuário: await whatsappApi.send(phone, message)
                    // No nosso caso (bot.cjs), o 'client' é a instância do WPPConnect
                    await client.sendText(jid, item.message);

                    // 4. Marcar como enviado e salvar a Raw Message (Regra de Auditoria)
                    await supabase
                        .from('notification_queue')
                        .update({
                            status: 'enviado',
                            sent_at: new Date().toISOString(),
                            raw_message: item.message, // Auditoria: texto exato enviado
                            error_log: null
                        })
                        .eq('id', item.id);

                    console.log(`✅ [WORKER] Notificação ${item.id} enviada com sucesso.`);

                } catch (sendError) {
                    console.error(`❌ [WORKER] Erro ao enviar notificação ${item.id}:`, sendError.message);

                    // Marcar erro para não travar a fila
                    await supabase
                        .from('notification_queue')
                        .update({
                            status: 'erro',
                            error_log: sendError.message
                        })
                        .eq('id', item.id);
                }
            }
        } catch (err) {
            console.error('⚠️ [WORKER] Erro no loop de notificações:', err.message);
        }
    }, 15000); // Poll a cada 15 segundos
}

module.exports = { startNotificationWorker };
