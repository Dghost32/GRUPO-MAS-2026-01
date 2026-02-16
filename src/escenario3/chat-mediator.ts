import type User from "./user.ts";

export type ChatMediator = {
  sendMessage(message: string, sender: User): void;
  register(user: User): void;
};
