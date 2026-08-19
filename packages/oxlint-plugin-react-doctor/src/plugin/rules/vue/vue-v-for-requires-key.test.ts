import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { vueVForRequiresKey } from "./vue-v-for-requires-key.js";

const scanVue = (content: string) =>
  runScanRule(vueVForRequiresKey, { relativePath: "src/List.vue", content });

describe("vue-v-for-requires-key", () => {
  it("flags v-for without a key", () => {
    const findings = scanVue(`
      <template>
        <li v-for="item in items">{{ item }}</li>
      </template>
    `);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("v-for");
  });

  it("accepts :key on the same element", () => {
    const findings = scanVue(`
      <template>
        <li v-for="item in items" :key="item.id">{{ item.name }}</li>
      </template>
    `);
    expect(findings).toEqual([]);
  });

  it("accepts v-bind:key", () => {
    const findings = scanVue(`
      <template>
        <li v-for="item in items" v-bind:key="item.id">{{ item.name }}</li>
      </template>
    `);
    expect(findings).toEqual([]);
  });

  it("requires the key on a template v-for, not a child", () => {
    const findings = scanVue(`
      <template>
        <template v-for="item in items">
          <li :key="item.id">{{ item.name }}</li>
        </template>
      </template>
    `);
    expect(findings).toHaveLength(1);
  });

  it("ignores non-vue files", () => {
    const findings = runScanRule(vueVForRequiresKey, {
      relativePath: "src/List.tsx",
      content: '<li v-for="item in items">{{ item }}</li>',
    });
    expect(findings).toEqual([]);
  });
});
