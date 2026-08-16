import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * The engine-resolution waterfall is duplicated verbatim across the three
 * skill files (each must be self-sufficient — a platform may load one skill
 * in isolation). Duplication means drift risk: a platform candidate added to
 * one copy and not the others strands that platform's users in whichever
 * skill was missed. These checks pin (a) the copies to each other and (b)
 * the candidates each shipped platform depends on.
 */

const SKILLS = ["learn", "review", "coach"] as const
const root = resolve(__dirname, "..")

function waterfallBlock(skill: string): string {
  const content = readFileSync(resolve(root, "skills", skill, "SKILL.md"), "utf-8")
  const start = content.indexOf("# Resolve the engine. RUN THIS BLOCK VERBATIM")
  const end = content.indexOf("```", start)
  expect(start, `${skill}: waterfall block missing`).toBeGreaterThan(-1)
  expect(end, `${skill}: waterfall block unterminated`).toBeGreaterThan(start)
  return content.slice(start, end)
}

/** The candidate list itself — `for d in … ; do` — is the drift-sensitive
 *  part. Comments and the commands that follow legitimately vary per skill. */
function candidateList(skill: string): string {
  const block = waterfallBlock(skill)
  const start = block.indexOf("for d in ")
  const end = block.indexOf("; do", start)
  expect(start, `${skill}: candidate list missing`).toBeGreaterThan(-1)
  expect(end, `${skill}: candidate list unterminated`).toBeGreaterThan(start)
  return block.slice(start, end)
}

describe("engine-resolution waterfall", () => {
  it("has an identical candidate list across all three skills", () => {
    const [learn, review, coach] = SKILLS.map(candidateList)
    expect(review).toBe(learn)
    expect(coach).toBe(learn)
  })

  it("carries every shipped platform's candidate", () => {
    const block = candidateList("learn")
    for (const candidate of [
      '"$OPENCODE_PLUGIN_ROOT"',
      '"$CLAUDE_PLUGIN_ROOT"',
      '"$CODEX_PLUGIN_ROOT"',
      '"$ENGRAM_ROOT"',
      '"${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/extensions/engram"',
      '"$HOME/.gemini/config/plugins/engram"',
      '"$HOME/.pi/agent/git/github.com/nagisanzenin/engram"',
      '"$HOME/.agents/engram"',
    ]) {
      expect(block, `missing candidate ${candidate}`).toContain(candidate)
    }
  })

  it("fails closed when no candidate resolves", () => {
    const block = waterfallBlock("learn")
    expect(block).toContain("FAIL CLOSED")
  })
})
