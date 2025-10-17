class ZigZag {
    constructor(devThreshold = 5.0, depth = 10, allowZigZagOnOneBar = true, options) {
        this.ticksOffset = 0;
        if (depth < 1) {
            throw new Error('Depth must be greater than 0');
        }
        this.devThreshold = devThreshold;
        this.depth = depth;
        this.allowZigZagOnOneBar = allowZigZagOnOneBar;
        this.ticks = [];
        this.pivots = [];
        this._lastCheckedIndex = 0;
        this.maxTicksToKeep = options?.maxTicksToKeep || (depth * 3 + 50);
        this.trimBatchSize = options?.trimBatchSize || Math.floor(this.maxTicksToKeep * 0.2);
        this.maxPivotsToKeep = options?.maxPivotsToKeep || 1000;
    }
    getPivots() {
        return this.pivots;
    }
    _calcDev(basePrice, price) {
        return (100 * (price - basePrice)) / Math.abs(basePrice);
    }
    _isMorePrice(pivot, tick) {
        const m = pivot.isHigh ? 1 : -1;
        return tick.price * m > pivot.end.price * m;
    }
    _lastPivot() {
        let numberOfPivots = this.pivots.length;
        return numberOfPivots > 0 ? this.pivots[numberOfPivots - 1] : null;
    }
    _updateLastPivot(tick) {
        let lastPivot = this._lastPivot();
        if (!lastPivot)
            return;
        if (this.pivots.length === 1) {
            lastPivot.start = tick;
        }
        lastPivot.end = tick;
    }
    _addPivot(newPivot, finalizedTime) {
        let finalizedPivot = null;
        const last = this._lastPivot();
        if (last) {
            last.isFinalized = true;
            last.finalizedTime = finalizedTime; // 確定した時刻を保存
            finalizedPivot = last;
        }
        this.pivots.push(newPivot);
        if (this.pivots.length > this.maxPivotsToKeep * 1.2) {
            this._trimPivots();
        }
        return {
            finalizedPivot,
            newPivot
        };
    }
    _trimPivots() {
        const finalizedPivots = this.pivots.filter(p => p.isFinalized);
        const unfinalizedPivots = this.pivots.filter(p => !p.isFinalized);
        if (finalizedPivots.length > this.maxPivotsToKeep - 10) {
            this.pivots = [
                ...finalizedPivots.slice(-(this.maxPivotsToKeep - 10)),
                ...unfinalizedPivots
            ];
        }
    }
    _trimTicksIfNeeded() {
        const trimThreshold = this.maxTicksToKeep + 100;
        if (this.ticks.length > trimThreshold) {
            const removeCount = this.ticks.length - this.maxTicksToKeep;
            this.ticks = this.ticks.slice(removeCount);
            this.ticksOffset += removeCount;
            this._lastCheckedIndex = Math.max(0, this._lastCheckedIndex - removeCount);
        }
    }
    _isPivotPointCandidate(srcSeries, depth, isHigh) {
        const candidateIndex = srcSeries.length - depth - 1;
        if (candidateIndex < 0 || candidateIndex >= srcSeries.length) {
            return null;
        }
        const candidate = srcSeries[candidateIndex];
        if (!candidate) {
            return null;
        }
        let pivotPrice = candidate.price;
        if (srcSeries.length > depth * 2) {
            let isFound = true;
            for (let i = candidateIndex + 1; i <= Math.min(srcSeries.length - 1, candidateIndex + depth); i++) {
                const tick = srcSeries[i];
                if (!tick)
                    continue;
                if ((isHigh && tick.price > pivotPrice) || (!isHigh &&
                    tick.price < pivotPrice)) {
                    isFound = false;
                    break;
                }
            }
            for (let i = candidateIndex - 1; i >= Math.max(0, candidateIndex -
                depth); i--) {
                const tick = srcSeries[i];
                if (!tick)
                    continue;
                if ((isHigh && tick.price >= pivotPrice) || (!isHigh &&
                    tick.price <= pivotPrice)) {
                    isFound = false;
                    break;
                }
            }
            if (isFound) {
                return candidate;
            }
        }
        return null;
    }
    _newPivotPointFound(isHigh, tick) {
        const lastPivot = this._lastPivot();
        if (lastPivot !== null) {
            if (lastPivot.isHigh === isHigh) {
                if (this._isMorePrice(lastPivot, tick)) {
                    this._updateLastPivot(tick);
                    return null;
                }
            }
            else {
                const dev = this._calcDev(lastPivot.end.price, tick.price);
                if ((!lastPivot.isHigh && dev >= this.devThreshold) ||
                    (lastPivot.isHigh && dev <= -1 * this.devThreshold)) {
                    const newPivot = {
                        isHigh,
                        start: lastPivot.end,
                        end: tick,
                        isFinalized: false
                    };
                    const result = this._addPivot(newPivot, tick.time); // 確定時刻を渡す
                    return {
                        finalizedPivot: result.finalizedPivot,
                        newPivot
                    };
                }
            }
        }
        else {
            const firstPivot = {
                isHigh,
                start: tick,
                end: tick,
                isFinalized: false
            };
            const result = this._addPivot(firstPivot, null); // 最初のpivotは確定時刻なし
            return {
                finalizedPivot: result.finalizedPivot,
                newPivot: firstPivot
            };
        }
        return null;
    }
    update(tick) {
        this.ticks.push({
            time: tick.time,
            price: tick.price
        });
        this._trimTicksIfNeeded();
        if (this.ticks.length < this.depth * 2 + 1) {
            return null;
        }
        const minRequiredIndex = this.depth;
        const fromIndex = Math.max(this._lastCheckedIndex - this.depth, minRequiredIndex);
        const toIndex = this.ticks.length;
        const pricesSeries = this.ticks.slice(Math.max(0, fromIndex -
            this.depth), toIndex);
        let result = null;
        if (pricesSeries.length >= this.depth * 2 + 1) {
            const highPivot = this._isPivotPointCandidate(pricesSeries, this.depth, true);
            if (highPivot) {
                result = this._newPivotPointFound(true, highPivot);
            }
            if ((this.allowZigZagOnOneBar || !highPivot) && (!result || result.newPivot === null)) {
                const lowPivot = this._isPivotPointCandidate(pricesSeries, this.depth, false);
                if (lowPivot) {
                    result = this._newPivotPointFound(false, lowPivot);
                }
            }
        }
        this._lastCheckedIndex = toIndex - 1;
        return result;
    }
    getMemoryStats() {
        return {
            ticksCount: this.ticks.length,
            pivotsCount: this.pivots.length,
            ticksOffset: this.ticksOffset,
            totalTicksProcessed: this.ticksOffset + this.ticks.length,
            maxTicksToKeep: this.maxTicksToKeep,
            trimBatchSize: this.trimBatchSize,
            maxPivotsToKeep: this.maxPivotsToKeep,
            nextTrimAt: this.maxTicksToKeep + 100,
            ticksUntilTrim: Math.max(0, this.maxTicksToKeep + 100 - this.ticks.length)
        };
    }
    forceCleanup() {
        if (this.ticks.length > this.maxTicksToKeep) {
            const removeCount = this.ticks.length - this.maxTicksToKeep;
            this.ticks = this.ticks.slice(removeCount);
            this.ticksOffset += removeCount;
            this._lastCheckedIndex = Math.max(0, this._lastCheckedIndex - removeCount);
        }
        if (this.pivots.length > this.maxPivotsToKeep) {
            this._trimPivots();
        }
    }
}