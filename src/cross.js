
const Cross = {
    NONE : 0,
    GOLDEN : 1,
    DEAD : 2,
  };

function cross2str(cross) {
    if (cross == Cross.NONE) {
        return "NONE"
    } else if (cross == Cross.GOLDEN) {
        return "GOLDEN"
    } else if (cross == Cross.DEAD) {
        return "DEAD"
    }
    throw "Unknown Cross : " + cross
}

/**
 * 指定された2つのEMA配列からクロスを判定して返す
 * @param {array[Ema]} shortMaList 短期移動平均線
 * @param {array[Ema]} longMaList 長期移動平均線
 * @returns Cross
 */
function checkCross(shortMaList, longMaList) {
    const shortLen = shortMaList.length
    const longLen = longMaList.length
    if (shortLen < 3 || longLen < 3) {
        return Cross.NONE
    }
    // 最後の要素は確定足ではないため最後から3つ目と2つ目の要素で判定する
    if (shortMaList[shortLen-3].price < longMaList[longLen-3].price && shortMaList[shortLen-2].price > longMaList[longLen-2].price) {
        return Cross.GOLDEN
    } else if (shortMaList[shortLen-3].price > longMaList[longLen-3].price && shortMaList[shortLen-2].price < longMaList[longLen-2].price) {
        return Cross.DEAD
    }
    return Cross.NONE
}
