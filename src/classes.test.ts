import { describe, expect, test, spyOn } from "bun:test";
import Dog from "./classes.js";

describe("Dog", () => {
  test("should create a dog with name and age", () => {
    const { name, age } = new Dog(3, "Rex");

    expect(name).toBe("Rex");
    expect(age).toBe(3);
  });

  test("bark should log woof the specified number of times", () => {
    const dog = new Dog(2, "Buddy");
    const consoleSpy = spyOn(console, "log");

    dog.bark(3);

    expect(consoleSpy).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith("woof");

    consoleSpy.mockRestore();
  });

  test("bark should not log anything when times is 0", () => {
    const dog = new Dog(1, "Max");
    const consoleSpy = spyOn(console, "log");

    dog.bark(0);

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("bark should not log anything when times is negative", () => {
    const dog = new Dog(1, "Luna");
    const consoleSpy = spyOn(console, "log");

    dog.bark(-5);

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
