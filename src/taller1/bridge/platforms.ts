import type { Notification } from "./notifications.js";

// Abstraction
export abstract class Platform {
  protected notification: Notification;

  constructor(notification: Notification) {
    this.notification = notification;
  }

  abstract sendNotification(): string;
}

// Refined abstraction
export class Desktop extends Platform {
  sendNotification(): string {
    return `Send Desktop ${this.notification.getType()} Notification`;
  }
}

export class Mobile extends Platform {
  sendNotification(): string {
    return `Send Mobile ${this.notification.getType()} Notification`;
  }
}

export class Web extends Platform {
  sendNotification(): string {
    return `Send Web ${this.notification.getType()} Notification`;
  }
}
