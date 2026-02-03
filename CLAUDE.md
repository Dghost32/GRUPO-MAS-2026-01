# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install    # Install dependencies
bun dev        # Run src/index.ts
bun test       # Run tests (Bun's built-in test runner)
```

## Architecture

TypeScript project using Bun runtime, focused on design pattern implementations.

### Source Structure

- `src/index.ts` - Main entry point
- `src/classes.ts` - Class definitions (e.g., Dog)
- `src/utils.ts` - Utility functions
- `src/abstract-factory/` - Abstract Factory pattern implementation

### Abstract Factory Pattern (`src/abstract-factory/`)

Implements a game-themed Abstract Factory with Spanish naming:

**Interfaces:**
- `Personaje` - Character contract (atacar, getVida, getFuerza, getVelocidad)
- `Arma` - Weapon contract (usar, getDano, getAlcance, getDurabilidad)
- `MundoFactory` - Factory contract (crearArma, crearPersonaje)

**Implementations:**
- `Guerrero` - Warrior character
- `Espada` - Sword weapon
- `Videojuego` - Client that uses the factory

## Code Conventions

- ES modules with `.js` extensions in imports
- `export default` for classes and interfaces
- Private members with getter methods for encapsulation
- Strict TypeScript (noUncheckedIndexedAccess, exactOptionalPropertyTypes, etc.)
