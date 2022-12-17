"use strict";

export class Person {
    constructor(name, age) {
      this.name = name;
      this.age = age;
    }
  
    stringSentence() {
      return "Hello, my name is " + this.name + " and I'm " + this.age;
    }
}

