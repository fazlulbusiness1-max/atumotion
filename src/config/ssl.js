const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const certDir = path.resolve(__dirname, '../../certs');
const keyPath = path.join(certDir, 'server.key');
const certPath = path.join(certDir, 'server.cert');

async function getSSLCredentials() {
    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
    }

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        const key = fs.readFileSync(keyPath, 'utf8');
        const cert = fs.readFileSync(certPath, 'utf8');
        if (key && cert && key.trim().length > 0 && cert.trim().length > 0) {
            return { key, cert };
        }
    }

    // Generate self-signed certificate asynchronously
    console.log('[SSL] Generating new self-signed SSL certificate for local HTTPS...');
    const attrs = [
        { name: 'commonName', value: 'localhost' },
        { name: 'organizationName', value: 'Atumotion AI Server' }
    ];

    const pems = await selfsigned.generate(attrs, {
        days: 365,
        keySize: 2048,
        algorithm: 'sha256'
    });

    fs.writeFileSync(keyPath, pems.private, 'utf8');
    fs.writeFileSync(certPath, pems.cert, 'utf8');

    console.log('[SSL] SSL Certificate successfully generated and saved.');

    return {
        key: pems.private,
        cert: pems.cert
    };
}

module.exports = {
    getSSLCredentials,
    keyPath,
    certPath
};
