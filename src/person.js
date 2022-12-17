"use strict";

class Person {
    constructor(name, age) {
      this.name = name;
      this.age = age;
      this.car = new Car("toyota", 1000)
    }
  
    stringSentence() {
      return "Hello, my name is " + this.name + " and I'm " + this.age + ". " + this.car.stringSentence() 
    }
}

