import type { AutomovilType } from "./automovil.js";

export type { AutomovilType };

type AutomovilBuilderFn = {
  conMotor(motor: string): AutomovilBuilderFn;
  conColor(color: string): AutomovilBuilderFn;
  conLlantas(llantas: string): AutomovilBuilderFn;
  conSistemaSonido(sistema: string): AutomovilBuilderFn;
  conInteriores(interiores: string): AutomovilBuilderFn;
  conTechoSolar(techoSolar: boolean): AutomovilBuilderFn;
  conNavegacionGPS(gps: boolean): AutomovilBuilderFn;
  build(): AutomovilType;
};

type MutableConfig = {
  motor: string | undefined;
  color: string | undefined;
  llantas: string | undefined;
  sistemaSonido: string | undefined;
  interiores: string | undefined;
  techoSolar: boolean;
  navegacionGPS: boolean;
};

export default function createAutomovilBuilder(): AutomovilBuilderFn {
  const config: MutableConfig = {
    motor: undefined,
    color: undefined,
    llantas: undefined,
    sistemaSonido: undefined,
    interiores: undefined,
    techoSolar: false,
    navegacionGPS: false,
  };

  const builder: AutomovilBuilderFn = {
    conMotor: (motor) => { config.motor = motor; return builder; },
    conColor: (color) => { config.color = color; return builder; },
    conLlantas: (llantas) => { config.llantas = llantas; return builder; },
    conSistemaSonido: (sistema) => { config.sistemaSonido = sistema; return builder; },
    conInteriores: (interiores) => { config.interiores = interiores; return builder; },
    conTechoSolar: (techoSolar) => { config.techoSolar = techoSolar; return builder; },
    conNavegacionGPS: (gps) => { config.navegacionGPS = gps; return builder; },
    build: () => Object.freeze({ ...config }),
  };

  return builder;
}
