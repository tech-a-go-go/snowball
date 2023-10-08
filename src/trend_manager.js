'use strict';

const ASCENDING_ORDER = 1
const DESCENDING_ORDER = -1
const UNORDERED = 0

const NO_TREND_STATE = 0
const TREND_UP_STATE = 1
const TREND_DOWN_STATE = 2

class TrendManager {

    constructor() {
        this.currentState = NO_TREND_STATE
        this.trendUpTimeRanges = []
        this.trendDownTimeRanges = []
        this.beginTime = null
    }

    getState() {
        return this.currentState
    }

    clear() {
        this.currentState = NO_TREND_STATE
        this.trendUpTimeRanges = []
        this.trendDownTimeRanges = []
        this.beginTime = null
    }

    *getTrendUpTimeRanges(timerange, now) {
        for(let i = 0; i < this.trendUpTimeRanges.length; i++) {
            let t = this.trendUpTimeRanges[i]
            if (timerange.contains(t) || timerange.overlaps(t) || timerange.within(t)) {
                yield t
            }
        }
        if (this.currentState == TREND_UP_STATE) {
            let t = new TimeRange(this.beginTime, now)
            if (timerange.contains(t) || timerange.overlaps(t) || timerange.within(t)) {
                yield t
            }
        }
    }

    *getTrendDownTimeRanges(timerange, now) {
        for(let i = 0; i < this.trendDownTimeRanges.length; i++) {
            let t = this.trendDownTimeRanges[i]
            if (timerange.contains(t) || timerange.overlaps(t) || timerange.within(t)) {
                yield t
            }
        }
        if (this.currentState == TREND_DOWN_STATE) {
            let t = new TimeRange(this.beginTime, now)
            if (timerange.contains(t) || timerange.overlaps(t) || timerange.within(t)) {
                yield t
            }
        }
    }

    addPrices(time, prices) {
        let order = this.checkPricesOrder(prices)

        if (order === ASCENDING_ORDER) {
            if (this.currentState !== TREND_DOWN_STATE) {
                if(this.currentState === TREND_UP_STATE){
                    this.trendUpTimeRanges.push(new TimeRange(this.beginTime, time))
                }
                this.currentState = TREND_DOWN_STATE
                this.beginTime = time
            }
        } else if (order === DESCENDING_ORDER) {
            if (this.currentState !== TREND_UP_STATE) {
                if(this.currentState === TREND_DOWN_STATE){
                    this.trendDownTimeRanges.push(new TimeRange(this.beginTime, time))
                }
                this.currentState = TREND_UP_STATE
                this.beginTime = time
            }
        } else {
            if (this.currentState === TREND_UP_STATE) {
                this.currentState = NO_TREND_STATE
                this.trendUpTimeRanges.push(new TimeRange(this.beginTime, time))
                this.beginTime = null
            } else if (this.currentState === TREND_DOWN_STATE) {
                this.currentState = NO_TREND_STATE
                this.trendDownTimeRanges.push(new TimeRange(this.beginTime, time))
                this.beginTime = null
            }
        }
    }

    addPrices2(time, order) {
        if (order === ASCENDING_ORDER) {
            if (this.currentState !== TREND_DOWN_STATE) {
                if(this.currentState === TREND_UP_STATE){
                    this.trendUpTimeRanges.push(new TimeRange(this.beginTime, time))
                }
                this.currentState = TREND_DOWN_STATE
                this.beginTime = time
            }
        } else if (order === DESCENDING_ORDER) {
            if (this.currentState !== TREND_UP_STATE) {
                if(this.currentState === TREND_DOWN_STATE){
                    this.trendDownTimeRanges.push(new TimeRange(this.beginTime, time))
                }
                this.currentState = TREND_UP_STATE
                this.beginTime = time
            }
        } else {
            if (this.currentState === TREND_UP_STATE) {
                this.currentState = NO_TREND_STATE
                this.trendUpTimeRanges.push(new TimeRange(this.beginTime, time))
                this.beginTime = null
            } else if (this.currentState === TREND_DOWN_STATE) {
                this.currentState = NO_TREND_STATE
                this.trendDownTimeRanges.push(new TimeRange(this.beginTime, time))
                this.beginTime = null
            }
        }
    }

    checkPricesOrder(prices) {
        if (prices.length < 2) return UNORDERED;
        if (prices.every((val, i, prices) => !i || (prices[i] >= prices[i - 1]))) {
            return ASCENDING_ORDER;
        }
        else if (prices.every((val, i, prices) => !i || (prices[i] <= prices[i - 1]))) {
            return DESCENDING_ORDER;
        }
        return UNORDERED;
    }
}
