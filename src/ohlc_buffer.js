'use strict';

const WINDOW_SIZE_PATTERN = /^(\d+)(d|h|m|s)$/

/**
 * @classdesc OhlcBuffer
 */
class OhlcBuffer {

    /**
     * @constructor
     *
     * @param windowSize string   OHLCVの間隔 (1m, 10h,...)
     */
    constructor(windowSize) {
        this.setWindowSize(windowSize);
        this.list = [];
    }

    /**
     * 指定されたwindowSizeから時間を作成するのに必要なデータを作成する
     */
    setWindowSize(windowSize) {
        if (!windowSize) {
            throw new Error('windowSize is required');
        }
        const match = windowSize.match(WINDOW_SIZE_PATTERN);
        if (!match) {
            throw new Error('WINDOW_SIZE format is invalid: ' + windowSize);
        }
        const num = Number(match[1]);
        const unit = match[2];
        let timespan = 0; // sec
        if (unit === 'd') {
            timespan = num * 86400;
        } else if (unit === 'h') {
            timespan = num * 3600;
        } else if (unit === 'm') {
            timespan = num * 60;
        } else if (unit === 's') {
            timespan = num;
        }
        this.windowSize = windowSize;
        this.windowTime = parseInt(num, 10);
        this.windowUnit = unit;
        this.windowTimespan = timespan;
    }


    /**
     * 指定された時刻が windowTimespan を基準とした時間範囲の何個目に当たるか返す.
     */
    getIndex(timestamp) {
        return parseInt(timestamp /= this.windowTimespan, 10);
    }

    /**
     * 指定された時刻を正規化して返す.
     */
    getNormalize(timestamp) {
        return this.getIndex(timestamp) * this.windowTimespan;
    }

    /**
     * 価格を追加する
     * 
     * @price int 価格
     * @timestamp int タイムスタンプ(unixtime)
     */
    addPrice(price, timestamp) {
        // 基準時間に変換(TimeWindowの最初の時間)
        const normalizedTs = this.getNormalize(timestamp);
        let lastOhlc = this.getLast()
        if (lastOhlc && lastOhlc.ts == normalizedTs) {
            lastOhlc.close = price;
            if (lastOhlc.high < price) {
                lastOhlc.high = price;
            } else if (lastOhlc.low > price) {
                lastOhlc.low = price;
            }
        } else {
            this.list.push({
                ts: normalizedTs, // window 開始時刻
                ets: normalizedTs + this.windowTimespan, // window 終了時刻
                open: price,
                high: price,
                low: price,
                close: price,
            })
        }
    }

    toArray() {
        return this.list
    }

    clear() {
        this.list = [];
    }

    getLast() {
        if (this.list.length == 0) {
            return null
        }
        return this.list[this.list.length - 1]
    }

    size() {
        return this.list.length;
    }
}