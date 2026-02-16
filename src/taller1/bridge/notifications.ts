// Implementor
export interface Notification {
  getType(): string;
}

// Concrete implementations
export class MessageNotification implements Notification {
  getType(): string {
    return "Message";
  }
}

export class AlertNotification implements Notification {
  getType(): string {
    return "Alert";
  }
}

export class WarnNotification implements Notification {
  getType(): string {
    return "Warning";
  }
}

export class ConfirmNotification implements Notification {
  getType(): string {
    return "Confirmation";
  }
}
