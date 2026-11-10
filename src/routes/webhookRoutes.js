const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Meta Webhook Verification (GET)
router.get('/', webhookController.verify);

// Meta Webhook Ingestion (POST)
router.post('/', webhookController.handleEvent);

module.exports = router;
