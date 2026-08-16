# Engram on DeepSeek Harness (dsh)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) is DeepSeek's
everything-is-a-plugin agent harness (developer preview — its own README warns of
compatibility-breaking changes). Engram runs on it through surfaces dsh ships natively:
`SKILL.md` directory-bundle skills discovered from `~/.agents/skills`, `AGENTS.md`
instructions, an unmodified-Claude-Code hook bridge for the session nudge, and a subagent
tool for the blind assessor. No adapter code — the port is a clone, three symlinks, and one
optional patch block.

Verified against `@deepseek-ai/dsh` (npm, 2026-08-16), headless and web profiles.

## Install

**1 · Clone into the shared agent home** (`~/.agents` — dsh reads it natively; the skills'
engine-resolution waterfall knows this path since v1.13.0):

```sh
git clone https://github.com/nagisanzenin/engram ~/.agents/engram
```

**2 · Link the three skills into dsh's user skill root:**

```sh
mkdir -p ~/.agents/skills
for s in learn review coach; do ln -sfn ~/.agents/engram/skills/$s ~/.agents/skills/$s; done
```

dsh's skill provider watches these roots live — no restart needed. The skills appear in the
session's skill catalog; invoke them by name (`learn`, `review`, `coach`) from the composer
or let the model load them.

**3 · The nudge (optional but recommended)** — dsh runs Engram's stock Claude Code
SessionStart hook through its bundled hook bridge; no extra package install is needed.
Open `~/.dsh/profiles/<profile>/cordis.patch.yml` (created on that profile's first boot)
and **replace the trailing empty list `[]`** with the block from
[dsh/cordis.patch.yml](dsh/cordis.patch.yml), substituting your absolute home path —
then restart the profile. Do NOT append after the `[]`: that is invalid YAML, and dsh
fails loud at boot (which is also your confirmation the patch is being read).

The bridge runs Engram's `hooks/hooks.json` — the same file Claude Code runs, unmodified.
The hook prints at most two lines when reviews are due and nothing otherwise.

**4 · Instructions (optional):** dsh discovers `AGENTS.md` (and `CLAUDE.md`) in the
project and the user-global `~/.dsh/AGENTS.md`. Appending Engram's block there makes the
tutor rules ambient; without it the skills carry everything they need.

## Model / auth

dsh needs a DeepSeek API key: `export DEEPSEEK_API_KEY=…` in the launching environment, or
enter it once in the Web UI's Settings → Models. There are no bundled free models.

## What's shared, what's different

- **State**: the same `~/.claude/learning/` as every other platform — learn in dsh, review
  in Claude Code, one schedule.
- **Engine resolution**: the skills resolve `scripts/engram.py` from the clone at
  `~/.agents/engram` — no environment variable needed.
- **Subagents** (architect, blind assessor, artifact smith): dsh has a subagent tool with
  fresh-context spawns. Engram's agent definitions aren't registered as dsh presets; the
  skills detect this and construct the isolation themselves (`skills/_shared/subagents.md`),
  exactly as on OpenClaw — the assessor stays blind either way.
- **Sandbox**: dsh defaults to `workspace-write` permissions. Engram's state lives in
  `~/.claude/learning/` (outside the workspace); approve that write when the harness asks,
  or run with `DSH_PERMISSION_MODE` per dsh's docs.

## Beta caveats

- dsh is a developer preview and its plugin surfaces move; this port deliberately uses only
  stock dsh capabilities (no Engram adapter code), so drift shows up as a missing surface,
  not a crash.
- `~` is not expanded in patch-config strings — the patch block must carry absolute paths
  (the shipped template says so in-line).
- Verified keyless on 2026-08-16: skill discovery through the documented symlinks (all
  three skills in `skill.list` with correct metadata) and a clean fail-loud boot with the
  nudge patch applied. Hook firing and the full learn loop were verified in a live keyed
  session — see the release's user-session report.
