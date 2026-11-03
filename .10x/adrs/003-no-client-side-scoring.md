# ADR-003: No client-side scoring or fake fallbacks

**Status:** Accepted
**Date:** 2026-11-03
**Feature:** jvision-rework

## Context
`simulateClientInference` silently replaced every server error with a browser-made result using different weights from the server.

## Decision
The frontend never produces a prediction. If the API fails, it shows an error with a retry. Every number shown comes from the API response.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Keep an offline demo mode, clearly labelled | Works without server | A fake verdict in a medical UI | Risk of being read as real |

## Consequences
- The app is useless offline; that is correct for a diagnostic research tool.
