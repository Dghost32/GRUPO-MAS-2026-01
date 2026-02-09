# Propuesta de Patrones de Diseño

## Ejercicio 1: Personalización de Automóviles

### Tipo de patrón: Creacional

### Patrón seleccionado: Builder

### Justificación

El problema describe la creación de un objeto `Automóvil` con múltiples configuraciones opcionales (motor, color, llantas, sonido, interiores, techo solar, GPS, etc.). El patrón **Builder** es la solución directa a este escenario porque:

- **Elimina el "constructor telescópico"**: en lugar de un constructor con 10+ parámetros, se encadenan métodos descriptivos como `.conMotor("V8").conColor("rojo").conTechoSolar(true)`.
- **Permite omitir atributos opcionales** sin crear subclases ni constructores sobrecargados.
- **Separa la construcción de la representación**: la clase `AutomovilBuilder` encapsula la lógica de ensamblaje, mientras que `Automovil` solo almacena el estado final.
- **Facilita la inmutabilidad**: el método `build()` puede devolver un objeto congelado cuyas propiedades no se modifican después de la creación.

### Diagrama de clases

```
┌──────────────────────────┐
│        Automovil         │
├──────────────────────────┤
│ - motor: string          │
│ - color: string          │
│ - llantas: string        │
│ - sistemaSonido: string  │
│ - interiores: string     │
│ - techoSolar: boolean    │
│ - navegacionGPS: boolean │
└──────────────────────────┘
             ▲
             │ crea
┌──────────────────────────┐
│     AutomovilBuilder     │
├──────────────────────────┤
│ - automovil: Automovil   │
├──────────────────────────┤
│ + conMotor(m): this      │
│ + conColor(c): this      │
│ + conLlantas(l): this    │
│ + conSistemaSonido(s):   │
│       this               │
│ + conInteriores(i): this │
│ + conTechoSolar(t): this │
│ + conNavegacionGPS(n):   │
│       this               │
│ + build(): Automovil     │
└──────────────────────────┘
```

### Beneficios alineados con la rúbrica

- Legibilidad y claridad al construir objetos complejos paso a paso.
- Inmutabilidad del objeto resultante tras `build()`.
- Flexibilidad para omitir atributos opcionales.
- Separación de construcción y representación.

---

## Ejercicio 2: Notificaciones x Plataformas

### Tipo de patrón: Estructural

### Patrón seleccionado: Bridge

### Justificación

El problema presenta dos dimensiones independientes que varían por separado: el **tipo de notificación** (mensaje, alerta, advertencia, confirmación) y la **plataforma** (escritorio, móvil, web). El patrón **Bridge** desacopla estas dos jerarquías para que puedan evolucionar de forma independiente:

- **Evita la explosión combinatoria**: sin Bridge se necesitarían N tipos x M plataformas clases (NotificacionMensajeWeb, NotificacionAlertaMovil, etc.). Con Bridge, solo N + M clases.
- **Separa responsabilidades**: la abstracción (`Notificacion`) maneja la lógica del tipo, y la implementación (`Plataforma`) maneja cómo se muestra.
- **Escalabilidad**: agregar una nueva plataforma o un nuevo tipo no requiere modificar las clases existentes.
- **Flexibilidad en tiempo de ejecución**: se puede cambiar la plataforma de una notificación dinámicamente.

### Diagrama de clases

```
┌──────────────────────┐         ┌─────────────────────┐
│   <<abstract>>       │         │    <<interface>>     │
│    Notificacion      │────────▶│     Plataforma      │
├──────────────────────┤         ├─────────────────────┤
│ # plataforma:        │         │ + mostrar(titulo:    │
│     Plataforma       │         │   string, mensaje:   │
├──────────────────────┤         │   string): void      │
│ + enviar(): void     │         └─────────────────────┘
└──────────────────────┘                   ▲
         ▲                                 │
         │                    ┌────────────┼────────────┐
   ┌─────┴──────┐             │            │            │
   │            │    ┌────────┴──┐  ┌──────┴────┐  ┌───┴──────────┐
┌──┴────────┐ ┌┴────┴──────┐ │ Escritorio │  │   Movil   │  │     Web      │
│  Mensaje  │ │   Alerta   │ │ Plataforma │  │ Plataforma│  │  Plataforma  │
├───────────┤ ├────────────┤ ├────────────┤  ├───────────┤  ├──────────────┤
│ +enviar() │ │ +enviar()  │ │ +mostrar() │  │ +mostrar()│  │  +mostrar()  │
└───────────┘ └────────────┘ └────────────┘  └───────────┘  └──────────────┘
```

### Beneficios alineados con la rúbrica

- Separación de responsabilidades entre tipo de notificación y plataforma.
- Escalabilidad al agregar nuevos tipos o plataformas sin modificar código existente.
- Reducción de clases frente a la herencia combinatoria.
- Flexibilidad en tiempo de ejecución para cambiar plataformas dinámicamente.

---

## Ejercicio 3: Chat Grupal

### Tipo de patrón: Comportamiento

### Patrón seleccionado: Mediator

### Justificación

El problema describe usuarios en una sala de chat que se envían mensajes entre sí. Sin un coordinador central, cada usuario necesitaría referencias directas a todos los demás, creando un acoplamiento O(n^2). El patrón **Mediator** centraliza la comunicación:

- **Reduce la complejidad**: los usuarios solo conocen al mediador (la sala de chat), no a los demás usuarios.
- **Facilita el mantenimiento**: agregar o eliminar usuarios solo requiere registrarlos/desregistrarlos en el mediador, sin tocar los demás objetos.
- **Centraliza la lógica de comunicación**: las reglas de distribución de mensajes viven en un solo lugar (la sala de chat).
- **Desacopla los participantes**: cada `Usuario` depende únicamente de la interfaz del mediador, no de otros usuarios concretos.

### Diagrama de clases

```
┌────────────────────────────┐
│       <<interface>>        │
│      ChatMediator          │
├────────────────────────────┤
│ + registrar(u: Usuario)    │
│ + enviarMensaje(mensaje:   │
│   string, emisor: Usuario) │
└────────────────────────────┘
              ▲
              │ implementa
┌────────────────────────────┐        ┌────────────────────────┐
│       SalaDeChat           │◀───────│       Usuario          │
├────────────────────────────┤        ├────────────────────────┤
│ - usuarios: Usuario[]      │        │ - nombre: string       │
├────────────────────────────┤        │ - sala: ChatMediator   │
│ + registrar(u): void       │        ├────────────────────────┤
│ + enviarMensaje(mensaje,   │        │ + enviar(msg): void    │
│   emisor): void            │        │ + recibir(msg, de):    │
└────────────────────────────┘        │     void               │
                                      └────────────────────────┘
```

### Beneficios alineados con la rúbrica

- Facilita el mantenimiento al agregar/eliminar usuarios sin modificar los demás.
- Mejor organización con la lógica de comunicación centralizada en el mediador.
- Reduce la complejidad evitando interacciones punto a punto entre usuarios.

---

## Resumen

| Ejercicio | Tipo | Patrón | Justificación clave |
|-----------|------|--------|---------------------|
| 1. Personalización de automóviles | Creacional | **Builder** | Elimina constructores telescópicos, permite configuración paso a paso |
| 2. Notificaciones x Plataformas | Estructural | **Bridge** | Desacopla dos dimensiones independientes, evita explosión de subclases |
| 3. Chat grupal | Comportamiento | **Mediator** | Centraliza comunicación, elimina acoplamiento directo entre usuarios |
