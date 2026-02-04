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

TypeScript project using Bun runtime, focused on design pattern implementations.

- `src/index.ts` - Main entry point
- `src/classes.ts` - Class definitions (e.g., Dog)
- Tests live alongside source files as `*.test.ts`

## Code Conventions

- ES modules with `.js` extensions in imports (even for `.ts` files)
- `export default` for classes
- Separate `export type` for type definitions
- Strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- Testing uses Bun's built-in runner (`bun:test`): `describe`, `test`, `expect`, `spyOn`
- Husky pre-push hook runs tests before pushing
