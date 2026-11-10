const db = require('../config/database');

const settingModel = {
    getAll() {
        const rows = db.prepare('SELECT key, value, updated_at FROM settings').all();
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    },

    get(key) {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    },

    set(key, value) {
        const stmt = db.prepare(`
            INSERT INTO settings (key, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `);
        return stmt.run(key, String(value));
    },

    setMultiple(settingsObj) {
        for (const [key, val] of Object.entries(settingsObj)) {
            if (val !== undefined) {
                this.set(key, val);
            }
        }
        return this.getAll();
    }
};

module.exports = settingModel;
