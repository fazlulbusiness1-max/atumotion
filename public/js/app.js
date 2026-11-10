// Atumotion AI Dashboard Client Controller

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    loadDashboardStats();
    loadSettings();
    loadProducts();
    loadLogs();
    setupEventHandlers();
});

// 0. Auth Logic
function checkAuth() {
    const token = localStorage.getItem('atumotion_token');
    const loginModal = document.getElementById('modal-login');
    if (!token) {
        if (loginModal) loginModal.classList.add('active');
    } else {
        if (loginModal) loginModal.classList.remove('active');
    }
}

function logout() {
    localStorage.removeItem('atumotion_token');
    showToast('Logged out successfully.', 'info');
    setTimeout(() => {
        window.location.reload();
    }, 500);
}

function openCredentialsModal() {
    document.getElementById('modal-credentials').classList.add('active');
}

function closeCredentialsModal() {
    document.getElementById('modal-credentials').classList.remove('active');
}

// 1. Navigation & Tabs
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    document.getElementById('btn-refresh').addEventListener('click', () => {
        loadDashboardStats();
        loadSettings();
        loadProducts();
        loadLogs();
        showToast('Data refreshed successfully', 'info');
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');

    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeNav) activeNav.classList.add('active');

    const targetSection = document.getElementById(`tab-${tabId}`);
    if (targetSection) targetSection.style.display = 'block';

    // Update Top Titles
    const titles = {
        overview: { title: 'Overview Dashboard', subtitle: 'Real-time status of your AI sales assistant, inventory, and Meta webhooks.' },
        credentials: { title: 'API & Platform Credentials', subtitle: 'Manage Gemini AI API keys, Meta access tokens, and Webhook security.' },
        prompt: { title: 'AI System Prompt & Persona', subtitle: 'Customize the instructions, business guidelines, and language tone for the AI.' },
        inventory: { title: 'Inventory & Product Showcase', subtitle: 'Manage real-time product catalog, pricing, and stock quantities.' },
        notifications: { title: 'Admin Emergency Notification Channels', subtitle: 'Configure email and WhatsApp numbers to receive low stock & handoff alerts.' },
        simulator: { title: 'Interactive Live Bot Simulator', subtitle: 'Simulate customer conversations and test real-time stock answers.' },
        logs: { title: 'Event Audit Trail & History', subtitle: 'Inspect webhook events, AI decisions, handoffs, and error logs.' }
    };

    if (titles[tabId]) {
        document.getElementById('section-title').textContent = titles[tabId].title;
        document.getElementById('section-subtitle').textContent = titles[tabId].subtitle;
    }
}

// 2. Load Stats
async function loadDashboardStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success) {
            const s = data.stats;
            document.getElementById('stat-products').textContent = s.totalProducts;
            document.getElementById('stat-low-stock').textContent = s.lowStockCount;
            document.getElementById('stat-messages').textContent = s.totalMessages;

            const aiStatusEl = document.getElementById('stat-ai-status');
            if (s.hasGeminiKey) {
                aiStatusEl.textContent = 'Active (Gemini)';
                aiStatusEl.style.color = 'var(--success)';
            } else {
                aiStatusEl.textContent = 'Local Fallback (No Key)';
                aiStatusEl.style.color = 'var(--warning)';
            }
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// 3. Load Settings
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) {
            const s = data.settings;
            // API Credentials
            if (s.gemini_api_key) document.getElementById('input-gemini-key').value = s.gemini_api_key;
            if (s.ai_model) document.getElementById('input-ai-model').value = s.ai_model;
            if (s.meta_verify_token) {
                document.getElementById('input-verify-token').value = s.meta_verify_token;
                document.getElementById('overview-verify-token').value = s.meta_verify_token;
            }
            if (s.meta_access_token) document.getElementById('input-access-token').value = s.meta_access_token;
            if (s.meta_phone_number_id) document.getElementById('input-phone-id').value = s.meta_phone_number_id;
            if (s.meta_page_id) document.getElementById('input-page-id').value = s.meta_page_id;

            // System Prompt
            if (s.system_prompt) document.getElementById('input-system-prompt').value = s.system_prompt;

            // Admin Notifications
            if (s.admin_whatsapp) document.getElementById('input-admin-whatsapp').value = s.admin_whatsapp;
            if (s.admin_email) document.getElementById('input-admin-email').value = s.admin_email;
            if (s.low_stock_threshold) document.getElementById('input-stock-threshold').value = s.low_stock_threshold;
            if (s.smtp_host) document.getElementById('input-smtp-host').value = s.smtp_host;
            if (s.smtp_port) document.getElementById('input-smtp-port').value = s.smtp_port;
            if (s.smtp_user) document.getElementById('input-smtp-user').value = s.smtp_user;

            // Update overview webhook url
            const currentHost = window.location.host;
            const protocol = window.location.protocol;
            document.getElementById('overview-webhook-url').value = `${protocol}//${currentHost}/webhook`;
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
}

// 4. Load Products
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
            const tbody = document.getElementById('products-table-body');
            tbody.innerHTML = '';

            if (data.products.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No products found in database. Click "+ Add New Product" to add one!</td></tr>`;
                return;
            }

            data.products.forEach(p => {
                let badgeClass = 'badge-success';
                let statusLabel = 'In Stock';
                if (p.stock_quantity === 0) {
                    badgeClass = 'badge-danger';
                    statusLabel = 'Out of Stock';
                } else if (p.stock_quantity <= 3) {
                    badgeClass = 'badge-warning';
                    statusLabel = 'Low Stock';
                }

                const imgHtml = p.image_url 
                    ? `<img src="${p.image_url}" alt="${p.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: var(--radius-sm);">` 
                    : `<div style="width: 40px; height: 40px; background: rgba(255,255,255,0.05); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">📦</div>`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${imgHtml}</td>
                    <td><strong>${p.name}</strong><br><small style="color: var(--text-muted);">${p.description ? p.description.substring(0, 45) + '...' : ''}</small></td>
                    <td><code>${p.sku}</code></td>
                    <td>$${parseFloat(p.regular_price).toFixed(2)}</td>
                    <td>${p.offer_price ? `<span style="color: var(--success); font-weight: 700;">$${parseFloat(p.offer_price).toFixed(2)}</span>` : '<span style="color: var(--text-muted);">-</span>'}</td>
                    <td><strong>${p.stock_quantity}</strong></td>
                    <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Edit</button>
                        <button class="btn btn-secondary btn-sm" style="color: var(--danger); margin-left: 6px;" onclick="deleteProduct(${p.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Failed to load products:', err);
    }
}

// 5. Load Logs
async function loadLogs() {
    try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        if (data.success) {
            const tbody = document.getElementById('logs-table-body');
            tbody.innerHTML = '';

            if (data.logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">No event logs yet.</td></tr>`;
                return;
            }

            data.logs.forEach(log => {
                let badgeClass = 'badge-info';
                if (log.level === 'warn') badgeClass = 'badge-warning';
                if (log.level === 'error') badgeClass = 'badge-danger';
                if (log.level === 'alert') badgeClass = 'badge-danger';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color: var(--text-muted); font-size: 11px;">${new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td><span class="badge ${badgeClass}">${log.level.toUpperCase()}</span></td>
                    <td><code>${log.event}</code></td>
                    <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); max-width: 400px; word-break: break-all;">${log.details || ''}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Failed to load logs:', err);
    }
}

// 6. Event Handlers
function setupEventHandlers() {
    // Form: Login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('atumotion_token', data.token);
                    document.getElementById('modal-login').classList.remove('active');
                    showToast('Logged in successfully as ' + data.username, 'success');
                    loadDashboardStats();
                    loadSettings();
                } else {
                    showToast(data.message || 'Invalid credentials', 'error');
                }
            } catch (err) {
                showToast('Login request failed', 'error');
            }
        });
    }

    // Form: Account Security
    const formSec = document.getElementById('form-account-security');
    if (formSec) {
        formSec.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('sec-current-pass').value;
            const newUsername = document.getElementById('sec-new-user').value.trim();
            const newPassword = document.getElementById('sec-new-pass').value;

            try {
                const res = await fetch('/api/auth/change-credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newUsername, newPassword })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Credentials updated successfully!', 'success');
                    closeCredentialsModal();
                    formSec.reset();
                } else {
                    showToast(data.message || 'Error updating credentials', 'error');
                }
            } catch (err) {
                showToast('Failed to update credentials', 'error');
            }
        });
    }

    // Form: Credentials
    document.getElementById('form-credentials').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            gemini_api_key: document.getElementById('input-gemini-key').value.trim(),
            ai_model: document.getElementById('input-ai-model').value,
            meta_verify_token: document.getElementById('input-verify-token').value.trim(),
            meta_access_token: document.getElementById('input-access-token').value.trim(),
            meta_phone_number_id: document.getElementById('input-phone-id').value.trim(),
            meta_page_id: document.getElementById('input-page-id').value.trim()
        };

        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('API credentials saved successfully!', 'success');
            loadDashboardStats();
            document.getElementById('overview-verify-token').value = payload.meta_verify_token;
        } else {
            showToast(data.message || 'Error saving credentials', 'error');
        }
    });

    // Form: System Prompt
    document.getElementById('form-prompt').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            system_prompt: document.getElementById('input-system-prompt').value
        };

        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('AI System Prompt updated!', 'success');
        }
    });

    // Form: Notifications
    document.getElementById('form-notifications').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            admin_whatsapp: document.getElementById('input-admin-whatsapp').value.trim(),
            admin_email: document.getElementById('input-admin-email').value.trim(),
            low_stock_threshold: document.getElementById('input-stock-threshold').value,
            smtp_host: document.getElementById('input-smtp-host').value.trim(),
            smtp_port: document.getElementById('input-smtp-port').value.trim(),
            smtp_user: document.getElementById('input-smtp-user').value.trim()
        };

        const pass = document.getElementById('input-smtp-pass').value;
        if (pass) payload.smtp_pass = pass;

        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('Notification channels updated!', 'success');
        }
    });

    // Form: Product Add/Edit
    document.getElementById('form-product').addEventListener('submit', async (e) => {
        e.preventDefault();
        const prodId = document.getElementById('prod-id').value;
        const payload = {
            name: document.getElementById('prod-name').value.trim(),
            sku: document.getElementById('prod-sku').value.trim(),
            stock_quantity: parseInt(document.getElementById('prod-stock').value, 10),
            regular_price: parseFloat(document.getElementById('prod-regular-price').value),
            offer_price: document.getElementById('prod-offer-price').value ? parseFloat(document.getElementById('prod-offer-price').value) : null,
            image_url: document.getElementById('prod-image').value.trim(),
            description: document.getElementById('prod-desc').value.trim()
        };

        const url = prodId ? `/api/products/${prodId}` : '/api/products';
        const method = prodId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Product ${prodId ? 'updated' : 'added'} successfully!`, 'success');
            closeProductModal();
            loadProducts();
            loadDashboardStats();
        } else {
            showToast(data.message || 'Error saving product', 'error');
        }
    });

    // Form: Simulator Chat
    document.getElementById('form-simulator').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('simulator-input');
        const text = input.value.trim();
        if (!text) return;

        appendChatMessage('user', text);
        input.value = '';

        // Add thinking bubble
        const thinkingBubble = appendChatMessage('bot', 'AI is searching inventory and preparing response...');

        try {
            const res = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, customerName: 'Simulator Tester' })
            });
            const data = await res.json();
            thinkingBubble.remove();

            if (data.success) {
                appendChatMessage('bot', data.reply, data.suggestedProducts);
                loadLogs();
            } else {
                appendChatMessage('bot', 'Error: ' + (data.message || 'Failed to simulate response'));
            }
        } catch (err) {
            thinkingBubble.remove();
            appendChatMessage('bot', 'Network error calling server.');
        }
    });
}

// 7. Chat Simulator UI Helper
function appendChatMessage(sender, text, products = []) {
    const container = document.getElementById('simulator-messages');
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender}`;
    bubble.textContent = text;

    if (products && products.length > 0) {
        products.forEach(p => {
            const preview = document.createElement('div');
            preview.className = 'product-attachment-preview';
            preview.innerHTML = `
                ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : ''}
                <div>
                    <div style="font-weight: 700; font-size: 13px;">${p.name}</div>
                    <div style="font-size: 11px; color: #94a3b8;">SKU: ${p.sku} | Price: $${p.regular_price} | Stock: ${p.stock_quantity} left</div>
                </div>
            `;
            bubble.appendChild(preview);
        });
    }

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

// 8. Product Modal Helpers
function openAddProductModal() {
    document.getElementById('modal-product-title').textContent = 'Add New Product';
    document.getElementById('prod-id').value = '';
    document.getElementById('form-product').reset();
    document.getElementById('modal-product').classList.add('active');
}

function openEditProductModal(p) {
    document.getElementById('modal-product-title').textContent = 'Edit Product';
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-sku').value = p.sku;
    document.getElementById('prod-stock').value = p.stock_quantity;
    document.getElementById('prod-regular-price').value = p.regular_price;
    document.getElementById('prod-offer-price').value = p.offer_price || '';
    document.getElementById('prod-image').value = p.image_url || '';
    document.getElementById('prod-desc').value = p.description || '';
    document.getElementById('modal-product').classList.add('active');
}

function closeProductModal() {
    document.getElementById('modal-product').classList.remove('active');
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product from the database?')) return;
    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('Product removed.', 'info');
            loadProducts();
            loadDashboardStats();
        }
    } catch (err) {
        showToast('Error deleting product', 'error');
    }
}

// 9. Prompt Presets
function loadPromptPreset(type) {
    const textarea = document.getElementById('input-system-prompt');
    if (type === 'ecommerce') {
        textarea.value = `You are a high-converting, professional AI Sales Assistant for our retail store.
Goals:
1. Promote our featured products warmly and highlight active discounts.
2. Check real-time stock levels and recommend available alternatives if an item is sold out.
3. Guide the customer through the checkout process: collect their Name, Phone, and Address.
4. If an order is confirmed, thank the customer and inform them shipping takes 24-48 hours.`;
    } else if (type === 'bilingual') {
        textarea.value = `You are an expert bilingual AI Customer Support & Sales Agent for our business.
Rules:
1. Always reply in the exact language the customer used (Bengali or English).
2. Answer questions accurately regarding our products, prices, and stock counts.
3. Polite, welcoming, and respectful tone at all times.
4. If human support is needed, reassure the customer that an admin is taking over immediately.`;
    }
    showToast(`Loaded ${type} preset. Click "Update System Rules" to save.`, 'info');
}

// 10. Test Notification
async function testNotificationDelivery() {
    showToast('Sending test notification...', 'info');
    try {
        const res = await fetch('/api/test-notification', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('Test notification trigger complete! Check Logs.', 'success');
            loadLogs();
        }
    } catch (err) {
        showToast('Failed to trigger test alert.', 'error');
    }
}

// 11. Clipboard Utility
function copyToClipboard(elementId) {
    const input = document.getElementById(elementId);
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Copied to clipboard!', 'info');
}

// 12. Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
