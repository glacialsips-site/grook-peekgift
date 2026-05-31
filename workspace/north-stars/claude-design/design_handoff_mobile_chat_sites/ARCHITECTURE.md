# ARCHITECTURE — The No-Ceilings Mandate

> **This document overrides the agent's defaults.** The product owner has been
> burned repeatedly by codebases that build straight to an MVP and then can't be
> grown — the product gets "relegated to the MVP" because ceilings were baked deep
> into early decisions. **Your job is not to ship the smallest thing that works.
> Your job is to lay a foundation that can absorb every ambition in the roadmap
> without a rewrite.** Deliberately overbuild the *foundation*; you may ship
> features incrementally on top of it, but the load-bearing decisions below are
> non-negotiable and must exist from commit #1.

> If you ever find yourself thinking "I'll just hardcode this for now and
> generalize later" — **stop.** That is the exact failure mode this document
> exists to prevent. Generalize the *seam* now (an interface, an event, a token);
> you may implement the simplest *adapter* behind it.

---

## 0. The Prime Directive: where ceilings come from, and how we refuse them

Ceilings are almost never "the code is slow." They are **irreversible early
decisions** that later features can't route around. The classic ones — and our
standing refusal of each:

| MVP ceiling | Why it's fatal later | Our refusal (from day 1) |
|---|---|---|
| Sites stored as **HTML strings / blobs** | Can't theme, diff, collaborate, re-target, or version | **Site IR** — a normalized, versioned document tree. HTML is a *render target*, never the source of truth. |
| **Single-tenant** data model | Multi-tenant retrofit touches every table & query | Tenant/workspace on **every** aggregate, enforced at the data layer. |
| **CRUD-over-mutable-rows** | History is destroyed; new read-shapes need migrations & backfills | **Event-sourced core + CQRS.** The log is truth; read models are derived & disposable. |
| Business logic **inside the web framework** | Can't add native, API, jobs, or swap the framework | **Hexagonal / ports-and-adapters.** Domain core is framework-free. |
| **One LLM vendor, hardwired** | Can't switch models, add tools, or run agents | **Provider-agnostic AI gateway** + governed agent loop. |
| **Synchronous request path** for everything | Generation/render/email block the user; can't scale | **Async, event-driven** with workers; outbox + message bus. |
| **No permission model** ("add auth later") | Sharing/teams/roles become a security rewrite | **Capability/ReBAC model** present at launch, even if everyone's an owner today. |
| Feature behavior **hardcoded in components** | Every variant is a fork | **Feature flags + a plugin/extension registry.** |
| Hardcoded styles | A new theme = new code | **Design tokens + theme-as-data.** |

If a proposed change reintroduces any row in column 1, it must be rejected in code
review.

---

## 1. The crown jewel: the **Site IR** (Intermediate Representation)

Everything this product can ever become flows from one decision: **a generated
site is a structured, versioned document — not markup.**

### 1.1 What it is
A serializable tree (JSON / typed schema) describing a site independent of any
output format:

```
Site
├── meta          (id, tenant, slug, locale, status, seo)
├── theme         (tokenset ref + overrides: palette, type scale, motion, density)
├── capabilities  (declared features this site uses: commerce, rsvp, auction, …)
└── pages[]
    └── sections[]            (hero, collection, itinerary, gift-registry, lots…)
        └── blocks[]          (text, media, card, cta, countdown, map, form…)
            └── bindings       (to data sources: catalog, guest list, lots, clock)
            └── interactions   (open-sheet, open-menu, reveal-bar, submit-rsvp…)
            └── style refs     (token references — never raw hex in the tree)
```

### 1.2 Why it is the anti-ceiling
Because the source of truth is structured, **every future feature is a function
over the IR** instead of a rewrite:

- **Multi-target rendering** — the same IR renders to responsive web (SSR/SSG at
  the edge), React Native, an email-safe HTML subset, PDF, AMP, or an embeddable
  widget. The ten reference sites are just the *web* render of ten IR documents.
- **Theming** — a theme is a tokenset; restyling is data, not code. (Covers
  HEMLOCK→Cyber Rave without touching the renderer.)
- **Real-time collaboration** — the IR is a CRDT document (Yjs/Automerge); multiple
  editors and the AI mutate the same tree with presence and conflict-free merge.
- **AI generation** — Claude emits/patches **IR**, validated against schema, not
  free HTML. Safe, diffable, reversible, governable.
- **Versioning, diffing, rollback, A/B** — structural diffs over the tree; every
  version addressable.
- **Accessibility & i18n** — transforms over the tree (locale swap, contrast pass)
  apply everywhere at once.
- **New section/block types** — register a new block kind (e.g. "auction lot") with
  a renderer per target; it lights up across the whole system.

### 1.3 Rules
- The IR schema lives in a **shared, versioned package** (`packages/site-ir`) with a
  formal schema (Zod + JSON Schema, or protobuf) and an explicit **migration path**
  (every document carries a schema version; migrations are pure functions).
- **No renderer may read anything but the IR.** No component reaches into a DB.
- **No raw color/size literals in the IR** — only token references. (This is what
  makes theme-as-data real.)
- Blocks/sections are an **open set** via the block registry (§7), not an enum
  baked into the renderer.

---

## 2. Macro shape: modular monorepo, hexagonal services, event-driven core

### 2.1 Monorepo
- **pnpm workspaces + Turborepo** (or Nx). One repo, many packages, strict
  boundaries enforced by lint rules (e.g. `eslint-plugin-boundaries`) so a UI
  package can never import a database driver.

```
apps/
  builder-web/        Next.js (App Router, RSC) — the chat+phone Builder shell
  builder-native/     Expo / React Native — same shell, shared domain + IR renderer
  site-renderer/      edge runtime that renders published sites from IR
  admin/              internal ops console
services/
  api-gateway/        GraphQL (federation) + tRPC + public REST/OpenAPI
  identity/           auth, sessions, orgs, ReBAC
  conversation/       chat sessions, streaming, message log
  generation/         AI orchestration (agent loop, tools, sandbox)
  composition/        Site IR aggregate, versions, CRDT sync
  rendering/          IR → target compilers (web/native/email/pdf)
  publishing/         domains, certs, CDN invalidation, deploys
  commerce/           catalog, cart, checkout, payments
  events/             rsvp, guest lists, ticketing
  auctions/           lots, bids, settlement
  engagement/         notifications (email/sms/push), digests
  analytics/          ingest + dashboards
  media/              uploads, transforms, CDN
packages/
  site-ir/            THE schema + migrations + validators
  design-tokens/      token sets + theme engine (theme-as-data)
  ui-kit/             headless + styled components (Builder shell)
  ir-render-web/      IR → web; ir-render-native; ir-render-email; ir-render-pdf
  domain-*/           pure domain logic per context (no framework imports)
  contracts/          shared API/event schemas, codegen clients & SDKs
  observability/      OTel setup, logging, tracing helpers
  testing/            fixtures incl. the 10 reference sites as IR documents
```

### 2.2 Hexagonal (ports & adapters) + DDD
- Each `services/*` is a **bounded context** with a **pure domain core**
  (`packages/domain-*`) that imports **no framework, no DB, no HTTP**.
- All I/O is a **port** (interface). Adapters implement ports: Postgres adapter,
  Stripe adapter, Anthropic adapter, S3 adapter, etc. **Swapping a vendor is
  swapping an adapter** — the canonical anti-lock-in move.
- Delivery mechanisms (HTTP, GraphQL, queue consumer, native bridge) are also
  adapters around the same application services. This is why "add native" or "add
  a public API" is never a rewrite.

### 2.3 Event-sourced + CQRS core
- **Write side:** commands → aggregates → **append-only event log** (Postgres event
  store or EventStoreDB). The log is the single source of truth; **state is never
  destroyed.**
- **Read side:** projectors consume events into **purpose-built read models**
  (Postgres views, search indices, caches). Need a new query shape or dashboard?
  **Add a projector and replay** — no migration, no backfill scripts, no data loss.
- **Outbox pattern** for reliable publish to the bus; consumers are idempotent.
- This single decision is the deepest insurance against ceilings: **any feature you
  haven't thought of yet can be derived from the event history.**

### 2.4 Async, event-driven backbone
- Durable message bus: **NATS JetStream** or **Kafka/Redpanda**. Generation,
  rendering, publishing, notifications, analytics are **jobs**, not request-blocking
  calls. Everything horizontally scalable; nothing on the hot path that doesn't have
  to be.

---

## 3. Tenancy, identity, and permissions — present at launch

Even if today there is one user:
- **Tenant/workspace id on every aggregate and every row**, enforced at the
  repository layer (not hopefully-remembered in queries). Postgres **Row-Level
  Security** as a backstop.
- **Identity context:** users, organizations, workspaces, memberships, sessions,
  API keys/OAuth clients (for the future public API).
- **Authorization is relationship-based (ReBAC, Zanzibar-style — e.g. OpenFGA/SpiceDB)**
  or at minimum a clean RBAC with resource-scoped capabilities. Permission checks go
  through one policy service. "Add teams/roles/sharing later" is then **data, not a
  security rewrite.**

---

## 4. The AI generation engine — governed, agentic, vendor-neutral

This is the product's heart; build it to grow into full agents.
- **LLM gateway port.** All model calls go through one provider-agnostic interface
  (Anthropic today; others tomorrow) with streaming, tool/function calling,
  retries, cost/usage metering, and prompt/version tracking.
- **Agent loop, not a single prompt.** The generator is a tool-using loop that
  **reads and patches the Site IR** via well-typed tools (`addSection`,
  `updateBlock`, `bindData`, `applyTheme`…), each validated against the IR schema.
  This is what lets "make the red suits neon" become a precise, reversible IR patch.
- **Sandboxed execution.** If/when generation runs code, it runs in an isolated
  sandbox (microVM / WASM / Firecracker) — never in-process.
- **Guardrails.** Every AI mutation is schema-validated, policy-checked, and emitted
  as a domain event (so it's diffable, attributable, and reversible).
- **Retrieval.** A vector store (pgvector / a dedicated vector DB) backs grounding,
  examples, and brand/style memory.
- Treat **streaming as first-class** end-to-end (token stream → conversation
  service → client) — the design depends on the live "being-built" feel.

---

## 5. Rendering & publishing — many targets, real domains

- `packages/ir-render-*`: one compiler per target. Web render runs at the **edge**
  with SSG/ISR; published sites are static-fast but data-backed.
- **Publishing service** owns slugs, **custom domains**, TLS cert issuance, and CDN
  invalidation. Custom domains being a first-class concept from the start avoids a
  brutal retrofit.
- The Builder's **live preview** renders the *same* IR through the *same* web
  renderer the published site uses — no divergent "preview vs real" codepaths
  (another classic ceiling).

---

## 6. Capability contexts — stub the seam, grow the feature

The generated sites already imply commerce, RSVP, auctions, payments, real-time
clocks. Each is its **own bounded context** with its own events. You may ship a thin
adapter first, but the **context, its events, and its IR binding must exist now** so
a site can *declare* it uses the capability and the renderer can bind to it:

- **commerce** — catalog, cart, checkout; payments behind a port (Stripe adapter
  first). Powers HEMLOCK's add-to-bag, the "claim the loot" registry.
- **events** — RSVP, guest lists, ticketing; the "claim-a-gift so guests don't
  double up" dedupe is a domain invariant here, not UI logic.
- **auctions** — lots, bids, settlement; real-time bid updates over the realtime
  gateway (Charity Gala "register to bid").
- **engagement** — email/SMS/push behind ports; digests as jobs.
- **realtime** — a WebSocket/SSE gateway for presence, co-editing (CRDT sync), live
  clocks/countdowns (Space Mission "live mission clock"), and bid tickers.
- **analytics** — event ingest → owner dashboards (derived read models).
- **media** — uploads, image/video transforms, responsive derivatives, CDN.

---

## 7. Extensibility: the registry + flags (so variants aren't forks)

- **Block/section registry.** New IR block kinds register `{schema, web renderer,
  native renderer, editor affordances, AI tool descriptor}`. Adding "auction lot" or
  "vinyl tracklist" is registration, not renderer surgery.
- **Plugin system.** Capability contexts and integrations load as modules against
  stable extension points. Third parties (and future-you) extend without forking
  core.
- **Feature flags + config service.** Every nontrivial behavior is flag-guarded and
  remotely configurable; experiments and gradual rollout are built-in, not bolted-on.

---

## 8. Cross-cutting: observability, contracts, quality (from commit #1)

- **Observability:** **OpenTelemetry** traces/metrics/logs across every service;
  correlation IDs through the async bus; dashboards + alerts. You cannot grow what
  you cannot see.
- **Contract-first:** schemas in `packages/contracts`; **typed end-to-end**
  (TypeScript) with **codegen** for clients and the public SDK. API is **versioned**
  from v1; events are versioned and never silently broken.
- **Testing:** the **ten reference sites become IR fixtures**; a conformance suite
  asserts the web renderer reproduces them. Unit-test domain cores in isolation
  (trivial, since they're framework-free); contract-test adapters; e2e the Builder
  flow.
- **Infra as code:** containerized; **Terraform/Pulumi**; portable across PaaS
  (Vercel/Railway/Fly to start) and **Kubernetes-ready** for scale. Stay
  **cloud-agnostic** — no single managed service on the critical path without a port
  and a fallback.
- **CI/CD:** trunk-based, preview environments per PR, migrations gated, blue-green
  or canary deploys.

---

## 9. Recommended stack (chosen for maximal capability + longevity)

Defaults were requested ("pick the most powerful"). These are recommendations, not
dogma — but **§1–§8 are stack-independent and mandatory** regardless of substitutions.

- **Language:** TypeScript everywhere; **Go or Rust** permitted for hot paths
  (edge render, realtime fan-out, sandbox supervisor) behind the same contracts.
- **Web:** Next.js (App Router, React Server Components) + the `ui-kit` + theme-as-data.
- **Native:** Expo / React Native, sharing `site-ir`, `ir-render-native`, domain
  types, and contracts. (Match the iOS-26 liquid-glass language from the design.)
- **Realtime/collab:** Yjs or Automerge (CRDT) + a WebSocket gateway; presence.
- **API:** GraphQL (federation) at the gateway + tRPC for first-party typed calls +
  public REST/OpenAPI for third parties.
- **Backend services:** NestJS (DI + modular, hexagonal-friendly) or Fastify;
  domain logic stays in `packages/domain-*`.
- **Datastores:** Postgres (event store + read models + RLS), Redis (cache/locks/
  queues), S3-compatible object storage, OpenSearch/Typesense (search), pgvector or
  a vector DB (AI retrieval).
- **Bus:** NATS JetStream or Kafka/Redpanda. **Workers:** durable queues
  (Temporal for long-running/agent workflows is strongly encouraged — it makes
  multi-step generation reliable and resumable).
- **AI:** Anthropic via the LLM gateway port; tool-calling agent loop; sandboxed
  execution (Firecracker/WASM).
- **Infra:** Docker + Terraform/Pulumi; PaaS-portable, K8s-ready; OTel; per-PR
  previews.

---

## 10. Build order (foundation first, features incrementally — never the reverse)

You may ship thin, but build the **seams** in this order before features ride them:

1. **Monorepo + boundaries + contracts + CI + OTel skeleton.**
2. **`site-ir` package** — schema, validators, migration harness, and the 10
   reference sites encoded as IR fixtures.
3. **`ir-render-web`** — reproduce the conformance suite from IR. (Now rendering is
   proven before any feature exists.)
4. **Event-sourced spine** — event store, bus, outbox, one projector, replay.
5. **Identity + tenancy + ReBAC** — even with a single user.
6. **Composition context** — IR aggregate, versions, CRDT sync; Builder live preview
   wired to `ir-render-web`.
7. **Conversation + generation** — streaming chat; agent loop emitting validated IR
   patches.
8. **Publishing** — slugs, custom domains, edge deploy.
9. **Capability contexts** — commerce / events / auctions / engagement, each as a
   declared IR capability with a thin adapter, thickened over time.
10. **Native app + public API/SDK** — fall out of the shared packages and contracts
    with no rewrite. *(This is the proof the ceilings are gone.)*

---

## 11. The one-paragraph version (paste this at the top of any planning doc)

> Source of truth is a **versioned Site IR document tree**, never HTML. The core is
> **event-sourced + CQRS** behind a **hexagonal, multi-tenant, ReBAC-secured**
> domain, in a **modular monorepo** with **contract-first typed boundaries**. Every
> external dependency — LLM, payments, storage, email, render target — sits behind a
> **port with swappable adapters**. AI generates by **patching validated IR through
> a governed agent loop**, not by emitting markup. Work is **async over a durable
> event bus**; new read shapes come from **new projectors + replay**, not
> migrations. Capabilities (commerce, RSVP, auctions, realtime, analytics, media)
> are **bounded contexts declared on the IR** and rendered by a **block registry**,
> behind **feature flags**. Web, native, email, and PDF are **render targets of the
> same IR**. Nothing on the critical path locks us to one vendor or one tenant. Ship
> features incrementally; **never compromise these seams.**
