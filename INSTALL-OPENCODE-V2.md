# Engram on OpenCode 2.0 (beta)

OpenCode 2.0 — the `opencode2` binary, installed from `@opencode-ai/cli@beta` — replaces the
V1 plugin API and [does not load V1 plugins](https://opencode.ai/v2/docs/migrate-v1). Engram
ships **both entry points in one package**: the V1 adapter at the package root, a V2 adapter
at `./server` (which the V2 runtime probes automatically) and `./v2` (the same file, for
explicit reference). `opencode` and `opencode2` can run side by side against **one** Engram
install — same extracted files, same learner data, byte-identical state.

> **Beta status.** OpenCode 2.0 is in beta and its plugin API is still moving. One known
> beta limit from live testing: the free bundled models (`opencode/*-free`) drop the
> connection (`Error: Transport`) on subagent spawns — the curriculum-architect step of
> `/learn` — so use a configured provider for real sessions. The adapter
> was built and verified against `opencode2 v0.0.0-next-17444` (2026-08-14; both hook call forms of the beta SDK lines are supported). Every V2 hook is
> feature-detected: on an older beta Engram degrades feature-by-feature instead of crashing
> the host. If something misbehaves, please report it — issue #18 tracks V2 support.

## Install

In any `opencode.json` / `opencode.jsonc` (project or `~/.config/opencode/`), V2 reads the
`plugins` array (V1 reads `plugin` — keep both while you run both):

```jsonc
{
  "plugin":  ["opencode-engram-learning"],          // V1 (unchanged)
  "plugins": ["opencode-engram-learning"]           // V2 — same package, since v1.12.0
}
```

V2 resolves npm packages by probing the `server` package export first, so the same package
name loads the V1 adapter under V1 and the V2 adapter under V2 — no `/v2` suffix needed.
Do **not** write `"opencode-engram-learning/v2"` in `plugins`: V2 never splits subpaths off
config entries, and npm-package-arg parses that form as a *GitHub repo spec*, so it fails —
confusingly. The bare package name is the whole story.

To run the unreleased tip instead of the npm release (you lose the `/engram-update` upgrade
path — it diffs against the npm cache):

```jsonc
{
  "plugins": ["git+https://github.com/nagisanzenin/engram.git"]
}
```

Local checkout (development): V2's directory discovery only follows string-valued
`package.json` entry fields, so point at the entry file itself — relative paths resolve
against the directory of the config file that declares them:

```jsonc
{
  "plugins": ["./path/to/engram/.opencode-plugin/v2.ts"]
}
```

Then start `opencode2` in the project. First start self-extracts into `.opencode/` (or
`~/.config/opencode/` when the project has no opencode config file), reloads the command,
skill, and agent domains so `/learn`, `/review-loop`, `/coach` work in that same session,
and writes the `AGENTS.md` block V2 discovers natively.

## What's identical to V1

- The extraction target and layout (`skills/`, `agents/`, `scripts/`, `AGENTS.md`,
  `.engram-version.jsonc`) — V1 and V2 resolve the same target and share it.
- Learner data (`~/.claude/learning/`) — untouched by the adapter split.
- The update system: on a version bump you get the same session notification, the same
  `/engram-update` flow, the same deterministic `engram_update` tool with auto / per-file /
  keep-as-is modes and crash-resumable checkpoints.
- `ENGRAM_ROOT` / `OPENCODE_PLUGIN_ROOT` in every shell execution.

## What's different under V2

| Surface | V1 | V2 |
|---|---|---|
| Commands on disk | `commands/` (shared selfExtract, plural since v1.10.x) | identical — V2's canonical discovery dir |
| `/engram-update` while an update is pending | in-memory pseudo-command | generated `commands/engram-update.md`, removed when resolved (guarded — your own file with that name is never touched) |
| Update toast | TUI toast on `session.idle` | dropped — V2 plugins have no toast API; the system-prompt notification remains |
| Session nudge | injected via `system.transform` | injected via the V2 session context hook, once per session |
| Agent `tools:` frontmatter | honored | legacy in V2 (superseded by `permissions:`); files keep the V1 shape so both engines can share them. The assessor's blindness is enforced by its prompt, as on OpenClaw |

## Verified against the real beta

Smoke-tested end to end on `opencode2 v0.0.0-next-17444`: plugin listed as active,
self-extraction into the project (`commands/` + skills + agents + scripts),
`AGENTS.md` written, nothing leaked into `~/.config/opencode/` from a project workspace, and
`npx vitest run` green (206 checks; the pre-existing V1 tests run unmodified).

One V2-specific behavior worth knowing: V2 runs plugins inside a background service shared
across projects, so Engram never trusts `process.cwd()` — it asks the plugin API for the
workspace directory (every V2 domain response carries `location.directory`). If you run an
Engram-enabled project and a plain project side by side, each workspace gets its own plugin
instance and its own correct target.
