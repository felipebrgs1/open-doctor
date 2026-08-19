import { defineRule } from "../../utils/define-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import {
  findVueTemplateOpeningTagAt,
  vueOpeningTagHasKeyBinding,
} from "../../utils/find-vue-template-opening-tag.js";
import { isVueSfcPath, parseVueSfc } from "../../utils/parse-vue-sfc.js";
import { offsetToSourceLocation } from "../../utils/offset-to-source-location.js";

const V_FOR_PATTERN = /\bv-for\b/g;

export const vueVForRequiresKey = defineRule({
  id: "vue-v-for-requires-key",
  title: "v-for is missing a key",
  requires: ["vue"],
  severity: "warn",
  recommendation:
    "Add `:key` on the same element as `v-for` so Vue can reuse the correct DOM nodes when the list changes.",
  scan: (file) => {
    if (!isVueSfcPath(file.relativePath)) return [];
    const { template } = parseVueSfc(file.content);
    if (template === null || template.content.length === 0) return [];

    const findings: ScanFinding[] = [];
    for (const match of template.content.matchAll(V_FOR_PATTERN)) {
      const matchIndex = match.index;
      if (matchIndex === undefined) continue;
      const openingTag = findVueTemplateOpeningTagAt(template.content, matchIndex);
      if (openingTag === null) continue;
      if (vueOpeningTagHasKeyBinding(openingTag.text)) continue;
      const location = offsetToSourceLocation(file.content, template.startOffset + matchIndex);
      findings.push({
        message:
          "This `v-for` has no `:key`, so Vue cannot tell list items apart when the array changes.",
        line: location.line,
        column: location.column,
      });
    }
    return findings;
  },
});
