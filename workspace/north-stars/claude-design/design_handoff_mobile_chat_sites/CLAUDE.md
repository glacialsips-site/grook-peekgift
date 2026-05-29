# CLAUDE.md — Operating rules for the coding agent

Place this at the **repository root**. It is loaded into every Claude Code session.
It exists to stop one specific failure: **silently building to an MVP and baking in
ceilings.** Read `ARCHITECTURE.md` in full before planning any work.

## Prime directive
Build the **foundation deliberately overbuilt**; ship **features incrementally** on
top of it. You may implement the simplest *adapter* behind an interface — you may
**not** skip the interface. When tempted to "hardcode now, generalize later,"
generalize the **seam** now (interface / event / token) and put the simplest
implementation behind it.

## Hard rules — never violate without the owner's explicit say-so
1. **Sites are stored as Site IR (structured, versioned), never as HTML strings.**
   HTML/native/email/PDF are render targets only.
2. **Tenant/workspace id on every aggregate**, enforced at the data layer. No
   single-tenant tables.
3. **Event-sourced + CQRS core.** Don't destroy state with mutable-row CRUD. New
   query shapes = new projector + replay, not a migration that drops history.
4. **Hexagonal.** Domain logic lives in `packages/domain-*` and imports no
   framework, DB, or HTTP. All I/O is a port with adapters.
5. **Every external dependency behind a port** (LLM, payments, storage, email,
   render target, search). No vendor SDK imported directly into domain or UI code.
6. **AI mutates validated Site IR via typed tools.** Never let the model emit raw
   markup into the source of truth.
7. **AuthZ goes through the policy service** (ReBAC/RBAC). No ad-hoc permission
   checks scattered in handlers.
8. **Async by default** for generation, rendering, publishing, notifications,
   analytics. Don't block the request path.
9. **No raw color/size literals** in the IR or in shipped UI — use design tokens
   (theme-as-data).
10. **Contract-first + versioned.** Cross-boundary calls use schemas in
    `packages/contracts`. APIs and events are versioned; never break them silently.

## Before you start any task
- Restate which **bounded context** and **package** you're touching.
- Confirm the change respects the boundary lint rules (UI ⇏ DB, domain ⇏ framework).
- If the task seems to require breaking a hard rule, **stop and surface it** with the
  cheapest compliant alternative — don't quietly take the shortcut.

## Definition of done for a feature
- Domain logic unit-tested in isolation (no infra).
- New behavior is **flag-guarded**.
- New IR block/section kinds are **registered** (schema + web renderer + native
  renderer stub + AI tool descriptor), not special-cased.
- Emits/consumes versioned events; adds a projector if it needs a new read shape.
- Observability: traced + logged with correlation IDs.
- The renderer **conformance suite still passes** (the 10 reference sites).

## Anti-patterns that mean you've drifted to MVP (self-check)
- "I'll store the rendered HTML to keep it simple." → No. Store IR.
- "Just query the table directly here." → No. Through the domain/read model.
- "We only have one workspace, skip the tenant column." → No.
- "Call the Anthropic SDK right in the component." → No. Through the gateway port.
- "Add permissions later." → No. Capability check now, even if everyone's an owner.
- "One big service is fine for now." → Boundaries now; deploy topology can stay
  simple, but the seams must exist.

## Stack
See `ARCHITECTURE.md` §9. Stack choices are flexible; the **seams in §1–§8 are
not.** If you substitute a technology, preserve the port/contract so it stays
swappable.

## Design fidelity
The product UI is **high-fidelity** — match `README.md` tokens, motion curves, and
the four mobile interaction patterns exactly. Recreate the designs through the
production token + component + IR-render systems, **not** by importing the
prototype's inline-styled JSX.
