// Primer caso

import AutomovilBuilder from "./automovil.js";

const auto = new AutomovilBuilder()
  .conMotor("V8 4.0L")
  .conColor("rojo")
  .conLlantas("deportivas 18in")
  .conSistemaSonido("Bose")
  .conInteriores("cuero")
  .conTechoSolar(true)
  .conNavegacionGPS(true)
  .build();

console.log(auto);
