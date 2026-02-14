import {
  AlertNotification,
  ConfirmNotification,
  MessageNotification,
  WarnNotification,
} from "./taller1/bridge/notifications.js";
import { Desktop, Mobile, Platform, Web } from "./taller1/bridge/platforms.js";

const platforms = [Desktop, Mobile, Web];
const notifications = [
  new MessageNotification(),
  new AlertNotification(),
  new WarnNotification(),
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

const generatedNotifications = generateNotifications();
generatedNotifications.forEach((notification) => {
  console.log(notification.sendNotification());
});
