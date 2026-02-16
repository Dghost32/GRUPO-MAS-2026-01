import { describe, expect, spyOn, test } from "bun:test";
import type { ChatMediator } from "./chat-mediator.js";
import User from "./user.js";

describe("User", () => {
  test("send throws when mediator is not set", () => {
    const user = new User("Alice");

    expect(() => user.send("Hola"))
      .toThrow("Alice is not registered in any chat room.");
  });

  test("send delegates to mediator and logs", () => {
    const mediator: ChatMediator = {
      sendMessage: () => {},
      register: () => {},
    };
    const mediatorSpy = spyOn(mediator, "sendMessage");
    const logSpy = spyOn(console, "log");

    const user = new User("Bob");
    user.setMediator(mediator);
    user.send("Hola");

    expect(logSpy).toHaveBeenCalledWith("Bob envia: Hola");
    expect(mediatorSpy).toHaveBeenCalledWith("Hola", user);

    logSpy.mockRestore();
    mediatorSpy.mockRestore();
  });

  test("receive logs incoming messages", () => {
    const logSpy = spyOn(console, "log");
    const user = new User("Carol");

    user.receive("Hola", "Alice");

    expect(logSpy).toHaveBeenCalledWith("Carol recibe de Alice: Hola");

    logSpy.mockRestore();
  });
});
