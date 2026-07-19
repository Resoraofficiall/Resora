# Contributing to Resora

Resora is a curated, invite-only marketplace — the engineering discipline
around this repo mirrors that same restraint. This document defines the
branch strategy required by Build Prompt Phase 0, Step 6, and the ground
rules every contribution follows.

## Branch Strategy

| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Mirrors production. Protected — no direct commits, ever. | — (reference only) |
| `development` | Integration branch. All `feature/*` branches merge here first. | Nothing automatic |
| `release` | Cut from `development` when a batch of work is ready to ship. | **Staging** (automatic on merge) |
| `hotfix/*` | Urgent production fixes, branched from `main`, merged to both `main` and `development`. | Staging, then production on manual approval |
| `feature/*` | One branch per feature/phase item, branched from `development`. | Nothing automatic — CI runs typecheck/lint/tests only |

### Flow
