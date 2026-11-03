# ADR-002: Frontend on Vite + TypeScript, no framework

**Status:** Accepted
**Date:** 2026-11-03
**Feature:** jvision-rework

## Context
The frontend is one 1,200-line global-state script with dead handlers. The app is a single working screen with a drawer.

## Decision
Vite + TypeScript modules, no UI framework. Typed API client, small render functions, `VITE_API_URL` config.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| React + Vite | Components, ecosystem | Heavier, more than one screen needs | Owner chose no framework |
| Plain JS, no build | Open file directly | No types, hardcoded API URL | Types catch contract drift |

## Consequences
- Needs `npm run build`; the existing Vitest setup carries over.
