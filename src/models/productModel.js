const db = require('../config/database');

const productModel = {
    getAll() {
        return db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    },

    getById(id) {
        return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    },

    getBySku(sku) {
        return db.prepare('SELECT * FROM products WHERE sku = ?').get(sku);
    },

    search(query) {
        const term = `%${query}%`;
        return db.prepare(`
            SELECT * FROM products 
            WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
            ORDER BY id DESC
        `).all(term, term, term);
    },

    getLowStock(threshold = 3) {
        return db.prepare(`
            SELECT * FROM products 
            WHERE stock_quantity <= ? 
            ORDER BY stock_quantity ASC
        `).all(threshold);
    },

    create({ name, sku, description, regular_price, offer_price, stock_quantity, image_url }) {
        const stmt = db.prepare(`
            INSERT INTO products (name, sku, description, regular_price, offer_price, stock_quantity, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            name,
            sku,
            description || '',
            parseFloat(regular_price) || 0,
            offer_price ? parseFloat(offer_price) : null,
            parseInt(stock_quantity, 10) || 0,
            image_url || ''
        );
        return this.getById(result.lastInsertRowid);
    },

    update(id, { name, sku, description, regular_price, offer_price, stock_quantity, image_url }) {
        const stmt = db.prepare(`
            UPDATE products 
            SET name = ?, sku = ?, description = ?, regular_price = ?, offer_price = ?, stock_quantity = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(
            name,
            sku,
            description || '',
            parseFloat(regular_price) || 0,
            offer_price ? parseFloat(offer_price) : null,
            parseInt(stock_quantity, 10) || 0,
            image_url || '',
            id
        );
        return this.getById(id);
    },

    updateStock(id, newStock) {
        const stmt = db.prepare(`
            UPDATE products 
            SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(parseInt(newStock, 10) || 0, id);
        return this.getById(id);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM products WHERE id = ?');
        return stmt.run(id);
    }
};

module.exports = productModel;
