# AGENTS

How this repo is put together, and how to find things before you write code.
This is a fork of React Doctor (`origin` = `felipebrgs1/open-doctor`, `upstream` = `millionco/react-doctor`).
The job is to keep the React engine intact and make Vue a first-class dialect. Plan: `roadmap.md`.

## System

A scan is: discover the project → run oxlint + scan/project rules → filter/suppress → report.

```
discoverProject          core/src/project-info/discover-project.ts
  → detectFramework      core/src/project-info/detect-framework.ts
  → buildCapabilities    core/src/project-info/capabilities.ts
runInspect               core/src/run-inspect.ts
  → runOxlint            core/src/run-oxlint.ts
      prepareLintSources extracts HTML / Astro / Vue scripts, maps diags back
  → checkSecurityScan    walks the tree; every rule with scan: runs here
  → project-analysis     unused files, duplicate JSX, graph (already sees .vue)
  → score / JSON report  core/src/build-json-report.ts  (React-weighted — don't lie on Vue)
```

```
packages/
  core/                         engine (private)
    src/project-info/           discoverProject, detectFramework, capabilities
    src/run-inspect.ts          orchestrator
    src/run-oxlint.ts           lint host
    src/errors.ts               ReactDoctorError + tagged leaves
    src/schemas.ts              Diagnostic / JsonReport  (Framework = FRAMEWORK_TOKENS)
    src/services/               Effect services (Files, Git, Linter, Score, …)
    src/utils/                  one helper per file
  oxlint-plugin-react-doctor/   rules (canonical)
    src/plugin/rules/<bucket>/  one rule per file, defineRule({…})
    src/plugin/utils/           AST / SFC / capability helpers
    scripts/generate-rule-registry.mjs   bucket → framework / category / tags
  eslint-plugin-react-doctor/   ESLint mirror of the oxlint plugin
  react-doctor/                 CLI + public inspect()
  api/                          programmatic diagnose()
```

A project is analyzable if it has a React runtime, a Vue runtime, Three, Remotion, or any source files (`is-analyzable-project.ts`). Plain TS still gets the agnostic buckets (security, js-performance, architecture, zod, bundle-size).

## Find things first

Search before adding a helper, type, constant, or rule. Search again after, and delete what you superseded.

```bash
bunx @rayhanadev/truffler "<query>" packages --kind function,method,interface,type,constant --limit 20
```

Derive 3–6 queries from the behavior (proposed name + domain noun + verb). Narrow the root first (`packages/core/src`, `packages/oxlint-plugin-react-doctor/src/plugin`). Read the top matches before writing anything.

| Looking for                             | Start here                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| Project / framework detection           | `core/src/project-info/detect-framework.ts`, `discover-project.ts`                     |
| Capability tokens                       | `oxlint-plugin-…/plugin/utils/capability.ts` + `core/src/project-info/capabilities.ts` |
| Has React / Vue runtime                 | `core/src/utils/has-react-runtime.ts`, `has-vue-runtime.ts`                            |
| A rule                                  | `oxlint-plugin-…/plugin/rules/<bucket>/<name>.ts` then `gen`                           |
| Rule metadata / registry                | generated `plugin/rule-registry.ts` — do not edit by hand                              |
| Vue SFC parse / script extract          | `plugin/utils/parse-vue-sfc.ts`, `extract-vue-script-lint-source.ts`                   |
| Vue template tag helpers                | `plugin/utils/find-vue-template-opening-tag.ts`                                        |
| Lint file set / HTML / Astro / Vue prep | `core/src/utils/prepare-lint-sources.ts`                                               |
| Which files are lintable                | `core/src/project-info/constants.ts` → `SOURCE_FILE_PATTERN`                           |
| Scan-rule host                          | `core/src/check-security-scan.ts` (all `scan:` rules, not just security)               |
| Error types                             | `core/src/errors.ts`                                                                   |
| JSON report                             | `core/src/schemas.ts`, `build-json-report.ts`                                          |
| CLI commands                            | `react-doctor/src/cli/commands/`                                                       |
| Rule tests                              | colocated `*.test.ts`; harnesses in `oxlint-plugin-…/src/test-utils/`                  |
| Liveness (every rule must fire)         | `plugin/liveness/liveness-fixtures.ts`                                                 |
| Longer runbooks                         | `.agents/skills/` when present (rule-writing, fuzz, …)                                 |

## Code

- Package manager: `@antfu/ni` (`ni` / `nr` / `nun`). If `ni` is not on PATH, `pnpm --filter <pkg>` is fine.
- kebab-case files. `interface` over `type`. types in global scope. arrow functions. `Boolean` over `!!`. no `as` unless forced.
- No comments unless the code is a hack — then `// HACK: reason`.
- Descriptive names (`didPositionChange`, not `moved`; `innerItem`, not `x`). Re-read them after the change.
- One util per file under `utils/`. Magic numbers in `constants.ts` as `SCREAMING_SNAKE_CASE` with `_MS` / `_PX`.
- Don't duplicate. Don't leave dead code.

## Effect

`effect@4`. One import per module: `import * as Effect from "effect/Effect"`. Never `import { Effect, Schema } from "effect"`.

- Fail with `ReactDoctorError`. Leaves are `Schema.TaggedErrorClass<Self>()("Tag", { fields })` with a `get message()` getter (not `message =`).
- Dispatch with `Effect.catchReasons` / `catchTag`, never `error.message.includes(...)`. Helpers: `formatReactDoctorError`, `isReactDoctorError` in `core/src/errors.ts`.
- `return yield*` on terminal effects (`fail` / `die` / `interrupt`). No `try/catch` inside `Effect.gen` — wrap throws in `Effect.try`.
- Services: `Context.Service<Self, Interface>()("react-doctor/Name", { make })`. `Service.of({…})` in layers — never `{…} as const`.
- Layers: `layerNode` (prod), `layerOf` (fixed value), `layerInMemory` (fs tree), `layerCapture` (record calls), `layerNoop` (discard).
- Wire types: `Schema.Class`. Arg types: interfaces. Env: `Context.Reference` in `core/src/refs.ts`.
- Log with `import * as Console from "effect/Console"`. Do not invent a Logger.

Canonical shapes: `tmp/effect/.patterns/effect.md` if that clone is present.

## Capabilities and frameworks

`FRAMEWORK_TOKENS` in the plugin is the single union (`nextjs`, `vite`, `vue`, `nuxt`, `preact`, …). Core aliases `Framework` to it. Adding a framework means: token → `detectFramework` → `ProjectInfo` field → `buildCapabilities`.

- React rules require `react` (synthesized for hook/JSX/a11y buckets).
- Vue rules require `vue`. Nuxt rules require `nuxt` (and usually `vue` too).
- Vue+Vite classifies as `vue`, not `vite`. Nuxt wins over the bundler. Astro+Vue stays `astro` (islands); Vue rules still activate via `vueVersion`.
- Agnostic buckets (no `react` requirement): `security`, `security-scan`, `architecture`, `correctness`, `bundle-size`, `js-performance`, `design`, `zod`.

Do not put Vue checks in a React bucket. Do not add Vue to `BUCKETS_REQUIRING_REACT`.

## Rules

One file = one `defineRule` under `src/plugin/rules/<bucket>/`. The bucket directory sets `framework`, default category, and auto-tags (`scripts/generate-rule-registry.mjs`). A rule may override `category` and must set `id`, `title`, `severity`, `recommendation`.

Three execution modes — pick one:

| Mode    | Field                  | Host                               | Use for                                       |
| ------- | ---------------------- | ---------------------------------- | --------------------------------------------- |
| AST     | `create(context)`      | oxlint visitors                    | JS/TS/JSX, including extracted Vue `<script>` |
| Scan    | `scan(file)`           | `check-security-scan` (whole tree) | `.vue` templates, configs, secrets            |
| Project | `execution: "project"` | core project-analysis              | cross-file graph                              |

Vue template rules are `scan` and must bail unless `isVueSfcPath(file.relativePath)`. Scan rules outside `security-scan` need a `vue` or `nuxt` tag (the registry test enforces this).

After adding, renaming, or moving a rule:

```bash
pnpm --filter oxlint-plugin-react-doctor gen
```

Then add a liveness fixture in `plugin/liveness/liveness-fixtures.ts` (a snippet the rule **must** fire on). AST tests use `runRule`; scan tests use `runScanRule` (`src/test-utils/`).

Do not port React hook/JSX/a11y rules onto Vue. Write Vue-native detectors. Quiet when unsure — a false positive costs more than a miss.

## Vue dialect (what exists)

- Parser: in-tree `parseVueSfc` (no `@vue/compiler-sfc` yet — pnpm blocked it on a trust downgrade). Nested `<template>` is handled; `</script>` inside a string is not.
- Script extract: non-script bytes become spaces, line numbers stay aligned with the SFC. `prepare-lint-sources` writes a temp `.ts` / `.tsx` and remaps the path back to the `.vue`.
- Shipped rules: `vue-v-for-requires-key`, `vue-no-v-html`, `vue-no-mutating-props`.
- `.vue` is in `SOURCE_FILE_PATTERN` and in the security-scan text-file pattern. If a new Vue scan rule never fires, check those two gates first.
- Next rules and Nuxt bucket: `roadmap.md` Phase 1–2. Runtime scan is React Fiber — do not wrap it for Vue. Score is React-weighted — do not print it as truth on a Vue repo until Phase 4.

## Checks

Tests sit in each package's `tests/` (plugin rules colocate `*.test.ts`). Runner is `vite-plus/test`.

```bash
pnpm --filter oxlint-plugin-react-doctor exec vp test run src/plugin/rules/vue
pnpm --filter oxlint-plugin-react-doctor exec vp test run src/plugin/liveness/liveness.test.ts
pnpm --filter @react-doctor/core exec vp test run tests/detect-framework.test.ts
pnpm --filter oxlint-plugin-react-doctor gen
pnpm lint && pnpm typecheck
```

Format with `pnpm exec vp fmt <files>`. The `oxfmt` binary in PATH is the IDE wrapper and will refuse a file list.

## Common tasks

**Add a Vue template rule.** Create `plugin/rules/vue/<id>.ts` with `defineRule({ id, requires: ["vue"], scan })`. Filter to `.vue` via `isVueSfcPath`. Parse with `parseVueSfc`, walk `template.content`. Add `<id>.test.ts` using `runScanRule`. Add a liveness fixture keyed by `id` with `filePath` ending in `.vue`. Run `gen`, then the vue + liveness tests.

**Add a Vue script rule.** Same bucket, but `create` visitors if oxlint sees the extracted script, or `scan` + `oxc-parser` on `scripts[].content` (see `vue-no-mutating-props`) if you need the original `.vue` and must not fire on random `.ts` in a Vue repo.

**Add a Nuxt rule.** New files under `plugin/rules/nuxt/`. Codegen already maps that bucket to framework `nuxt` and tag `nuxt`. Require `["nuxt"]`. Do not put Nuxt checks in `rules/vue/`.

**Add a capability.** Token in `capability.ts` → emit it in `buildCapabilities` from a `ProjectInfo` field → set `requires` / `disabledWhen` on the rule. Optional `ProjectInfo` fields (`vueVersion?`) keep old test fixtures compiling.

**Add a framework.** `FRAMEWORK_TOKENS` + display name in `detect-framework.ts` + detection order (metaframeworks before bundlers; don't steal Astro/Next). Then the capability path above. `Record<Framework, string>` will fail the typecheck until the display name exists.

## Don't

- Don't rebrand packages (`react-doctor` → `open-doctor`) or publish an SDK. Surface stays until Vue is trusted (`roadmap.md` Phase 5).
- Don't merge `upstream` blindly — `FRAMEWORK_TOKENS` and `detectFramework` will conflict on every React Doctor release that touches them.
- Don't add CLI flags, score changes, or report fields without a real job. Prefer extending an existing field.
- Don't tell anyone to `uses: …@main` for the GitHub Action.
