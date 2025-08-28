'use strict';

/**
 * @classdesc OhlcBuffer
 */
class OhlcBuffer extends WindowBuffer{

    /**
     * @constructor
     *
     * @param windowSize string   OHLCの間隔 (1m, 10h,...)
     */
    constructor(windowSize) {
        super(windowSize)
    }

    /**
     * 価格を追加する
     * 
     * @price int 価格
     * @timestamp int タイムスタンプ(unixtime)
     * @return object price, normalizedTs, newPeriod(新しい足フラグ) の連想配列
     */
    addPrice(price, timestamp) {
        // 基準時間に変換(TimeWindowの最初の時間)
        const normalizedTs = this.getNormalize(timestamp);
        // 新しい足かフラグ
        let newPeriod = true
        let lastOhlc = this.getLast()
        if (lastOhlc && lastOhlc.ts == normalizedTs) {
            newPeriod = false
            lastOhlc.close = price;
            if (lastOhlc.high < price) {
                lastOhlc.high = price;
            } else if (lastOhlc.low > price) {
                lastOhlc.low = price;
            }
        } else {
            this.list.push({
                ts: normalizedTs, // window 開始時刻
                // ets: normalizedTs + this.windowTimespan, // window 終了時刻
                open: price,
                high: price,
                low: price,
                close: price,
            })
        }
        return {price, normalizedTs, newPeriod}
    }
}