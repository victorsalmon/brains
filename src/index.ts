/**
 * BRAINS OpenCode Plugin — Entry Point
 *
 * Architecture: BRAINS (Brainstorm Research Architect Implement Nurture Secure)
 * is a three-phase agentic development workflow ported from the Claude Code plugin
 * at Epiphytic/brains. The port maps Claude Code concepts to OpenCode equivalents:
 *
 *   Claude Code SKILL.md    → OpenCode agent (.md with YAML frontmatter)
 *   Claude Code Agent tool   → OpenCode Task tool / @mention subagent
 *   beads (bd CLI)            → OpenCode built-in todo tool
 *   tmux teammate spawn       → OpenCode subagent (Task tool)
 *   uvx star-chamber (shell)  → Custom tools wrapping uvx star-chamber CLI
 *   plugin.json               → opencode.json "plugin" array entry
 *
 * Known limitation: OpenCode subagents share session context (no isolation).
 * See README "Known Limitations" and agents/implement.md for details.
 *
 * Polish history: 3feedback-port.md (MiniMax M2.7) → 4fixes-port.md (Qwen 3.6 Plus)
 * → 5polish-port.md (GLM-5.1) → 6fix-port.md (minimax-m2.7)
 */
import type { Plugin, Event } from "@opencode-ai/plugin"
import starChamberAsk from "./tools/star-chamber-ask.js"
import starChamberReview from "./tools/star-chamber-review.js"
import brainsSetupCheck from "./tools/brains-setup-check.js"
import { detectComplexity, formatSuggestion } from "./hooks/complexity-detect.js"

export const BrainsPlugin: Plugin = async ({ client }) => {
  let lastAnalyzedMessageId: string | null = null

  return {
    // Register custom tools
    tool: {
      "star-chamber-ask": starChamberAsk,
      "star-chamber-review": starChamberReview,
      "brains-setup-check": brainsSetupCheck,
    },

    // Complexity detection on session updates
    event: async ({ event }: { event: Event }) => {
      // Only analyze message updates (not completions or other events)
      if (event.type !== "message.updated") return
      const props = event.properties as any
      if (props?.info?.role !== "user") return

      const messageId = props?.info?.id
      if (!messageId || messageId === lastAnalyzedMessageId) return
      lastAnalyzedMessageId = messageId

      // Extract text from message parts
      const parts = (props?.parts || []) as Array<{ type: string; text?: string }>
      const text = parts
        .filter((p) => p.type === "text")
        .map((p) => p.text ?? "")
        .join(" ")

      if (!text || text.length < 20) return

      const { signals, shouldSuggest } = detectComplexity(text)
      if (!shouldSuggest) return

      const suggestion = formatSuggestion(signals)

      // Log the suggestion (the agent will see this in context)
      await client.app.log({
        body: {
          service: "opencode-brains",
          level: "info",
          message: `BRAINS complexity detected: ${signals.join(", ")}`,
          extra: { signals, suggestion },
        },
      })
    },
  }
}

export default BrainsPlugin
