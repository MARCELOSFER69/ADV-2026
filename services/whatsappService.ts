
/**
 * WhatsApp Service
 * 
 * Integrates with a WhatsApp Gateway (recommended: Evolution API)
 * You will need:
 * - Base URL (e.g., https://api.suaempresa.com)
 * - Instance Name (e.g., advocacia_noleto)
 * - API Key
 */

const WHATSAPP_CONFIG = {
    baseUrl: '', // Fill with Gateway URL
    instance: '',
    apiKey: ''
};

export const whatsappService = {
    /**
     * Sends a text message via WhatsApp Gateway
     */
    async sendMessage(remoteJid: string, text: string) {
        if (!WHATSAPP_CONFIG.baseUrl || !WHATSAPP_CONFIG.apiKey) {
            console.warn('WhatsApp API not configured. Message not sent externaly.');
            return null;
        }

        try {
            const response = await fetch(
                `${WHATSAPP_CONFIG.baseUrl}/message/sendText/${WHATSAPP_CONFIG.instance}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': WHATSAPP_CONFIG.apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        number: remoteJid,
                        text: text,
                        delay: 1200,
                        linkPreview: true
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`WhatsApp API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            throw error;
        }
    },

    /**
     * Formats a phone number to WhatsApp JID format
     */
    formatToJid(phone: string) {
        const cleanNumber = phone.replace(/\D/g, '');
        if (cleanNumber.length < 10) return null;
        return `${cleanNumber}@s.whatsapp.net`;
    },

    channel: null as ReturnType<typeof supabase.channel> | null,

    /**
     * Initializes Realtime listener for new notifications
     */
    initialize() {
        if (this.channel) return;

        console.log('[WhatsApp] Initializing Realtime Service...');

        // 1. Process any pending notifications on startup (Catch-up)
        this.processPendingNotifications();

        // 2. Listen for new INSERTs
        this.channel = supabase
            .channel('whatsapp-queue-listener')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notification_queue' },
                async (payload) => {
                    console.log('[WhatsApp] New notification received:', payload.new);
                    await this.processSingleNotification(payload.new);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[WhatsApp] Realtime connected.');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[WhatsApp] Realtime connection error. Retrying in 5s...');
                    setTimeout(() => {
                        this.channel = null;
                        this.initialize();
                    }, 5000);
                } else if (status === 'TIMED_OUT') {
                    console.error('[WhatsApp] Realtime timed out. Retrying...');
                    this.channel = null;
                    this.initialize();
                }
            });
    },

    /**
     * Legacy method renamed to processPending - calls single processor in loop
     */
    async processPendingNotifications() {
        try {
            const { automationService } = await import('./automationService');
            const pending = await automationService.getNotifications('pendente');

            console.log(`[WhatsApp] Processing ${pending.length} pending notifications...`);

            for (const notification of pending) {
                await this.processSingleNotification(notification);
            }
        } catch (e) {
            console.error('[WhatsApp] Error processing pending:', e);
        }
    },

    /**
     * Process a single notification (Shared logic)
     */
    async processSingleNotification(notification: any) {
        // Prevent double processing if status changed in meantime (optional check)
        if (notification.status !== 'pendente') return;

        try {
            const { automationService } = await import('./automationService');

            // Fetch client phone
            const { data: client } = await supabase.from('clients').select('telefone_whatsapp').eq('id', notification.client_id).single();
            const jid = client?.telefone_whatsapp ? this.formatToJid(client.telefone_whatsapp) : null;

            if (jid) {
                await this.sendMessage(jid, notification.message);
                await automationService.updateNotificationStatus(notification.id!, 'enviado');
                console.log(`[WhatsApp] Message sent to ${jid}`);
            } else {
                await automationService.updateNotificationStatus(notification.id!, 'erro', 'Telefone inválido ou não encontrado.');
                console.warn(`[WhatsApp] Invalid phone for client ${notification.client_id}`);
            }
        } catch (err: any) {
            console.error(`[WhatsApp] Failed to send notification ${notification.id}:`, err);
            const { automationService } = await import('./automationService');
            await automationService.updateNotificationStatus(notification.id!, 'erro', err.message);
        }
    }
};

import { supabase } from './supabaseClient';
