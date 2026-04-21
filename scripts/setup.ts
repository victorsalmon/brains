#!/usr/bin/env bun

/**
 * BRAINS Setup Script for OpenCode
 *
 * Copies agent definitions, reference docs, and compiled tools to
 * ~/.config/opencode/ directories. Creates default brains.json config.
 * Checks uv, star-chamber, and git availability.
 *
 * Usage:
 *   bun run scripts/setup.ts          # interactive setup
 *   bun run scripts/setup.ts --check  # check only, no changes
 *
 * Port note: Original Claude Code plugin had an interactive setup wizard
 * (/brains:setup skill). This is a non-interactive file-copy script.
 *
 * Polish note (6fix-port.md): Removed src/tools/ fallback — OpenCode
 * cannot execute TypeScript tool files directly, so dist/ is now a hard
 * requirement. Also fixed ESM require() → import and added writeFileSync
 * to the existing fs import.
 */

import { join, dirname } from "path"
import { homedir } from "os"
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync } from "fs"

const CONFIG_DIR = join(homedir(), ".config", "opencode")
const AGENTS_DIR = join(CONFIG_DIR, "agents")
const REFERENCES_DIR = join(CONFIG_DIR, "references", "brains")
const TOOLS_DIR = join(CONFIG_DIR, "tools")

// Resolve paths relative to the package root
const PACKAGE_DIR = dirname(import.meta.dir)

const CHECK_ONLY = process.argv.includes("--check")

function copyDir(src: string, dst: string, label: string): number {
  if (!existsSync(src)) {
    console.log(`⚠️  ${label}: source not found at ${src}`)
    return 0
  }

  mkdirSync(dst, { recursive: true })

  let count = 0
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const dstPath = join(dst, entry)

    if (statSync(srcPath).isDirectory()) {
      count += copyDir(srcPath, dstPath, `${label}/${entry}`)
    } else {
      if (!CHECK_ONLY) {
        copyFileSync(srcPath, dstPath)
      }
      count++
    }
  }

  return count
}

function writeDefaultConfig(): void {
  const configPath = join(CONFIG_DIR, "brains.json")

  if (existsSync(configPath)) {
    console.log(`✅ brains config: already exists at ${configPath}`)
    return
  }

  if (CHECK_ONLY) {
    console.log(`⚠️  brains config: not found at ${configPath} (would create)`)
    return
  }

  const defaultConfig = {
    version: "0.1.0",
    mode: "parallel",
    autopilot: false,
    lean: false,
    debateRounds: 2,
    defaultModel: "anthropic/claude-sonnet-4-20250514",
    teammateModel: "anthropic/claude-sonnet-4-20250514",
    escalateOnRetry: true,
    pollingIntervalSeconds: 15,
    userResponseTimeoutSeconds: 14400,
    baseBranches: ["main", "master", "develop"],
  }

  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
  console.log(`✅ brains config: created at ${configPath}`)
}

async function checkDeps(): Promise<void> {
  console.log("\n=== Dependency Check ===")

  // Check uv
  try {
    const version = await Bun.$`uv --version`.text()
    console.log(`✅ uv: ${version.trim()}`)
  } catch {
    console.log("❌ uv: NOT INSTALLED")
    console.log("   Install: curl -LsSf https://astral.sh/uv/install.sh | sh")
  }

  // Check star-chamber
  try {
    const version = await Bun.$`uvx star-chamber --version`.text()
    console.log(`✅ star-chamber: ${version.trim()}`)
  } catch {
    console.log("⚠️  star-chamber: NOT INSTALLED (auto-installs on first uvx call)")
  }

  // Check git
  try {
    await Bun.$`git rev-parse --git-dir`.quiet()
    console.log("✅ git: repository detected")
  } catch {
    console.log("⚠️  git: not a git repository")
  }

  console.log("")
}

async function main(): Promise<void> {
  console.log(`\n🧠 BRAINS Setup for OpenCode${CHECK_ONLY ? " (check only)" : ""}\n`)

  // Check dependencies
  await checkDeps()

  // Create config directory
  mkdirSync(CONFIG_DIR, { recursive: true })

  // Copy agents
  const agentsSrc = join(PACKAGE_DIR, "agents")
  const agentCount = copyDir(agentsSrc, AGENTS_DIR, "agents")
  if (agentCount > 0) {
    console.log(`✅ agents: ${agentCount} file(s) copied to ${AGENTS_DIR}`)
  }

  // Copy references
  const refsSrc = join(PACKAGE_DIR, "references")
  const refCount = copyDir(refsSrc, REFERENCES_DIR, "references")
  if (refCount > 0) {
    console.log(`✅ references: ${refCount} file(s) copied to ${REFERENCES_DIR}`)
  }

  // Copy tools (require dist/ to be built)
  const toolsSrcDist = join(PACKAGE_DIR, "dist", "tools")

  if (existsSync(toolsSrcDist)) {
    const toolCount = copyDir(toolsSrcDist, TOOLS_DIR, "tools")
    if (toolCount > 0) {
      console.log(`✅ tools: ${toolCount} file(s) copied from dist/ to ${TOOLS_DIR}`)
    }
  } else {
    console.log(`⚠️  tools: dist/tools/ not found. Run 'bun run build' before setup.`)
  }

  // Write default config
  writeDefaultConfig()

  // Summary
  console.log("\n=== Setup Complete ===")
  console.log(`  Agents:     ${AGENTS_DIR}`)
  console.log(`  References: ${REFERENCES_DIR}`)
  console.log(`  Config:     ${join(CONFIG_DIR, "brains.json")}`)
  console.log("\nAdd the plugin to your OpenCode config:")
  console.log(`  ${join(CONFIG_DIR, "opencode.json")}`)
  console.log('  → "plugin": ["opencode-brains"]')
  console.log("\nRestart OpenCode to load the new agents and tools.")
}

main().catch(console.error)
