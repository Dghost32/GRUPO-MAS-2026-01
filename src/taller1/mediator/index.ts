import ChatRoom from "./chat-room.js";
import User from "./user.js";

const chatRoom = new ChatRoom();

const alice = new User("Alice");
const bob = new User("Bob");
const carol = new User("Carol");

chatRoom.register(alice);
chatRoom.register(bob);
chatRoom.register(carol);

alice.send("Hola a todos");
bob.send("Hola Alice");
