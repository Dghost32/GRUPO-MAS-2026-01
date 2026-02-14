// Implementor
export interface Notification {
  getNotificationType(): string;
}

// Concrete implementations
export class MessageNotification implements Notification {
  getNotificationType(): string {
    return "Message";
  }
}

export class AlertNotification implements Notification {
  getNotificationType(): string {
    return "Alert";
  }
}

export class WarningNotification implements Notification {
  getNotificationType(): string {
    return "Warning";
  }
}

export class ConfirmNotification implements Notification {
  getNotificationType(): string {
    return "Confirmation";
  }
}
