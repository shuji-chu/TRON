const config = require('../config');
const AdButton = require('../models/AdButton');

async function buildMainKeyboard() {
    const buttons = await AdButton.find().sort('order').limit(config.MAX_BUTTONS);
    let keyboard = [];

    if (buttons.length) {
        for (let i = 0; i < buttons.length; i += 2) {
            const row = [];
            buttons.slice(i, i + 2).forEach(btn => {
                row.push({ text: btn.text, url: btn.url });
            });
            keyboard.push(row);
        }
    } else {
        keyboard.push([{ text: '📢 广告投放', url: config.ADMIN_LINK }]);
    }

    return { inline_keyboard: keyboard };
}

function buildAdminKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '📝 修改收款地址', callback_data: 'set_address' }],
            [{ text: '📷 上传二维码', callback_data: 'upload_qr' }],
            [{ text: '📢 管理广告按钮', callback_data: 'manage_buttons' }],
            [{ text: '📜 查看兑换记录', callback_data: 'view_records' }],
            [{ text: '💰 查看余额', callback_data: 'view_balance' }],
            [{ text: '👥 使用人数', callback_data: 'view_users' }],
            [{ text: '⬅️ 返回主菜单', callback_data: 'back_main' }]
        ]
    };
}

function buildBalanceKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '📢 广告投放', url: config.ADMIN_LINK }]
        ]
    };
}

function buildConfirmKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '✅ 确定', callback_data: 'confirm_return' }]
        ]
    };
}

module.exports = {
    buildMainKeyboard,
    buildAdminKeyboard,
    buildBalanceKeyboard,
    buildConfirmKeyboard
};