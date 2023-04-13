const PubNub = require('pubnub');

const credentials = {
  publishKey: 'pub-c-be7b70c6-49af-402e-b710-8955b866fac8',
  subscribeKey: 'sub-c-d0463204-ab8b-43c8-9614-e0914cf40fe5',
  secretKey: 'sec-c-YTJiMmViNWQtOGI1ZS00ZTcwLWE0Y2UtN2MwNzMxYzQ5YWU1'
};

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub {
    constructor({ blockchain, transactionPool }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;

        this.pubnub = new PubNub(credentials);
        this.pubnub.subscribe({ channels: Object.values(CHANNELS) });
        this.pubnub.addListener(this.listener());
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

    listener() {
        return {
            message: messageObject => {
            const { channel, message } = messageObject;
        
            this.handleMessage(channel, message);
            }
        };
    }

    publish({ channel, message }) {
        this.pubnub.publish({ channel, message });
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

// const testPubSub = new PubSub()
// testPubSub.publish({channel: CHANNELS.TEST, message:'hello pubnub'});

module.exports = PubSub;

/* 
Nel primo case dello switch(channel) - Il true è stato aggiunto per avere un flag vero sul validateTransactions. Aggiungendo onSuccess nella funzione replaceChain, essendo il flag vero la condizione descritta in seguito con il callback può far
partire la funzione clearBlockchainTransactions che pulisce tutte le transazioni indicate nel parsedMessage (ovvero nella catena fatta di transazioni approvate nella network intera perchè siamo nella funzione replaceChain) comprendendo tutti i transactionpools di tutti i miners della rete, senza così correre il rischio di far validare a qualcuno delle transazioni che sono invece già presenti nella blockchain

Nella funzione publish({channel, message}) - per evitare ridondanze di messaggi (ovvero che chi pubblica il messaggio poi si rivede lo stesso messaggio perchè è subscriber sullo stesso canale),
si disinscrive temporaneamente la sottoscrizione del publisher per poi
risottoscriverlo un'altra volta (ma almeno non si vede il messaggio due volte)
*/