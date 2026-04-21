/**
 * star-chamber-review Custom Tool
 *
 * Wraps `uvx star-chamber review` for multi-LLM code/security review.
 * Used by nurture and secure agents.
 *
 * Port note: Original Claude Code plugin invoked star-chamber via shell.
 * This OpenCode version uses custom tool definitions with Zod schemas.
 * The `lean` parameter was removed in polish (6fix-port.md) as it
 * was declared in the schema but never used in the execute function.
 */
import { tool } from "@opencode-ai/plugin"
import { join } from "path"
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { loadConfig } from "../config.js"

export default tool({
  description:
    "Send code files to the star-chamber multi-LLM council for security or quality review. Use for nurture (quality review) and secure (security review) phases.",
  args: {
    files: tool.schema
      .array(tool.schema.string())
      .describe("Paths to files to review"),
    contextFiles: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Paths to additional context files (ADRs, design docs, etc.)"),
    reviewFocus: tool.schema
      .string()
      .optional()
      .describe("Specific review focus (e.g., 'security', 'completeness', 'quality')"),
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

    // Verify files exist
    const existingFiles = args.files.filter((f) => existsSync(f))
    if (existingFiles.length === 0) {
      return `ERROR: None of the specified files exist: ${args.files.join(", ")}`
    }

    // Create temp directory
    const tmpDir = join(tmpdir(), "brains-council", `run-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })

    try {
      // Build context file
      const contextParts: string[] = []

      if (args.reviewFocus) {
        contextParts.push(`## Review Focus\n\n${args.reviewFocus}`)
      }

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
        return await runDebateReview(existingFiles, contextFile, rounds, tmpDir)
      } else {
        return await runParallelReview(existingFiles, contextFile, tmpDir)
      }
    } finally {
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {}
    }
  },
})

async function runParallelReview(
  files: string[],
  contextFile: string,
  tmpDir: string
): Promise<string> {
  const cmd = [
    "uvx", "star-chamber", "review",
    "--context-file", contextFile,
    "--format", "json",
    ...files,
  ]

  try {
    const result = await Bun.$`${cmd}`.text()
    return formatReviewResult(result)
  } catch (err: any) {
    return `Star-chamber review failed: ${err.message}`
  }
}

async function runDebateReview(
  files: string[],
  contextFile: string,
  rounds: number,
  tmpDir: string
): Promise<string> {
  let councilContext = ""
  let lastResult = ""

  for (let round = 1; round <= rounds; round++) {
    const args: string[] = [
      "uvx", "star-chamber", "review",
      "--context-file", contextFile,
      "--format", "json",
    ]

    if (round > 1 && councilContext) {
      const councilFile = join(tmpDir, "council-context.txt")
      writeFileSync(councilFile, councilContext)
      args.push("--council-context", councilFile)
    }

    args.push(...files)

    try {
      const result = await Bun.$`${args}`.text()
      lastResult = result

      if (round < rounds) {
        councilContext = synthesizeReviewRound(result, round)
      }
    } catch (err: any) {
      return `Star-chamber review debate failed on round ${round}: ${err.message}`
    }
  }

  return formatReviewResult(lastResult)
}

function synthesizeReviewRound(jsonResult: string, round: number): string {
  try {
    const parsed = JSON.parse(jsonResult)
    const issues: string[] = []

    if (parsed.consensus_issues) {
      for (const issue of parsed.consensus_issues) {
        issues.push(`${issue.location}: ${issue.description}`)
      }
    }

    return `## Council review feedback (round ${round}):\n\n**Issues raised:**\n${issues.map((i) => `- ${i}`).join("\n")}\n\nPlease review these findings and provide your perspective.`
  } catch {
    return `## Council review feedback (round ${round}):\n\n${jsonResult}`
  }
}

function formatReviewResult(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr)

    let output = "## Council Review\n\n"

    if (parsed.consensus_issues?.length) {
      output += "### Consensus Issues\n"
      for (let i = 0; i < parsed.consensus_issues.length; i++) {
        const issue = parsed.consensus_issues[i]
        output += `${i + 1}. \`${issue.location}\` **[${issue.severity || "medium"}]** - ${issue.description}\n`
        if (issue.suggestion) output += `   - **Suggestion:** ${issue.suggestion}\n`
      }
      output += "\n"
    }

    if (parsed.majority_issues?.length) {
      output += "### Majority Issues\n"
      for (let i = 0; i < parsed.majority_issues.length; i++) {
        const issue = parsed.majority_issues[i]
        output += `${i + 1}. \`${issue.location}\` **[${issue.severity || "medium"}]** — flagged by ${issue.flagged_by}\n`
      }
      output += "\n"
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
