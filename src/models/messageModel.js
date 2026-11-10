const db = require('../config/database');

const messageModel = {
    getAll(limit = 50) {
        return db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT ?').all(limit);
    },

    create({ platform, sender_id, sender_name, message_text, response_text, is_admin_handled = 0 }) {
        const stmt = db.prepare(`
            INSERT INTO messages (platform, sender_id, sender_name, message_text, response_text, is_admin_handled)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            platform,
            sender_id,
            sender_name || 'Customer',
            message_text,
            response_text || '',
            is_admin_handled ? 1 : 0
        );
        return db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
    },

    setAdminHandled(senderId, handled = true) {
        const stmt = db.prepare(`
            UPDATE messages 
            SET is_admin_handled = ? 
            WHERE sender_id = ?
        `);
        return stmt.run(handled ? 1 : 0, senderId);
    },

    isSenderAdminHandled(senderId) {
        const row = db.prepare(`
            SELECT is_admin_handled FROM messages 
            WHERE sender_id = ? 
            ORDER BY id DESC LIMIT 1
        `).get(senderId);
        return row ? Boolean(row.is_admin_handled) : false;
    }
};

module.exports = messageModel;
