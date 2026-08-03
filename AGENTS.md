# AGENTS.md — Context for AI Assistants

## Project: opencode-brains

This file tells any AI assistant (human or automated) what they need to know before working on this codebase.

---

## Project Overview

**opencode-brains** is a BRAINS three-phase agentic development workflow for OpenCode — research, plan, implement with multi-LLM review. It implements the BRAINS methodology:

**B**rainstorm **R**esearch **A**rchitect **I**mplement **N**urture **S**ecure

## Project Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Build TypeScript source with Bun |
| `npm run setup` | Run setup wizard |
| `bun run scripts/setup.ts` | Setup script entry point |

## Git Workflow

- **Base branch:** `main`
- **Pull:** `git pull --rebase origin main`
- **Push:** `git push origin main`
- **Commits:** Semantic messages (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)

## Global Context

See `C:\Repos\salmon-orchestrator\AGENTS.md` for the ORCHESTRATOR platform conventions, orchestrator workflow, agent roles, and completion checklist.
