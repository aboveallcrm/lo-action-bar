# Graphify

This repository includes a project-scoped install of [open-source Graphify](https://github.com/Graphify-Labs/graphify) (PyPI package [`graphifyy`](https://pypi.org/project/graphifyy/), CLI command `graphify`, [Apache-2.0](https://github.com/Graphify-Labs/graphify/blob/HEAD/LICENSE)). Docs: [overview](https://docs.graphify.com/open-source/overview), [install](https://docs.graphify.com/open-source/installation).

Graphify turns this repo (code, and optionally docs) into a local knowledge graph that AI coding agents can query instead of repeatedly grepping files.

## Privacy

- Code is parsed on the machine with tree-sitter. The open-source CLI has no telemetry and does not upload code.
- Code-only extraction needs no API key: `graphify extract . --code-only`
- Documents, PDFs, and images are sent to an LLM only if you run a non-`--code-only` extract with a backend configured. Prefer `--code-only` or `GRAPHIFY_BACKEND=none`.
- This PR does **not** connect the repo to hosted Graphify at app.graphify.com and does not add credentials or secrets.

## How agents use it

1. Install the CLI once on your machine: `uv tool install graphifyy` (or `pipx install graphifyy`).
2. Build the graph: in Claude Code, Codex, Cursor, Gemini CLI, Hermes, or Antigravity run `/graphify .`, or from a terminal run `graphify extract . --code-only` and `graphify cluster-only . --no-label`.
3. Query: `graphify query "..."`, `graphify path "A" "B"`, `graphify explain "..."`.
4. After code edits: `graphify update .` (AST-only, no API cost).

This commit adds the skill files, agent instructions, `.graphifyignore`, and `.gitignore` entries. It does **not** include a generated `graphify-out/` graph; build that locally (or in a follow-up) when you work in the repo.

## What was added

- Skills: `.agents/skills/graphify/`, `.claude/skills/graphify/`, `.codex/skills/graphify/`, `.hermes/skills/graphify/`, `.gemini/skills/graphify/`
- Cursor rule: `.cursor/rules/graphify.mdc`
- Antigravity rule and workflow: `.agents/rules/graphify.md`, `.agents/workflows/graphify.md`
- Short Graphify sections in `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` (created or appended)
- Fail-open assistant hooks (`graphify hook-guard` / `graphify hook-check`) when those settings files are new or can be merged safely
- `.graphifyignore` and gitignore rules for local graph artifacts (`cache/`, `cost.json`, `memory/`, `reflections/`, `.graphify_*`)

After a local build, `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` can be committed later if the team wants a shared map. Local-only artifacts stay ignored.
