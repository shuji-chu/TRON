const TronWeb = require('tronweb');
const config = require('../config');

const tronWeb = new TronWeb({
    fullHost: config.TRON_FULL_NODE,
    privateKey: config.TRX_PRIVATE_KEY
});

async function getAccountInfo(address) {
    try {
        const account = await tronWeb.trx.getAccount(address);
        if (!account || !account.address) return null;
        const balance = await tronWeb.trx.getBalance(address);
        const trxBalance = tronWeb.fromSun(balance);
        const resources = await tronWeb.trx.getAccountResources(address);
        const energyLimit = resources.EnergyLimit || 0;
        const energyUsed = resources.EnergyUsed || 0;
        const freeNetLimit = resources.freeNetLimit || 0;
        const freeNetUsed = resources.freeNetUsed || 0;
        const netLimit = resources.NetLimit || 0;
        const netUsed = resources.NetUsed || 0;
        let usdtBalance = 0;
        try {
            const contract = await tronWeb.contract().at(config.USDT_CONTRACT);
            const usdtRaw = await contract.balanceOf(address).call();
            usdtBalance = tronWeb.fromSun(usdtRaw.toString());
        } catch (e) {}
        return {
            address,
            trxBalance,
            usdtBalance,
            createTime: account.create_time || 0,
            lastOperationTime: account.latest_opration_time || 0,
            energyLimit, energyUsed, freeNetLimit, freeNetUsed, netLimit, netUsed,
            accountType: account.type === 'MultiSignature' ? '多签账户' : '普通账户'
        };
    } catch (error) {
        return null;
    }
}

async function getTrxBalance(address) {
    try {
        const balance = await tronWeb.trx.getBalance(address);
        return tronWeb.fromSun(balance);
    } catch (e) { return 0; }
}

async function getUsdtBalance(address) {
    try {
        const contract = await tronWeb.contract().at(config.USDT_CONTRACT);
        const balance = await contract.balanceOf(address).call();
        return tronWeb.fromSun(balance.toString());
    } catch (e) { return 0; }
}

async function sendTrx(toAddress, amountTRX) {
    try {
        const tradeobj = await tronWeb.transactionBuilder.sendTrx(
            toAddress,
            tronWeb.toSun(amountTRX),
            tronWeb.defaultAddress.base58
        );
        const signedtxn = await tronWeb.trx.sign(tradeobj);
        const receipt = await tronWeb.trx.sendRawTransaction(signedtxn);
        if (receipt.result) return { success: true, txID: receipt.txid };
        else return { success: false, error: '交易失败' };
    } catch (e) { return { success: false, error: e.message }; }
}

async function getTrxTransactions(address, limit = 50) {
    try {
        const txs = await tronWeb.trx.getTransactionsRelated(address, 'all', limit);
        return txs || [];
    } catch (e) { return []; }
}

async function getUsdtTransactions(address, limit = 50) {
    try {
        const contract = await tronWeb.contract().at(config.USDT_CONTRACT);
        const events = await contract.getEvents('Transfer', {
            filter: { $or: [{ from: tronWeb.address.toHex(address) }, { to: tronWeb.address.toHex(address) }] },
            limit,
            order: 'block_timestamp desc'
        });
        return events || [];
    } catch (e) { return []; }
}

async function getUsdtTransactionCount(address) {
    try {
        const contract = await tronWeb.contract().at(config.USDT_CONTRACT);
        const incoming = await contract.getEvents('Transfer', {
            filter: { to: tronWeb.address.toHex(address) },
            limit: 100,
            order: 'block_timestamp desc'
        });
        const outgoing = await contract.getEvents('Transfer', {
            filter: { from: tronWeb.address.toHex(address) },
            limit: 100,
            order: 'block_timestamp desc'
        });
        return { incoming: incoming.length, outgoing: outgoing.length };
    } catch (e) { return { incoming: 0, outgoing: 0 }; }
}

module.exports = {
    tronWeb,
    getAccountInfo,
    getTrxBalance,
    getUsdtBalance,
    sendTrx,
    getTrxTransactions,
    getUsdtTransactions,
    getUsdtTransactionCount
};
