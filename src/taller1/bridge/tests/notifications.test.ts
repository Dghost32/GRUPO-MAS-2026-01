import { describe, it, expect } from "bun:test";

import {
  AlertNotification,
  ConfirmNotification,
  MessageNotification,
  WarnNotification,
} from "../notifications.js";

describe("Notification implementation", () => {
  it("MessageNotification should return 'Message'", () => {
    const notification = new MessageNotification();
    expect(notification.getType()).toBe("Message");
  });

  it("AlertNotification should return 'Alert'", () => {
    const notification = new AlertNotification();
    expect(notification.getType()).toBe("Alert");
  });

  it("ConfirmNotification should return 'Confirm'", () => {
    const notification = new ConfirmNotification();
    expect(notification.getType()).toBe("Confirmation");
  });

  it("WarnNotification should return 'Warn'", () => {
    const notification = new WarnNotification();
    expect(notification.getType()).toBe("Warning");
  });
});
