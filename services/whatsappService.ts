
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
    }
};
