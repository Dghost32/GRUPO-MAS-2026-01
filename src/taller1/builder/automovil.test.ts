import { describe, expect, test } from "bun:test";
import AutomovilBuilder from "./automovil.js";
import type { Automovil } from "./automovil.js";

type Builder = {
  conMotor(motor: string): Builder;
  conColor(color: string): Builder;
  conLlantas(llantas: string): Builder;
  conSistemaSonido(sistema: string): Builder;
  conInteriores(interiores: string): Builder;
  conTechoSolar(techoSolar: boolean): Builder;
  conNavegacionGPS(gps: boolean): Builder;
  build(): Automovil;
};

function automovilBuilderSuite(name: string, create: () => Builder) {
  describe(name, () => {
    test("build() returns an automovil with default values when nothing is set", () => {
      const auto: Automovil = create().build();

      expect(auto.motor).toBeUndefined();
      expect(auto.color).toBeUndefined();
      expect(auto.llantas).toBeUndefined();
      expect(auto.sistemaSonido).toBeUndefined();
      expect(auto.interiores).toBeUndefined();
      expect(auto.techoSolar).toBe(false);
      expect(auto.navegacionGPS).toBe(false);
    });

    test("conMotor sets the engine type", () => {
      const auto = create().conMotor("V8").build();

      expect(auto.motor).toBe("V8");
    });

    test("conColor sets the color", () => {
      const auto = create().conColor("rojo").build();

      expect(auto.color).toBe("rojo");
    });

    test("conLlantas sets the wheel type", () => {
      const auto = create().conLlantas("deportivas 18in").build();

      expect(auto.llantas).toBe("deportivas 18in");
    });

    test("conSistemaSonido sets the sound system", () => {
      const auto = create().conSistemaSonido("Bose").build();

      expect(auto.sistemaSonido).toBe("Bose");
    });

    test("conInteriores sets the interior type", () => {
      const auto = create().conInteriores("cuero").build();

      expect(auto.interiores).toBe("cuero");
    });

    test("conTechoSolar enables the sunroof", () => {
      const auto = create().conTechoSolar(true).build();

      expect(auto.techoSolar).toBe(true);
    });

    test("conNavegacionGPS enables GPS navigation", () => {
      const auto = create().conNavegacionGPS(true).build();

      expect(auto.navegacionGPS).toBe(true);
    });

    test("methods can be chained to build a fully configured car", () => {
      const auto = create()
        .conMotor("V6")
        .conColor("azul")
        .conLlantas("todo terreno")
        .conSistemaSonido("Harman Kardon")
        .conInteriores("tela premium")
        .conTechoSolar(true)
        .conNavegacionGPS(true)
        .build();

      expect(auto.motor).toBe("V6");
      expect(auto.color).toBe("azul");
      expect(auto.llantas).toBe("todo terreno");
      expect(auto.sistemaSonido).toBe("Harman Kardon");
      expect(auto.interiores).toBe("tela premium");
      expect(auto.techoSolar).toBe(true);
      expect(auto.navegacionGPS).toBe(true);
    });

    test("build() returns an immutable object", () => {
      const auto = create().conColor("negro").build();

      expect(() => {
        const mutable = auto as { -readonly [K in keyof Automovil]: Automovil[K] };
        mutable.color = "blanco";
      }).toThrow();
    });

    test("each build() call returns a separate instance", () => {
      const builder = create().conColor("verde");
      const auto1 = builder.build();
      const auto2 = builder.build();

      expect(auto1).toEqual(auto2);
      expect(auto1).not.toBe(auto2);
    });
  });
}

automovilBuilderSuite("AutomovilBuilder (class)", () => new AutomovilBuilder());
