# opencode-brains

**BRAINS** for OpenCode — a three-phase agentic development workflow with optional multi-LLM review.

**B**rainstorm **R**esearch **A**rchitect **I**mplement **N**urture **S**ecure

Ported from the [Claude Code BRAINS plugin](https://github.com/Epiphytic/brains) to OpenCode.

## How It Works

BRAINS encodes a three-phase methodology for tackling complex software tasks:

1. **brains** — Phase 1: Interactive research, question-driven questionnaire, and ADR production. Default mode: parallel with star-chamber review.
2. **map** — Phase 2: High-level plan generation (stub-level), with task creation using OpenCode's todo tool.
3. **implement** — Phase 3: Spawns subagent teammates per plan-phase. Each teammate grooms tasks, implements them, then runs nurture and secure reviews.

Each phase chains into the next via user approval — or, with autopilot enabled, runs hands-off from phase 1 through phase 3.

## Prerequisites

**Required:**
- [OpenCode](https://opencode.ai) — the agent host

**Required for multi-LLM modes (parallel, debate):**
- [uv](https://docs.astral.sh/uv/) — Python package manager
- [star-chamber](https://pypi.org/project/star-chamber/) — multi-LLM council (`uvx star-chamber`)
- Provider configuration at `~/.config/star-chamber/providers.json`

## Installation

```bash
# 1. Install the package
npm install -g opencode-brains

# 2. Run setup
npx opencode-brains setup

# 3. Add the plugin to OpenCode config
# Edit ~/.config/opencode/opencode.json:
{
  "plugin": ["opencode-brains"]
}

# 4. Restart OpenCode
```

### Manual setup

```bash
# Copy agents
cp -r agents/* ~/.config/opencode/agents/

# Copy references
mkdir -p ~/.config/opencode/references/brains
cp -r references/* ~/.config/opencode/references/brains/

# Create config
cp brains.json.example ~/.config/opencode/brains.json
```

## Agents

| Agent | Type | Description |
|---|---|---|
| `brains` | Primary | Phase 1: research + questionnaire + ADR |
| `map` | Primary | Phase 2: high-level plan + todos |
| `implement` | Primary | Phase 3: subagent-per-phase execution |
| `nurture` | Subagent | Review and refine implementation |
| `secure` | Subagent | Security review and hardening |
| `suggest` | Subagent (hidden) | Complexity detection (auto-invoked) |

**Switch between primary agents** using the **Tab** key. **Invoke subagents** using `@` mentions (e.g., `@nurture review the auth module`).

## Custom Tools

| Tool | Description |
|---|---|
| `star-chamber-ask` | Send a design question to the multi-LLM council |
| `star-chamber-review` | Send code to the council for review |
| `brains-setup-check` | Verify dependencies and configuration |

## Modes

Most agents support three modes:

| Mode | Behavior |
|---|---|
| `single` | Local LLM only, no star-chamber |
| `parallel` (default) | Work locally, then send to council for review |
| `debate` | Multi-round deliberation across LLMs |

Configure in `~/.config/opencode/brains.json`:

```json
{
  "mode": "parallel",
  "autopilot": false,
  "lean": false,
  "debateRounds": 2,
  "defaultModel": "anthropic/claude-sonnet-4-20250514",
  "teammateModel": "anthropic/claude-sonnet-4-20250514",
  "escalateOnRetry": true,
  "pollingIntervalSeconds": 15,
  "userResponseTimeoutSeconds": 14400,
  "baseBranches": ["main", "master", "develop"]
}
```

## Usage

```
# Start BRAINS phase 1
Tab → select "brains" agent → describe your feature

# Or run phase 2 directly (if you have an ADR already)
Tab → select "map" agent → reference the ADR

# Or run phase 3 directly (if you have a plan already)
Tab → select "implement" agent

# Invoke nurture or secure as subagents
@nurture review the auth module
@secure check for vulnerabilities in src/api/
```

### Autopilot

Set `"autopilot": true` in `~/.config/opencode/brains.json` to run phases 1→2→3 hands-off. The system stops only when it needs human judgment (`needs-human` escalation).

### Lean mode

Set `"lean": true` for a token-efficient path (~30-45% less structural overhead). Uses compact protocol excerpts and scoped context.

## Phase Outputs

| Phase | Output File | Additional |
|---|---|---|
| brains | `docs/plans/YYYY-MM-DD-<slug>-research.md` | ADRs in `docs/adr/` |
| map | `docs/plans/YYYY-MM-DD-<slug>-map.md` | Todos with `[brains:<slug>]` prefix |
| implement | Per-phase nurture/secure reports | `docs/plans/<slug>-wrap-up.md` |

## Configuration Reference

| Key | Type | Default | Description |
|---|---|---|---|
| `mode` | `single\|parallel\|debate` | `parallel` | Default LLM review mode |
| `autopilot` | `boolean` | `false` | Skip user gates, auto-chain phases |
| `lean` | `boolean` | `false` | Token-efficient path |
| `debateRounds` | `number` | `2` | Debate rounds (debate mode) |
| `defaultModel` | `string` | `anthropic/claude-sonnet-4-20250514` | Default model |
| `teammateModel` | `string` | `anthropic/claude-sonnet-4-20250514` | Model for teammate subagents |
| `escalateOnRetry` | `boolean` | `true` | Retry on orchestrator model after 2 failures |
| `pollingIntervalSeconds` | `number` | `15` | Polling interval for teammate status |
| `userResponseTimeoutSeconds` | `number` | `14400` | Timeout for user responses (4h) |
| `baseBranches` | `string[]` | `["main","master","develop"]` | Branches that trigger branch offer |

## Known Limitations

### Subagent Context Sharing

OpenCode subagents share the same session context. When the implement agent spawns teammates per plan-phase, each teammate sees the full conversation history and file state from previous phases. This differs from the original BRAINS where tmux panes provided near-complete isolation between teammates.

**What this means in practice:**
- File edits from phase 1 are visible to phase 2's teammate
- Todo state from earlier phases carries forward
- The agent's context window grows with each phase

**Mitigation:** For projects requiring strict isolation between phases, consider using git worktrees manually before running the implement phase, or use the `single` mode to reduce context overhead.

## Differences from Claude Code BRAINS

| Aspect | Claude Code | OpenCode |
|---|---|---|
| Agent switching | `/brains:brains` slash command | Tab key to switch agents |
| Subagent invocation | `Agent` tool | Task tool / `@` mentions |
| Task tracking | beads (`bd` CLI) | Built-in `todo` tool |
| Teammate spawning | tmux / agent-teams | OpenCode subagents |
| Multi-LLM review | Shell `uvx star-chamber` | Custom tools wrapping `uvx star-chamber` |
| Configuration | `settings.local.json` | `~/.config/opencode/brains.json` |
| Plugin system | `plugin.json` + SKILL.md | TypeScript plugin + agent markdown |

## Acknowledgments

Ported from [BRAINS](https://github.com/Epiphytic/brains) by Liam Helmer. Built on top of:

- [star-chamber](https://github.com/peteski22/star-chamber) — multi-LLM council
- [OpenCode](https://opencode.ai) — the open source AI coding agent

## License

[MIT](LICENSE)