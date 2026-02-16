import type { ChatMediator } from "./chat-mediator.js";
import type User from "./user.js";

class ChatRoom implements ChatMediator {
  private users: User[] = [];

  register(user: User): void {
    this.users.push(user);
    user.setMediator(this);
  }

  sendMessage(message: string, sender: User): void {
    for (const user of this.users) {
      if (user !== sender) {
        user.receive(message, sender.name);
      }
    }
  }
}

export default ChatRoom;
