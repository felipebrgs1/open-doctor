# Open Doctor roadmap

Fork of React Doctor. Goal: keep the React product intact and make Vue a first-class dialect, not a flag.

This file is the working plan. A phase is done when the checks at the bottom of that phase are true — not when the code exists.

## Already shipped (foundation)

- Remotes: `origin` → `felipebrgs1/open-doctor`, `upstream` → `millionco/react-doctor`.
- Framework tokens `vue` and `nuxt`. Vue+Vite classifies as `vue`; Nuxt wins over the bundler; Astro+Vue stays Astro.
- Capabilities `vue`, `vue:3`, `nuxt`. Vue SPA is `client-only`; Nuxt is `ssr`.
- `.vue` is a source file. `<script>` / `<script setup>` is extracted with offsets preserved so existing JS rules (perf, security, architecture, zod) run on Vue scripts.
- Native Vue rules:
  - `vue-v-for-requires-key`
  - `vue-no-v-html`
  - `vue-no-mutating-props`
- SFC parser is in-tree (no `@vue/compiler-sfc` — pnpm blocked the official compiler on a trust downgrade).

Not done: Nuxt rules, runtime scan, score, rebrand, template IR.

## Phase 1 — Vue rules people will believe

Ship a small Vue pack with the same bar as React rules: one problem, evidence, adversarial tests, quiet when unsure.

Implement next, in this order:

1. `vue-v-if-with-v-for` — both on the same element. Vue 3 warns; the `v-for` runs first. Syntax-only.
2. `vue-watch-needs-cleanup` — `watch` / `watchEffect` that opens a listener, timer, or observer and never returns a stop handle / `onCleanup`. Scope-aware. Skip `watchEffect` with `flush: "sync"` until proven.
3. `vue-no-ref-unwrapped-in-script` — using a `ref()` binding as a value in `<script>` without `.value`. Scope-aware. Out of scope: templates (auto-unwrap), `reactive()`, computed returned into a template.
4. `vue-define-emits-unused` — `emit('x')` / `defineEmits` name that the template never listens to. Path-aware. v1: same file only.
5. `vue-no-unused-template-ref` — `ref="foo"` with no `useTemplateRef('foo')` / `const foo = ref()`. Same file only.

Do not port React rules (`exhaustive-deps`, `jsx-key`, jsx-a11y). Research each as a Vue rule (`rule-research` → `rule-writing` → `rule-validate`).

**Done when:** five rules, liveness fixtures, focused tests green, at least one real Vue repo scanned with findings you would keep.

**Kill:** drop any rule that produces more than a handful of obvious FPs on two popular Vue repos.

## Phase 2 — Nuxt as its own bucket

Detection already exists. Rules do not.

1. Create `rules/nuxt/` (codegen already knows the bucket).
2. `nuxt-no-window-in-setup` — `window` / `document` in `<script setup>` outside `onMounted` / `if (import.meta.client)`. SSR crash. Quiet inside `onMounted`, `process.client`, and `.client.vue`.
3. `nuxt-no-fetch-in-setup` — `fetch` / `$fetch` in setup without `useAsyncData` / `useFetch`. Hydration mismatch.
4. Teach the oxlint config about Nuxt auto-imports (`ref`, `computed`, `useAsyncData`, …) so script extraction does not invent undefined-variable noise.

**Done when:** a Nuxt 3 playground is classified as `nuxt`, the two rules fire, auto-import globals do not flood the report.

## Phase 3 — Parser and script fidelity

The in-tree SFC splitter is good enough for the three shipped rules. It will lie on nested `</script>` in strings, odd `lang`, and macros.

1. Switch `parseVueSfc` to `@vue/compiler-sfc` + `@vue/compiler-dom` once the registry lets the packages through (or vendor a pinned tarball).
2. Register Vue compiler macros as globals on extracted scripts: `defineProps`, `defineEmits`, `defineExpose`, `defineModel`, `defineOptions`, `defineSlots`, `withDefaults`.
3. Map `<script lang="tsx">` / JSX in Vue correctly (already stubbed via `hasJsx`).
4. Keep offset-preserving extraction so JS rules stay on the original `.vue` lines.

**Done when:** the three shipped rules plus Phase 1 still pass, and a SFC with nested `<template v-if>` + `lang="ts"` + macros typechecks under oxlint without fake findings.

## Phase 4 — Honest product on a Vue repo

Do not claim Vue Doctor until the output is honest.

1. CLI / summary: say "Vue" / "Nuxt" when that is what was detected. Do not say "React project" on a Vue tree.
2. Score: skip or isolate the 0–100 score on Vue/Nuxt until it is trained on Vue diagnostics. A React-weighted number on a Vue report is a lie.
3. Runtime `scan http://…`: keep Fiber React-only. A Vue runtime pass is a separate probe (Vue DevTools hook / performance marks), not a wrap of `browser-probe.ts`.
4. `doctor.config.*` and `--ignore-tag vue` already work via the `vue` tag. Document that. Do not add a `--vue` flag.

**Done when:** `npx .` on a Vue playground prints Vue, runs the Vue pack + agnostic JS rules, and does not print a React score.

**Kill:** if Vue scans stay unused after this lands, revert the copy and leave the engine quiet.

## Phase 5 — Trust (required before more surface)

1. A small fixture app (`playgrounds/vue-nuxt/`) with the known-bad and known-good cases.
2. `rde-eval` against 3–5 real Vue/Nuxt repos. Read every hit. Promote FPs to regression tests.
3. Fuzz the SFC parser and the Vue scan rules (`@react-doctor/fuzz`).
4. Push this branch to `origin` and keep `upstream` for React-only syncs. Do not rebrand packages (`react-doctor` → `open-doctor`) until Phase 4 is true.

**Done when:** you can name the false-positive rate on the eval set and would run the tool on your own Vue repo.

## Phase 6 — Open-doc (only after Phase 5)

The shared layer is a template IR, not a rename.

JSX, Vue SFC, and later Svelte/Astro compile to the same document: elements, attributes, events, conditionals, lists, bindings. A11y and a subset of perf should run on that IR.

Do not start this phase until there is a second first-class dialect with trusted rules. Publishing a plugin SDK or renaming the CLI before that is surface you cannot take back.

Out of scope until then: Svelte pack, Solid pack, full rebrand, public rule SDK, a second score.

## Suggested order of work

```
Phase 1 rules  →  Phase 3 parser if a rule is blocked  →  Phase 2 Nuxt
    →  Phase 4 honest CLI/score  →  Phase 5 evals  →  Phase 6 IR
```

Skip ahead only when a later phase unblocks an earlier one (e.g. macros flooding Phase 1).

## Working agreement

- Vue rules live in `packages/oxlint-plugin-react-doctor/src/plugin/rules/vue/`.
- Nuxt rules live in `rules/nuxt/`. Do not put Nuxt checks in the Vue bucket.
- New public surface (flags, score, report fields, Action) still goes through the product-thinking pass.
- Sync from `upstream` with care: capability tokens and `FRAMEWORK_TOKENS` will conflict on every React Doctor release that touches those files.
