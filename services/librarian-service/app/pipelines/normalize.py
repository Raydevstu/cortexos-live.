from __future__ import annotations

import hashlib
import re

from app.schemas.librarian import NormalizeResult


def _chunk_paragraphs(text: str, max_chars: int = 1200) -> list[str]:
    if not text:
        return []
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= max_chars:
            current = f"{current}\n\n{para}".strip()
        else:
            if current:
                chunks.append(current)
            if len(para) <= max_chars:
                current = para
            else:
                for idx in range(0, len(para), max_chars):
                    chunks.append(para[idx : idx + max_chars])
                current = ""
    if current:
        chunks.append(current)
    return chunks


def normalize_content(
    title: str,
    raw_content: str,
    *,
    chunk_size: int = 1200,
) -> NormalizeResult:
    """Normalize source/artifact text while keeping raw sources conceptually immutable."""
    cleaned_lines = [line.rstrip() for line in raw_content.replace("\r\n", "\n").split("\n")]
    collapsed = re.sub(r"\n{3,}", "\n\n", "\n".join(cleaned_lines)).strip()
    headings = [
        line.lstrip("#").strip()
        for line in collapsed.split("\n")
        if re.match(r"^\s{0,3}#{1,6}\s+\S+", line)
    ]
    checksum = hashlib.sha256(collapsed.encode("utf-8")).hexdigest()
    chunks = _chunk_paragraphs(collapsed, max_chars=chunk_size)
    words = len(re.findall(r"\b\w+\b", collapsed))
    return NormalizeResult(
        title=title.strip() or "Untitled Source",
        normalized_text=collapsed,
        checksum=checksum,
        headings=headings,
        chunks=chunks,
        word_count=words,
    )
