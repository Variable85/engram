import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { tmpdir } from "node:os"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { runEngramUpdate } from "../.opencode-plugin/update-core"
import { readManifest } from "../.opencode-plugin/update"

/**
 * Input-validation guards, added after the v1.3.0 review: V2 hands the raw
 * model-supplied tool input straight to runEngramUpdate (no zod in front, and
 * the runtime may not enforce the JSON Schema). Malformed input must produce
 * a message — never a throw — and must never consume a manifest entry.
 */

let tmp: string
beforeEach(() => {
  tmp = mkdtempSync(resolve(tmpdir(), "engram-core-test-"))
  writeFileSync(resolve(tmp, ".engram-update.jsonc"), JSON.stringify({
    from: "1.0.0",
    to: "1.1.0",
    source: "/nowhere",
    categories: { skills: { added: [], skipped: ["skills/learn.md"] } },
    state: "pending",
    applied: [],
    remaining: ["skills"],
  }))
  mkdirSync(resolve(tmp, "skills"), { recursive: true })
  writeFileSync(resolve(tmp, "skills", "learn.md"), "user-edited content")
})
afterEach(() => rmSync(tmp, { recursive: true }))

describe("runEngramUpdate input validation", () => {
  it("a decision missing `action` is reported and NOT consumed from skipped[]", () => {
    const out = runEngramUpdate({ target: tmp, mode: "per_file", decisions: [{ file: "skills/learn.md" }] } as any)

    expect(out).toContain("malformed decision")
    const m = readManifest(tmp)!
    expect(m.categories.skills.skipped).toContain("skills/learn.md")
    expect(m.remaining).toContain("skills")
    expect(existsSync(resolve(tmp, "skills", "learn.md"))).toBe(true)
  })

  it("a non-array decisions value returns a message instead of throwing", () => {
    expect(runEngramUpdate({ target: tmp, mode: "per_file", decisions: "abc" } as any)).toContain("must be an array")
  })

  it("an unknown mode returns a message instead of routing", () => {
    expect(runEngramUpdate({ target: tmp, mode: "explode" } as any)).toBe("[engram] Unknown mode.")
  })

  it("a non-string target returns a message instead of throwing", () => {
    expect(runEngramUpdate({ target: 42, mode: "skip" } as any)).toContain("target must be a path string")
    expect(runEngramUpdate(null as any)).toContain("expected an object")
  })

  it("valid decisions still work end to end", () => {
    const out = runEngramUpdate({
      target: tmp,
      mode: "per_file",
      decisions: [{ file: "skills/learn.md", action: "keep" }],
    })
    expect(out).toContain("KEPT skills/learn.md")
    expect(existsSync(resolve(tmp, ".engram-update.jsonc"))).toBe(false)
  })
})
