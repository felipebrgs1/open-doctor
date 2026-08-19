import { parseVueSfc } from "./parse-vue-sfc.js";

export interface VueScriptLintSource {
  readonly lintSource: string;
  readonly hasJsx: boolean;
}

const JSX_SCRIPT_LANGUAGES = new Set(["jsx", "tsx"]);

const isJsxScriptLanguage = (language: string | true | undefined): boolean =>
  typeof language === "string" && JSX_SCRIPT_LANGUAGES.has(language.toLowerCase());

export const extractVueScriptLintSource = (sourceText: string): VueScriptLintSource => {
  const { scripts } = parseVueSfc(sourceText);
  const lintCharacters: string[] = Array.from(sourceText, (character) =>
    character === "\n" || character === "\r" ? character : " ",
  );
  let hasJsx = false;
  for (const script of scripts) {
    if (isJsxScriptLanguage(script.attributes.lang)) hasJsx = true;
    for (let offset = script.startOffset; offset < script.endOffset; offset += 1) {
      lintCharacters[offset] = sourceText[offset] ?? " ";
    }
  }
  return { lintSource: lintCharacters.join(""), hasJsx };
};
