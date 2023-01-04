
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


function getTrendPattern(ma1, ma2, ma3, ma4) {
    if (ma1 > ma2 && ma2 > ma3 && ma3 > ma4) { return 1 }
    else if (ma2 > ma1 && ma1 > ma3 && ma3 > ma4) { return 2 }
    else if (ma2 > ma3 && ma3 > ma1 && ma1 > ma4) { return 3 }
    else if (ma2 > ma3 && ma3 > ma4 && ma4 > ma1) { return 4 }
    else if (ma3 > ma2 && ma2 > ma1 && ma1 > ma4) { return 5 }
    else if (ma3 > ma2 && ma2 > ma4 && ma4 > ma1) { return 6 }
    else if (ma3 > ma4 && ma4 > ma2 && ma2 > ma1) { return 7 }
    else if (ma3 > ma4 && ma4 > ma1 && ma1 > ma2) { return 8 }
    else if (ma3 > ma1 && ma1 > ma4 && ma4 > ma2) { return 9 }
    else if (ma1 > ma3 && ma3 > ma4 && ma4 > ma2) { return 10 }
    else if (ma3 > ma1 && ma1 > ma2 && ma2 > ma4) { return 11 }
    else if (ma1 > ma3 && ma3 > ma2 && ma2 > ma4) { return 12 }
    else if (ma4 > ma3 && ma3 > ma2 && ma2 > ma1) { return 21 }
    else if (ma4 > ma3 && ma3 > ma1 && ma1 > ma2) { return 22 }
    else if (ma4 > ma1 && ma1 > ma3 && ma3 > ma2) { return 23 }
    else if (ma1 > ma4 && ma4 > ma3 && ma3 > ma2) { return 24 }
    else if (ma4 > ma1 && ma1 > ma2 && ma2 > ma3) { return 25 }
    else if (ma1 > ma4 && ma4 > ma2 && ma2 > ma3) { return 26 }
    else if (ma1 > ma2 && ma2 > ma4 && ma4 > ma3) { return 27 }
    else if (ma2 > ma1 && ma1 > ma4 && ma4 > ma3) { return 28 }
    else if (ma2 > ma4 && ma4 > ma1 && ma1 > ma3) { return 29 }
    else if (ma2 > ma4 && ma4 > ma3 && ma3 > ma1) { return 30 }
    else if (ma4 > ma2 && ma2 > ma1 && ma1 > ma3) { return 31 }
    else if (ma4 > ma2 && ma2 > ma3 && ma3 > ma1) { return 32 }
}