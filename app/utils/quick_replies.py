"""从助手正文末尾解析快捷按钮文案（::actions:: JSON 数组）。"""

from __future__ import annotations

import json
import re
from typing import List, Tuple

# 匹配文末 ::actions::["a","b"]，兼容模型多打一个冒号
_ACTIONS_SUFFIX = re.compile(
    r"(?:^|\n)\s*:?:?actions::\s*(\[[\s\S]*?\])\s*\Z",
    re.MULTILINE,
)

_MAX_BUTTONS = 3
_MAX_LABEL_LEN = 32


def split_answer_and_quick_replies(text: str) -> Tuple[str, List[str]]:
    """返回 (展示用正文, 最多 3 条按钮文案)。"""
    if not text or not str(text).strip():
        return text, []
    m = _ACTIONS_SUFFIX.search(text)
    if not m:
        return text, []
    try:
        parsed = json.loads(m.group(1))
    except json.JSONDecodeError:
        return text, []
    if not isinstance(parsed, list):
        return text, []
    labels: List[str] = []
    for item in parsed:
        s = str(item).strip()
        if not s:
            continue
        if len(s) > _MAX_LABEL_LEN:
            s = s[:_MAX_LABEL_LEN]
        labels.append(s)
        if len(labels) >= _MAX_BUTTONS:
            break
    clean = text[: m.start()].rstrip()
    return clean, labels
