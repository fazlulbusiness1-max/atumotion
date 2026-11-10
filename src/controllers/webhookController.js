const settingModel = require('../models/settingModel');
const messageModel = require('../models/messageModel');
const logModel = require('../models/logModel');
const aiService = require('../services/aiService');
const metaService = require('../services/metaService');

const webhookController = {
    /**
     * Webhook Verification for Meta (GET)
     */
    verify(req, res) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const configuredToken = settingModel.get('meta_verify_token') || 'atumotion_secret_verify_token_2026';

        if (mode === 'subscribe' && token === configuredToken) {
            console.log('[Webhook] Verification succeeded with Meta.');
            logModel.info('WEBHOOK_VERIFIED', 'Meta Webhook verified successfully.');
            return res.status(200).send(challenge);
        } else {
            console.warn('[Webhook] Verification failed. Tokens did not match.');
            logModel.warn('WEBHOOK_VERIFICATION_FAILED', `Received token: ${token}, Expected: ${configuredToken}`);
            return res.sendStatus(403);
        }
    },

    /**
     * Webhook Event Ingestion (POST)
     */
    async handleEvent(req, res) {
        // Return 200 OK immediately to Meta to prevent timeout
        res.status(200).send('EVENT_RECEIVED');

        const body = req.body;
        if (!body || !body.object) return;

        try {
            // 1. WhatsApp Cloud API Payload
            if (body.object === 'whatsapp_business_account') {
                const entry = body.entry?.[0];
                const change = entry?.changes?.[0]?.value;
                const messageObj = change?.messages?.[0];
                const contact = change?.contacts?.[0];

                if (messageObj && messageObj.type === 'text') {
                    const senderId = messageObj.from;
                    const senderName = contact?.profile?.name || 'WhatsApp Customer';
                    const userText = messageObj.text.body;

                    await webhookController.processIncomingMessage({
                        platform: 'whatsapp',
                        senderId,
                        senderName,
                        userText
                    });
                }
            }

            // 2. Facebook Messenger Payload
            else if (body.object === 'page') {
                const entry = body.entry?.[0];
                const messagingEvent = entry?.messaging?.[0];

                if (messagingEvent && messagingEvent.message && messagingEvent.message.text) {
                    // Ignore echo messages sent by the page itself
                    if (messagingEvent.message.is_echo) return;

                    const senderId = messagingEvent.sender.id;
                    const userText = messagingEvent.message.text;

                    await webhookController.processIncomingMessage({
                        platform: 'messenger',
                        senderId,
                        senderName: 'Messenger User',
                        userText
                    });
                }
            }
        } catch (error) {
            console.error('[Webhook] Processing error:', error);
            logModel.error('WEBHOOK_PROCESSING_ERROR', error.message);
        }
    },

    /**
     * Shared logic for processing messages across platforms
     */
    async processIncomingMessage({ platform, senderId, senderName, userText }) {
        logModel.info('INCOMING_MESSAGE', `[${platform}] From ${senderName} (${senderId}): "${userText}"`);

        // Check Human-in-the-Loop status
        const isHandledByAdmin = messageModel.isSenderAdminHandled(senderId);
        const globalHandoff = settingModel.get('human_handoff_active') === 'true';

        if (isHandledByAdmin || globalHandoff) {
            logModel.info('HUMAN_HANDOFF_ACTIVE', `AI reply suppressed for ${senderId} because Admin is handling the conversation.`);
            messageModel.create({
                platform,
                sender_id: senderId,
                sender_name: senderName,
                message_text: userText,
                response_text: '[Suppressed: Human in the loop active]',
                is_admin_handled: 1
            });
            return;
        }

        // Process message with AI & Inventory context
        const aiResponse = await aiService.processMessage(userText, {
            senderName,
            platform,
            senderId
        });

        // Determine image attachment if any suggested products exist
        let imageUrl = null;
        if (aiResponse.suggestedProducts && aiResponse.suggestedProducts.length > 0) {
            imageUrl = aiResponse.suggestedProducts[0].image_url;
        }

        // Dispatch response to customer via Meta API
        if (platform === 'whatsapp') {
            await metaService.sendWhatsAppMessage(senderId, aiResponse.text, imageUrl);
        } else if (platform === 'messenger') {
            await metaService.sendMessengerMessage(senderId, aiResponse.text, imageUrl);
        }

        // Save conversation record in database
        messageModel.create({
            platform,
            sender_id: senderId,
            sender_name: senderName,
            message_text: userText,
            response_text: aiResponse.text,
            is_admin_handled: aiResponse.intent === 'human_handoff' ? 1 : 0
        });
    }
};

module.exports = webhookController;
