"use strict";

class Car {
    constructor(name, price) {
      this.name = name;
      this.price = price;
    }
  
    stringSentence() {
      return "The price of my car " + this.name + " is " + this.price;
    }
}
