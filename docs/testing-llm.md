# Testing Protocol (LLM)

Structured test protocol for validating the BRAINS plugin. Follow each test case sequentially. Record PASS/FAIL for each.

## Environment Setup

```bash
# Load the plugin
claude --plugin-dir /path/to/brains
```

Prerequisite checks:

```bash
command -v uv >/dev/null 2>&1 && echo "PASS: uv installed" || echo "FAIL: uv missing"
command -v node >/dev/null 2>&1 && echo "PASS: node installed" || echo "FAIL: node missing (visual companion won't work)"
CONFIG_PATH="${STAR_CHAMBER_CONFIG:-$HOME/.config/star-chamber/providers.json}"
[[ -f "$CONFIG_PATH" ]] && echo "PASS: star-chamber config exists" || echo "WARN: no config (multi-LLM modes unavailable)"
```

## Test Suite

### T01: Plugin Structure Validation

Verify all required files exist and are well-formed.

```bash
# Manifest exists and is valid JSON
jq . /path/to/brains/.claude-plugin/plugin.json > /dev/null 2>&1 && echo "T01.1 PASS" || echo "T01.1 FAIL"

# All 8 SKILL.md files exist
for skill in suggest storm research architect implement nurture secure brains; do
  [[ -f "/path/to/brains/skills/$skill/SKILL.md" ]] && echo "T01.2 PASS: $skill" || echo "T01.2 FAIL: $skill"
done

# Shared reference exists
[[ -f "/path/to/brains/references/multi-llm-protocol.md" ]] && echo "T01.3 PASS" || echo "T01.3 FAIL"

# Visual companion scripts exist and are executable
for script in start-server.sh stop-server.sh; do
  [[ -x "/path/to/brains/skills/storm/scripts/$script" ]] && echo "T01.4 PASS: $script" || echo "T01.4 FAIL: $script"
done
```

**Expected**: All PASS.

### T02: Frontmatter Validation

Every SKILL.md must have valid YAML frontmatter with required fields.

```bash
for skill in suggest storm research architect implement nurture secure brains; do
  FILE="/path/to/brains/skills/$skill/SKILL.md"
  # Check frontmatter delimiters
  head -1 "$FILE" | grep -q '^---' && tail -n +2 "$FILE" | grep -q '^---' || { echo "T02.1 FAIL: $skill missing frontmatter"; continue; }
  # Check required fields
  sed -n '2,/^---$/p' "$FILE" | grep -q '^name:' && echo "T02.2 PASS: $skill has name" || echo "T02.2 FAIL: $skill missing name"
  sed -n '2,/^---$/p' "$FILE" | grep -q '^description:' && echo "T02.3 PASS: $skill has description" || echo "T02.3 FAIL: $skill missing description"
done
```

**Expected**: All PASS.

### T03: Description Quality

Verify descriptions follow conventions.

For each SKILL.md, check:

| Check | Criteria | How to Verify |
|-------|----------|---------------|
| T03.1 | Third person | Description starts with "This skill" |
| T03.2 | Trigger phrases | Contains quoted phrases ("brainstorm", "research", etc.) |
| T03.3 | Slash command | User-invocable skills mention `/brains:<name>` |
| T03.4 | Mode listing | User-invocable skills mention supported modes |

```bash
for skill in storm research architect implement nurture secure brains; do
  FILE="/path/to/brains/skills/$skill/SKILL.md"
  DESC=$(sed -n '/^description:/,/^[a-z]/p' "$FILE" | head -1)
  echo "$DESC" | grep -q 'This skill' && echo "T03.1 PASS: $skill" || echo "T03.1 FAIL: $skill not third person"
  echo "$DESC" | grep -q '"/brains:' && echo "T03.3 PASS: $skill" || echo "T03.3 FAIL: $skill missing slash command"
done
```

**Expected**: All PASS.

### T04: Suggest Skill — Complexity Detection

Test that the suggest skill correctly identifies complex tasks.

**T04.1 — Complex task triggers suggestion:**
Prompt: "I need to build a distributed task queue with retry logic, dead letter queues, and a monitoring dashboard"
Expected: Claude suggests `/brains:storm` or `/brains:brains`

**T04.2 — Simple task does NOT trigger:**
Prompt: "Rename the variable `foo` to `bar` in utils.py"
Expected: Claude proceeds directly without suggesting BRAINS

**T04.3 — Never auto-invokes:**
For any prompt, verify BRAINS is suggested (not invoked). The user must explicitly run a `/brains:*` command.

### T05: Storm Skill — Brainstorming Flow

**T05.1 — Single mode:**
```
/brains:storm --single "design a caching layer"
```
Expected:
- No star-chamber invocation
- Asks clarifying questions one at a time
- Proposes 2-3 approaches
- Writes spec to `docs/plans/`

**T05.2 — Parallel mode (default):**
```
/brains:storm "design a caching layer"
```
Expected:
- Brainstorms locally first
- After design is approved, invokes `uvx star-chamber ask`
- Presents council feedback
- Offers to revise based on feedback

**T05.3 — Debate mode:**
```
/brains:storm --debate "design a caching layer"
```
Expected:
- Creates temp directory for debate rounds
- Invokes star-chamber at major decision points
- Synthesizes anonymously between rounds

**T05.4 — Visual companion offer:**
Prompt with visual aspects: `/brains:storm "design a dashboard UI"`
Expected: Offers visual companion in its own message (no other content in that message)

### T06: Research Skill

**T06.1 — Defines questions first:**
```
/brains:research "what testing frameworks work best here"
```
Expected: Presents research questions before investigating

**T06.2 — Uses appropriate tools:**
Expected: Uses Glob, Grep, Read for codebase; WebSearch/WebFetch for external

**T06.3 — Structured output:**
Expected: Report with findings, confidence levels, sources, implications

### T07: Architect Skill

**T07.1 — Reads prior outputs:**
After completing storm and research phases, run `/brains:architect`
Expected: References the storm spec and research report

**T07.2 — Creates ADRs:**
Expected: Creates numbered ADR files in `docs/adr/`

**T07.3 — Decision framework:**
Expected: Categorizes decisions by impact and reversibility

### T08: Implement Skill

**T08.1 — Plan structure:**
```
/brains:implement
```
Expected: Creates ordered task list with Nurture and Secure as final phases

**T08.2 — Beads detection:**
Expected: Checks for beads plugin, uses TaskCreate/TaskUpdate as fallback

**T08.3 — Tmux detection:**
In tmux: Expected: Opens new pane
Not in tmux: Expected: Provides launch instructions

**T08.4 — Fresh context:**
Expected: The implementation session starts with a clean context, not the current conversation

### T09: Nurture Skill

**T09.1 — Review first, then fix:**
Expected: Presents prioritized issue list BEFORE making changes

**T09.2 — Priority ordering:**
Expected: P0 bugs fixed first, then P1 missing features/tests, then P2 quality

**T09.3 — Atomic commits:**
Expected: Each fix committed separately with descriptive messages

### T10: Secure Skill

**T10.1 — Secrets scan:**
Expected: Runs grep patterns for common secret indicators

**T10.2 — OWASP categories:**
Expected: Reviews relevant OWASP Top 10 categories for the project's stack

**T10.3 — Dependency audit:**
Expected: Runs appropriate audit command for the project's package manager

### T11: BRAINS Orchestrator

**T11.1 — Sequential execution:**
```
/brains:brains "build a webhook processor"
```
Expected: Storm → Research → Architect → Implement in order

**T11.2 — User gates:**
Expected: Pauses between each phase for user confirmation

**T11.3 — Phase skipping:**
At a user gate, say "skip research"
Expected: Proceeds to next phase with a warning

**T11.4 — Mode propagation:**
```
/brains:brains --debate "build a webhook processor"
```
Expected: All phases use debate mode unless overridden

**T11.5 — Resume after interruption:**
Start a pipeline, complete Storm, then end the session. Start a new session and run `/brains:brains` again.
Expected: Detects existing storm output in `docs/plans/` and offers to resume from research.

### T12: Cross-Reference Integrity

Verify all internal file references resolve:

```bash
# Multi-LLM protocol referenced by all non-suggest skills
for skill in storm research architect implement nurture secure brains; do
  grep -q 'multi-llm-protocol.md' "/path/to/brains/skills/$skill/SKILL.md" && echo "T12.1 PASS: $skill" || echo "T12.1 FAIL: $skill"
done

# Storm references visual companion
grep -q 'visual-companion.md' "/path/to/brains/skills/storm/SKILL.md" && echo "T12.2 PASS" || echo "T12.2 FAIL"

# Brains references all phase skills
for skill in storm research architect implement nurture secure; do
  grep -q "$skill" "/path/to/brains/skills/brains/SKILL.md" && echo "T12.3 PASS: $skill" || echo "T12.3 FAIL: $skill"
done
```

**Expected**: All PASS.

## Results Template

```markdown
## BRAINS Plugin Test Results

**Date:** YYYY-MM-DD
**Tester:** [name or model]
**Plugin version:** 0.1.0

| Test | Status | Notes |
|------|--------|-------|
| T01 Structure | | |
| T02 Frontmatter | | |
| T03 Descriptions | | |
| T04 Suggest | | |
| T05 Storm | | |
| T06 Research | | |
| T07 Architect | | |
| T08 Implement | | |
| T09 Nurture | | |
| T10 Secure | | |
| T11 BRAINS | | |
| T12 References | | |

**Overall:** PASS / FAIL
**Issues found:**
```
