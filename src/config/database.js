const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../../');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.resolve(dataDir, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize Tables
function initDatabase() {
    // 1. Settings Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Products / Inventory Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            description TEXT,
            regular_price REAL NOT NULL,
            offer_price REAL,
            stock_quantity INTEGER NOT NULL DEFAULT 0,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. Messages History Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL, -- 'whatsapp' | 'messenger' | 'simulator'
            sender_id TEXT NOT NULL,
            sender_name TEXT,
            message_text TEXT NOT NULL,
            response_text TEXT,
            is_admin_handled INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 4. System Logs Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL, -- 'info' | 'warn' | 'error' | 'alert'
            event TEXT NOT NULL,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    seedDefaultSettings();
    seedSampleProducts();
}

const crypto = require('crypto');

function hashPassword(password, salt = 'atumotion_secure_salt_2026') {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function seedDefaultSettings() {
    const defaultSettings = [
        { key: 'admin_username', value: 'admin' },
        { key: 'admin_password', value: hashPassword('admin123') },
        { key: 'gemini_api_key', value: '' },
        { key: 'meta_verify_token', value: 'atumotion_secret_verify_token_2026' },
        { key: 'meta_access_token', value: '' },
        { key: 'meta_phone_number_id', value: '' },
        { key: 'meta_page_id', value: '' },
        { key: 'admin_email', value: '' },
        { key: 'admin_whatsapp', value: '' },
        { key: 'smtp_host', value: 'smtp.gmail.com' },
        { key: 'smtp_port', value: '587' },
        { key: 'smtp_user', value: '' },
        { key: 'smtp_pass', value: '' },
        { key: 'smtp_secure', value: 'false' },
        { key: 'low_stock_threshold', value: '3' },
        { key: 'human_handoff_active', value: 'false' },
        { key: 'ai_model', value: 'gemini-1.5-flash' },
        {
            key: 'system_prompt',
            value: `You are an intelligent, friendly, and polite 24/7 AI Customer Support & Sales Assistant for our business.
Your goals:
1. Greet customers warmly and answer questions about products, prices, and policies.
2. Check real-time inventory from the database. If a customer asks about a product, provide its name, regular price, offer price (if available), and current stock availability.
3. If an item is out of stock or low in stock, apologize politely and inform them that restocking is in progress.
4. When a customer wants to place an order, politely collect their: Full Name, Phone Number, Delivery Address, and Desired Product/Quantity.
5. If the customer asks for a human agent or asks a complex policy question you are not sure about, politely state: "I am connecting you with our human support team right away. They will reach out to you shortly."
6. Maintain a professional, polite, and helpful tone at all times. Support both Bengali and English based on the customer's language.`
        }
    ];

    const checkStmt = db.prepare('SELECT key FROM settings WHERE key = ?');
    const insertStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

    for (const item of defaultSettings) {
        const existing = checkStmt.get(item.key);
        if (!existing) {
            insertStmt.run(item.key, item.value);
        }
    }
}

function seedSampleProducts() {
    const countQuery = db.prepare('SELECT COUNT(*) as count FROM products');
    const row = countQuery.get();
    if (row && row.count === 0) {
        const insertProduct = db.prepare(`
            INSERT INTO products (name, sku, description, regular_price, offer_price, stock_quantity, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        insertProduct.run(
            'Wireless Noise Cancelling Headphones',
            'TECH-001',
            'Premium wireless over-ear headphones with active noise cancellation and 40h battery life.',
            120.00,
            99.00,
            15,
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'
        );

        insertProduct.run(
            'Smart Fitness Watch v2',
            'TECH-002',
            'Waterproof fitness tracker with heart rate monitor, AMOLED display, and sleep tracking.',
            65.00,
            49.99,
            8,
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
        );

        insertProduct.run(
            'Minimalist Mechanical Keyboard',
            'TECH-003',
            'Compact RGB mechanical gaming & typing keyboard with tactile switches.',
            85.00,
            75.00,
            2, // Low stock example
            'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500'
        );
    }
}

// Call on import
initDatabase();

module.exports = db;
