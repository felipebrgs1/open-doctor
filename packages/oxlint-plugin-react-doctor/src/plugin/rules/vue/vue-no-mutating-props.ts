import { parseSync } from "oxc-parser";
import { defineRule } from "../../utils/define-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { isVueSfcPath, parseVueSfc } from "../../utils/parse-vue-sfc.js";
import { offsetToSourceLocation } from "../../utils/offset-to-source-location.js";

interface OxcNode {
  readonly type: string;
  readonly start?: number;
  readonly object?: OxcNode;
  readonly argument?: OxcNode;
  readonly left?: OxcNode;
  readonly [key: string]: unknown;
}

const getRootIdentifierName = (node: OxcNode | undefined): string | null => {
  let current = node;
  while (current !== undefined && current.type === "MemberExpression") {
    current = current.object;
  }
  if (current === undefined || current.type !== "Identifier") return null;
  const name = current.name;
  return typeof name === "string" ? name : null;
};

const visitOxcNode = (node: unknown, visit: (current: OxcNode) => void): void => {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const entry of node) visitOxcNode(entry, visit);
    return;
  }
  const current = node as OxcNode;
  if (typeof current.type === "string") visit(current);
  for (const value of Object.values(current)) visitOxcNode(value, visit);
};

const collectPropsMutations = (scriptContent: string, fileName: string): number[] => {
  let program: unknown;
  try {
    program = parseSync(fileName, scriptContent, { sourceType: "module" }).program;
  } catch {
    return [];
  }
  const mutationOffsets: number[] = [];
  visitOxcNode(program, (node) => {
    if (node.type === "AssignmentExpression" && getRootIdentifierName(node.left) === "props") {
      if (typeof node.start === "number") mutationOffsets.push(node.start);
      return;
    }
    if (node.type === "UpdateExpression" && getRootIdentifierName(node.argument) === "props") {
      if (typeof node.start === "number") mutationOffsets.push(node.start);
    }
  });
  return mutationOffsets;
};

export const vueNoMutatingProps = defineRule({
  id: "vue-no-mutating-props",
  title: "Props are mutated",
  requires: ["vue"],
  severity: "error",
  recommendation:
    "Do not assign to `props`. Emit an event or use a local copy so data still flows from parent to child.",
  scan: (file) => {
    if (!isVueSfcPath(file.relativePath)) return [];
    const { scripts } = parseVueSfc(file.content);
    const findings: ScanFinding[] = [];
    for (const [scriptIndex, script] of scripts.entries()) {
      const language = typeof script.attributes.lang === "string" ? script.attributes.lang : "ts";
      const fileName = `${file.relativePath}.${scriptIndex}.${language}`;
      for (const scriptOffset of collectPropsMutations(script.content, fileName)) {
        const location = offsetToSourceLocation(file.content, script.startOffset + scriptOffset);
        findings.push({
          message:
            "This writes to `props`, which breaks Vue's one-way data flow and the parent will not see a reliable update.",
          line: location.line,
          column: location.column,
        });
      }
    }
    return findings;
  },
});
