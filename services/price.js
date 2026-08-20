const axios = require('axios');

let cachedTrxRate = null;
let cachedCnyRate = null;
let lastTrxFetch = 0;
let lastCnyFetch = 0;
const CACHE_DURATION = 30000;

async function getMarketRate() {
    const now = Date.now();
    if (cachedTrxRate && now - lastTrxFetch < CACHE_DURATION) return cachedTrxRate;
    try {
        const response = await axios.get('https://www.okx.com/api/v5/market/ticker?instId=TRX-USDT');
        cachedTrxRate = parseFloat(response.data.data[0].last);
        lastTrxFetch = now;
        return cachedTrxRate;
    } catch (error) {
        return cachedTrxRate || 0;
    }
}

async function getCnyRate() {
    const now = Date.now();
    if (cachedCnyRate && now - lastCnyFetch < CACHE_DURATION) return cachedCnyRate;
    try {
        const response = await axios.get('https://www.okx.com/api/v5/market/ticker?instId=USDT-CNY');
        cachedCnyRate = parseFloat(response.data.data[0].last);
        lastCnyFetch = now;
        return cachedCnyRate;
    } catch (error) {
        return cachedCnyRate || 7.2;
    }
}

async function getDisplayRate() {
    const marketRate = await getMarketRate();
    const usdtToTrx = 1 / marketRate;
    return usdtToTrx - 0.24;
}

module.exports = { getMarketRate, getCnyRate, getDisplayRate };
