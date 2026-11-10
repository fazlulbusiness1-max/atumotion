const productModel = require('../models/productModel');
const settingModel = require('../models/settingModel');
const notificationService = require('./notificationService');
const logModel = require('../models/logModel');

const inventoryService = {
    getAllProducts() {
        return productModel.getAll();
    },

    getProductSummaryText() {
        const products = productModel.getAll();
        if (products.length === 0) {
            return "Currently no products in the catalog.";
        }
        return products.map(p => {
            const stockStatus = p.stock_quantity > 0 ? `In Stock (${p.stock_quantity} available)` : 'OUT OF STOCK';
            const price = p.offer_price ? `Offer: $${p.offer_price} (Regular: $${p.regular_price})` : `$${p.regular_price}`;
            return `- [ID: ${p.id}, SKU: ${p.sku}] ${p.name}: ${price}. Status: ${stockStatus}. Description: ${p.description || 'N/A'}`;
        }).join('\n');
    },

    searchProducts(query) {
        return productModel.search(query);
    },

    async checkAndNotifyLowStock() {
        const threshold = parseInt(settingModel.get('low_stock_threshold'), 10) || 3;
        const lowStockItems = productModel.getLowStock(threshold);

        if (lowStockItems.length > 0) {
            const details = lowStockItems.map(p => `${p.name} (SKU: ${p.sku}) -> Only ${p.stock_quantity} left!`).join('\n');
            await notificationService.notifyAdmin(
                'Low Inventory Stock Alert',
                `The following items are running out of stock:\n${details}`,
                { count: lowStockItems.length }
            );
        }
        return lowStockItems;
    },

    deductStock(productId, quantity = 1) {
        const product = productModel.getById(productId);
        if (!product) return { success: false, message: 'Product not found' };

        if (product.stock_quantity < quantity) {
            return {
                success: false,
                message: `Insufficient stock. Only ${product.stock_quantity} available.`
            };
        }

        const newStock = product.stock_quantity - quantity;
        productModel.updateStock(productId, newStock);
        logModel.info('STOCK_DEDUCTED', `Stock for ${product.name} deducted by ${quantity}. New stock: ${newStock}`);

        // Check if now low stock
        const threshold = parseInt(settingModel.get('low_stock_threshold'), 10) || 3;
        if (newStock <= threshold) {
            this.checkAndNotifyLowStock();
        }

        return { success: true, product: productModel.getById(productId) };
    }
};

module.exports = inventoryService;
