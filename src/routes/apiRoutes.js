const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// 0. Auth
router.post('/auth/login', dashboardController.login);
router.post('/auth/change-credentials', dashboardController.changeCredentials);

// 1. Stats
router.get('/stats', dashboardController.getStats);

// 2. Settings
router.get('/settings', dashboardController.getSettings);
router.post('/settings', dashboardController.saveSettings);

// 3. Products
router.get('/products', dashboardController.getProducts);
router.post('/products', dashboardController.addProduct);
router.put('/products/:id', dashboardController.updateProduct);
router.delete('/products/:id', dashboardController.deleteProduct);

// 4. Messages & Logs
router.get('/messages', dashboardController.getMessages);
router.post('/messages/handoff', dashboardController.toggleHandoff);
router.get('/logs', dashboardController.getLogs);

// 5. Test Live Simulation & Notifications
router.post('/simulate', dashboardController.simulateChat);
router.post('/test-notification', dashboardController.testNotification);

module.exports = router;
