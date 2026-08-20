const { tronWeb, sendTrx } = require('./tron');
const Setting = require('../models/Setting');
const ExchangeRecord = require('../models/ExchangeRecord');
const UserSession = require('../models/UserSession');
const safew = require('./safew');
const { getDisplayRate } = require('./price');
const config = require('../config');

async function startMonitoring() {
    setInterval(async () => {
        try {
            const setting = await Setting.findOne({});
            const address = setting.usdtReceiveAddress || config.DEFAULT_WALLET;
            const contract = await tronWeb.contract().at(config.USDT_CONTRACT);
            const events = await contract.getEvents('Transfer', {
                filter: { to: tronWeb.address.toHex(address) },
                limit: 10,
                order: 'block_timestamp desc'
            });

            for (const event of events) {
                const txID = event.transaction_id;
                const exists = await ExchangeRecord.findOne({ txId: txID });
                if (exists) continue;

                const fromAddress = tronWeb.address.fromHex(event.result.from);
                const amount = tronWeb.fromSun(event.result.value.toString());

                let returnAddress = fromAddress;
                let notifyUserId = null;

                const session = await UserSession.findOne({
                    payAddress: fromAddress,
                    state: 'confirmed',
                    updatedAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
                });

                if (session && session.returnAddress) {
                    returnAddress = session.returnAddress;
                    notifyUserId = session.userId;
                    await UserSession.updateOne({ _id: session._id }, { $unset: { state: 1 } });
                }

                const displayRate = await getDisplayRate();
                let trxAmount = amount * displayRate;
                if (amount >= config.BONUS_THRESHOLD) {
                    trxAmount += config.BONUS_AMOUNT;
                }

                const result = await sendTrx(returnAddress, trxAmount);

                if (result.success) {
                    await new ExchangeRecord({
                        txId: txID,
                        fromAddress,
                        toAddress: address,
                        usdtAmount: amount,
                        rate: displayRate,
                        trxAmount,
                        returnAddress,
                        outTxHash: result.txID,
                        status: 'completed'
                    }).save();

                    if (notifyUserId) {
                        await safew.sendMessage(notifyUserId, `✅ 请查收，${trxAmount} TRX 已转入您的地址`);
                    }

                    if (config.ADMIN_ID) {
                        await safew.sendMessage(config.ADMIN_ID, `✅ 兑换成功\n金额: ${amount} USDT -> ${trxAmount} TRX\n返还地址: ${returnAddress}\n哈希: ${result.txID}`);
                    }
                } else {
                    await new ExchangeRecord({
                        txId: txID,
                        fromAddress,
                        toAddress: address,
                        usdtAmount: amount,
                        rate: displayRate,
                        trxAmount,
                        returnAddress,
                        status: 'failed'
                    }).save();

                    await safew.sendMessage(config.ADMIN_ID, `❌ 兑换失败\n原因: ${result.error}\n金额: ${amount} USDT`);
                }
            }

            const trxAddress = tronWeb.defaultAddress.base58;
            const trxBalance = await require('./tron').getTrxBalance(trxAddress);

            if (trxBalance < config.MIN_TRX_BALANCE) {
                await safew.sendMessage(config.ADMIN_ID, `⚠️ TRX 余额不足\n当前余额: ${trxBalance} TRX\n请及时补充 TRX`);
            }
        } catch (error) {
            console.error('监控错误:', error.message);
        }
    }, 30000);
}

module.exports = { startMonitoring };