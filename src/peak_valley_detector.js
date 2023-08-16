'use strict';

class PeakValleyDetector {
    constructor(windowSize, emaSize) {
        this.windowBuffer = new WindowBuffer(windowSize)
        this.ema = new Ema(emaSize)

        this.lastDirection = 0;
        this.lastEmaValue = null;
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

    store(time, price) {
        const emaTime = this.windowBuffer.getNormalize(time)
        this.ema.add(price, emaTime)
        const emaValue = this.ema.getLast().price

        time *= 1000
        let result = this._detectPeakValley(time, price, emaValue)
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

    _detectPeakValley(time, price, emaValue) {
        if(this.lastEmaValue === null) {
            this.lastEmaValue = emaValue;
            return null;
        }

        const currentDirection = (emaValue > this.lastEmaValue) ? 1 : -1;
        let result = null;

        if(this.lastDirection !== 0 && currentDirection !== this.lastDirection) {
            if(this.lastDirection === 1) {
                result = {id: this.currentId, time: this.currentPeak.time, price: this.currentPeak.price, ema: this.currentPeak.ema, type: 'Peak', fixedTime: time, fixedPrice: price};
                this.currentPeak = null;
            } else {
                result = {id: this.currentId, time: this.currentValley.time, price: this.currentValley.price, ema: this.currentValley.ema, type: 'Valley', fixedTime: time, fixedPrice: price};
                this.currentValley = null;
            }
            this.currentId++;
        }

        if(currentDirection === 1) {
            if(!this.currentPeak || price > this.currentPeak.price) {
                this.currentPeak = {time, price, emaValue};
            }
        } else if(currentDirection === -1) {
            if(!this.currentValley || price < this.currentValley.price) {
                this.currentValley = {time, price, emaValue};
            }
        }

        this.lastEmaValue = emaValue;
        this.lastDirection = currentDirection;

        return result;
    }


    clear() {
        this.ema.clear()
        this.lastDirection = 0;
        this.lastEmaValue = null;
        this.currentPeak = null;
        this.currentValley = null;
        this.currentId = 1;
        this.peakValley = []
        this.fixedPeak = []
        this.fixedValley = []
    }
}
