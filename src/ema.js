'use strict';



class Ema {

    /**
     * @constructor
     *
     * @param size int   平均を取るサイズ
     */
    constructor(size) {
        if (size < 2) {
            throw Error("size must be greater than 2")
        }
        // 外部から与えられた生データ一覧
        // [{"price": 123.46, "ts": 1671303928}, {"price": 125.32, "ts": 1671303929},...
        this.values = []
        // 計算した移動平均値一覧
        // [{"price": 120.01, "ts": 1671303928}, {"price": 120.21, "ts": 1671303929},...
        this.averages = []
        this.size = size
        // 正規化された時刻(ローソク足の最初の時刻)
        this.lastNormalizedTs = 0
    }

    /**
     * 数値を追加する
     * 
     * @param {number} price 
     * @param {int} normalizedTs 
     */
     add(price, normalizedTs) {
        
        if (this.lastNormalizedTs == 0) {
            // 最初のデータの処理
            this.values.push({"price": price, "ts": normalizedTs})
            this.averages.push({"price": price, "ts": normalizedTs})
        } else {
            // 二個目以降のデータの処理
            let lastValue = this.values[this.values.length-1]
            // 直近のデータと同じ時刻であればそれを更新. そうでなければ追加.
            if (lastValue.ts == normalizedTs) {
                lastValue.price = price
                // 生データの個数がsizeに達していない場合は単純移動平均
                if (this.values.length < this.size) {
                    let sum = 0;
                    for (let i = 0; i < this.values.length; i++) {
                        sum += values[i].price;
                    }
                    this.averages[this.averages.length-1].price = sum / this.values.length
                } else {
                    // 指数平滑移動平均
                    const lastAverage = this.averages[this.averages.length-2]
                    // https://www.moneypartners.co.jp/support/tech/ema.html
                    const newAverage = lastAverage + (2 / (this.size + 1)) * (lastValue.price - lastAverage)
                    this.averages[this.averages.length-1].price = newAverage
                }
            } else {
                // 新規時刻の価格データの追加処理
                this.values.push({"price": price, "ts": normalizedTs})
                if (this.values.length < this.size) {
                    // 生データの個数がsizeに達していない場合は単純移動平均
                    let sum = 0;
                    for (let i = 0; i < this.values.length; i++) {
                        sum += values[i].price;
                    }
                    this.averages.push({"price":sum / this.values.length, "ts": normalizedTs})
                } else {
                    // 指数平滑移動平均
                    const lastAverage = this.averages[this.averages.length-1]
                    // https://www.moneypartners.co.jp/support/tech/ema.html
                    const newAverage = lastAverage + (2 / (this.size + 1)) * (lastValue.price - lastAverage)
                    this.averages.push({"price": newAverage, "ts": normalizedTs}) 
                }
            }
        }
        this.lastNormalizedTs = normalizedTs
    }

    _getAverages(arr) {
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
            sum += values[i].price;
        }
        return sum / arr.length
    }
}
