const { GoogleGenerativeAI } = require('@google/generative-ai');
const settingModel = require('../models/settingModel');
const inventoryService = require('./inventoryService');
const notificationService = require('./notificationService');
const logModel = require('../models/logModel');

const aiService = {
    /**
     * Process an incoming customer message and return an AI-generated answer.
     * @param {string} userMessage 
     * @param {object} contextOptions - { senderName, platform, senderId }
     */
    async processMessage(userMessage, contextOptions = {}) {
        const settings = settingModel.getAll();
        const apiKey = settings.gemini_api_key?.trim();
        const systemPrompt = settings.system_prompt || 'You are an AI customer support assistant.';
        const inventoryContext = inventoryService.getProductSummaryText();

        const senderName = contextOptions.senderName || 'Customer';
        const platform = contextOptions.platform || 'General';

        // Check for Human Handoff Intent
        const humanKeywords = ['agent', 'human', 'admin', 'মানুষ', 'অ্যাডমিন', 'কথা বলতে চাই', 'helpdesk', 'support person'];
        const isHumanRequested = humanKeywords.some(kw => userMessage.toLowerCase().includes(kw));

        if (isHumanRequested) {
            await notificationService.notifyAdmin(
                `Human Agent Requested by ${senderName}`,
                `Customer ${senderName} on ${platform} requested human intervention.\nCustomer Message: "${userMessage}"`,
                { senderId: contextOptions.senderId, platform }
            );

            logModel.info('HUMAN_HANDOFF_TRIGGERED', `Customer ${senderName} requested human agent.`);
            return {
                text: "আমাদের সাপোর্ট টিমের একজন সদস্যকে আপনার বিষয়ে জানানো হয়েছে। তারা অতি শীঘ্রই আপনার সাথে সরাসরি যোগাযোগ করবেন। ধন্যবাদ আপনার ধৈর্যের জন্য!",
                intent: 'human_handoff',
                suggestedProducts: []
            };
        }

        // Check if Gemini API Key is provided
        if (!apiKey) {
            logModel.warn('AI_NO_API_KEY', 'Gemini API key is not configured in settings. Using local smart fallback.');
            return this.fallbackSmartResponse(userMessage, inventoryContext);
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelName = settings.ai_model || 'gemini-1.5-flash';
            const model = genAI.getGenerativeModel({ model: modelName });

            const fullPrompt = `
${systemPrompt}

--- REAL-TIME INVENTORY DATABASE ---
${inventoryContext}
-------------------------------------

Current Customer Information:
Name: ${senderName}
Platform: ${platform}
Customer Message: "${userMessage}"

Instructions for your response:
1. Provide a direct, polite, and helpful answer.
2. If the customer asks for a product, accurately reference the product name, price, and whether it's in stock or out of stock based on the inventory above.
3. If the customer is ordering, acknowledge the details and ask for any missing fields (Name, Phone, Address).
4. Reply in the same language as the customer's query (Bengali or English).
`;

            const result = await model.generateContent(fullPrompt);
            const responseText = result.response.text();

            logModel.info('AI_REPLY_GENERATED', `Successfully generated response for ${senderName} using ${modelName}`);

            // Detect any products mentioned to attach cards/images
            const allProducts = inventoryService.getAllProducts();
            const matchingProducts = allProducts.filter(p => 
                userMessage.toLowerCase().includes(p.name.toLowerCase()) || 
                userMessage.toLowerCase().includes(p.sku.toLowerCase())
            );

            return {
                text: responseText,
                intent: 'ai_response',
                suggestedProducts: matchingProducts
            };

        } catch (error) {
            console.error('[AIService] Gemini API Error:', error.message);
            logModel.error('AI_GENERATION_FAILED', `Error calling Gemini API: ${error.message}`);
            return {
                text: `ধন্যবাদ আপনার মেসেজের জন্য। আমি বিষয়টি পেয়েছি। বিস্তারিত তথ্যের জন্য আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।\n(Notice: Please check your Gemini API key in dashboard)`,
                intent: 'error_fallback',
                suggestedProducts: []
            };
        }
    },

    fallbackSmartResponse(userMessage, inventoryText) {
        const query = userMessage.toLowerCase();
        const products = inventoryService.getAllProducts();

        // Check if query matches any product
        const matched = products.filter(p => 
            query.includes(p.name.toLowerCase()) || 
            query.includes(p.sku.toLowerCase())
        );

        if (matched.length > 0) {
            const p = matched[0];
            const price = p.offer_price ? `৳${p.offer_price} (Regular: ৳${p.regular_price})` : `৳${p.regular_price}`;
            const stock = p.stock_quantity > 0 ? `বর্তমানে স্টকে আছে (${p.stock_quantity} টি উপলব্ধ)` : 'দুঃখিত, এই পণ্যটি বর্তমানে স্টক আউট।';
            return {
                text: `আমাদের "${p.name}" সম্পর্কে জানতে চাওয়ার জন্য ধন্যবাদ!\nমূল্য: ${price}\nস্টক তথ্য: ${stock}\nবিবরণ: ${p.description || ''}\n\nআপনি কি এটি অর্ডার করতে চান? তাহলে আপনার নাম, ফোন নম্বর ও ডেলিভারি ঠিকানা জানান।`,
                intent: 'product_inquiry',
                suggestedProducts: [p]
            };
        }

        if (query.includes('stock') || query.includes('পণ্য') || query.includes('product') || query.includes('লিস্ট')) {
            return {
                text: `আমাদের বর্তমান প্রোডাক্ট তালিকা ও স্টক তথ্য:\n\n${inventoryText}\n\nআপনি কোন পণ্যটি সম্পর্কে জানতে চান বলুন!`,
                intent: 'inventory_list',
                suggestedProducts: products
            };
        }

        return {
            text: `হ্যালো! আমাদের মেসেজ করার জন্য ধন্যবাদ। আমাদের ক্যাটালগ দেখতে "প্রোডাক্ট" লিখুন, অথবা কোনো নির্দিষ্ট পণ্যের নাম লিখে জানতে পারেন। (দ্রষ্টব্য: পূর্ণ এআই সুবিধার জন্য ড্যাশবোর্ড থেকে Gemini API কী যুক্ত করুন)।`,
            intent: 'general_greeting',
            suggestedProducts: []
        };
    }
};

module.exports = aiService;
