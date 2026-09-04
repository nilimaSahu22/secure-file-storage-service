/**
 * Strip common Markdown syntax down to plain text so text-to-speech reads natural
 * sentences instead of literal `**`, `#`, `[text](url)`, table pipes, etc. Not a full
 * parser — just enough to cover what the assistant's own replies actually use.
 */
export function stripMarkdown(markdown: string): string {
  let text = markdown;

  // Fenced code blocks — reading code aloud isn't useful, so drop them entirely.
  text = text.replace(/```[\s\S]*?```/g, " ");
  // Inline code
  text = text.replace(/`([^`]+)`/g, "$1");
  // Images ![alt](url) -> alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Headings
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Bold / italic / strikethrough
  text = text.replace(/(\*\*\*|___)(.*?)\1/g, "$2");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  // Blockquotes
  text = text.replace(/^\s*>\s?/gm, "");
  // Horizontal rules
  text = text.replace(/^ {0,3}([-*_])(\s*\1){2,}\s*$/gm, "");
  // Table separator rows (|---|---|)
  text = text.replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/gm, "");
  // List markers
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+[.)]\s+/gm, "");
  // Remaining table pipes -> pause
  text = text.replace(/\|/g, ", ");
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{2,}/g, "\n");

  return text.trim();
}
