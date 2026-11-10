const db = require('../config/database');

const logModel = {
    getAll(limit = 100) {
        return db.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT ?').all(limit);
    },

    log(level, event, details = '') {
        const stmt = db.prepare(`
            INSERT INTO logs (level, event, details)
            VALUES (?, ?, ?)
        `);
        return stmt.run(level, event, typeof details === 'object' ? JSON.stringify(details) : String(details));
    },

    info(event, details) {
        return this.log('info', event, details);
    },

    warn(event, details) {
        return this.log('warn', event, details);
    },

    error(event, details) {
        return this.log('error', event, details);
    },

    alert(event, details) {
        return this.log('alert', event, details);
    }
};

module.exports = logModel;
