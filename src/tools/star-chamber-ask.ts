import { tool } from "@opencode-ai/plugin"
import { join } from "path"
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { loadConfig } from "../config.js"

export default tool({
  description:
    "Send a design question to the star-chamber multi-LLM council for review. Use --mode parallel for single-round review or --mode debate for multi-round deliberation.",
  args: {
    question: tool.schema.string().describe("The design question to ask the council"),
    contextFiles: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Paths to context files to include (e.g., ARCHITECTURE.md, ADR files)"),
    mode: tool.schema
      .enum(["parallel", "debate"])
      .default("parallel")
      .describe("Review mode: parallel (single round) or debate (multi-round)."),
    rounds: tool.schema
      .number()
      .min(1)
      .max(10)
      .default(2)
      .describe("Number of debate rounds (only applies to debate mode)."),
  },
  async execute(args, context) {
    const config = loadConfig()
    const mode = args.mode ?? config.mode
    const rounds = args.rounds ?? config.debateRounds

    // Check uv availability
    try {
      await Bun.$`uv --version`.quiet()
    } catch {
      return `ERROR: uv is required for star-chamber. Install: curl -LsSf https://astral.sh/uv/install.sh | sh`
    }

    // Check star-chamber availability
    try {
      await Bun.$`uvx star-chamber --version`.quiet()
    } catch {
      return `ERROR: star-chamber not found. Install: uvx star-chamber --version (auto-installs on first use)`
    }

    // Create temp directory
    const tmpDir = join(tmpdir(), "brains-council", `run-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })

    try {
      // Build context file
      const contextParts: string[] = []

      if (args.contextFiles) {
        for (const filePath of args.contextFiles) {
          if (existsSync(filePath)) {
            const content = await Bun.file(filePath).text()
            contextParts.push(`## ${filePath}\n\n${content}`)
          }
        }
      }

      const contextFile = join(tmpDir, "context.txt")
      writeFileSync(contextFile, contextParts.join("\n\n---\n\n"))

      if (mode === "debate") {
        return await runDebate(args.question, contextFile, rounds, tmpDir)
      } else {
        return await runParallel(args.question, contextFile, tmpDir)
      }
    } finally {
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
    }
  },
})

async function runParallel(
  question: string,
  contextFile: string,
  tmpDir: string
): Promise<string> {
  try {
    const result = await Bun.$`uvx star-chamber ask --context-file ${contextFile} --format json ${question}`.text()
    return formatAskResult(result)
  } catch (err: any) {
    return `Star-chamber ask failed: ${err.message}`
  }
}

async function runDebate(
  question: string,
  contextFile: string,
  rounds: number,
  tmpDir: string
): Promise<string> {
  let councilContext = ""
  let lastResult = ""

  for (let round = 1; round <= rounds; round++) {
    const args: string[] = [
      "uvx", "star-chamber", "ask",
      "--context-file", contextFile,
      "--format", "json",
    ]

    if (round > 1 && councilContext) {
      const councilFile = join(tmpDir, "council-context.txt")
      writeFileSync(councilFile, councilContext)
      args.push("--council-context", councilFile)
    }

    args.push(question)

    try {
      const result = await Bun.$`${args}`.text()
      lastResult = result

      // Generate anonymous synthesis for next round
      if (round < rounds) {
        councilContext = synthesizeRound(result, round)
      }
    } catch (err: any) {
      return `Star-chamber debate failed on round ${round}: ${err.message}`
    }
  }

  return formatAskResult(lastResult)
}

function synthesizeRound(jsonResult: string, round: number): string {
  try {
    const parsed = JSON.parse(jsonResult)
    const points: string[] = []

    if (parsed.consensus) points.push(`Consensus: ${parsed.consensus}`)
    if (parsed.summary) points.push(`Summary: ${parsed.summary}`)

    return `## Council feedback (round ${round}):\n\n**Key points raised:**\n${points.map((p) => `- ${p}`).join("\n")}\n\nPlease provide your perspective on these points.`
  } catch {
    return `## Council feedback (round ${round}):\n\n${jsonResult}`
  }
}

function formatAskResult(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr)

    let output = "## Council Advisory\n\n"

    if (parsed.consensus) {
      output += `### Consensus Recommendation\n${parsed.consensus}\n\n`
    }

    if (parsed.approaches) {
      output += "### Approaches Considered\n"
      for (const approach of parsed.approaches) {
        output += `**${approach.name || "Approach"}**${approach.recommended_by ? ` — Recommended by ${approach.recommended_by} provider(s)` : ""}\n`
        if (approach.pros) output += `- **Pros:** ${approach.pros}\n`
        if (approach.cons) output += `- **Cons:** ${approach.cons}\n`
        if (approach.risk) output += `- **Risk:** ${approach.risk}\n`
        output += "\n"
      }
    }

    if (parsed.summary) {
      output += `### Summary\n${parsed.summary}\n`
    }

    if (parsed.failed_providers?.length) {
      output += `\n**Failed providers:** ${parsed.failed_providers.join(", ")}\n`
    }

    return output
  } catch {
    return jsonStr
  }
}
