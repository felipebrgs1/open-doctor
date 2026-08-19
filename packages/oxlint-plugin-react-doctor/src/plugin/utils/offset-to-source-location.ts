export interface SourceLocation {
  readonly line: number;
  readonly column: number;
}

export const offsetToSourceLocation = (sourceText: string, offset: number): SourceLocation => {
  const clampedOffset = Math.max(0, Math.min(offset, sourceText.length));
  let line = 1;
  let lastNewlineOffset = -1;
  for (let index = 0; index < clampedOffset; index += 1) {
    if (sourceText.charCodeAt(index) === 10) {
      line += 1;
      lastNewlineOffset = index;
    }
  }
  return { line, column: clampedOffset - lastNewlineOffset };
};
