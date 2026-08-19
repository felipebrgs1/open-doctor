export interface VueTemplateOpeningTag {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly text: string;
}

const isQuote = (character: string): boolean => character === '"' || character === "'";

export const findVueTemplateOpeningTagEnd = (template: string, tagStart: number): number => {
  let quote: string | null = null;
  for (let index = tagStart; index < template.length; index += 1) {
    const character = template[index];
    if (character === undefined) return template.length;
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (isQuote(character)) {
      quote = character;
      continue;
    }
    if (character === ">") return index + 1;
  }
  return template.length;
};

export const findVueTemplateOpeningTagAt = (
  template: string,
  innerOffset: number,
): VueTemplateOpeningTag | null => {
  const tagStart = template.lastIndexOf("<", innerOffset);
  if (tagStart === -1) return null;
  const tagEnd = findVueTemplateOpeningTagEnd(template, tagStart);
  if (tagEnd <= innerOffset) return null;
  return {
    startOffset: tagStart,
    endOffset: tagEnd,
    text: template.slice(tagStart, tagEnd),
  };
};

export const vueOpeningTagHasKeyBinding = (openingTag: string): boolean =>
  /(?:^|\s)(?::key\b|v-bind:key\b|key\s*=)/.test(openingTag);
