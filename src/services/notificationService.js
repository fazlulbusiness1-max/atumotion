const nodemailer = require('nodemailer');
const axios = require('axios');
const settingModel = require('../models/settingModel');
const logModel = require('../models/logModel');

const notificationService = {
    /**
     * Notify Admin via Email and/or WhatsApp
     * @param {string} subject 
     * @param {string} message 
     * @param {object} metaData 
     */
    async notifyAdmin(subject, message, metaData = {}) {
        const settings = settingModel.getAll();
        const results = { email: false, whatsapp: false };

        // 1. Send Email Notification if SMTP configured
        if (settings.admin_email && settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
            try {
                const transporter = nodemailer.createTransporter({
                    host: settings.smtp_host,
                    port: parseInt(settings.smtp_port, 10) || 587,
                    secure: settings.smtp_secure === 'true',
                    auth: {
                        user: settings.smtp_user,
                        pass: settings.smtp_pass
                    }
                });

                await transporter.sendMail({
                    from: `"AI Automation Bot" <${settings.smtp_user}>`,
                    to: settings.admin_email,
                    subject: `[AI Alert] ${subject}`,
                    text: `${message}\n\nTimestamp: ${new Date().toISOString()}\nDetails: ${JSON.stringify(metaData, null, 2)}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #4f46e5; margin-top: 0;">${subject}</h2>
                            <p style="font-size: 16px; color: #334155; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                            <small style="color: #64748b;">Automated alert from your AI Assistant Server at ${new Date().toLocaleString()}</small>
                        </div>
                    `
                });

                results.email = true;
                logModel.info('NOTIFICATION_EMAIL_SENT', `Alert sent to ${settings.admin_email}: ${subject}`);
            } catch (err) {
                console.error('[NotificationService] Email error:', err.message);
                logModel.error('NOTIFICATION_EMAIL_FAILED', `Failed sending email to ${settings.admin_email}: ${err.message}`);
            }
        } else if (settings.admin_email) {
            logModel.warn('NOTIFICATION_EMAIL_SKIPPED', 'Admin email is set but SMTP credentials are incomplete.');
        }

        // 2. Send WhatsApp Notification via Meta API
        if (settings.admin_whatsapp && settings.meta_access_token && settings.meta_phone_number_id) {
            try {
                const cleanPhone = settings.admin_whatsapp.replace(/[^0-9]/g, '');
                const url = `https://graph.facebook.com/v19.0/${settings.meta_phone_number_id}/messages`;

                await axios.post(
                    url,
                    {
                        messaging_product: 'whatsapp',
                        to: cleanPhone,
                        type: 'text',
                        text: {
                            body: `🚨 *[AI Automation Alert]*\n*${subject}*\n\n${message}`
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${settings.meta_access_token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                results.whatsapp = true;
                logModel.info('NOTIFICATION_WHATSAPP_SENT', `WhatsApp alert sent to ${cleanPhone}: ${subject}`);
            } catch (err) {
                console.error('[NotificationService] WhatsApp alert error:', err.response?.data || err.message);
                logModel.error('NOTIFICATION_WHATSAPP_FAILED', `WhatsApp alert failed: ${err.message}`);
            }
        }

        // Always log the alert event for the web dashboard live feed
        logModel.alert(subject, `${message} ${JSON.stringify(metaData)}`);

        return results;
    }
};

module.exports = notificationService;
