/**
 * 匹配 ::actions:: + JSON 数组（可出现在段落中间，不要求在文末）。
 * 移除后把前后正文拼回一句，避免模型把 actions 插在问号后面、后面还有说明时整段无法匹配。
 */
const ACTIONS_BLOCK = /\s*:?:?actions::\s*(\[[\s\S]*?\])/;

export function parseQuickRepliesFromContent(text: string): { text: string; replies: string[] } {
  const m = ACTIONS_BLOCK.exec(text);
  if (!m || m.index === undefined) return { text, replies: [] };
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!Array.isArray(parsed)) return { text, replies: [] };
    const replies = parsed
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((s) => (s.length > 32 ? s.slice(0, 32) : s));
    if (replies.length === 0) return { text, replies: [] };
    const before = text.slice(0, m.index).trimEnd();
    const after = text.slice(m.index + m[0].length).trimStart();
    const merged = [before, after].filter(Boolean).join(before && after ? " " : "");
    return { text: merged.trim(), replies };
  } catch {
    return { text, replies: [] };
  }
}
