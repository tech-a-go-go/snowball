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
                if (this.values.length <= this.size) {
                    this.averages[this.averages.length-1].price = this._getAverages(this.values)
                } else {
                    // 指数平滑移動平均
                    // https://www.moneypartners.co.jp/support/tech/ema.html
                    this.averages[this.averages.length-1].price = this._getExpoAverages(this.averages, price, this.size)
                }
            } else {
                // 新規時刻の価格データの追加処理
                this.values.push({"price": price, "ts": normalizedTs})
                if (this.values.length <= this.size) {
                    // 生データの個数がsizeに達していない場合は単純移動平均
                    this.averages.push({"price": this._getAverages(this.values), "ts": normalizedTs})
                } else {
                    // 指数平滑移動平均
                    // _getExpoAveragesで前回の指数平準移動平均として最後から2個目の要素を利用するため一旦価格なしの要素を追加してから指数平準移動平均を計算して追加している
                    this.averages.push({"ts": normalizedTs})
                    // ダミーとして入れたpriceデータを更新
                    this.averages[this.averages.length-1].price = this._getExpoAverages(this.averages, price, this.size)
                }
            }
        }
        this.lastNormalizedTs = normalizedTs
    }

    /**
     * 指定された配列の単純移動平均を返す
     * @param {*} arr 計算する配列
     * @returns 平均値
     */
    _getAverages(arr) {
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
            sum += arr[i].price;
        }
        return sum / arr.length
    }

    /**
     * 指定された配列の指数平準移動平均を返す
     * @param {*} arr 計算する配列
     * @param {*} price 今回の価格
     * @param {*} emaSize 指数平準移動平均のサイズ
     * @returns 今回の指数平準移動平均
     */
    _getExpoAverages(arr, price, emaSize) {
        // 前回の指数平準移動平均を利用するため最後から2個目の要素を使う
        // (最後の要素は今回計算したものを保存する要素となる)
        const lastAverage = arr[arr.length-2].price
        return lastAverage + (2 / (emaSize + 1)) * (price - lastAverage)
    }

    toArray() {
        return this.averages
    }

    /**
     * Key=時刻、Value=移動平均価格のdictを返す
     * @returns dict
     */
    toDict() {
        return this.averages.reduce(
            (obj,data) => {
                obj[data.ts] = data.price
                return obj
            }, {}
        )
    }
}
