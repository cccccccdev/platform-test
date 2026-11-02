function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return out;
}

function renderTableRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('-');
}

function renderBlockquote(buffer: string[]) {
  return `<blockquote>${buffer.map(renderInline).join('<br/>')}</blockquote>`;
}

/**
 * 轻量 Markdown 渲染：覆盖标题、段落、有序/无序列表、代码块、引用、表格、分割线与行内样式。
 * 所有源文本先做 HTML 转义，避免公告内容注入标签。
 */
export function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push('<hr/>');
      index += 1;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const buffer: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        buffer.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(renderBlockquote(buffer));
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const header = renderTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(renderTableRow(lines[index]));
        index += 1;
      }
      const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
      const body = rows
        .map((row) => `<tr>${header.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] ?? '')}</td>`).join('')}</tr>`)
        .join('');
      html.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      const tag = bullet ? 'ul' : 'ol';
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index];
        const matchBullet = /^\s*[-*+]\s+(.*)$/.exec(current);
        const matchOrdered = /^\s*\d+\.\s+(.*)$/.exec(current);
        const isSameKind = bullet ? Boolean(matchBullet) : Boolean(matchOrdered);
        if (!isSameKind) break;
        items.push(`<li>${renderInline((matchBullet ?? matchOrdered)?.[1] ?? '')}</li>`);
        index += 1;
      }
      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|\s*>|```)/.test(lines[index]) && !lines[index].includes('|')) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (paragraph.length) {
      html.push(`<p>${paragraph.map(renderInline).join('<br/>')}</p>`);
    } else {
      index += 1;
    }
  }

  return html.join('');
}
