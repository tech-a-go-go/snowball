class ImpulseDetector {
    constructor() {
        this.priceHistory = [];
        this.lookback = 20;
        this.diffRma = 0;
        this.atrPeriod = 14;
        this.prevUpCond = false;
        this.prevDownCond = false;
        this.baseSlopeMin = 0.0004;
        this.kSlope = 1.2;
        this.kEmaBuf = 0.8;
        this.upImpulseTimes = [];
        this.downImpulseTimes = [];
    }
    get diffAlpha() {
        return 1 / this.atrPeriod;
    }
    addTick(tickPrice, s1Ema9, s1Ema20, timestamp) {
        const flags = { isUptrend: false, isDowntrend: false };
        this.priceHistory.push(tickPrice);
        if (this.priceHistory.length > this.lookback) {
            this.priceHistory.shift();
        }
        if (this.priceHistory.length < 5)
            return flags;
        const p = tickPrice;
        const e9 = s1Ema9;
        const e20 = s1Ema20;
        const prev = this.priceHistory[this.priceHistory.length - 2];
        const absDiff = Math.abs(p - prev);
        this.diffRma = this.diffRma === 0
            ? absDiff
            : this.diffRma + this.diffAlpha * (absDiff - this.diffRma);
        const atrPerTick = this.diffRma;
        const recent = this.priceHistory.slice(-5);
        const slope = this.calculateSlope(recent);
        const slopeUpTh = Math.max(this.baseSlopeMin, this.kSlope * atrPerTick);
        const slopeDnTh = -slopeUpTh;
        const emaBuffer = this.kEmaBuf * atrPerTick;
        const upCond = (e9 - e20 > emaBuffer) && (p > e9) && (slope > slopeUpTh);
        const downCond = (e20 - e9 > emaBuffer) && (p < e9) && (slope < slopeDnTh);
        const upPulse = this.prevUpCond && !upCond;
        const downPulse = this.prevDownCond && !downCond;
        flags.isUptrend = upPulse;
        flags.isDowntrend = downPulse;
        if (upPulse && timestamp !== undefined) this.upImpulseTimes.push(timestamp);
        if (downPulse && timestamp !== undefined) this.downImpulseTimes.push(timestamp);
        this.prevUpCond = upCond;
        this.prevDownCond = downCond;
        return flags;
    }
    calculateSlope(values) {
        if (values.length < 2)
            return 0;
        const n = values.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }
    reset() {
        this.priceHistory = [];
        this.diffRma = 0;
        this.prevUpCond = false;
        this.prevDownCond = false;
        this.upImpulseTimes = [];
        this.downImpulseTimes = [];
    }
}