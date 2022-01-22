const redis = require('redis');

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub {
    constructor({ blockchain, transactionPool }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;

        this.publisher = redis.createClient();
        this.subscriber = redis.createClient();

        this.subscribeToChannels();

        this.subscriber.on(
            'message',
            (channel, message) => this.handleMessage(channel, message)
        );
    }

    handleMessage(channel, message) {
        console.log(`Message received. Channel: ${channel}. Message: ${message}.`);

        const parsedMessage = JSON.parse(message);

        switch(channel) {
            case CHANNELS.BLOCKCHAIN:
                this.blockchain.replaceChain(parsedMessage, true, () => {
                    this.transactionPool.clearBlockchainTransactions({
                        chain: parsedMessage
                    });
                });
                break;
            case CHANNELS.TRANSACTION:
                this.transactionPool.setTransaction(parsedMessage);
                break;
            default:
                return;
        }
    }

    subscribeToChannels() {
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }

    publish({ channel, message }) {
        this.subscriber.unsubscribe(channel, () => {
            this.publisher.publish(channel, message, () => {
                this.subscriber.subscribe(channel);
            });
        });
    }

    broadcastChain() {
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }

    broadcastTransaction(transaction) {
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        });
    }
}

module.exports = PubSub;

/* 
Nel primo case dello switch(channel) - Il true è stato aggiunto per avere un flag vero sul validateTransactions. Aggiungendo onSuccess nella funzione replaceChain, essendo il flag vero la condizione descritta in seguito con il callback può far
partire la funzione clearBlockchainTransactions che pulisce tutte le transazioni indicate nel parsedMessage (ovvero nella catena fatta di transazioni approvate nella network intera perchè siamo nella funzione replaceChain) comprendendo tutti i transactionpools di tutti i miners della rete, senza così correre il rischio di far validare a qualcuno delle transazioni che sono invece già presenti nella blockchain

Nella funzione publish({channel, message}) - per evitare ridondanze di messaggi (ovvero che chi pubblica il messaggio poi si rivede lo stesso messaggio perchè è subscriber sullo stesso canale),
si disinscrive temporaneamente la sottoscrizione del publisher per poi
risottoscriverlo un'altra volta (ma almeno non si vede il messaggio due volte)
*/