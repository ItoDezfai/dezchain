const Transaction = require('../wallet/transaction');

class TransactionMiner {
    constructor({ blockchain, transactionPool, wallet, pubsub }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }

    mineTransactions() {
        const validTransactions = this.transactionPool.validTransactions(); 

        validTransactions.push(
            Transaction.rewardTransaction({ minerWallet: this.wallet })
        );

        this.blockchain.addBlock({ data: validTransactions });

        this.pubsub.broadcastChain();

        this.transactionPool.clear();
    }
}

module.exports = TransactionMiner;

/* 
1. get the transaction pool's valid transactions
2. generate the miner's reward
3. add a block consisting of these transactions to the blockchain
4. broadcast the updated blockchain
5. clear the pool
*/