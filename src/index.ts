import Dog from "./classes.js";

const { name, age, bark } = new Dog(19, "Copito");
console.log(`${name} is ${age} y/o`);

bark(3);
