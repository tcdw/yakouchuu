# Agent Playbook

## Purpose
This document keeps autonomous or scripted contributors aligned when working on **yakouchuu-parser**, a TypeScript CLI that converts SPC files into AMK-friendly data.

## Quick Facts
- **Package manager:** `pnpm` (see `packageManager` field in `package.json`).
- **Language / output:** TypeScript sources live in `src/`, compiled CommonJS lands in `dist/`.
- **Entry point:** `src/ykc2mml.ts` (published CLI via the `bin` field).
- **Linting:** ESLint 9 flat config (`eslint.config.mjs`) with `typescript-eslint`.
- **Custom types:** Additional declarations go under `types/` and are wired via `tsconfig.json`.

## Environment Setup
1. `pnpm install` (runs `pnpm run build` automatically via the `prepare` script).
2. Keep `dist/` out of version control (`.gitignore` already covers it).
3. Use the recommended Node version from `.nvmrc` if present; otherwise latest LTS works.

## Common Tasks
| Task | Command | Notes |
| --- | --- | --- |
| Build once | `pnpm build` | Invokes `tsc -p tsconfig.json`. |
| Lint | `pnpm lint` | Must pass before proposing changes. |
| Run CLI | `pnpm exec ykc2mml path/to/file.spc [flags]` | Writes `.json` + `.txt` outputs next to the SPC. |
| Add runtime dep | `pnpm add <pkg>` | Dev-only: `pnpm add -D <pkg>`. |
| Update types | Edit `types/*.d.ts` and include the folder in `tsconfig.json` if new. |

## Coding Conventions
- Target Node/CommonJS output; avoid top-level await.
- Prefer explicit typing on exported surfaces; internal helpers may infer.
- Minimize incidental console logging—only intentional messages (warnings already in code) should remain.
- Keep helper comments short and purposeful; no redundant narration.
- When touching Buffer math or SPC driver logic, retain parity with the original implementation and document non-obvious changes in commit messages / PR descriptions.

## Testing & Validation
1. `pnpm lint`
2. `pnpm build`
3. Optional manual smoke test: run the CLI against a known SPC sample and verify `.json` / `.txt` outputs update as expected.

## Release Checklist
1. Ensure version bump in `package.json` if publishing.
2. Clean install & build: `pnpm install && pnpm build`.
3. Confirm generated `dist/` files reflect the latest sources.
4. Publish via `pnpm publish` (not automated here; ensure credentials are configured).

Keep this guide current as workflows evolve so downstream agents stay productive.***
