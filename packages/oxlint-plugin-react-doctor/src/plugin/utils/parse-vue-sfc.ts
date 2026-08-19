import { offsetToSourceLocation } from "./offset-to-source-location.js";

export interface VueSfcBlockAttributes {
  readonly [attributeName: string]: string | true;
}

export interface VueSfcBlock {
  readonly type: "script" | "template" | "style";
  readonly content: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startLine: number;
  readonly startColumn: number;
  readonly attributes: VueSfcBlockAttributes;
}

export interface ParsedVueSfc {
  readonly scripts: readonly VueSfcBlock[];
  readonly template: VueSfcBlock | null;
}

const BLOCK_OPEN_PATTERN = /<(script|template|style)\b([^>]*?)(\/)?>/gi;

const isBlockNameBoundary = (character: string | undefined): boolean =>
  character === undefined || /[\s>/]/.test(character);

const parseBlockAttributes = (rawAttributes: string): VueSfcBlockAttributes => {
  const attributes: Record<string, string | true> = {};
  const attributePattern =
    /([:@A-Za-z_][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of rawAttributes.matchAll(attributePattern)) {
    const attributeName = match[1];
    if (attributeName === undefined) continue;
    attributes[attributeName] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return attributes;
};

const findMatchingCloseTag = (
  sourceText: string,
  contentStart: number,
  tagName: string,
): number => {
  const openNeedle = `<${tagName}`;
  const closeNeedle = `</${tagName}`;
  let depth = 1;
  let searchIndex = contentStart;
  while (searchIndex < sourceText.length) {
    const nextOpen = sourceText.indexOf(openNeedle, searchIndex);
    const nextClose = sourceText.indexOf(closeNeedle, searchIndex);
    if (nextClose === -1) return -1;
    if (
      nextOpen !== -1 &&
      nextOpen < nextClose &&
      isBlockNameBoundary(sourceText[nextOpen + openNeedle.length])
    ) {
      depth += 1;
      searchIndex = nextOpen + openNeedle.length;
      continue;
    }
    if (!isBlockNameBoundary(sourceText[nextClose + closeNeedle.length])) {
      searchIndex = nextClose + closeNeedle.length;
      continue;
    }
    depth -= 1;
    if (depth === 0) return nextClose;
    searchIndex = nextClose + closeNeedle.length;
  }
  return -1;
};

export const parseVueSfc = (sourceText: string): ParsedVueSfc => {
  const scripts: VueSfcBlock[] = [];
  let template: VueSfcBlock | null = null;
  let searchIndex = 0;

  while (searchIndex < sourceText.length) {
    BLOCK_OPEN_PATTERN.lastIndex = searchIndex;
    const openMatch = BLOCK_OPEN_PATTERN.exec(sourceText);
    if (openMatch === null || openMatch.index === undefined) break;

    const tagName = openMatch[1]?.toLowerCase();
    const rawAttributes = openMatch[2] ?? "";
    const isSelfClosing = openMatch[3] === "/";
    if (tagName !== "script" && tagName !== "template" && tagName !== "style") {
      searchIndex = openMatch.index + openMatch[0].length;
      continue;
    }

    const contentStart = openMatch.index + openMatch[0].length;
    const closeIndex = isSelfClosing
      ? contentStart
      : findMatchingCloseTag(sourceText, contentStart, tagName);
    if (closeIndex === -1) break;

    const content = isSelfClosing ? "" : sourceText.slice(contentStart, closeIndex);
    const { line, column } = offsetToSourceLocation(sourceText, contentStart);
    const block: VueSfcBlock = {
      type: tagName,
      content,
      startOffset: contentStart,
      endOffset: closeIndex,
      startLine: line,
      startColumn: column,
      attributes: parseBlockAttributes(rawAttributes),
    };

    if (tagName === "script") scripts.push(block);
    else if (tagName === "template" && template === null) template = block;

    searchIndex = isSelfClosing ? contentStart : closeIndex + `</${tagName}>`.length;
  }

  return { scripts, template };
};

export const isVueSfcPath = (filePath: string): boolean => filePath.toLowerCase().endsWith(".vue");
