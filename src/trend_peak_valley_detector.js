class TrendPeakValleyDetector {
    constructor() {
        this.currentTrend = null
        this.lastTrend = null;
        this.secondLastTrend = null

        this.currentPeak = null;
        this.currentValley = null;
        this.currentId = 1;

        this.peakValley = []
        this.fixedPeak = []
        this.fixedValley = []
    }

    getPeakValley() {
        return [...this.peakValley]
    }

    bulkStore(data) {
        this.clear()
        data.forEach((d) => {
            this.store(d.ts, d.close)
        })
    }

    store(time, price, trend) {
        time *= 1000

        let result = this._detectPeakValley(time, price, trend)
        if (result) {
            if (result.type === 'Peak') {
                this.peakValley.push([result.time, result.price])
                this.fixedPeak.push([result.fixedTime, result.fixedPrice])
            } else if (result.type === 'Valley') {
                this.peakValley.push([result.time, result.price])
                this.fixedValley.push([result.fixedTime, result.fixedPrice])
            }
            return result
        }
        return null
    }

    _detectPeakValley(time, price, trend) {
        let result = null;

        if (this.currentTrend != trend) {
            this.secondLastTrend = this.lastTrend;
            this.lastTrend = this.currentTrend;
            this.currentTrend = trend

            if (this.secondLastTrend === TREND_UP_STATE && this.lastTrend === NO_TREND_STATE && this.currentTrend === TREND_UP_STATE) {
                result = {id: this.currentId++, time: this.currentValley.time, price: this.currentValley.price, trend: this.lastTrend, type: 'Valley', fixedTime: time, fixedPrice: price};
                this.currentValley = null;
                this.currentPeak = null;
            }
            else if (this.secondLastTrend === TREND_DOWN_STATE && this.lastTrend === NO_TREND_STATE && this.currentTrend === TREND_DOWN_STATE) {
                result = {id: this.currentId++, time: this.currentPeak.time, price: this.currentPeak.price, trend: this.lastTrend, type: 'Peak', fixedTime: time, fixedPrice: price};
                this.currentPeak = null;
                this.currentValley = null;
            }
            else if ((this.secondLastTrend === TREND_UP_STATE && this.lastTrend === NO_TREND_STATE && this.currentTrend === TREND_DOWN_STATE) ||
                (this.secondLastTrend === TREND_DOWN_STATE && this.lastTrend === NO_TREND_STATE && this.currentTrend === TREND_UP_STATE)) {
                this.currentPeak = null;
                this.currentValley = null;
            }
            else if (this.lastTrend === TREND_UP_STATE && this.currentTrend === TREND_DOWN_STATE) {
                result = {id: this.currentId++, time: this.currentPeak.time, price: this.currentPeak.price, trend: this.lastTrend, type: 'Peak', fixedTime: time, fixedPrice: price};
                this.currentPeak = null;
                this.currentValley = null;
            }
            else if (this.lastTrend === TREND_DOWN_STATE && this.currentTrend === TREND_UP_STATE) {
                result = {id: this.currentId++, time: this.currentValley.time, price: this.currentValley.price, trend: this.lastTrend, type: 'Valley', fixedTime: time, fixedPrice: price};
                this.currentValley = null;
                this.currentPeak = null;
            }
            else if (this.lastTrend === NO_TREND_STATE && this.currentTrend === TREND_UP_STATE) {
                result = {id: this.currentId++, time: this.currentValley.time, price: this.currentValley.price, trend: this.lastTrend, type: 'Valley', fixedTime: time, fixedPrice: price};
                this.currentValley = null;
                this.currentPeak = null;
            }
            else if (this.lastTrend === TREND_UP_STATE && this.currentTrend === NO_TREND_STATE) {
                result = {id: this.currentId++, time: this.currentPeak.time, price: this.currentPeak.price, trend: this.lastTrend, type: 'Peak', fixedTime: time, fixedPrice: price};
                this.currentPeak = null;
                this.currentValley = null;
            }
            else if (this.lastTrend === NO_TREND_STATE && this.currentTrend === TREND_DOWN_STATE) {
                result = {id: this.currentId++, time: this.currentPeak.time, price: this.currentPeak.price, trend: this.lastTrend, type: 'Peak', fixedTime: time, fixedPrice: price};
                this.currentPeak = null;
                this.currentValley = null;
            }
            else if (this.lastTrend === TREND_DOWN_STATE && this.currentTrend === NO_TREND_STATE) {
                result = {id: this.currentId++, time: this.currentValley.time, price: this.currentValley.price, trend: this.lastTrend, type: 'Valley', fixedTime: time, fixedPrice: price};
                this.currentValley = null;
                this.currentPeak = null;
            }
        }

        if (this.currentTrend === NO_TREND_STATE) {
            if (!this.currentPeak || price > this.currentPeak.price) {
                this.currentPeak = { time, price };
            }
            if (!this.currentValley || price < this.currentValley.price) {
                this.currentValley = { time, price };
            }
        } else if (this.currentTrend === TREND_UP_STATE) {
            if (!this.currentPeak || price > this.currentPeak.price) {
                this.currentPeak = { time, price };
            }
        } else if (this.currentTrend === TREND_DOWN_STATE) {
            if (!this.currentValley || price < this.currentValley.price) {
                this.currentValley = { time, price };
            }
        }

        return result;
    }

}
