import { z } from "zod"
import { homedir } from "os"
import { join } from "path"
import { existsSync, readFileSync } from "fs"

export const BrainsConfigSchema = z.object({
  version: z.string().default("0.1.0"),
  mode: z.enum(["single", "parallel", "debate"]).default("parallel"),
  autopilot: z.boolean().default(false),
  lean: z.boolean().default(false),
  debateRounds: z.number().int().min(1).max(10).default(2),
  defaultModel: z.string().default("anthropic/claude-sonnet-4-20250514"),
  teammateModel: z.string().default("anthropic/claude-sonnet-4-20250514"),
  escalateOnRetry: z.boolean().default(true),
  pollingIntervalSeconds: z.number().int().min(5).max(120).default(15),
  userResponseTimeoutSeconds: z.number().int().default(14400),
  baseBranches: z.array(z.string()).default(["main", "master", "develop"]),
})

export type BrainsConfig = z.infer<typeof BrainsConfigSchema>

const CONFIG_PATHS = [
  join(homedir(), ".config", "opencode", "brains.json"),
  join(process.cwd(), ".opencode", "brains.json"),
]

export function loadConfig(): BrainsConfig {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, "utf-8")
        const parsed = JSON.parse(raw)
        return BrainsConfigSchema.parse(parsed)
      } catch {
        // Fall through to defaults
      }
    }
  }
  return BrainsConfigSchema.parse({})
}

export function getConfigPath(): string | null {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) return configPath
  }
  return null
}

export function getReferencesDir(): string {
  return join(homedir(), ".config", "opencode", "references", "brains")
}

export const config = loadConfig()
