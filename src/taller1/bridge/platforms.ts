import type { Notification } from "./notifications.js";

// Abstraction
abstract class Platform {
  protected notification: Notification;

  constructor(notification: Notification) {
    this.notification = notification;
  }

  abstract sendAlert(): string;
}

export class Desktop extends Platform {
  sendAlert(): string {
    return `Send ${this.notification.assignNotification()} Notification`;
  }
}

export class Mobile extends Platform {
  sendAlert(): string {
    return `Send ${this.notification.assignNotification()} Notification`;
  }
}

export class Web extends Platform {
  sendAlert(): string {
    return `Send ${this.notification.assignNotification()} Notification`;
  }
}
