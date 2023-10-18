'use strict';

class PriceManager extends EventTarget {

    constructor() {
        super()

        console.log('PriceManager initializing...')

        this.rawData = []

        this.s1OhlcBuf = new OhlcBuffer("1s")
        this.s1Ema9 = new Ema(9)
        this.s1Ema125 = new Ema(125)
        this.s1Ema150 = new Ema(150)
    
        this.m1OhlcBuf = new OhlcBuffer("1m")
        this.m1Ema9 = new Ema(9)
        this.m1Ema25 = new Ema(25)
        this.m1Ema45 = new Ema(45) // m5Ema9とほぼ同じ
        this.m1Ema75 = new Ema(75)
        this.m1Ema250 = new Ema(250)

        this.m5OhlcBuf = new OhlcBuffer("5m")
        this.m5Ema9 = new Ema(9)

        this.h1OhlcBuf = new OhlcBuffer("1h")
        this.h1Ema9 = new Ema(9)

        this.trendManager1 = new TrendManager()
        this.trendManager2 = new TrendManager()

        this.trends = []
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
        let timestamp = Math.floor(date.getTime() / 1000);
        let result = this.store(timestamp, price)

        this.dispatchEvent(new CustomEvent('priceData', { detail: {timestamp, price} }))
        
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
        this.s1Ema125.clear()
        this.s1Ema150.clear()
        this.m1OhlcBuf.clear()
        this.m1Ema9.clear()
        this.m1Ema25.clear()
        this.m1Ema45.clear()
        this.m1Ema75.clear()
        this.m1Ema250.clear()
        this.m5OhlcBuf.clear()
        this.m5Ema9.clear()

        this.trendManager1.clear()
        this.trendManager2.clear()
    }

    store(unixtime, price) {
        this.rawData.push({timestamp: unixtime, price: price})

        const s1Result = this.s1OhlcBuf.addPrice(price, unixtime)
        this.s1Ema9.add(price, s1Result.normalizedTs)
        this.s1Ema125.add(price, s1Result.normalizedTs)
        this.s1Ema150.add(price, s1Result.normalizedTs)

        const m1Result = this.m1OhlcBuf.addPrice(price, unixtime)
        this.m1Ema9.add(price, m1Result.normalizedTs)
        this.m1Ema25.add(price, m1Result.normalizedTs)
        this.m1Ema45.add(price, m1Result.normalizedTs)
        this.m1Ema75.add(price, m1Result.normalizedTs)
        this.m1Ema250.add(price, m1Result.normalizedTs)

        const m5Result = this.m5OhlcBuf.addPrice(price, unixtime)
        this.m5Ema9.add(price, m5Result.normalizedTs)

        const h1Result = this.h1OhlcBuf.addPrice(price, unixtime)
        this.h1Ema9.add(price, h1Result.normalizedTs)

        if (s1Result.newPeriod) {
            if (this.s1Ema9.count() > 0 && this.m1Ema9.count() > 0) {
                let d = this.s1Ema9.getLast()
                this.trendManager1.addPrices(d.ts * 1000, 
                [
                    // d.price,
                    this.s1Ema125.getLast().price,
                    this.s1Ema150.getLast().price,
                    this.m1Ema9.getLast().price,
                    this.m1Ema45.getLast().price, // m5Ema9とほぼ同じ
                    this.m1Ema75.getLast().price,
                    this.h1Ema9.getLast().price,
                ])
                let order = UNORDERED
                if (this.m1Ema9.getLast().price > this.m1Ema25.getLast().price
                    && this.m1Ema9.getLast().price > this.m5Ema9.getLast().price
                    && this.m1Ema9.getLast().price > this.h1Ema9.getLast().price) {
                    order = DESCENDING_ORDER
                } else if (this.m1Ema9.getLast().price < this.m1Ema25.getLast().price
                && this.m1Ema9.getLast().price < this.m5Ema9.getLast().price
                && this.m1Ema9.getLast().price < this.h1Ema9.getLast().price) {
                    order = ASCENDING_ORDER
                }
                this.trendManager2.addPrices2(d.ts * 1000, order)

                let trendA = this.trendManager1.getState();
                let trendB = this.trendManager2.getState();

                let trend = NO_TREND_STATE;
                if (trendA === TREND_UP_STATE && trendB === TREND_UP_STATE) {
                    trend = TREND_UP_STATE;
                } else if (trendA === TREND_DOWN_STATE && trendB === TREND_DOWN_STATE) {
                    trend = TREND_DOWN_STATE;
                }
                this.trends.push({timestamp:unixtime, price, trend})
            } 
        }

        return {"s1NewPeriod": s1Result.newPeriod, "m1NewPeriod": m1Result.newPeriod, "m5NewPeriod": m5Result.newPeriod, "h1NewPeriod": h1Result.newPeriod}
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