/**
 * チャートのポイントを表すクラス
 */
class ChartPoint {
    constructor(time, price) {
        this.time = time;
        this.price = price;
    }
}

/**
 * ピボットを表すクラス
 */
class Pivot {
    /**
     *
     * @param {bool} isHigh 山ピボットか谷ピボットか
     * @param {ChartPoint} start 前のポイントを表すChartPointオブジェクト
     * @param {ChartPoint} end 現在のポイントを表すChartPointオブジェクト
     */
    constructor(isHigh, start, end) {
        this.isHigh = isHigh;
        this.start = start;
        this.end = end;
    }

    /**
     * 指定されたchatPointの価格が
     * 山ピボットの場合にこのpivotの価格よりも高いか、
     * 谷ピボットの場合にこのpivotの価格よりも安いか、
     * どうかを判定する
     * @param {ChartPoint} chartPoint
     * @returns {bool}
     */
    isMorePrice(chartPoint) {
        const m = this.isHigh ? 1 : -1;
        return chartPoint.price * m > this.end.price * m;
    }
}

/**
 * ZigZagアルゴリズムのクラス.
 *
 * ZigZagSimple.pine を javascript に変換したもの.
 */
export default class ZigZag {
    /**
     *
     * @param {number} devThreshold ピボットが方向を変える前に必要な最小パーセンテージ偏差
     * @param {number} depth ピボット検出に必要なバー数
     * @param {bool} allowZigZagOnOneBar 大きなバーがピボット高とピボット低の両方を作る場合、つまり一つのバーで山と谷の両方を許容するかフラグ
     * @param {string} differencePriceMode "Absolute" or "Percent"
     */
    constructor(devThreshold = 5.0, depth = 10, allowZigZagOnOneBar = true, differencePriceMode = 'Absolute') {
        if (depth < 1) {
            throw new Error('Depth must be greater than 0');
        }
        this.devThreshold = devThreshold;
        this.depth = depth;
        this.allowZigZagOnOneBar = allowZigZagOnOneBar;
        // 未使用
        this.differencePriceMode = differencePriceMode;
        // 生データ
        this.ohclvs = [];
        // ピボット一覧
        this.pivots = [];
    }

    /**
     * ピボットのリストを返す
     * @returns {Pivot[]}
     */
    getPivots() {
        return this.pivots;
    }

    /**
     * basePriceとpriceのdeviationを計算する
     * @param {number} basePrice 開始価格
     * @param {number} price 終了価格
     * @returns {number} deviation(%)
     */
    _calcDev(basePrice, price) {
        return (100 * (price - basePrice)) / Math.abs(basePrice);
    }

    _priceRotationDiff(start, end) {
        let diff = end - start;
        let sign = Math.sign(diff) > 0 ? '+' : '';
        let diffStr =
            this.differencePriceMode === 'Absolute' ? diff.toFixed(2) : ((diff * 100) / start).toFixed(2) + '%';
        let result = `(${sign}${diffStr})`;
        return result;
    }

    /**
     * 最後のpivotを取得する. なければnullを返す.
     * @returns {Pivot}
     */
    _lastPivot() {
        let numberOfPivots = this.pivots.length;
        return numberOfPivots > 0 ? this.pivots[numberOfPivots - 1] : null;
    }

    /**
     * 指定されたchartPointで最後のpivotのendを更新する.
     * lastPivotが1つしかない場合はstartも更新する.
     *
     * lastPivotが存在するかどうかは呼び出し元で確認しておくこと.
     * @param {ChartPoint} chartPoint
     */
    _updateLastPivot(chartPoint) {
        let lastPivot = this._lastPivot();
        if (this.pivots.length === 1) {
            lastPivot.start = chartPoint;
        }
        lastPivot.end = chartPoint;
    }

    /**
     * pivotを追加する
     * @param {Pivot} newPivot
     */
    _addPivot(newPivot) {
        this.pivots.push(newPivot);
    }

    /**
     * srcSeries[length]の要素がピボットの候補となりえるか判定する
     *
     * @param {number[]} srcSeries ピボット値を計算するためのデータシリーズ
     * @param {number} depth ピボット確認に必要な長さ（バー数）
     * @param {bool} isHigh 山ピボットか谷ピボットかフラグ
     * @returns ピボットの場合はChartPointオブジェクト、そうでない場合はnullを返す
     */
    _isPivotPointCandidate(srcSeries, depth, isHigh) {
        const candidateIndex = srcSeries.length - depth - 1;
        if (candidateIndex < 0) {
            return null;
        }

        // ピボットであるかチェックする価格(バー)
        let pivotPrice = srcSeries[candidateIndex].price;

        // チェックするバー(pivotPrice)の場所は現在からlengthバー前である. (src[length]としたので.)
        // よって length * 2 の値が bar_index よりも小さければ、チェックするバーの前に length分のバー、
        // チェックするバーの後ろにも length分のバーが存在するということである. -> よって充分なバーが存在する.
        if (depth * 2 <= srcSeries.length) {
            let isFound = true;
            // チェックするバーより後ろのバーを調査する.
            // チェックするバーがピボットであることを否定するデータを探す.
            for (let i = candidateIndex + 1; i <= Math.min(srcSeries.length - 1, candidateIndex + depth); i++) {
                if ((isHigh && srcSeries[i].price > pivotPrice) || (!isHigh && srcSeries[i].price < pivotPrice)) {
                    // 否定するデータが見つかったのでピボットは成立しない.
                    isFound = false;
                    break;
                }
            }

            // チェックするバーより前のバーを調査する.
            // こちらも上と同様に、チェックするバーがピボットであることを否定するデータを探す.
            for (let i = candidateIndex - 1; i >= Math.max(0, candidateIndex - depth); i--) {
                if ((isHigh && srcSeries[i].price >= pivotPrice) || (!isHigh && srcSeries[i].price <= pivotPrice)) {
                    isFound = false;
                    break;
                }
            }

            if (isFound) {
                return new ChartPoint(srcSeries[candidateIndex].time, pivotPrice);
            }
        }
        return null;
    }

    /**
     * 指定された chartPoint がピボットポイントであるかどうかを判定する.
     * @param {bool} isHigh chartPointが山か谷かどちらのピボットポイントか
     * @param {ChartPoint} chartPoint 候補となるポイント
     * @returns {bool} ピボットポイントであった場合はtrue, そうでない場合はfalse
     */
    _newPivotPointFound(isHigh, chartPoint) {
        let result = false;
        const lastPivot = this._lastPivot();
        if (lastPivot !== null) {
            // 最後のピボットと同じピーク形状かチェック (山と山か or 谷と谷か)
            if (lastPivot.isHigh === isHigh) {
                // highの場合、poitの方が lastPivotよりpriceが高い
                // lowの場合、pointの方が lastPivotよりpriceが低い
                // をチェックしている.
                if (lastPivot.isMorePrice(chartPoint)) {
                    this._updateLastPivot(chartPoint);
                    result = true;
                }
            } else {
                // 偏差の条件を満たせばピボットポイントとして追加する
                const dev = this._calcDev(lastPivot.end.price, chartPoint.price);
                if (
                    (!lastPivot.isHigh && dev >= this.devThreshold) ||
                    (lastPivot.isHigh && dev <= -1 * this.devThreshold)
                ) {
                    this._addPivot(new Pivot(isHigh, lastPivot.end, chartPoint));
                    result = true;
                }
            }
        } else {
            // 最初のピボットはそのまま追加する
            let startDate = new Date();
            let startPoint = new ChartPoint(startDate.getTime(), 0);
            this._addPivot(new Pivot(isHigh, startPoint, chartPoint));
            result = true;
        }

        return result;
    }

    /**
     * 新しいデータを追加する
     * @param {Object} item tickデータのオブジェクト {time: number, price: number}
     */
    update(item) {
        this.ohclvs.push(item);

        // 開始からdepth以上の数のデータがなければなにもしない
        if (this.ohclvs.length < this.depth * 2) {
            return;
        }

        // データから価格のseriesを作る
        const pricesSeries = this.ohclvs.map(tick => {
            return new ChartPoint(tick.time, tick.price);
        });

        // 山ピボットをチェック
        const highPivot = this._isPivotPointCandidate(pricesSeries, this.depth, true);
        if (highPivot) {
            this._newPivotPointFound(true, highPivot);
        }

        // 谷ピボットをチェック
        // もし this.allowZigZagOnOneBar が false で highPivot あれば、
        // バーは山ピボットであるので同じバーで谷ピボットチェックをスキップ
        if (this.allowZigZagOnOneBar || !highPivot) {
            const lowPivot = this._isPivotPointCandidate(pricesSeries, this.depth, false);
            if (lowPivot) {
                this._newPivotPointFound(false, lowPivot);
            }
        }
    }
}