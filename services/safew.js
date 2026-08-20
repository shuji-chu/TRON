const axios = require('axios');
const config = require('../config');

const api = axios.create({
    baseURL: config.API_BASE,
    timeout: 30000
});

async function apiCall(method, params = {}) {
    try {
        const response = await api.post(`/${method}`, params);
        return response.data;
    } catch (error) {
        console.error(`SafeW API ${method} error:`, error.response?.data || error.message);
        throw error;
    }
}

async function sendMessage(chatId, text, replyMarkup = null, parseMode = 'Markdown') {
    const params = { chat_id: chatId, text, parse_mode: parseMode };
    if (replyMarkup) params.reply_markup = replyMarkup;
    return await apiCall('sendMessage', params);
}

async function sendPhoto(chatId, photo, caption = '', replyMarkup = null) {
    const params = { chat_id: chatId, photo, caption, parse_mode: 'Markdown' };
    if (replyMarkup) params.reply_markup = replyMarkup;
    return await apiCall('sendPhoto', params);
}

async function editMessageText(chatId, messageId, text, replyMarkup = null, parseMode = 'Markdown') {
    const params = { chat_id: chatId, message_id: messageId, text, parse_mode: parseMode };
    if (replyMarkup) params.reply_markup = replyMarkup;
    return await apiCall('editMessageText', params);
}

async function deleteMessage(chatId, messageId) {
    return await apiCall('deleteMessage', { chat_id: chatId, message_id: messageId });
}

async function answerCallbackQuery(callbackQueryId, text = '') {
    return await apiCall('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

async function getUpdates(offset = 0, timeout = 30) {
    const response = await axios.get(`${config.API_BASE}/getUpdates`, {
        params: { offset, timeout }
    });
    return response.data;
}

module.exports = {
    apiCall,
    sendMessage,
    sendPhoto,
    editMessageText,
    deleteMessage,
    answerCallbackQuery,
    getUpdates
};