import type { ChatMediator } from "./chat-mediator.js";

export class User {
  private mediator?: ChatMediator;

  constructor(public name: string) {}

  setMediator(mediator: ChatMediator): void {
    this.mediator = mediator;
  }

  send(message: string): void {
    if (!this.mediator) {
      throw new Error(`${this.name} is not registered in any chat room.`);
    }

    console.log(`${this.name} envia: ${message}`);
    this.mediator.sendMessage(message, this);
  }

  receive(message: string, from: string): void {
    console.log(`${this.name} recibe de ${from}: ${message}`);
  }
}

export default User;
