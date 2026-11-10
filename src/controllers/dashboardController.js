const settingModel = require('../models/settingModel');
const productModel = require('../models/productModel');
const messageModel = require('../models/messageModel');
const logModel = require('../models/logModel');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');

const crypto = require('crypto');

function hashPassword(password, salt = 'atumotion_secure_salt_2026') {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const dashboardController = {
    // 0. Authentication
    login(req, res) {
        try {
            const { username, password } = req.body;
            const storedUser = settingModel.get('admin_username') || 'admin';
            const storedPassHash = settingModel.get('admin_password');

            const inputHash = hashPassword(password || '');

            if (username === storedUser && inputHash === storedPassHash) {
                // Generate simple session token
                const token = crypto.randomBytes(32).toString('hex');
                settingModel.set('current_session_token', token);
                logModel.info('ADMIN_LOGIN_SUCCESS', `Admin logged in successfully as ${username}`);
                return res.json({ success: true, token, username });
            } else {
                logModel.warn('ADMIN_LOGIN_FAILED', `Failed login attempt for username: ${username}`);
                return res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    changeCredentials(req, res) {
        try {
            const { currentPassword, newUsername, newPassword } = req.body;
            const storedPassHash = settingModel.get('admin_password');
            const inputCurrentHash = hashPassword(currentPassword || '');

            if (inputCurrentHash !== storedPassHash) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
            }

            if (newUsername && newUsername.trim()) {
                settingModel.set('admin_username', newUsername.trim());
            }

            if (newPassword && newPassword.trim()) {
                if (newPassword.trim().length < 6) {
                    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
                }
                settingModel.set('admin_password', hashPassword(newPassword.trim()));
            }

            logModel.info('CREDENTIALS_CHANGED', 'Admin updated username or password.');
            res.json({ success: true, message: 'Username/Password updated successfully!' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // 1. Dashboard Statistics
    getStats(req, res) {
        try {
            const products = productModel.getAll();
            const threshold = parseInt(settingModel.get('low_stock_threshold'), 10) || 3;
            const lowStockProducts = products.filter(p => p.stock_quantity <= threshold);
            const messages = messageModel.getAll(500);
            const settings = settingModel.getAll();

            const stats = {
                totalProducts: products.length,
                lowStockCount: lowStockProducts.length,
                totalMessages: messages.length,
                humanHandoffCount: messages.filter(m => m.is_admin_handled === 1).length,
                hasGeminiKey: Boolean(settings.gemini_api_key && settings.gemini_api_key.trim().length > 10),
                hasMetaToken: Boolean(settings.meta_access_token && settings.meta_access_token.trim().length > 10),
                adminEmail: settings.admin_email || 'Not configured',
                adminWhatsApp: settings.admin_whatsapp || 'Not configured'
            };

            res.json({ success: true, stats });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // 2. Settings Management
    getSettings(req, res) {
        try {
            const settings = settingModel.getAll();
            // Mask critical secrets slightly for display safety
            const safeSettings = { ...settings };
            if (safeSettings.smtp_pass) safeSettings.smtp_pass_set = true;
            res.json({ success: true, settings: safeSettings });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    saveSettings(req, res) {
        try {
            const updates = req.body;
            settingModel.setMultiple(updates);
            logModel.info('SETTINGS_UPDATED', 'Admin updated system configuration settings.');
            res.json({ success: true, message: 'Settings saved successfully!' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // 3. Products Management
    getProducts(req, res) {
        try {
            const products = productModel.getAll();
            res.json({ success: true, products });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    addProduct(req, res) {
        try {
            const { name, sku, description, regular_price, offer_price, stock_quantity, image_url } = req.body;
            if (!name || !sku || regular_price === undefined) {
                return res.status(400).json({ success: false, message: 'Name, SKU, and Regular Price are required.' });
            }
            const product = productModel.create({
                name,
                sku,
                description,
                regular_price,
                offer_price,
                stock_quantity,
                image_url
            });
            logModel.info('PRODUCT_ADDED', `Product added: ${name} (SKU: ${sku}) with ${stock_quantity} stock.`);
            res.json({ success: true, product });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    updateProduct(req, res) {
        try {
            const { id } = req.params;
            const updated = productModel.update(id, req.body);
            logModel.info('PRODUCT_UPDATED', `Product ID ${id} was updated.`);
            res.json({ success: true, product: updated });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    deleteProduct(req, res) {
        try {
            const { id } = req.params;
            productModel.delete(id);
            logModel.info('PRODUCT_DELETED', `Product ID ${id} was deleted.`);
            res.json({ success: true, message: 'Product deleted successfully.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // 4. Conversation History & Human Handoff
    getMessages(req, res) {
        try {
            const messages = messageModel.getAll(100);
            res.json({ success: true, messages });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    toggleHandoff(req, res) {
        try {
            const { senderId, status } = req.body;
            messageModel.setAdminHandled(senderId, status);
            logModel.info('HANDOFF_TOGGLED', `Admin handoff for ${senderId} set to: ${status}`);
            res.json({ success: true, message: `Handoff updated for ${senderId}` });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // 5. Activity Logs
    getLogs(req, res) {
        try {
            const logs = logModel.getAll(100);
            res.json({ success: true, logs });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // 6. Live Bot Simulator
    async simulateChat(req, res) {
        try {
            const { message, customerName } = req.body;
            if (!message) {
                return res.status(400).json({ success: false, message: 'Message text is required.' });
            }

            const name = customerName || 'Test Customer';
            const aiResponse = await aiService.processMessage(message, {
                senderName: name,
                platform: 'Simulator',
                senderId: 'sim-001'
            });

            // Save simulator message for log view
            messageModel.create({
                platform: 'simulator',
                sender_id: 'sim-001',
                sender_name: name,
                message_text: message,
                response_text: aiResponse.text,
                is_admin_handled: aiResponse.intent === 'human_handoff' ? 1 : 0
            });

            res.json({
                success: true,
                reply: aiResponse.text,
                intent: aiResponse.intent,
                suggestedProducts: aiResponse.suggestedProducts
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // 7. Test Admin Notification
    async testNotification(req, res) {
        try {
            const result = await notificationService.notifyAdmin(
                'Test Notification from AI Dashboard',
                'This is a verification test to confirm your Email and WhatsApp notification channels are operating properly.',
                { test: true }
            );
            res.json({ success: true, result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

module.exports = dashboardController;
