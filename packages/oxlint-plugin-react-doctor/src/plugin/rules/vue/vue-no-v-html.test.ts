import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { vueNoVHtml } from "./vue-no-v-html.js";

describe("vue-no-v-html", () => {
  it("flags v-html in a template", () => {
    const findings = runScanRule(vueNoVHtml, {
      relativePath: "src/Preview.vue",
      content: `
        <template>
          <div v-html="markup" />
        </template>
      `,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("v-html");
  });

  it("does not flag v-html mentioned only in script", () => {
    const findings = runScanRule(vueNoVHtml, {
      relativePath: "src/Preview.vue",
      content: `
        <script setup>
        const docs = "use v-html carefully"
        </script>
        <template>
          <p>{{ docs }}</p>
        </template>
      `,
    });
    expect(findings).toEqual([]);
  });
});
