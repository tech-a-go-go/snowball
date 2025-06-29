"use strict";

class PriceManager2 extends EventTarget {
  constructor() {
    super();

    console.log("PriceManager2 initializing...");

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
  }

  static getInstance() {
    if (!window.priceManager) {
      window.priceManager = new PriceManager2();
      window.priceManager.subscribeStreaming();
    }
    return window.priceManager;
  }

  size() {
    return this.s1OhlcBuf.size();
  }

  onPriceReceive(priceData) {
    let sellPrice = parseFloat(priceData[2][0]); // bid価格
    let buyPrice = parseFloat(priceData[3][0]);  // ask価格
    let price = (buyPrice + sellPrice) / 2;
    let date = new Date(priceData[1]);
    let realTimestamp = date.getTime();
    let timestamp = Math.floor(realTimestamp / 1000);
    let result = this.store(timestamp, price);

    this.dispatchEvent(
      new CustomEvent("priceData", {
        detail: { timestamp, realTimestamp, price, buyPrice, sellPrice },
      })
    );

    if (result.s1NewPeriod) {
      if (result.m1NewPeriod) {
        // s1 is also in the new period
        this.dispatchEvent(new Event("m1NewPeriod"));
      } else {
        this.dispatchEvent(new Event("s1NewPeriod"));
      }
    }
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

    return { s1NewPeriod: s1Result.newPeriod, m1NewPeriod: m1Result.newPeriod };
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
