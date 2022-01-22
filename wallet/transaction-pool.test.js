const TransactionPool = require('./transaction-pool');
const Transaction = require('./transaction');
const Wallet = require('./index');
const Blockchain = require('../blockchain');

describe('TransactionPool', () => {
    let transactionPool, transaction, senderWallet;

    beforeEach(() => {
       transactionPool = new TransactionPool();
       senderWallet = new Wallet();
       transaction = new Transaction({
           senderWallet,
           recipient: 'fake-recipient',
           amount: 50
       }); 
    });

    describe('setTransaction()', () => {
        it('adds a transaction', () => {
            transactionPool.setTransaction(transaction);

            expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
        });
    });

    describe('existingTransaction()', () => {
        it('returns an existing transaction given an input address', () => {
            transactionPool.setTransaction(transaction);

            expect(transactionPool.existingTransaction({ inputAddress: senderWallet.publicKey })).toBe(transaction);
        });
    });

    describe('validTransactions()', () => {
        let validTransactions, errorMock;

        beforeEach(() => {
            validTransactions = [];
            errorMock = jest.fn(); 
            global.console.error = errorMock;   // mi permette di non far vedere sempre a display tutte le transazioni marcate come false

            for (let i=0; i<10; i++) {
                transaction = new Transaction({
                    senderWallet,
                    recipient: 'any-recipient',
                    amount: 30
                });

                if (i%3===0) {
                    transaction.input.amount = 999999;  // ogni transazioni divisibile per tre (partendo da zero i.e. 0, 3, 9, etc.) inserisco una transaction non valida manomettendo l'amount
                } else if (i%3===1) {
                    transaction.input.signature = new Wallet().sign('foo'); // ogni transazioni divisibile per 3 (partendo da 1 i.e. 1, 4, 7, etc.) rendo invalida la transaction manomettendo la signature
                } else {
                    validTransactions.push(transaction);    // tutte le altre le metto nel pool
                }

                transactionPool.setTransaction(transaction);
            }
        });

        it('returns valid transaction',() => {
            expect(transactionPool.validTransactions()).toEqual(validTransactions);
        });

        it('logs errors for the invalid transactions', () => {  // questo test è per vedere se effettivamente la funzione che registra gli errori (in questo caso le transazioni ritenute non valide), viene effettivamente chiamata e quindi funzionante
            transactionPool.validTransactions();
            expect(errorMock).toHaveBeenCalled();
        });
    });

    describe('clear()', () => {
        it('clears the transactions', () => {
            transactionPool.clear();

            expect(transactionPool.transactionMap).toEqual({});
        });
    });

    describe('clearBlockchainTransactions()', () => { // questo test è per la funzione di pulire le transazioni del pool se queste transazioni sono già contenute nella blockchain (questo vuol dire che qualcuno le ha già validate). E' una funzione di pulizia un po' più sofisticata di clear()
        it('clears the pool of any existing blockchain transactions', () => {
            const blockchain = new Blockchain();
            const expectedTransactionMap = {};

            for (let i=0; i<6; i++) {       // in questo test si creano 6 transazioni che verranno tutte registrate nella transaction pool, ma solo metà di queste verranno aggiunte alla blockchain
                const transaction = new Wallet().createTransaction({
                    recipient: 'foo', amount: 20
                });

                transactionPool.setTransaction(transaction);

                if (i%2===0) {
                    blockchain.addBlock({ data: [transaction] })    // solo queste transazioni verranno inserite nella blockchain
                } else {
                    expectedTransactionMap[transaction.id] = transaction; // mentre per le altre non inserite nella blockchain, queste verranno mappate in una expectedTransactionMap
                }
            }

            transactionPool.clearBlockchainTransactions({ chain: blockchain.chain }); // chiamo la funzione che dovrebbe pulire nella transaction pool solo quelle transazioni che sono state inserite nella blockchain

            expect(transactionPool.transactionMap).toEqual(expectedTransactionMap); // alla fine mi aspetto che quelle rimanenti nella transaction pool (mappate nella transactionmap) siano le stesse della expectedTransactionMap
        });
    });
});