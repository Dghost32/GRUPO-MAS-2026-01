export default class Dog {
  age: number;
  name: string;

  constructor(age: number, name: string) {
    this.age = age;
    this.name = name;
  }

  bark(times: number) {
    if (times <= 0) return;

    for (let i = 0; i < times; i++) {
      console.log("woof");
    }
  }
}

export type DogType = {
  age: number;
  name: string;
};
