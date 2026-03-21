/** 与后端一致的文末 ::actions:: JSON 数组解析（兼容旧消息仅存正文时） */
const ACTIONS_SUFFIX = /(?:^|\n)\s*:?:?actions::\s*(\[[\s\S]*?\])\s*$/;

export function parseQuickRepliesFromContent(text: string): { text: string; replies: string[] } {
  const m = text.match(ACTIONS_SUFFIX);
  if (!m || m.index === undefined) return { text, replies: [] };
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!Array.isArray(parsed)) return { text, replies: [] };
    const replies = parsed
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((s) => (s.length > 32 ? s.slice(0, 32) : s));
    return { text: text.slice(0, m.index).trimEnd(), replies };
  } catch {
    return { text, replies: [] };
  }
}
