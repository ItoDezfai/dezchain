const Transaction = require('./transaction');
const { STARTING_BALANCE } = require('../config');
const { ec, cryptoHash } = require('../util');

class Wallet {
    constructor() {
        this.balance = STARTING_BALANCE;

        this.keyPair = ec.genKeyPair();

        this.publicKey = this.keyPair.getPublic().encode('hex');
    }

    sign(data) {
        return this.keyPair.sign(cryptoHash(data))
    }

    createTransaction({ recipient, amount, chain }) {
        if (chain) {
            this.balance = Wallet.calculateBalance({
                chain,
                address: this.publicKey
            });
        }

        if (amount > this.balance) {
            throw new Error('Amount exceeds balance');
        }

        return new Transaction({ senderWallet: this, recipient, amount });
    }

    static calculateBalance({ chain, address }) {
        let hasConductedTransaction = false;
        let outputsTotal = 0;

        for (let i=chain.length-1; i>0; i--) {
            const block = chain[i];

            for (let transaction of block.data) {
                if (transaction.input.address === address) {
                    hasConductedTransaction = true;
                }

                const addressOutput = transaction.outputMap[address];

                if (addressOutput) {
                    outputsTotal = outputsTotal + addressOutput;
                }
            }

            if (hasConductedTransaction) {
                break;
            }
        }

        return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal;
    }
};

module.exports = Wallet;

/* 
if (transaction.input.address === address) - se la transazione matcha con una transazione che ho fatto io allora
si flagga come vero e si smette di sommare gli outputs (con il break sotto riportato alla fine) perchè quella è l'ultima mia transazione effettuata che ha già tenuto conto di tutte le transazioni avvenute precedentemente
const addressOutput = transaction.outputMap[address]; - altrimenti se la conductedTransaction è falsa, vuole dire che la transazione non è fatta da me, ma da altri verso di me e devo aggiungere la somma degli outputs (che possono essere accaduti dopo la mia ultima transazione fatta da me)
if (addressOutput) - aggiunge il valore solo se il wallet riceve una transazione (quindi esiste un valore) da altri allo stesso indirizzo
if (hasConductedTransaction) {break;} - l'ultima mia transazione effettuata tiene già conto di tutte le transazioni avvenute precedentemente
se hasConductedTransaction è vero (io ho condotto una transazione) ritorna outputsTotal, altrimenti riporta lo STARTING_BALANCE + outputsTotal calcolato progressivamente
*/