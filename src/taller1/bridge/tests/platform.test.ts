import { describe, it, expect } from "bun:test";
import { Desktop, Mobile, Web } from "../platforms.js";
import type { Notification } from "../notifications.js";

class MockNotification implements Notification {
  getType(): string {
    return "Mock";
  }
}

describe("Platform implementation", () => {
  const mockNotification = new MockNotification();

  it("Desktop should format correctly", () => {
    const desktop = new Desktop(mockNotification);
    expect(desktop.sendNotification()).toBe("Send Desktop Mock Notification");
  });

  it("Mobile should format correctly", () => {
    const mobile = new Mobile(mockNotification);
    expect(mobile.sendNotification()).toBe("Send Mobile Mock Notification");
  });

  it("Web should format correctly", () => {
    const desktop = new Web(mockNotification);
    expect(desktop.sendNotification()).toBe("Send Web Mock Notification");
  });
});
