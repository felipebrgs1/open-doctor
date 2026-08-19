import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { vueNoMutatingProps } from "./vue-no-mutating-props.js";

const scanVue = (content: string) =>
  runScanRule(vueNoMutatingProps, { relativePath: "src/Field.vue", content });

describe("vue-no-mutating-props", () => {
  it("flags assignment to props in script setup", () => {
    const findings = scanVue(`
      <script setup>
      const props = defineProps({ count: Number })
      props.count = 1
      </script>
    `);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("props");
  });

  it("flags incrementing a prop", () => {
    const findings = scanVue(`
      <script setup>
      const props = defineProps({ count: Number })
      props.count++
      </script>
    `);
    expect(findings).toHaveLength(1);
  });

  it("does not flag reading props", () => {
    const findings = scanVue(`
      <script setup>
      const props = defineProps({ count: Number })
      const next = props.count + 1
      </script>
    `);
    expect(findings).toEqual([]);
  });

  it("does not flag a local object named state", () => {
    const findings = scanVue(`
      <script setup>
      const state = { count: 0 }
      state.count = 1
      </script>
    `);
    expect(findings).toEqual([]);
  });
});
