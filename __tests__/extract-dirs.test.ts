import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { tmpdir } from "node:os"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { selfExtract } from "../.opencode-plugin/install"

/**
 * Issue #20 — the engine reads gold/assessor-gold.jsonl and
 * experiments/<preset>.json from _plugin_root() (engram.py's own location),
 * so an extraction that omits them fails 10 selftest checks on every fresh
 * opencode install. docs/ is cited by the extracted skills and promised by
 * the AGENTS.md block. All three must extract, with the same new-files-only
 * semantics as the incumbent dirs.
 */
describe("issue #20 — selfExtract ships gold/, experiments/, docs/", () => {
  let tmp: string
  let pkg: string

  beforeEach(() => {
    tmp = mkdtempSync(resolve(tmpdir(), "engram-test-"))
    writeFileSync(resolve(tmp, "opencode.jsonc"), "{}")
    pkg = resolve(tmp, "pkg")
    mkdirSync(resolve(pkg, "skills"), { recursive: true })
    writeFileSync(resolve(pkg, "skills", "SKILL.md"), "skill")
    mkdirSync(resolve(pkg, "agents"), { recursive: true })
    writeFileSync(resolve(pkg, "agents", "agent.md"), "agent")
    mkdirSync(resolve(pkg, "scripts"), { recursive: true })
    writeFileSync(resolve(pkg, "scripts", "engram.py"), "script")
    mkdirSync(resolve(pkg, "gold"), { recursive: true })
    writeFileSync(resolve(pkg, "gold", "assessor-gold.jsonl"), '{"id":"g_001"}\n')
    mkdirSync(resolve(pkg, "experiments"), { recursive: true })
    writeFileSync(resolve(pkg, "experiments", "interleaving-vs-blocked.json"), "{}")
    mkdirSync(resolve(pkg, "docs"), { recursive: true })
    writeFileSync(resolve(pkg, "docs", "05-affective-layers.md"), "docs")
    writeFileSync(resolve(pkg, "package.json"), JSON.stringify({ version: "1.13.2" }))
  })
  afterEach(() => rmSync(tmp, { recursive: true }))

  it("fresh install extracts the engine's gold set, presets, and docs", () => {
    selfExtract(pkg, tmp, "1.13.2")
    const target = resolve(tmp, ".opencode")
    expect(existsSync(resolve(target, "gold", "assessor-gold.jsonl"))).toBe(true)
    expect(existsSync(resolve(target, "experiments", "interleaving-vs-blocked.json"))).toBe(true)
    expect(existsSync(resolve(target, "docs", "05-affective-layers.md"))).toBe(true)
  })

  it("never overwrites an existing extracted gold file (new-files-only)", () => {
    const target = resolve(tmp, ".opencode")
    mkdirSync(resolve(target, "gold"), { recursive: true })
    writeFileSync(resolve(target, "gold", "assessor-gold.jsonl"), "locally-edited\n")

    selfExtract(pkg, tmp, "1.13.2")
    expect(readFileSync(resolve(target, "gold", "assessor-gold.jsonl"), "utf-8")).toBe("locally-edited\n")
  })

  it("version bump manifests gold/experiments/docs so bundled updates can land", () => {
    const target = resolve(tmp, ".opencode")
    // Simulate an older install whose extracted copies differ from the package.
    mkdirSync(resolve(target, "gold"), { recursive: true })
    writeFileSync(resolve(target, "gold", "assessor-gold.jsonl"), "old-gold\n")
    mkdirSync(resolve(target, "experiments"), { recursive: true })
    writeFileSync(resolve(target, "experiments", "interleaving-vs-blocked.json"), "old")
    mkdirSync(resolve(target, "docs"), { recursive: true })
    writeFileSync(resolve(target, "docs", "05-affective-layers.md"), "old")
    writeFileSync(resolve(target, ".engram-version.jsonc"), JSON.stringify({ version: "1.13.1" }))

    selfExtract(pkg, tmp, "1.13.2")

    const manifest = JSON.parse(readFileSync(resolve(target, ".engram-update.jsonc"), "utf-8"))
    expect(manifest.categories.gold.skipped).toContain("gold/assessor-gold.jsonl")
    expect(manifest.categories.experiments.skipped).toContain("experiments/interleaving-vs-blocked.json")
    expect(manifest.categories.docs.skipped).toContain("docs/05-affective-layers.md")
  })
})
