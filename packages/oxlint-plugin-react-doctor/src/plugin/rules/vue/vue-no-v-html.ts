import { defineRule } from "../../utils/define-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { isVueSfcPath, parseVueSfc } from "../../utils/parse-vue-sfc.js";
import { offsetToSourceLocation } from "../../utils/offset-to-source-location.js";

const V_HTML_PATTERN = /\bv-html\b/g;

export const vueNoVHtml = defineRule({
  id: "vue-no-v-html",
  title: "v-html renders unsanitized markup",
  requires: ["vue"],
  severity: "warn",
  category: "Security",
  recommendation:
    "Avoid `v-html` for untrusted input. Render text, or sanitize the HTML before binding it.",
  scan: (file) => {
    if (!isVueSfcPath(file.relativePath)) return [];
    const { template } = parseVueSfc(file.content);
    if (template === null || template.content.length === 0) return [];

    const findings: ScanFinding[] = [];
    for (const match of template.content.matchAll(V_HTML_PATTERN)) {
      const matchIndex = match.index;
      if (matchIndex === undefined) continue;
      const location = offsetToSourceLocation(file.content, template.startOffset + matchIndex);
      findings.push({
        message:
          "`v-html` injects raw HTML into the page, so untrusted content here becomes an XSS sink.",
        line: location.line,
        column: location.column,
      });
    }
    return findings;
  },
});
