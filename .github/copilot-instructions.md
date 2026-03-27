# Copilot custom instructions

## Documentation

Whenever you make changes to the backend architecture, deployment topology, or
key design decisions (e.g. lambda-lith pattern, EventBridge routing, worker
design), update `docs/backend-architecture.md` to reflect the new state.

If no docs file exists yet for the area you are changing, create one under
`docs/` at the repository root.

## Code style

- Backend is TypeScript. Use explicit return types on all functions and methods.
- Prefer `async`/`await` with `try`/`catch` over `.then()`/`.catch()` chains.
- Use `const` by default; only use `let` when reassignment is required.

## Testing

- Backend tests live in `services/backend/src/__tests__/` and use Jest + ts-jest.
- Run backend tests with `npm test` from `services/backend/`.
- Every new service or handler should have a corresponding test file.

## Mono-repo layout

```
flightdad/
├── apps/mobile          # Expo / React Native
├── services/backend     # Node.js / Express (lambda-lith in production)
├── packages/shared      # Shared TypeScript types
└── docs/                # Architecture and design documentation
```
