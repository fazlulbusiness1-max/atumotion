const axios = require('axios');
const settingModel = require('../models/settingModel');
const logModel = require('../models/logModel');

const metaService = {
    /**
     * Send WhatsApp Message via Meta Cloud API
     * @param {string} to - Recipient phone number with country code
     * @param {string} text - Message text
     * @param {string} imageUrl - Optional image attachment URL
     */
    async sendWhatsAppMessage(to, text, imageUrl = null) {
        const settings = settingModel.getAll();
        const accessToken = settings.meta_access_token?.trim();
        const phoneNumberId = settings.meta_phone_number_id?.trim();

        if (!accessToken || !phoneNumberId) {
            logModel.warn('WHATSAPP_CONFIG_MISSING', 'Meta Access Token or Phone Number ID is missing in settings.');
            return { success: false, reason: 'Credentials not configured' };
        }

        const cleanTo = to.replace(/[^0-9]/g, '');
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

        try {
            // If image is present, send image message with caption
            if (imageUrl) {
                await axios.post(
                    url,
                    {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: cleanTo,
                        type: 'image',
                        image: {
                            link: imageUrl,
                            caption: text
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } else {
                await axios.post(
                    url,
                    {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: cleanTo,
                        type: 'text',
                        text: { body: text }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            }

            logModel.info('WHATSAPP_MESSAGE_SENT', `Reply successfully sent to ${cleanTo}`);
            return { success: true };
        } catch (err) {
            const errorData = err.response?.data || err.message;
            console.error('[MetaService] WhatsApp API Error:', errorData);
            logModel.error('WHATSAPP_SEND_FAILED', `Failed to send to ${cleanTo}: ${JSON.stringify(errorData)}`);
            return { success: false, error: errorData };
        }
    },

    /**
     * Send Messenger Message via Facebook Graph API
     * @param {string} recipientId - PSID of recipient
     * @param {string} text - Message text
     * @param {string} imageUrl - Optional image URL
     */
    async sendMessengerMessage(recipientId, text, imageUrl = null) {
        const settings = settingModel.getAll();
        const accessToken = settings.meta_access_token?.trim();

        if (!accessToken) {
            logModel.warn('MESSENGER_CONFIG_MISSING', 'Meta Access Token is missing in settings.');
            return { success: false, reason: 'Token not configured' };
        }

        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`;

        try {
            const messagePayload = { text };
            if (imageUrl) {
                messagePayload.attachment = {
                    type: 'image',
                    payload: {
                        url: imageUrl,
                        is_reusable: true
                    }
                };
            }

            await axios.post(
                url,
                {
                    recipient: { id: recipientId },
                    message: messagePayload
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            logModel.info('MESSENGER_MESSAGE_SENT', `Reply sent to PSID: ${recipientId}`);
            return { success: true };
        } catch (err) {
            const errorData = err.response?.data || err.message;
            console.error('[MetaService] Messenger API Error:', errorData);
            logModel.error('MESSENGER_SEND_FAILED', `Failed to send to ${recipientId}: ${JSON.stringify(errorData)}`);
            return { success: false, error: errorData };
        }
    }
};

module.exports = metaService;
