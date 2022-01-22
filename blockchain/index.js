const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const { cryptoHash }  = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
    }

    addBlock({ data }) {
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],
            data
        });

        this.chain.push(newBlock);
    }

    replaceChain(chain, validateTransactions, onSuccess) {
        if (chain.length <= this.chain.length) {
            console.error('The incoming chain must be longer');
            return;
        }
        
        if (!Blockchain.isValidChain(chain)) {
            console.error('The incoming chain must be valid');
            return;
        }

        if (validateTransactions && !this.validTransactionData({ chain })) {
            console.error('The incoming chain has invalid data');
            return;
        }

        if (onSuccess) onSuccess();
        console.log('replacing chain with', chain);
        this.chain = chain;
    }

    validTransactionData({ chain }) {
        for (let i=1; i<chain.length; i++) {
            const block = chain[i];
            const transactionSet = new Set();
            let rewardTransactionCount = 0;

            for (let transaction of block.data) {
                if (transaction.input.address === REWARD_INPUT.address) {
                    rewardTransactionCount += 1;

                    if (rewardTransactionCount > 1) {
                        console.error('Miner rewards exceed limit');
                        return false;
                    }

                    if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                } else {
                    if (!Transaction.validTransaction(transaction)) {
                        console.error('Invalid transaction');
                        return false;
                    }

                    const trueBalance = Wallet.calculateBalance({
                        chain: this.chain,
                        address: transaction.input.address
                    });

                    if (transaction.input.amount !== trueBalance) {
                        console.error('Invalid input amount');
                        return false;
                    }

                    if (transactionSet.has(transaction)) {
                        console.error('An identical transaction appears more than once in the block');
                        return false;
                    } else {
                        transactionSet.add(transaction);
                    }
                }
            }
        }

        return true;
    }

    static isValidChain(chain) {
        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
            return false;
        };

        for (let i=1; i<chain.length; i++) {
            const { timestamp, lastHash, hash, nonce, difficulty, data } = chain[i];
            const actualLastHash = chain[i-1].hash;
            const lastDifficulty = chain[i-1].difficulty;

            if(lastHash !== actualLastHash) return false;

            const validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);

            if (hash !== validatedHash) return false;

            if (Math.abs(lastDifficulty - difficulty) > 1) return false;
        }

        return true;
    }
}

module.exports = Blockchain;

/* 
In replaceChain - è stato aggiunto onSuccess per flaggare le transazioni approvate dai miners e che sono nella blockchain
Per la funzione validTransactionData - per validare dovremmo controllare che i wallet input balances siano validi in accordo alla blockchain history, ma non possiamo accettare di default nuove catene in ingresso perchè potrebbero essere fake. Quindi andiamo a validare gli input balances di ogni istanza della propria blockchain history, e per questo motivo questo metodo non è statico
const transactionSet = new Set(); - questo una classe nativa di Java che crea una data structure che permette di fare una collezione di items unici. Questa costante la mettiamo qui per essere creata ad ogni singolo blocco.
if (transaction.input.address === REWARD_INPUT.address) - qui identifica solo le transazioni di avvenuto reward (e quindi validate)
if (rewardTransactionCount > 1) - per ogni transazione ci deve essere uno e un solo reward
if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) - per controllare che il reward sia valido, si fa un check sull'amount di reward stabilito. Se è uguale va bene. Non avendo l'indirizzo a priori dell'outputMap, usiamo Object.values per accedere ai suoi contenuti sapendo che solo il primo elemento dell'array riporta l'indirizzo del reward.
a riga 61 - sull'else dell'if - se la transazione non è una transazione di reward, dobbiamo controllare se è valida
const trueBalance = Wallet.calculateBalance - ora dobbiamo mettere un controllo sulla validità della transazione basato sulla compatibilità del wallet con l'intera storia della blockchain. Fortunatamente abbiamo la funzione calculatedBalance che permette già di fare questo controllo.
chain: this.chain, - questa DEVE essere this.chain ovvero una catena validata in base alla corrente e accettata blockchain, e non la chain presa in input a validTransactionData perchè quella può essere un fake da un attaccante.
if (transaction.input.amount !== trueBalance) - ora abbiamo controllato che l'input amount della transaction matcha con quello della intera blockchain history. Questo controllo completa la validazione dei dati della transazione
if (transactionSet.has(transaction))  - per ogni blocco ci deve essere una e una sola transazione univoca. Se ci sono transazioni identiche a quelle storate, ritorna falso
su else a riga 80 - altrimenti aggiunge la transazione al set
const lastDifficulty = chain[i-1].difficulty; - aggiunto per avere una valutazione in più per evitare l'attacco di manomissione difficulty
if (Math.abs(lastDifficulty - difficulty) > 1) return false; - valutazione per evitare salti anomali nella difficulty. Senza Math.abs sarebbe solo una valutazione per evitare il caso di manomissione in ribasso. Con math.abs prendo il valore assoluto (quindi comprendo il caso anche con manomissione in rialzo, difficulty troppo alta che può bloccare la blockchain intera)
*/