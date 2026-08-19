import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { prepareLintSources } from "../src/utils/prepare-lint-sources.js";

const createdDirectories: string[] = [];

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("prepareLintSources vue", () => {
  it("extracts Vue script into a temp module mapped back to the SFC", () => {
    const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vue-lint-src-"));
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vue-lint-tmp-"));
    createdDirectories.push(rootDirectory, temporaryDirectory);
    const vuePath = path.join(rootDirectory, "Card.vue");
    fs.writeFileSync(
      vuePath,
      [
        "<template>",
        "  <p>{{ label }}</p>",
        "</template>",
        "<script setup>",
        'const label = "hi"',
        "</script>",
        "",
      ].join("\n"),
    );

    const prepared = prepareLintSources(rootDirectory, temporaryDirectory, ["Card.vue"]);
    expect(prepared.lintFiles).toHaveLength(1);
    const lintPath = prepared.lintFiles[0];
    expect(lintPath).toBeDefined();
    if (lintPath === undefined) return;
    expect(path.extname(lintPath)).toBe(".ts");
    expect(prepared.sourcePathByLintPath.get(path.resolve(lintPath))).toBe("Card.vue");
    expect(fs.readFileSync(lintPath, "utf8")).toContain('const label = "hi"');
    expect(fs.readFileSync(lintPath, "utf8")).not.toContain("<p>");
  });
});
