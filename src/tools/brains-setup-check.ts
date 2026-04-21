import { tool } from "@opencode-ai/plugin"
import { join } from "path"
import { existsSync, mkdirSync, readdirSync } from "fs"
import { homedir } from "os"

export default tool({
  description:
    "Check BRAINS dependencies and configuration. Run this before using BRAINS to verify that uv, star-chamber, and config files are properly set up.",
  args: {
    scope: tool.schema
      .enum(["global", "local", "both"])
      .optional()
      .describe("Check scope: global (system-wide), local (this project), or both. Default: both."),
  },
  async execute(args, context) {
    const scope = args.scope ?? "both"
    const results: string[] = []
    const status: Record<string, string | number> = {}
    let hasErrors = false

    // Check uv
    let uvVersion = ""
    try {
      uvVersion = await Bun.$`uv --version`.text()
      results.push(`✅ uv: ${uvVersion.trim()}`)
      status.uv = uvVersion.trim()
    } catch {
      results.push("❌ uv: NOT INSTALLED")
      results.push("   Install: curl -LsSf https://astral.sh/uv/install.sh | sh")
      hasErrors = true
      status.uv = "missing"
    }

    // Check star-chamber (only if uv is available)
    if (uvVersion) {
      try {
        const scVersion = await Bun.$`uvx star-chamber --version`.text()
        results.push(`✅ star-chamber: ${scVersion.trim()}`)
        status.starChamber = scVersion.trim()
      } catch {
        results.push("⚠️  star-chamber: NOT INSTALLED (auto-installs on first uvx call)")
        results.push("   Verify: uvx star-chamber list-providers")
        status.starChamber = "not-verified"
      }
    } else {
      results.push("⚠️  star-chamber: skipped (uv not available)")
      status.starChamber = "skipped"
    }

    // Check git repo
    try {
      await Bun.$`git rev-parse --git-dir`.quiet()
      results.push("✅ git: repository detected")
      status.git = "ok"
    } catch {
      results.push("⚠️  git: not a git repository (BRAINS requires git)")
      status.git = "missing"
    }

    // Global checks
    if (scope === "global" || scope === "both") {
      const globalConfigPath = join(homedir(), ".config", "star-chamber", "providers.json")
      if (existsSync(globalConfigPath)) {
        results.push(`✅ star-chamber config: ${globalConfigPath}`)
        status.starChamberConfig = "found"
      } else {
        results.push(`⚠️  star-chamber config: not found at ${globalConfigPath}`)
        results.push("   Run: uvx star-chamber list-providers")
        status.starChamberConfig = "missing"
      }

      const brainsConfigPath = join(homedir(), ".config", "opencode", "brains.json")
      if (existsSync(brainsConfigPath)) {
        results.push(`✅ brains config: ${brainsConfigPath}`)
        status.brainsConfig = "found"
      } else {
        results.push(`⚠️  brains config: not found at ${brainsConfigPath} (using defaults)`)
        status.brainsConfig = "using-defaults"
      }

      const agentsDir = join(homedir(), ".config", "opencode", "agents")
      if (existsSync(agentsDir)) {
        const agentFiles = readdirSync(agentsDir).filter((f) => f.endsWith(".md"))
        const count = agentFiles.length
        results.push(`✅ agents directory: ${count} agent(s) found`)
        status.agents = count
      } else {
        results.push(`⚠️  agents directory: not found at ${agentsDir}`)
        status.agents = "missing"
      }
    }

    // Local checks
    if (scope === "local" || scope === "both") {
      const docsPlansDir = join(context.worktree, "docs", "plans")
      const docsAdrDir = join(context.worktree, "docs", "adr")

      if (existsSync(docsPlansDir)) {
        results.push(`✅ docs/plans/: exists`)
        status.docsPlans = "exists"
      } else {
        results.push(`ℹ️  docs/plans/: not found (will be created on first run)`)
        status.docsPlans = "missing"
      }

      if (existsSync(docsAdrDir)) {
        results.push(`✅ docs/adr/: exists`)
        status.docsAdr = "exists"
      } else {
        results.push(`ℹ️  docs/adr/: not found (will be created on first run)`)
        status.docsAdr = "missing"
      }
    }

    // Summary
    const errors = results.filter((r) => r.startsWith("❌")).length
    const warnings = results.filter((r) => r.startsWith("⚠️")).length

    let summary = `\n## BRAINS Setup Check\n\n${results.join("\n")}\n\n`
    summary += `---\n**${errors} error(s), ${warnings} warning(s)**`

    if (errors > 0) {
      summary += "\n\nBRAINS multi-LLM modes (--parallel, --debate) require uv and star-chamber.\nSingle mode (--single) works without them."
    }

    // Set structured metadata for the agent
    context.metadata({
      title: `BRAINS Setup: ${errors} error(s), ${warnings} warning(s)`,
      metadata: {
        scope,
        errors,
        warnings,
        status,
        ready: errors === 0,
      },
    })

    return summary
  },
})
