import { describe, it, expect } from "bun:test";
import { Desktop } from "../platforms.js";
import { AlertNotification, MessageNotification } from "../notifications.js";

describe("Bridge integration", () => {
  it("Desktop & Message notification should work together", () => {
    const notification = new MessageNotification();
    const platform = new Desktop(notification);
    expect(platform.sendNotification()).toBe(
      "Send Desktop Message Notification",
    );
  });

  it("Platform should work with any Notification implementation", () => {
    const notifications = [new MessageNotification(), new AlertNotification()];
    notifications.forEach((notification) => {
      const platform = new Desktop(notification);
      expect(platform.sendNotification()).toContain(notification.getType());
    });
  });
});
