
const Trend = {
    NONE : 0,
    UP : 1,
    DOWN : 2,
  };

function trend2str(trend) {
    if (trend == Trend.NONE) {
        return "NONE"
    } else if (trend == Trend.UP) {
        return "UP"
    } else if (trend == Trend.DOWN) {
        return "DOWN"
    }
    throw "Unknown Trend : " + trend
}

/**
 * 指定された2つのEMA配列からトレンド判定して返す
 * @param {array[Ema]} shortMaList 短期移動平均線
 * @param {array[Ema]} longMaList 長期移動平均線
 * @returns Trend
 */
function checkTrend(shortMaList, longMaList) {
    const shortLen = shortMaList.length
    const longLen = longMaList.length
    if (shortLen < 2 || longLen < 2) {
        return Trend.NONE
    }
    // 最後の要素は確定足ではないため最後から2つ目の要素で判定する
    if (shortMaList[shortLen-2].price > longMaList[longLen-2].price) {
        return Trend.UP
    } else if (shortMaList[shortLen-2].price < longMaList[longLen-2].price) {
        return Trend.DOWN
    }
    return Trend.NONE
}
