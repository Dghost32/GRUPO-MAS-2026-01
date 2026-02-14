//  Implementor
interface Color {
  aplicarColor(): string;
}

// Concrete implementations
export class Rojo implements Color {
  aplicarColor(): string {
    return "Rojo";
  }
}

export class Azul implements Color {
  aplicarColor(): string {
    return "Azul";
  }
}

// Abstraction
abstract class Forma {
  protected color: Color;
  constructor(color: Color) {
    this.color = color;
  }

  abstract dibujar(): string;
}

export class Circulo extends Forma {
  dibujar(): string {
    return `Pinta en ${this.color.aplicarColor()}`;
  }
}

export class Cuadrado extends Forma {
  dibujar(): string {
    return `Pinta en ${this.color.aplicarColor()}`;
  }
}
