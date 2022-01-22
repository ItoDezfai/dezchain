const Transaction = require('./transaction');

class TransactionPool {
    constructor() {
        this.transactionMap = {};
    }

    clear() {
        this.transactionMap = {};
    }
    
    setTransaction(transaction) {
        this.transactionMap[transaction.id] = transaction;
    }

    setMap(transactionMap) {
        this.transactionMap = transactionMap;
    }

    existingTransaction({ inputAddress }) {
        const transactions = Object.values(this.transactionMap);

        return transactions.find(transaction => transaction.input.address === inputAddress);
    }

    validTransactions() {
        return Object.values(this.transactionMap).filter(
            transaction => Transaction.validTransaction(transaction)
        );
    }

    clearBlockchainTransactions({ chain }) {
        for (let i=1; i<chain.length; i++) {
            const block = chain[i];

            for (let transaction of block.data) {
                if (this.transactionMap[transaction.id]) {
                    delete this.transactionMap[transaction.id];
                }
            }
        }
    }
}

module.exports = TransactionPool;

/* 
return Object.values(this.transactionMap).filter(  - voglio un array di tutte le transazioni dentro TransactionMap che sono valide. Il filter è una funzione utile che permette di estrarre solo i valori di un array che passano una condizione (ritenuti true), e toglie i valori falsi
(transaction) => Transaction.validTransaction(transaction) - questa è la condizione di passaggio dei valori (che le transazioni siano ritenute vere dalla funzione validTransaction)
clearBlockchainTransactions({ chain }) - questa funzione cancella solo le transazioni che sono state inserite a blockchain
for (let i=1; i<chain.length; i++) - parte da 1 perchè il primo blocco è il genesis block
for (let transaction of block.data) - ci permette di creare una variabile automaticamente per un array di dati in un for loop
*/
