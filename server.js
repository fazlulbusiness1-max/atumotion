const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Initialize DB and SSL
require('./src/config/database');
const { getSSLCredentials } = require('./src/config/ssl');

// Import Routes
const webhookRoutes = require('./src/routes/webhookRoutes');
const apiRoutes = require('./src/routes/apiRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend Dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Mount Webhook Routes (Supports both /webhook and /api/webhook for Meta compatibility)
app.use('/webhook', webhookRoutes);
app.use('/api/webhook', webhookRoutes);

// Mount API Routes for Dashboard
app.use('/api', apiRoutes);

// Fallback to Dashboard
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Port configuration
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

async function startServer() {
    // 1. Start HTTP Server
    const httpServer = http.createServer(app);
    httpServer.listen(HTTP_PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 [HTTP Server] Running at: http://localhost:${HTTP_PORT}`);
        console.log(`📊 [Dashboard] Open in browser: http://localhost:${HTTP_PORT}`);
        console.log(`🔗 [Webhook Endpoint]: http://localhost:${HTTP_PORT}/webhook`);
        console.log(`======================================================`);
    });

    // 2. Start HTTPS / SSL Server
    try {
        const sslCredentials = await getSSLCredentials();
        const httpsServer = https.createServer(sslCredentials, app);
        httpsServer.listen(HTTPS_PORT, () => {
            console.log(`🔒 [HTTPS / SSL Server] Running at: https://localhost:${HTTPS_PORT}`);
            console.log(`🛡️  [Secure Webhook]: https://localhost:${HTTPS_PORT}/webhook`);
            console.log(`======================================================\n`);
        });
    } catch (sslErr) {
        console.warn(`[SSL Warning] Could not start HTTPS listener: ${sslErr.message}`);
    }
}

startServer();

module.exports = app;
