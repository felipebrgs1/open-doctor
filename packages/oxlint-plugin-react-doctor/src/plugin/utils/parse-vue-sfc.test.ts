import { describe, expect, it } from "vite-plus/test";
import { extractVueScriptLintSource } from "./extract-vue-script-lint-source.js";
import { parseVueSfc } from "./parse-vue-sfc.js";

describe("parseVueSfc", () => {
  it("extracts script setup and a nested template block", () => {
    const source = [
      "<template>",
      '  <template v-if="ready"><span>{{ label }}</span></template>',
      "</template>",
      '<script setup lang="ts">',
      "const ready = true",
      "</script>",
    ].join("\n");

    const parsed = parseVueSfc(source);
    expect(parsed.template?.content).toContain("v-if");
    expect(parsed.template?.content).toContain("</template>");
    expect(parsed.scripts).toHaveLength(1);
    expect(parsed.scripts[0]?.attributes.lang).toBe("ts");
    expect(parsed.scripts[0]?.attributes.setup).toBe(true);
    expect(parsed.scripts[0]?.content).toContain("const ready = true");
  });

  it("keeps both a normal script and script setup", () => {
    const source = [
      '<script lang="ts">',
      'export const name = "Card"',
      "</script>",
      "<script setup>",
      "const count = 1",
      "</script>",
      "<template><p /></template>",
    ].join("\n");

    const parsed = parseVueSfc(source);
    expect(parsed.scripts).toHaveLength(2);
    expect(parsed.scripts[0]?.content).toContain("export const name");
    expect(parsed.scripts[1]?.content).toContain("const count");
  });
});

describe("extractVueScriptLintSource", () => {
  it("preserves script offsets so line numbers match the SFC", () => {
    const source = [
      "<template>",
      "  <p>{{ label }}</p>",
      "</template>",
      "<script setup>",
      'const label = "hi"',
      "</script>",
    ].join("\n");

    const { lintSource, hasJsx } = extractVueScriptLintSource(source);
    expect(hasJsx).toBe(false);
    expect(lintSource).toHaveLength(source.length);
    expect(lintSource).toContain('const label = "hi"');
    expect(lintSource).not.toContain("<p>");
    expect(lintSource.split("\n")).toHaveLength(source.split("\n").length);
  });
});
