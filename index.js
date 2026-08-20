require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const safew = require('./services/safew');
const tron = require('./services/tron');
const price = require('./services/price');
const monitor = require('./services/monitor');
const Setting = require('./models/Setting');
const AdButton = require('./models/AdButton');
const ExchangeRecord = require('./models/ExchangeRecord');
const UserSession = require('./models/UserSession');
const keyboardUtils = require('./utils/keyboard');

mongoose.connect(config.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

let lastAddressQuery = {};

function getBeijingTime() {
    return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}

async function ensureDefaultSetting() {
    const setting = await Setting.findOne({});
    if (!setting) {
        await new Setting({ usdtReceiveAddress: config.DEFAULT_WALLET }).save();
    }
}

async function handleCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text || '';

    if (text === '/start') {
        const welcomeText = `🤖 *TRX 自动兑换机器人*\n\n24 小时全自动 USDT → TRX 闪兑服务，进 U 即兑，秒到账。\n\n💹 *汇率说明*\n- 汇率基于市场实时价格，系统自动计算优惠后展示\n\n📌 *使用方法*\n1️⃣ 点击「💱 立即兑换」获取自动兑换地址\n2️⃣ 向该地址转入 USDT（最低 1 USDT 起）\n3️⃣ 系统自动按展示汇率计算并转出 TRX 到您的钱包\n\n🔍 *余额查询*\n直接发送任意 TRON 钱包地址（T 开头）\n\n⚠️ *注意事项*\n- 请勿使用交易所转账\n- 转账成功后请刷新钱包查看\n\n🆘 *转错退款*\n请联系管理员 @qishe77\n\n👇 请选择操作：`;
        const keyboard = await keyboardUtils.buildMainKeyboard();
        await safew.sendMessage(chatId, welcomeText, keyboard);
        return;
    }

    if (text === '/exchange') {
        const setting = await Setting.findOne({});
        const address = setting.usdtReceiveAddress || config.DEFAULT_WALLET;
        const displayRate = await price.getDisplayRate();
        const cnyRate = await price.getCnyRate();
        const hundredUsdt = (100 * displayRate + config.BONUS_AMOUNT).toFixed(4);
        const text2 = `📈 转账成功后自动秒回 TRX\n24 小时自动闪兑换\n➖➖➖➖➖➖➖➖➖➖\n💹 实时汇率\n1 USDT = ${displayRate.toFixed(4)} TRX\n100 USDT = ${hundredUsdt} TRX\n今日 U 价：¥${cnyRate} CNY\n🎉 自动兑换地址：\n\`${address}\`\n（点击地址自动复制）\n⚠️ 请仔细核对钱包地址，转错无法找回\n➖➖➖➖➖➖➖➖➖➖\n🔸 进 U 即兑，全自动返 TRX\n🆘 1U 起兑换\n⚡️ 双钱包支付无需担心够不够\n⚠️ 转账成功后请刷新钱包查看\n❗️ 千万请勿使用交易所转账\n🔋 使用能量进行转账节省 80% TRX`;
        if (setting.qrCodeFileId) {
            await safew.sendPhoto(chatId, setting.qrCodeFileId, '', null);
        }
        const keyboard = { inline_keyboard: [[{ text: '🎁 兑换给他人', callback_data: 'exchange_for_other' }]] };
        await safew.sendMessage(chatId, text2, keyboard);
        return;
    }

    if (text === '/balance') {
        await safew.sendMessage(chatId, '🔍 余额查询\n\n请直接发送您的 TRON 钱包地址（以 T 开头）');
        return;
    }

    if (text === '/urate') {
        const cnyRate = await price.getCnyRate();
        await safew.sendMessage(chatId, `💵 今日 U 价\n\n1 USDT = ¥${cnyRate} CNY\n\n数据来源：OKX 实时价格\n更新时间：${getBeijingTime()}\n换汇请联系： @qishe77`);
        return;
    }

    if (text === '/help') {
        await safew.sendMessage(chatId, `📖 *使用帮助*\n\n命令列表：\n/start - 开始使用\n/exchange - 立即兑换\n/balance - 余额查询\n/urate - 今日U价\n/help - 使用帮助\n\n功能说明：\n💱 立即兑换：获取自动兑换地址，转入 USDT 后自动返还 TRX\n📊 余额查询：发送 TRON 地址（T 开头）查询余额\n🎁 兑换给他人：在兑换页面点击按钮，可将返还 TRX 转入指定地址\n\n注意事项：\n⚠️ 请勿使用交易所转账\n⚠️ 转账前请核对地址，转错请联系管理员 @qishe77`);
        return;
    }

    if (text === '/admin') {
        await safew.sendMessage(chatId, '请输入管理密码：');
        await UserSession.updateOne({ userId }, { $set: { state: 'awaiting_admin_password' } });
        return;
    }

    if (text.startsWith('/addbutton')) {
        if (userId !== config.ADMIN_ID) return;
        const parts = text.replace('/addbutton ', '').split('|');
        if (parts.length === 2) {
            const count = await AdButton.countDocuments();
            if (count >= config.MAX_BUTTONS) {
                await safew.sendMessage(chatId, `最多 ${config.MAX_BUTTONS} 个按钮`);
                return;
            }
            await new AdButton({ text: parts[0].trim(), url: parts[1].trim(), order: count }).save();
            await safew.sendMessage(chatId, '✅ 广告按钮已添加');
        }
        return;
    }

    if (text.startsWith('/deletebutton')) {
        if (userId !== config.ADMIN_ID) return;
        const idx = parseInt(text.replace('/deletebutton ', ''));
        if (!isNaN(idx)) {
            const buttons = await AdButton.find().sort('order');
            if (buttons[idx - 1]) {
                await AdButton.deleteOne({ _id: buttons[idx - 1]._id });
                await safew.sendMessage(chatId, '✅ 广告按钮已删除');
            }
        }
        return;
    }

    if (/^T[A-Za-z0-9]{33,34}$/.test(text)) {
        await handleAddressQuery(chatId, text);
        return;
    }

    const session = await UserSession.findOne({ userId });
    if (session && session.state) {
        await handleStateInput(chatId, userId, text, session, msg);
        return;
    }
}

async function handleAddressQuery(chatId, address) {
    const loadingMsg = await safew.sendMessage(chatId, `正在查询账户\n${address}\n请稍候……`);
    const info = await tron.getAccountInfo(address);
    if (!info) {
        await safew.editMessageText(chatId, loadingMsg.result.message_id, '⚠️ 地址查询失败');
        return;
    }
    const usdtCount = await tron.getUsdtTransactionCount(address);
    const text = `👤 账户类型: ${info.accountType}\n🔍 查询地址: ${address}\n⏰ 创建时间: ${new Date(info.createTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}\n🌟 最后活跃: ${new Date(info.lastOperationTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}\n➖➖➖➖资源➖➖➖➖\n💰 TRX 余额：${info.trxBalance} TRX\n💰 TRX 质押：0 TRX\n💰 USDT 余额：${info.usdtBalance} USDT\n🔋 能量：${info.energyUsed} / ${info.energyLimit}\n📡 质押带宽：${info.netUsed} / ${info.netLimit}\n📡 免费带宽：${info.freeNetUsed} / ${info.freeNetLimit}\n➖➖➖➖权限➖➖➖➖\n拥有者 (Owner) 权限\n权限名称：owner(阈值 1)\n${address}(权重: 1)\n\n活跃 (Active) 权限\n权限名称：active(阈值 1)\n${address}(权重: 1)\n➖➖➖➖最近交易➖➖➖➖\n⤴️ USDT 支出笔数：${usdtCount.outgoing}    ⤵️ USDT 收入笔数：${usdtCount.incoming}`;
    await safew.editMessageText(chatId, loadingMsg.result.message_id, text, keyboardUtils.buildBalanceKeyboard());
}

async function handleStateInput(chatId, userId, text, session, msg) {
    const state = session.state;

    if (state === 'awaiting_admin_password') {
        try { await safew.deleteMessage(chatId, msg.message_id); } catch (e) {}
        if (text === config.ADMIN_PASSWORD) {
            await UserSession.updateOne({ userId }, { $unset: { state: 1 } });
            await safew.sendMessage(chatId, '🛠 管理面板\n\n请选择操作：', keyboardUtils.buildAdminKeyboard());
        } else {
            await safew.sendMessage(chatId, '⛔️ 密码不对');
            await UserSession.updateOne({ userId }, { $unset: { state: 1 } });
        }
    } else if (state === 'awaiting_address') {
        if (!/^T[A-Za-z0-9]{33,34}$/.test(text)) return await safew.sendMessage(chatId, '⚠️ 地址格式错误');
        await Setting.updateOne({}, { $set: { usdtReceiveAddress: text } });
        await UserSession.updateOne({ userId }, { $unset: { state: 1 } });
        await safew.sendMessage(chatId, `✅ 收款地址已更新为 \`${text}\``);
    } else if (state === 'awaiting_return_address') {
        if (!/^T[A-Za-z0-9]{33,34}$/.test(text)) return await safew.sendMessage(chatId, '⚠️ 地址格式错误');
        await UserSession.updateOne({ userId }, { $set: { state: 'confirm_return', returnAddress: text } });
        const setting = await Setting.findOne({});
        const address = setting.usdtReceiveAddress || config.DEFAULT_WALLET;
        await safew.sendMessage(chatId, `返还地址：\`${text}\`\n请仔细核对返还地址，如地址错误，责任自行承担，概不负责。\n\n请将 USDT 转入以下自动兑换地址：\n\`${address}\`\n\n到账后将按实时汇率自动返还 TRX 到上述地址。`, keyboardUtils.buildConfirmKeyboard());
    } else if (state === 'awaiting_qr') {
        if (msg.photo) {
            const photo = msg.photo[msg.photo.length - 1];
            await Setting.updateOne({}, { $set: { qrCodeFileId: photo.file_id } });
            await UserSession.updateOne({ userId }, { $unset: { state: 1 } });
            await safew.sendMessage(chatId, '✅ 二维码已更新');
        }
    } else {
        await UserSession.updateOne({ userId }, { $unset: { state: 1 } });
    }
}

async function handleCallback(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    if (data === 'exchange') {
        const setting = await Setting.findOne({});
        const address = setting.usdtReceiveAddress || config.DEFAULT_WALLET;
        const displayRate = await price.getDisplayRate();
        const cnyRate = await price.getCnyRate();
        const hundredUsdt = (100 * displayRate + config.BONUS_AMOUNT).toFixed(4);
        const text = `📈 转账成功后自动秒回 TRX\n24 小时自动闪兑换\n➖➖➖➖➖➖➖➖➖➖\n💹 实时汇率\n1 USDT = ${displayRate.toFixed(4)} TRX\n100 USDT = ${hundredUsdt} TRX\n今日 U 价：¥${cnyRate} CNY\n🎉 自动兑换地址：\n\`${address}\`\n（点击地址自动复制）\n⚠️ 请仔细核对钱包地址，转错无法找回\n➖➖➖➖➖➖➖➖➖➖\n🔸 进 U 即兑，全自动返 TRX\n🆘 1U 起兑换\n⚡️ 双钱包支付无需担心够不够\n⚠️ 转账成功后请刷新钱包查看\n❗️ 千万请勿使用交易所转账\n🔋 使用能量进行转账节省 80% TRX`;
        await safew.editMessageText(chatId, messageId, text, { inline_keyboard: [[{ text: '🎁 兑换给他人', callback_data: 'exchange_for_other' }]] });
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'exchange_for_other') {
        await UserSession.updateOne({ userId }, { $set: { state: 'awaiting_return_address' } });
        await safew.sendMessage(chatId, '请发送接收 TRX 的钱包地址（T 开头）');
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'confirm_return') {
        try { await safew.deleteMessage(chatId, messageId); } catch (e) {}
        await UserSession.updateOne({ userId }, { $set: { state: 'confirmed' } });
        await safew.sendMessage(chatId, '✅ 返还地址已确认，请转账 USDT 到收款地址，到账后自动返还 TRX。');
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'admin_panel') {
        await safew.sendMessage(chatId, '请输入管理密码：');
        await UserSession.updateOne({ userId }, { $set: { state: 'awaiting_admin_password' } });
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'set_address') {
        await UserSession.updateOne({ userId }, { $set: { state: 'awaiting_address' } });
        await safew.sendMessage(chatId, '请输入新的 USDT 收款地址（T 开头）');
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'upload_qr') {
        await UserSession.updateOne({ userId }, { $set: { state: 'awaiting_qr' } });
        await safew.sendMessage(chatId, '请发送二维码图片');
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'manage_buttons') {
        const buttons = await AdButton.find().sort('order');
        let text = '📢 广告按钮管理\n当前按钮：\n';
        buttons.forEach((btn, i) => {
            text += `${i + 1}. ${btn.text} -> ${btn.url}\n`;
        });
        text += '\n添加：/addbutton 文字|链接\n删除：/deletebutton 序号';
        await safew.sendMessage(chatId, text);
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'view_records') {
        const records = await ExchangeRecord.find().sort('-createdAt').limit(10);
        let text = '📜 兑换记录（最近10条）\n\n';
        for (const r of records) {
            text += `金额: ${r.usdtAmount} USDT -> ${r.trxAmount} TRX\n状态: ${r.status}\n时间: ${r.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}\n\n`;
        }
        await safew.sendMessage(chatId, text);
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'view_balance') {
        const setting = await Setting.findOne({});
        const address = setting.usdtReceiveAddress || config.DEFAULT_WALLET;
        const trxBalance = await tron.getTrxBalance(address);
        const usdtBalance = await tron.getUsdtBalance(address);
        const text = `💰 钱包余额\n\n地址：\`${address}\`\nTRX 余额：${trxBalance} TRX\nUSDT 余额：${usdtBalance} USDT\n\n⚠️ TRX 低于 ${config.MIN_TRX_BALANCE} 将自动提醒`;
        await safew.sendMessage(chatId, text);
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'view_users') {
        const count = await UserSession.countDocuments();
        await safew.sendMessage(chatId, `👥 使用人数：${count}`);
        await safew.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'back_main') {
        await safew.sendMessage(chatId, '👋 请选择操作：', await keyboardUtils.buildMainKeyboard());
        await safew.answerCallbackQuery(callbackQuery.id);
    } else {
        await safew.answerCallbackQuery(callbackQuery.id, '未知操作');
    }
}

async function handleMessage(msg) {
    const userId = msg.from.id.toString();
    const session = await UserSession.findOne({ userId });
    if (session && session.state === 'awaiting_qr' && msg.photo) {
        const photo = msg.photo[msg.photo.length - 1];
        await Setting.updateOne({}, { $set: { qrCodeFileId: photo.file_id } });
        await UserSession.updateOne({ userId }, { $unset: { state: 1 } });
        await safew.sendMessage(msg.chat.id, '✅ 二维码已更新');
        return;
    }
    await handleCommand(msg);
}

async function main() {
    await ensureDefaultSetting();
    monitor.startMonitoring();
    let offset = 0;
    console.log('机器人已启动');
    while (true) {
        try {
            const response = await safew.getUpdates(offset, 30);
            if (response.ok && response.result.length) {
                for (const update of response.result) {
                    offset = update.update_id + 1;
                    if (update.message) {
                        await handleMessage(update.message);
                    } else if (update.callback_query) {
                        await handleCallback(update.callback_query);
                    }
                }
            }
        } catch (error) {
            console.error('轮询错误:', error.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

main().catch(console.error);