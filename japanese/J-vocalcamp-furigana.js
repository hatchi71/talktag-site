/* Pair reviewed full-line kana readings with kanji groups for Japanese Vocal Camp. */
(() => {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const kanji = /^[\p{Script=Han}々]+$/u;
  const chunks = text => (text.match(/[\p{Script=Han}々]+|[^\p{Script=Han}々]+/gu) || [])
    // Compound + verb at the B1 clarification line are two reading units.
    .flatMap(part => part === '一度聞' ? ['一度', '聞'] : [part]);
  function align(parts, reading, index = 0, offset = 0) {
    if (index === parts.length) return offset === reading.length ? [] : null;
    const part = parts[index];
    if (!kanji.test(part)) {
      if (!reading.startsWith(part, offset)) return null;
      const rest = align(parts, reading, index + 1, offset + part.length);
      return rest === null ? null : [{text: part}, ...rest];
    }
    if (part === '一度' && parts[index + 1] === '聞') {
      const rt = 'いちど';
      if (!reading.startsWith(rt, offset)) return null;
      const rest = align(parts, reading, index + 1, offset + rt.length);
      return rest === null ? null : [{text: part, rt}, ...rest];
    }
    // Each kanji group must receive its own nonempty reading. Backtracking
    // avoids accidentally matching a following kana inside the kanji reading.
    const limit = Math.min(reading.length - offset, part.length * 6);
    for (let length = 1; length <= limit; length++) {
      const rest = align(parts, reading, index + 1, offset + length);
      if (rest !== null) return [{text: part, rt: reading.slice(offset, offset + length)}, ...rest];
    }
    return null;
  }
  function render(japanese, reading) {
    const base = String(japanese || '').normalize('NFKC');
    const kana = String(reading || '').normalize('NFKC');
    const pair = align(chunks(base), kana);
    if (!pair) return `<span class="j-vocal-reading-fallback">${esc(base)}<small>${esc(kana)}</small></span>`;
    return pair.map(({text, rt}) => rt ? `<ruby>${esc(text)}<rt>${esc(rt)}</rt></ruby>` : esc(text)).join('');
  }
  window.TalkTagJapaneseFurigana = {render, align, chunks};
})();
