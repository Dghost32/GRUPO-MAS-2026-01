import {
  AlertNotification,
  ConfirmNotification,
  MessageNotification,
  WarningNotification,
} from "./taller1/bridge/notifications.js";
import { Desktop, Mobile, Platform, Web } from "./taller1/bridge/platforms.js";

const platforms = [Desktop, Mobile, Web];
const notifications = [
  new MessageNotification(),
  new AlertNotification(),
  new WarningNotification(),
  new ConfirmNotification(),
];

const generateNotifications = (): Platform[] => {
  const result: Platform[] = [];
  platforms.forEach((PlatformClass) => {
    notifications.forEach((notification) => {
      result.push(new PlatformClass(notification));
    });
  });
  return result;
};

const generatedAlerts = generateNotifications();
generatedAlerts.forEach((notification) => {
  console.log(notification.sendNotification());
});
