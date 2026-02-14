// Primer caso

/* import AutomovilBuilder from "./taller1/builder/automovil.js";

const auto = new AutomovilBuilder()
  .conMotor("V8 4.0L")
  .conColor("rojo")
  .conLlantas("deportivas 18in")
  .conSistemaSonido("Bose")
  .conInteriores("cuero")
  .conTechoSolar(true)
  .conNavegacionGPS(true)
  .build();
  
  console.log(auto); */

// Segundo caso

import {
  AlertNotification,
  ConfirmNotification,
  MessageNotification,
  WarningNotification,
} from "./taller1/bridge/notifications.js";
import { Desktop, Mobile, Web } from "./taller1/bridge/platforms.js";

const message = new MessageNotification();
const alert = new AlertNotification();
const warning = new WarningNotification();
const confirmation = new ConfirmNotification();

const generateAlerts = () => {
  return {
    DesktopMessageNotification: new Desktop(message),
    DesktopAlertNotification: new Desktop(alert),
    DesktopWarningNotification: new Desktop(warning),
    DesktopConfirmNotification: new Desktop(confirmation),
    MobileMessageNotification: new Mobile(message),
    MobileAlertNotification: new Mobile(alert),
    MobileWarningNotification: new Mobile(warning),
    MobileConfirmNotification: new Mobile(confirmation),
    WebMessageNotification: new Web(message),
    WebAlertNotification: new Web(alert),
    WebWarningNotification: new Web(warning),
    WebConfirmNotification: new Web(confirmation),
  };
};

const generatedAlerts = generateAlerts();
Object.entries(generatedAlerts).forEach(([key, notification]) =>
  console.log(`${key}: ${notification.sendAlert()}`),
);
