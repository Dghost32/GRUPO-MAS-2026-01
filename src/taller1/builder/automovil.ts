export type AutomovilType = {
  readonly motor: string | undefined;
  readonly color: string | undefined;
  readonly llantas: string | undefined;
  readonly sistemaSonido: string | undefined;
  readonly interiores: string | undefined;
  readonly techoSolar: boolean;
  readonly navegacionGPS: boolean;
};

export default class AutomovilBuilder {
  private motor: string | undefined;
  private color: string | undefined;
  private llantas: string | undefined;
  private sistemaSonido: string | undefined;
  private interiores: string | undefined;
  private techoSolar: boolean = false;
  private navegacionGPS: boolean = false;

  conMotor(motor: string): this {
    this.motor = motor;
    return this;
  }

  conColor(color: string): this {
    this.color = color;
    return this;
  }

  conLlantas(llantas: string): this {
    this.llantas = llantas;
    return this;
  }

  conSistemaSonido(sistemaSonido: string): this {
    this.sistemaSonido = sistemaSonido;
    return this;
  }

  conInteriores(interiores: string): this {
    this.interiores = interiores;
    return this;
  }

  conTechoSolar(techoSolar: boolean): this {
    this.techoSolar = techoSolar;
    return this;
  }

  conNavegacionGPS(navegacionGPS: boolean): this {
    this.navegacionGPS = navegacionGPS;
    return this;
  }

  build(): AutomovilType {
    return Object.freeze({
      motor: this.motor,
      color: this.color,
      llantas: this.llantas,
      sistemaSonido: this.sistemaSonido,
      interiores: this.interiores,
      techoSolar: this.techoSolar,
      navegacionGPS: this.navegacionGPS,
    });
  }
}
