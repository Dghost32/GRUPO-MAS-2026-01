# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install    # Install dependencies
bun dev        # Run src/index.ts
bun test       # Run all tests (Bun's built-in test runner)
bun lint       # Lint with ESLint + typescript-eslint + SonarJS rules
```

## Architecture

TypeScript project using Bun runtime, focused on design pattern implementations organized by taller (workshop).

- `src/index.ts` - Main entry point
- `src/taller1/builder/` - Ejercicio 1: Builder pattern (class + functional)
- `src/taller1/docs/` - Activity guide and proposal for taller 1
- Tests live alongside source files as `*.test.ts`
- Each taller gets its own folder: `src/taller1/`, `src/taller2/`, etc.
- Each exercise gets a subfolder named after the pattern: `builder/`, `bridge/`, `mediator/`
- Each taller has a `docs/` folder for guides and proposals

## Code Conventions

- ES modules with `.js` extensions in imports (even for `.ts` files)
- `export default` for classes
- Separate `export type` for type definitions
- Strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- Testing uses Bun's built-in runner (`bun:test`): `describe`, `test`, `expect`, `spyOn`
- Husky pre-push hook runs tests before pushing
