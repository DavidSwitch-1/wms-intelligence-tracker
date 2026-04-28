// Lightweight markdown -> HTML renderer for use with dangerouslySetInnerHTML.
// Handles: **bold**, *italic*, `code`, # / ## / ### headings, - and 1. lists,
// ``` code blocks, --- hr, [text](url) links. No external deps.

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  s = s.replace(/`([^`]+)`/g, '<code style="background:#F1EEE6;padding:1px 5px;border-radius:3px;font-family:ui-monospace,\'SF Mono\',Consolas,monospace;font-size:0.92em;color:#0B1C37">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#0B1C37">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563EB;text-decoration:underline">$1</a>');
  return s;
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  const codeBlocks: string[] = [];
  let src = text.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g, (_m, _lang, code) => {
    codeBlocks.push(code);
    return '\u0000CODE' + (codeBlocks.length - 1) + '\u0000';
  });
  src = escapeHtml(src);
  const lines = src.split('\n');
  const out: string[] = [];
  let listKind: 'ul' | 'ol' | null = null;
  const closeList = () => { if (listKind) { out.push(listKind === 'ul' ? '</ul>' : '</ol>'); listKind = null; } };
  let pendingPara: string[] = [];
  const flushPara = () => {
    if (pendingPara.length) {
      out.push('<p style="margin:6px 0;line-height:1.6">' + pendingPara.map(inline).join('<br/>') + '</p>');
      pendingPara = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cb = line.match(/^\u0000CODE(\d+)\u0000$/);
    if (cb) {
      flushPara(); closeList();
      const code = escapeHtml(codeBlocks[parseInt(cb[1], 10)]).replace(/^\n+|\n+$/g, '');
      out.push('<pre style="background:#F1EEE6;border:1px solid #E5E0D0;border-radius:6px;padding:10px 12px;overflow-x:auto;font-family:ui-monospace,\'SF Mono\',Consolas,monospace;font-size:12px;color:#0B1C37;margin:10px 0;line-height:1.5;white-space:pre"><code>' + code + '</code></pre>');
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      flushPara(); closeList();
      out.push('<hr style="border:none;border-top:1px solid #E5E0D0;margin:14px 0" />');
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 || h2 || h3) {
      flushPara(); closeList();
      const lvl = h1 ? 1 : h2 ? 2 : 3;
      const sz = lvl === 1 ? 20 : lvl === 2 ? 17 : 14;
      const txt = (h1 ? h1[1] : h2 ? h2[1] : h3![1]);
      out.push('<h' + lvl + ' style="margin:14px 0 6px;font-size:' + sz + 'px;font-weight:700;color:#0B1C37;letter-spacing:-0.01em">' + inline(txt) + '</h' + lvl + '>');
      continue;
    }
    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushPara();
      if (listKind !== 'ul') { closeList(); out.push('<ul style="margin:6px 0;padding-left:22px">'); listKind = 'ul'; }
      out.push('<li style="margin:2px 0">' + inline(ul[1]) + '</li>');
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushPara();
      if (listKind !== 'ol') { closeList(); out.push('<ol style="margin:6px 0;padding-left:22px">'); listKind = 'ol'; }
      out.push('<li style="margin:2px 0">' + inline(ol[1]) + '</li>');
      continue;
    }
    if (line.trim() === '') {
      flushPara(); closeList();
      continue;
    }
    closeList();
    pendingPara.push(line);
  }
  flushPara(); closeList();
  return out.join('');
}
