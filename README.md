# Atumotion AI - WhatsApp & Messenger Automation Agent & Webhook Hub

A production-grade, 24/7 AI Customer Support and Sales Agent with real-time SQLite inventory management, Meta (WhatsApp & Messenger) Webhook integration, and a sleek web dashboard.

---

## 🌟 Features

- **24/7 AI Sales & Customer Support:** Powered by Google Gemini Flash (with custom persona and system prompt configuration).
- **Real-Time Inventory Tracking:** Checks live stock levels, regular vs. offer prices, product images, and auto-deducts stock.
- **Meta Platform Integration:** Built-in Webhook verification and message handlers for WhatsApp Cloud API & Facebook Messenger.
- **Human-in-the-Loop (Handoff):** Detects customer requests for human assistance, notifies the admin, and suppresses AI replies to prevent conflicting answers.
- **Emergency Admin Alerts:** Instant notifications via WhatsApp and Email (SMTP) when stock runs low (e.g. $\le 3$ items remaining) or when human assistance is requested.
- **Secured Web Dashboard:** Protected with credentials, enabling real-time product management, prompt fine-tuning, API key rotation, event audit logs, and an interactive live chat simulator.
- **Dual Protocol Support:** Runs HTTP (port 3000) and HTTPS with self-signed SSL (port 8443) out of the box.

---

## 🚀 Quick Start (Local)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Application:**
   ```bash
   npm start
   ```

3. **Open the Dashboard:**
   - Standard HTTP: `http://localhost:3000`
   - Secure HTTPS: `https://localhost:8443`

4. **Default Admin Credentials:**
   - **Username:** `admin`
   - **Password:** `admin123`
   *(Can be changed anytime under "Account Security" in the dashboard)*

---

## 🔒 Security Best Practices

- All database files (`*.sqlite`), environment secrets (`.env`), and SSL keys (`certs/`) are excluded via `.gitignore`.
- API keys, access tokens, and passwords are encrypted and managed dynamically in SQLite or environment variables.
