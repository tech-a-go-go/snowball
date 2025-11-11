"use strict";

class PriceManager extends EventTarget {
  constructor() {
    super();

    console.log("PriceManager initializing...");

    this.rawData = [];

    this.s1OhlcBuf = new OhlcBuffer("1s");
    this.s1Ema9 = new Ema(9);
    this.s1Ema20 = new Ema(20);
    this.s1Ema75 = new Ema(75);
    this.s1Ema200 = new Ema(200);

    this.m1OhlcBuf = new OhlcBuffer("1m");
    this.m1Ema9 = new Ema(9);
    this.m1Ema20 = new Ema(20);
    this.m1Ema75 = new Ema(75);
    this.m1Ema200 = new Ema(200);

    this.zigzag1 = new ZigZag(0.008, 2);
  }

  static getInstance() {
    if (!window.priceManager) {
      window.priceManager = new PriceManager();
      window.priceManager.subscribeStreaming();
    }
    return window.priceManager;
  }

  size() {
    return this.s1OhlcBuf.size();
  }

  onPriceReceive(priceData) {
    const sellPrice = parseFloat(priceData[2][0]); // bid価格
    const buyPrice = parseFloat(priceData[3][0]);  // ask価格
    const price = (buyPrice + sellPrice) / 2;
    const date = new Date(priceData[1]);
    const realTimestamp = date.getTime();
    // 秒
    const timestamp = Math.floor(realTimestamp / 1000);
    const {s1NewPeriod, m1NewPeriod, zigzag1} = this.store(timestamp, price);

    const s1Ema9 = this.s1Ema9.getLast().price;
    const s1Ema20 = this.s1Ema20.getLast().price;
    const s1Ema75 = this.s1Ema75.getLast().price;
    const s1Ema200 = this.s1Ema200.getLast().price;
    const m1Ema9 = this.m1Ema9.getLast().price;
    const m1Ema20 = this.m1Ema20.getLast().price;
    const m1Ema75 = this.m1Ema75.getLast().price;
    const m1Ema200 = this.m1Ema200.getLast().price;
    
    this.dispatchEvent(
      new CustomEvent("tick", {
        detail: {
          // tick
          timestamp, realTimestamp, price, buyPrice, sellPrice,
          // ema
          s1NewPeriod, m1NewPeriod,
          s1Ema9, s1Ema20, s1Ema75, s1Ema200, m1Ema9, m1Ema20, m1Ema75, m1Ema200,
          // zigzag
          zigzag1,
        },
      })
    );
  }

  store(unixtime, price) {
    this.rawData.push({ timestamp: unixtime, price: price });

    const s1Result = this.s1OhlcBuf.addPrice(price, unixtime);
    this.s1Ema9.add(price, s1Result.normalizedTs);
    this.s1Ema20.add(price, s1Result.normalizedTs);
    this.s1Ema75.add(price, s1Result.normalizedTs);
    this.s1Ema200.add(price, s1Result.normalizedTs);

    const m1Result = this.m1OhlcBuf.addPrice(price, unixtime);
    this.m1Ema9.add(price, m1Result.normalizedTs);
    this.m1Ema20.add(price, m1Result.normalizedTs);
    this.m1Ema75.add(price, m1Result.normalizedTs);
    this.m1Ema200.add(price, m1Result.normalizedTs);

    const zigzag1Result = this.zigzag1.update({ time: unixtime, price });

    return { s1NewPeriod: s1Result.newPeriod, m1NewPeriod: m1Result.newPeriod, zigzag1:zigzag1Result};
  }

  bulkStore(data) {
    data.forEach((d) => {
      this.store(d.ts, d.price);
    });
  }

  subscribeStreaming() {
    let messageBroker = window.raise.MessageBrokerHolder.get();
    messageBroker.subscribe(
      "price.USD/JPY",
      "PRICE",
      this.onPriceReceive,
      this
    );
  }
}
