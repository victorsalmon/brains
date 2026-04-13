# Testing Guide (Humans)

How to manually test the BRAINS plugin after installing or making changes.

## Setup

Install the plugin locally:

```bash
claude --plugin-dir /path/to/brains
```

Verify installation:

```bash
# Inside a Claude Code session, run:
/help
```

All BRAINS skills should appear in the help output as `/brains:storm`, `/brains:research`, etc.

## Prerequisites Check

Before testing multi-LLM modes, verify star-chamber is working:

```bash
# Outside Claude Code
uvx star-chamber list-providers
```

If this fails, multi-LLM modes (`--parallel`, `--debate`) won't work. Single mode (`--single`) works without star-chamber.

## Test Each Skill

### 1. Suggest (Auto-Detection)

The suggest skill triggers automatically on complex tasks. To test:

1. Start a Claude Code session with the plugin loaded
2. Describe a complex, multi-component task:
   > "I need to build a new authentication system that handles OAuth2, SAML, and API keys, with a migration path from the existing session-based auth"
3. **Expected**: Claude suggests using `/brains:storm` or `/brains:brains` before diving in
4. **Not expected**: Claude auto-invokes BRAINS without asking

To verify it does NOT trigger on simple tasks:
> "Fix the typo on line 42 of README.md"

No BRAINS suggestion should appear.

### 2. Storm

```
/brains:storm "design a CLI tool for managing dotfiles"
```

**What to check:**
- Asks clarifying questions one at a time
- Offers the visual companion if the topic has visual aspects
- Proposes 2-3 approaches before committing to one
- Presents the design section by section, asking for approval
- Writes a spec to `docs/plans/YYYY-MM-DD-*-storm.md`
- Suggests the next phase (research or architect)

**Test modes:**
- `/brains:storm --single "topic"` — should NOT invoke star-chamber
- `/brains:storm --parallel "topic"` — brainstorms locally, then sends to council
- `/brains:storm --debate "topic"` — debates each decision with the council

### 3. Research

```
/brains:research "what ORM options exist for this project"
```

**What to check:**
- Defines research questions before investigating
- Uses Glob/Grep/Read to explore the codebase
- Uses WebSearch/WebFetch for external research
- Compiles findings with confidence levels
- Writes report to `docs/plans/YYYY-MM-DD-*-research.md`

### 4. Architect

```
/brains:architect "design the API layer"
```

**What to check:**
- Reviews any prior storm/research outputs
- Identifies architectural decisions to make
- Creates ADRs in `docs/adr/`
- Produces a comprehensive design document
- Covers: components, data flow, error handling, testing strategy

### 5. Implement

```
/brains:implement
```

**What to check:**
- Reads prior phase outputs from `docs/plans/`
- Creates an ordered task list with dependencies
- Includes Nurture and Secure as final tasks in the plan
- Detects tmux environment correctly
- If in tmux: opens a new pane with a fresh Claude session
- If not in tmux: provides clear instructions for launching

**Beads integration:**
- If you have the beads plugin installed, verify it creates beads tasks
- If not, verify it falls back to TaskCreate/TaskUpdate

### 6. Nurture

```
/brains:nurture
```

**What to check:**
- Reviews recent implementation changes
- Identifies bugs, missing features, missing tests
- Presents a prioritized issue list (P0/P1/P2)
- Fixes issues in priority order
- Runs tests after each fix
- Commits atomically

### 7. Secure

```
/brains:secure
```

**What to check:**
- Scans for hardcoded secrets
- Reviews against OWASP Top 10 (relevant categories)
- Audits dependencies for known vulnerabilities
- Produces a threat model
- Fixes critical/high issues
- Writes a security report

### 8. BRAINS (Full Pipeline)

```
/brains:brains "build a REST API for task management"
```

**What to check:**
- Runs Storm first, then Research, Architect, Implement in order
- Pauses between each phase for user confirmation ("Ready to move to research?")
- Each phase reads the outputs of prior phases
- Implementation plan includes Nurture and Secure as final tasks
- All outputs land in `docs/plans/` and `docs/adr/`

**Test skipping:**
- After Storm completes, say "skip research, go straight to architect"
- Verify it proceeds to architect with a warning about skipping

## Visual Companion

Test the browser-based brainstorming companion:

1. Run `/brains:storm` on a topic with visual aspects (UI design, architecture diagrams)
2. When offered the visual companion, accept it
3. Open the provided URL in your browser
4. Verify:
   - HTML content appears in the browser
   - Clicking options records selections
   - Claude picks up your browser interactions on the next turn
   - A "Continuing in terminal..." screen appears when switching back to text

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Skills don't appear in `/help` | Plugin not loaded | Check `--plugin-dir` path |
| "uv is missing" on parallel/debate | uv not installed | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| "config missing" on parallel/debate | No star-chamber config | `uvx star-chamber list-providers` and set up providers |
| Tmux pane doesn't open | Not in a tmux session | Start tmux first, or follow the manual instructions |
| Visual companion URL unreachable | Server didn't start | Check for Node.js availability |
