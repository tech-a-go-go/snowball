'use strict';

class PriceManager extends EventTarget {

    constructor() {
        super()

        console.log('PriceManager initializing...')

        this.s1OhlcBuf = new OhlcBuffer("1s")
        this.s1Ema9 = new Ema(9)
        this.s1Ema32 = new Ema(32)
        // this.s1Ema75 = new Ema(75)
        this.s1Ema125 = new Ema(125)
    
        this.m1OhlcBuf = new OhlcBuffer("1m")
        this.m1Ema9 = new Ema(9)
        this.m1Ema25 = new Ema(25)
        this.m1Ema75 = new Ema(75)
        this.m1Ema250 = new Ema(250)
    }

    static getInstance() {
        if (!window.priceManager) {
            window.priceManager = new PriceManager()
            window.priceManager.subscribeStreaming()
        }
        return window.priceManager
    }

    size() {
        return this.s1OhlcBuf.size()
    }

    onPriceReceive(priceData) {
        let buyPrice = parseInt(priceData[3][0] * 1000, 10)
        let sellPrice = parseInt(priceData[2][0] * 1000, 10)
        let price = (buyPrice + sellPrice) / 2 / 1000
        let date = new Date(priceData[1]);
        let unixtime = Math.floor(date.getTime() / 1000);
        let result = this.store(unixtime, price)

        if (result.s1NewPeriod) {
            if (result.m1NewPeriod) {
                // s1 is also in the new period
                this.dispatchEvent(new Event('m1NewPeriod'))
            } else {
                this.dispatchEvent(new Event('s1NewPeriod'))
            }
        } 
    }

    clear() {
        this.s1OhlcBuf.clear()
        this.s1Ema9.clear()
        this.s1Ema32.clear()
        // this.s1Ema75.clear()
        this.s1Ema125.clear()
        this.m1OhlcBuf.clear()
        this.m1Ema9.clear()
        this.m1Ema25.clear()
        this.m1Ema75.clear()
        this.m1Ema250.clear()
    }

    store(unixtime, price) {
        const s1Result = this.s1OhlcBuf.addPrice(price, unixtime)
        this.s1Ema9.add(price, s1Result.normalizedTs)
        this.s1Ema32.add(price, s1Result.normalizedTs)
        // this.s1Ema75.add(price, s1Result.normalizedTs)
        this.s1Ema125.add(price, s1Result.normalizedTs)

        const m1Result = this.m1OhlcBuf.addPrice(price, unixtime)
        this.m1Ema9.add(price, m1Result.normalizedTs)
        this.m1Ema25.add(price, m1Result.normalizedTs)
        this.m1Ema75.add(price, m1Result.normalizedTs)
        this.m1Ema250.add(price, m1Result.normalizedTs)

        return {"s1NewPeriod": s1Result.newPeriod, "m1NewPeriod": m1Result.newPeriod}
    }

    bulkStore(data) {
        this.clear()
        data.forEach((d) => {
            this.store(d.ts, d.price)
        })
    }

    subscribeStreaming() {
        let messageBroker = window.raise.MessageBrokerHolder.get()
        messageBroker.subscribe("price.USD/JPY", 'PRICE', this.onPriceReceive, this);
    }
}