// Readings are paired with the authored Japanese line. The original text stays
// visible; kana is added above each kanji group with semantic ruby markup.
const reviewedGlrReadings = {"日本語":"にほんご","名前":"なまえ","何":"なん","私":"わたし","座":"すわ","一杯":"いっぱい","勉強":"べんきょう","話":"はな","一度":"いちど","願":"ねが","初":"はじ","来":"き","道":"みち","分":"わ","建物":"たてもの","三階":"さんがい","合":"あ","入口":"いりぐち","少":"すこ","待":"ま","着":"つ","今":"いま","前":"まえ","予約":"よやく","時間":"じかん","変":"か","急":"きゅう","用事":"ようじ","入":"はい","三十分":"さんじゅっぷん","遅":"おく","一時半":"いちじはん","変更":"へんこう","難":"むずか","明日":"あした","大丈夫":"だいじょうぶ","静":"しず","所":"ところ","遠":"とお","場所":"ばしょ","今日":"きょう","軽":"かる","会":"あ","聞":"き","意図":"いと","違":"ちが","誰":"だれ","悪":"わる","次":"つぎ","一緒":"いっしょ","考":"かんが","説明":"せつめい","足":"た","点":"てん","認":"みと","誤解":"ごかい","解":"と","思":"おも","気遣":"きづか","先回":"さきまわ","困":"こま","必要":"ひつよう","頼":"たの","見守":"みまも","助":"たす"};
const reviewedPattern = new RegExp(Object.keys(reviewedGlrReadings).sort((a, b) => b.length - a.length).join('|'), 'g');
const kanji = /^[\p{Script=Han}々]+$/u;
const chunks = value => (value.match(/[\p{Script=Han}々]+|[^\p{Script=Han}々]+/gu) || [])
  .flatMap(part => part === '一度聞' ? ['一度', '聞'] : [part]);

function align(parts, reading, index = 0, offset = 0) {
  if (index === parts.length) return offset === reading.length ? [] : null;
  const part = parts[index];
  if (!kanji.test(part)) {
    if (!reading.startsWith(part, offset)) return null;
    const rest = align(parts, reading, index + 1, offset + part.length);
    return rest === null ? null : [{ text: part }, ...rest];
  }
  if (part === '一度' && parts[index + 1] === '聞') {
    if (!reading.startsWith('いちど', offset)) return null;
    const rest = align(parts, reading, index + 1, offset + 3);
    return rest === null ? null : [{ text: part, rt: 'いちど' }, ...rest];
  }
  const limit = Math.min(reading.length - offset, part.length * 6);
  for (let length = 1; length <= limit; length++) {
    const rest = align(parts, reading, index + 1, offset + length);
    if (rest !== null) return [{ text: part, rt: reading.slice(offset, offset + length) }, ...rest];
  }
  return null;
}

function ruby(text, reading) {
  const node = document.createElement('ruby');
  node.append(document.createTextNode(text));
  const rt = document.createElement('rt');
  rt.textContent = reading;
  node.append(rt);
  return node;
}

export function japaneseWithFurigana(text, authoredReading = '') {
  const result = document.createDocumentFragment();
  const source = String(text || '').normalize('NFKC');
  const reading = String(authoredReading || '').normalize('NFKC');
  const paired = reading ? align(chunks(source), reading) : null;
  if (paired) {
    for (const part of paired) result.append(part.rt ? ruby(part.text, part.rt) : document.createTextNode(part.text));
    return result;
  }
  let cursor = 0;
  for (const match of source.matchAll(reviewedPattern)) {
    result.append(document.createTextNode(source.slice(cursor, match.index)));
    result.append(ruby(match[0], reviewedGlrReadings[match[0]]));
    cursor = match.index + match[0].length;
  }
  result.append(document.createTextNode(source.slice(cursor)));
  if (reading) {
    const note = document.createElement('small');
    note.className = 'japanese-reading-fallback';
    note.textContent = reading;
    result.append(note);
  }
  return result;
}
