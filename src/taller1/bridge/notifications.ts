// Implementor
export interface Notification {
  assignNotification(): string;
}

// Concrete implementations
export class MessageNotification implements Notification {
  assignNotification(): string {
    return "Message";
  }
}

export class AlertNotification implements Notification {
  assignNotification(): string {
    return "Alert";
  }
}

export class WarningNotification implements Notification {
  assignNotification(): string {
    return "Warning";
  }
}

export class ConfirmNotification implements Notification {
  assignNotification(): string {
    return "Confirmation";
  }
}
