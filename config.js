require('dotenv').config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    TRX_PRIVATE_KEY: process.env.TRX_PRIVATE_KEY,
    MONGODB_URI: process.env.MONGODB_URI,
    SPREAD: 0.24,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'chulingli520',
    ADMIN_ID: process.env.ADMIN_ID || '13994927',
    ADMIN_LINK: 'https://sfw.bar/qishe77',
    API_BASE: `https://api.safew.bot/bot${process.env.BOT_TOKEN}`,
    TRON_FULL_NODE: 'https://api.trongrid.io',
    USDT_CONTRACT: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
    MAX_BUTTONS: 6,
    TX_PAGE_SIZE: 8,
    MIN_TRX_BALANCE: 20,
    BONUS_THRESHOLD: 100,
    BONUS_AMOUNT: 2,
    DEFAULT_WALLET: 'TWgv8ca1ubDKmuPdPfaEtpb6huKcZV2222'
};
