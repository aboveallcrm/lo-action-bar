# Above All Canonical Bootstrap

This repo participates in the Above All CRM / West Capital Lending AI architecture.
Before any Above All architecture, AI, Ezra, CRM, campaign, messaging, voice,
integration, onboarding, settings, taxonomy, compliance or model-routing work,
verify canonical state first.

## Canonical source of truth

- Canonical production repo: **aboveallcrm/Above-All-OS**
- Read first (in the canonical repo):
  - `docs/ABOVE_ALL_ARCHITECTURE_MANIFEST.json` (locked architecture manifest)
  - `docs/EDDIES_AI_BIBLE.md` (constitutional architecture)
  - `docs/TAXONOMY.md` (canonical tags/stages/status)
  - `docs/EZRA_ULTIMATE_V1.md` (Ezra operating model)
  - `docs/EZRA_MODEL_ROUTING_V1.json` (production AI routing)
  - relevant domain specs in `docs/` (GHL, Bonzo, Vapi, voice, campaign, product, onboarding)
- Live Supabase canonical registries and functions outrank stale local docs.
- Source-of-truth priority: live Supabase registries > canonical taxonomy >
  architecture manifest > domain specs > AI Bible > app overlays > provider
  mappings > local notes.

## Rules

1. Do not invent duplicate agents, tags, stages, products, skills, model routes,
   campaigns, settings or compliance rules when a canonical definition exists.
2. Local repo rules may add constraints but may never weaken canonical security,
   compliance, privacy, authorization or tenant-isolation requirements.
3. Report conflicts with canonical architecture before changing it; propose, do
   not silently replace.
4. Never auto-pull credit. Never expose raw secrets. Never mark work done
   without verification evidence.

## Shared skills and AI Bible (everyone on the same page)

- AI Bible: `aboveallcrm/Above-All-OS` at `docs/EDDIES_AI_BIBLE.md`. It is the rulebook for every AI model and agent.
- Shared skills: `aboveallcrm/agent-skills`. Hermes is the canonical editor; other agents pull from it. `shared/canonical` holds the drift-checked reference skills. Load only the smallest task-relevant set, never the whole repo.
- Tags: the Supabase `tag_catalog` is the source of truth. Never hardcode tag lists. `lo-hold` is the universal AI stop (`ai_paused` and similar are aliases). Protected live GHL triggers such as `ai_erika_start` must not be renamed.
- Messaging: DNC, STOP and channel eligibility fail closed. If eligibility is uncertain, do not send automated marketing.
- Credit: communication consent is never credit authorization. Never pull credit automatically.

## Verification and deployment (standing rules, apply everywhere)

- Verified commits only. Do not push unless local lint, typecheck, tests and build pass. Never leave failing CI behind: fix it or revert it before starting new work. Say VERIFIED only with evidence.
- Run it locally first. Verify on the local machine (lint, test, build) before any push, so cloud runs and tokens are not spent discovering failures. Run the smallest relevant check.
- Phone preview over Tailscale. Bind the dev server to all interfaces (for example `next dev -H 0.0.0.0`) and open `http://<device>.<tailnet>.ts.net:<port>` on the phone, or use `tailscale serve <port>` for HTTPS inside the tailnet. Never use Tailscale Funnel for anything with real borrower data.
- Deploys cost money. Batch work and push meaningful commits only. Docs, comments, config-only, test-only and AGENTS.md changes carry `[skip ci]` in the commit message. Ship one production deploy per finished feature; use previews only for UI review. Vercel and Netlify projects should use an ignored-build step so non-app changes do not build.
