#!/usr/bin/env node
// Build a private, inert staging pack from original PPP001 drafts. This script
// never connects to Supabase/R2, changes the public catalog, or publishes cards.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const levels = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const areas = ['readable', 'guided', 'miniTalks', 'vocalCamp', 'storyCamp'];
const areaNames = {
  readable: 'readable', guided: 'guided-listen-repeat',
  miniTalks: 'mini-talks', vocalCamp: 'vocal-camp', storyCamp: 'story-camp'
};
const areaLabels = {
  readable: 'Readable', guided: 'Guided Listen & Repeat',
  miniTalks: 'Mini Talks', vocalCamp: 'Vocal Camp', storyCamp: 'Story Camp'
};
const audioRatios = [2, 2.5, 3, 3.5];
const supportLanguages = ['vi', 'ne', 'km', 'my', 'th', 'ja'];

function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function fail(message) { throw new Error(message); }
function within(child, parent) {
  const path = relative(parent, child);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`Missing ${label}`);
  return value.trim();
}
function asArray(value, label) {
  if (!Array.isArray(value) || !value.length) fail(`Missing ${label}`);
  return value;
}
function sourceLine(unit, label, area) {
  if (!unit || typeof unit !== 'object') fail(`Invalid ${label}`);
  return {
    id: text(unit.id, `${label}.id`),
    target: text(unit.text ?? unit.target ?? unit.source, `${label}.target`),
    meaning: text(area === 'readable' && unit.supportTranslation
      ? unit.supportTranslation : unit.meaning, `${label}.meaning`),
    expressionId: typeof unit.expressionId === 'string' ? unit.expressionId : undefined,
    speaker: typeof unit.speaker === 'string' ? unit.speaker : undefined
  };
}

export function finalCardId(language, level, area) {
  const l = level.toLowerCase();
  if (area === 'miniTalks') return `mt-${language}-${l}-001-ppp-v2`;
  const kind = { readable: 'readable', guided: 'guided', vocalCamp: 'vocal-camp', storyCamp: 'story-camp' }[area];
  if (!kind) fail(`Unknown area ${area}`);
  return `${language}-${kind}-${l}-001-ppp-v2`;
}

export function normalizeDraft(file) {
  const bytes = readFileSync(file);
  const draft = JSON.parse(bytes.toString('utf8'));
  const language = draft.targetLanguage ?? draft.language;
  const level = String(draft.level || '').toUpperCase();
  if (!['en', 'ko'].includes(language) || !levels.includes(level) || String(draft.episode).padStart(3, '0') !== '001')
    fail(`${basename(file)} must be an English/Korean PPP episode 001 draft at A0–C2`);
  const rawCards = draft.cards ?? {
    readable: draft.readable,
    guided: draft.glr ?? draft.guidedListenRepeat,
    miniTalks: draft.miniTalks,
    vocalCamp: draft.vocalCamp,
    storyCamp: draft.storyCamp
  };
  const required = level === 'A0' ? (language === 'ko' ? ['readable', 'guided'] : ['guided']) : areas;
  for (const area of required) if (!rawCards[area]) fail(`${basename(file)} lacks ${area}`);
  const normalized = {};
  const readableTitle = rawCards.readable?.title;
  for (const area of areas) {
    const card = rawCards[area];
    if (!card) continue;
    const key = area === 'readable' ? 'paragraphs' : area === 'guided' ? 'lines'
      : area === 'miniTalks' ? 'turns' : 'units';
    let units = card[key];
    if (area === 'guided' && !units && card.targetExpression)
      units = [{ id: 'g1', text: card.targetExpression, meaning: card.meaning }];
    const lines = asArray(units, `${basename(file)}.${area}.${key}`)
      .map((unit, index) => sourceLine(unit, `${basename(file)}.${area}.${key}[${index}]`, area));
    if (new Set(lines.map(line => line.id)).size !== lines.length)
      fail(`${basename(file)}.${area} repeats a source-line ID`);
    normalized[area] = {
      area, lines, source: card,
      id: finalCardId(language, level, area),
      proposedId: card.proposedId ?? null,
      title: card.title ?? readableTitle ?? draft.title ?? draft.topic ?? draft.pppTopic ?? `PPP 001 · ${level}`
    };
  }
  return { file: basename(file), sha256: sha(bytes), language, level, draft, cards: normalized };
}

function imageFor(cardId, entry, issues) {
  const artwork = entry?.artwork;
  if (!artwork) { issues.push(`${cardId}: reviewed artwork missing`); return null; }
  const publicPath = artwork.publicPath;
  if (typeof publicPath !== 'string' || !/^\/assets\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/.test(publicPath))
    fail(`${cardId}: unsafe artwork.publicPath`);
  const local = resolve(repository, 'public', publicPath.slice(1));
  if (!within(local, resolve(repository, 'public')) || !existsSync(local)) {
    issues.push(`${cardId}: artwork file not present at ${publicPath}`); return null;
  }
  if (artwork.scriptPictureApproved !== true || !artwork.qcRecord) {
    issues.push(`${cardId}: script–picture approval and QC record required`); return null;
  }
  const alt = text(artwork.alt, `${cardId}.artwork.alt`);
  const bytes = statSync(local).size;
  const digest = sha(readFileSync(local));
  if (artwork.sha256 && artwork.sha256 !== digest)
    fail(`${cardId}: signed artwork checksum no longer matches scene`);
  if (artwork.bytes && artwork.bytes !== bytes)
    fail(`${cardId}: signed artwork size no longer matches scene`);
  return { path: publicPath, alt, bytes, sha256: digest };
}

function artworkCandidateFor(level, issues) {
  const publicPath = `/assets/ppp001-scenes/001-${level.toLowerCase()}.jpg`;
  const local = resolve(repository, 'public', publicPath.slice(1));
  if (!existsSync(local)) {
    issues.push(`${level}: optimized scene candidate missing at ${publicPath}`);
    return null;
  }
  return { path: publicPath, bytes: statSync(local).size, sha256: sha(readFileSync(local)),
    status: 'candidate-only; script-picture approval pending' };
}

function loadReadableSupport(files) {
  const cards = new Map();
  const sourceFiles = [];
  for (const file of files) {
    const bytes = readFileSync(file);
    const registry = JSON.parse(bytes.toString('utf8'));
    if (registry.schemaVersion !== 1 || String(registry.episode).padStart(3, '0') !== '001')
      fail(`${basename(file)}: expected PPP001 readable-support schemaVersion 1`);
    for (const card of asArray(registry.cards, `${basename(file)}.cards`)) {
      const id = text(card.cardId, `${basename(file)}.cardId`);
      if (cards.has(id)) fail(`Duplicate readable-support card ${id}`);
      cards.set(id, card);
    }
    sourceFiles.push({ file: basename(file), sha256: sha(bytes) });
  }
  return { cards, sourceFiles };
}

function validateReadableSupport(card, language, registry, signedApproval, waiver, issues) {
  if (!registry) { issues.push(`${card.id}: bilingual Readable registry missing`); return null; }
  const destination = language === 'en' ? 'ko' : 'en';
  const source = card.lines.map(line => line.target);
  const target = card.lines.map(line => line.meaning);
  if (registry.cardId !== card.id || registry.sourceLanguage !== language
    || JSON.stringify(registry.sourceLineIds) !== JSON.stringify(card.lines.map(line => line.id))
    || JSON.stringify(registry.source) !== JSON.stringify(source)
    || registry.sourceHash !== sha(source.map(value => value.trim()).join('\n'))
    || JSON.stringify(registry.translations?.[destination]) !== JSON.stringify(target))
    fail(`${card.id}: bilingual Readable source, IDs, hash, or translation differs from frozen draft`);
  const review = signedApproval?.status === 'ai-editorial-approved'
    && signedApproval.displayEligible === true
    && signedApproval.nativeReviewed === false
    && signedApproval.editorialQcRecord
    ? signedApproval : registry.review?.[destination];
  const approved = review?.displayEligible === true && (
    (review.status === 'reviewed' && review.nativeReviewed === true)
    || (review.status === 'ai-editorial-approved' && typeof review.editorialQcRecord === 'string'
      && review.editorialQcRecord.trim()));
  if (!approved)
    issues.push(`${card.id}: bilingual Readable editorial review pending`);
  const waiverEntry = waiver?.cards?.[card.id];
  const translationHash = sha(target.map(value => value.trim()).join('\n'));
  const humanReviewWaived = waiver?.status === 'waived-by-user'
    && waiver?.humanReviewPerformed === false
    && waiverEntry?.sourceHash === registry.sourceHash
    && waiverEntry?.translationHash === translationHash;
  if (!humanReviewWaived && !(review?.status === 'reviewed' && review.nativeReviewed === true))
    issues.push(`${card.id}: human Readable editorial review or exact-source user waiver pending`);
  return { destination, sourceHash: registry.sourceHash,
    reviewStatus: review?.status ?? 'missing', displayEligible: review?.displayEligible === true,
    nativeReviewed: review?.nativeReviewed === true,
    editorialQcRecord: review?.editorialQcRecord ?? null,
    humanReviewDisposition: humanReviewWaived ? 'waived-by-user'
      : review?.status === 'reviewed' && review.nativeReviewed === true ? 'reviewed' : 'pending',
    humanReviewPerformed: review?.status === 'reviewed' && review.nativeReviewed === true,
    ...(humanReviewWaived ? { waiverSha256: waiver.sourceSha256,
      translationHash } : {}) };
}

function requiredVariants(area, count) {
  if (area === 'guided' || area === 'miniTalks') return ['main'];
  if (area !== 'vocalCamp') return [];
  return Array.from({ length: count }, (_, i) => {
    const stem = `clip_${String(i + 1).padStart(3, '0')}`;
    return [stem, `${stem}_2_0`, `${stem}_3_0`, `${stem}_3_5`];
  }).flat();
}

function verifiedAudio(cardId, variant, spec, usedKeys, issues) {
  if (!spec) { issues.push(`${cardId}: audio ${variant} missing`); return null; }
  const file = spec.localFile;
  if (typeof file !== 'string' || !isAbsolute(file) || !/\.mp3$/i.test(file) || !existsSync(file)) {
    issues.push(`${cardId}: audio ${variant} requires an existing absolute MP3 path`); return null;
  }
  const r2Key = spec.r2Key;
  if (typeof r2Key !== 'string' || !r2Key || r2Key.startsWith('/') || r2Key.includes('..') || /[\x00-\x1f]/.test(r2Key))
    fail(`${cardId}: invalid R2 key for ${variant}`);
  if (usedKeys.has(r2Key)) fail(`Duplicate R2 key: ${r2Key}`);
  usedKeys.add(r2Key);
  const bytes = readFileSync(file);
  if (!bytes.length) fail(`${cardId}: empty audio file for ${variant}`);
  const digest = sha(bytes);
  if (spec.sha256 !== digest || spec.byteLength !== bytes.length) {
    issues.push(`${cardId}: ${variant} checksum or byte length mismatch`); return null;
  }
  const duration = Number(spec.durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) {
    issues.push(`${cardId}: ${variant} needs measured durationSeconds`); return null;
  }
  if (spec.technicalQcPass !== true || !spec.qcRecord) {
    issues.push(`${cardId}: ${variant} needs technical QC evidence`);
  }
  try {
    const raw = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
      'format=duration:stream=codec_name,codec_type', '-of', 'json', file],
    { encoding: 'utf8', timeout: 15000 });
    const probe = JSON.parse(raw);
    const actual = Number(probe.format?.duration);
    if (!probe.streams?.some(stream => stream.codec_type === 'audio' && stream.codec_name === 'mp3')
      || !Number.isFinite(actual) || Math.abs(actual - duration) > 0.35)
      issues.push(`${cardId}: ${variant} is not a measured MP3 or duration differs from ffprobe`);
  } catch {
    issues.push(`${cardId}: ${variant} could not be independently inspected by ffprobe`);
  }
  return {
    row: { card_id: cardId, variant, r2_key: r2Key, mime_type: 'audio/mpeg', byte_length: bytes.length, sha256: digest },
    duration, cues: spec.cues, sourceHash: spec.sourceHash
  };
}

// The audio assembly job emits one record per rendered file. Convert its
// checksum-backed records to the same manifest shape used by the builder.
// Artwork/script-picture sign-off remains a separate explicit media input.
export function mergeAudioPipeline(manifest, pipeline) {
  if (!pipeline) return manifest;
  if (pipeline.episode !== undefined && String(pipeline.episode).padStart(3, '0') !== '001')
    fail('Audio pipeline output is not PPP episode 001');
  const result = structuredClone(manifest);
  result.cards ||= {};
  const groups = new Map();
  for (const item of asArray(pipeline.cards, 'audio pipeline cards')) {
    const rawId = text(item.id, 'audio pipeline card.id');
    const count = Number(item.partCount || 1);
    const baseId = count > 1 ? rawId.replace(/-part\d+$/, '') : rawId;
    if (!/^(?:en-|ko-|mt-en-|mt-ko-)[a-z0-9-]+-ppp-v2$/.test(baseId))
      fail(`Unexpected PPP001 pipeline card ID: ${rawId}`);
    const stage = Number(item.stage || item.step || 0);
    const ratio = Number(item.ratio || 2.5);
    const variant = item.variant || (stage > 0
      ? `clip_${String(stage).padStart(3, '0')}${ratio === 2.5 ? '' : `_${ratio.toFixed(1).replace('.', '_')}`}`
      : 'main');
    const digest = text(item.sha256, `${rawId}.sha256`);
    const spec = {
      localFile: item.audioPath, sha256: digest, byteLength: item.bytes,
      durationSeconds: item.durationSeconds,
      r2Key: item.r2Key || `ppp001/${baseId}/${count > 1 ? `part${item.partIndex}/` : ''}${variant}/${digest}.mp3`,
      cues: item.training?.cues || item.timings || item.cues,
      technicalQcPass: item.technicalQcPass === true || item.qc?.pass === true,
      qcRecord: item.qcRecord || item.qc?.record || null,
      sourceHash: item.sourceHash || null
    };
    const records = groups.get(baseId) || [];
    records.push({ partIndex: Number(item.partIndex || 1), partCount: count,
      sourceIndices: item.sourceIndices, variant, spec });
    groups.set(baseId, records);
  }
  for (const [baseId, records] of groups) {
    const entry = result.cards[baseId] ||= {};
    const maxParts = Math.max(...records.map(record => record.partCount));
    if (maxParts > 1) {
      const parts = Array.from({ length: maxParts }, (_, index) => ({ partIndex: index + 1, audio: {} }));
      for (const record of records) {
        const part = parts[record.partIndex - 1];
        if (!part) fail(`${baseId}: invalid pipeline partIndex`);
        if (part.audio[record.variant]) fail(`${baseId}: duplicate pipeline part/variant`);
        part.audio[record.variant] = record.spec;
        if (record.sourceIndices) part.sourceIndices = record.sourceIndices;
      }
      // If the pipeline emits only timing cues, derive contiguous source spans
      // from the number of distinct local cue indices in each part.
      let next = 0;
      for (const part of parts) {
        if (part.sourceIndices) { next = Math.max(...part.sourceIndices) + 1; continue; }
        const cues = part.audio.main?.cues;
        const count = new Set(Array.isArray(cues) ? cues.map(cue => cue.i) : []).size;
        if (!count) fail(`${baseId}: split pipeline output needs sourceIndices or Guided cues`);
        part.sourceIndices = Array.from({ length: count }, (_, index) => next + index);
        next += count;
      }
      entry.parts = parts.map(({ sourceIndices, audio }) => ({ sourceIndices, audio }));
    } else {
      entry.audio ||= {};
      for (const record of records) {
        if (entry.audio[record.variant]) fail(`${baseId}: duplicate pipeline variant ${record.variant}`);
        entry.audio[record.variant] = record.spec;
      }
    }
  }
  return result;
}

// Editorial sign-off is kept separate from audio assembly. A signed overlay
// cannot approve changed source text or changed artwork, and cannot overwrite
// audio records supplied by the media job.
export function mergeEditorialOverlay(manifest, overlay, drafts) {
  if (!overlay) return manifest;
  if (overlay.schemaVersion !== 1 || overlay.release !== 'PPP001-20261114'
    || overlay.reviewType !== 'Codex AI editorial; not human or native review'
    || !overlay.cards || typeof overlay.cards !== 'object')
    fail('Invalid PPP001 AI editorial overlay');
  const expected = new Map(drafts.flatMap(draft => Object.values(draft.cards)
    .map(card => [card.id, { draft, card }])));
  if (Object.keys(overlay.cards).length !== expected.size)
    fail('AI editorial overlay does not cover every PPP001 base card');
  const result = structuredClone(manifest);
  result.cards ||= {};
  for (const [id, { draft, card }] of expected) {
    const signed = overlay.cards[id];
    const sourceHash = sha(card.lines.map(line => line.target.trim()).join('\n'));
    if (!signed || signed.sourceDraftSha256 !== draft.sha256
      || signed.targetSourceSha256 !== sourceHash
      || JSON.stringify(signed.targetIds) !== JSON.stringify(card.lines.map(line => line.id)))
      fail(`${id}: AI editorial sign-off does not match current script`);
    const entry = result.cards[id] ||= {};
    entry.editorialApproved = signed.editorialApproved === true;
    entry.editorialQcRecord = signed.editorialQcRecord;
    entry.rightsApproved = signed.rightsApproved === true;
    entry.rightsQcRecord = signed.rightsQcRecord;
    entry.artwork = { ...signed.artwork };
  }
  return result;
}

function guidedCues(cardId, cues, lineCount, reps, duration, issues) {
  if (!Array.isArray(cues) || cues.length !== lineCount * reps) {
    issues.push(`${cardId}: Guided cues must cover ${lineCount} lines × ${reps} repetitions`);
    return null;
  }
  const seen = new Set();
  let previousEnd = 0;
  for (const cue of cues) {
    const { s, voiceEnd, e, i, r } = cue;
    if (![s, voiceEnd, e, i, r].every(Number.isFinite) || !Number.isInteger(i) || !Number.isInteger(r)
      || i < 0 || i >= lineCount || r < 1 || r > reps || s < previousEnd - 0.02
      || !(s < voiceEnd && voiceEnd < e) || e > duration + 0.1) {
      issues.push(`${cardId}: invalid or overlapping Guided cue`); return null;
    }
    if (e - voiceEnd + 0.08 < Math.max(3, 2.5 * (voiceEnd - s))) {
      issues.push(`${cardId}: Guided cue has less than the required 2.5× speaking gap`); return null;
    }
    const key = `${i}:${r}`;
    if (seen.has(key)) { issues.push(`${cardId}: repeated Guided cue ${key}`); return null; }
    seen.add(key); previousEnd = e;
  }
  return cues.map(({ s, voiceEnd, e, i, r }) => ({ s, voiceEnd, e, i, r }));
}

function approvedSupport(draft, area, source) {
  if ((draft.targetLanguage ?? draft.language) !== 'ko') return {};
  const record = draft.translationDrafts?.[area];
  if (!record || JSON.stringify(record.source) !== JSON.stringify(source)) return {};
  const hash = sha(source.map(value => value.trim()).join('\n'));
  if (record.sourceHash !== hash) return {};
  const result = {};
  for (const language of supportLanguages) {
    const choice = record.support?.[language];
    // The protected player does not yet label AI-reviewed text as provisional;
    // export only native-reviewed arrays until that notice is implemented.
    if (choice?.status !== 'reviewed' || choice.displayEligible !== true) continue;
    if (Array.isArray(choice.lines) && choice.lines.length === source.length
      && choice.lines.every(value => typeof value === 'string' && value.trim()))
      result[language] = choice.lines;
  }
  return result;
}

function soundPayload(base, card, lines, cues, media) {
  const payload = { ...base,
    type: card.area === 'guided' ? 'guided' : 'plain',
    expressions: lines.map(line => line.target),
    meanings: lines.map(line => line.meaning)
  };
  if (lines.some(line => line.expressionId)) payload.expressionIds = lines.map(line => line.expressionId || null);
  if (card.area === 'miniTalks') payload.speakers = lines.map(line => line.speaker || '');
  if (card.area === 'miniTalks' && Array.isArray(media?.cues)) {
    const timings = media.cues.map(cue => ({
      s: Number(cue.s ?? cue.start),
      e: Number(cue.e ?? cue.end),
      voiceEnd: Number(cue.voiceEnd ?? cue.e ?? cue.end),
      i: Number(cue.i ?? cue.index)
    }));
    if (timings.every(cue => Number.isFinite(cue.s) && Number.isFinite(cue.e)
      && Number.isFinite(cue.voiceEnd) && Number.isInteger(cue.i)
      && cue.i >= 0 && cue.i < lines.length && cue.s < cue.voiceEnd && cue.voiceEnd <= cue.e))
      payload.training = { cues: timings };
  }
  if (card.area === 'guided') {
    const reps = Number(card.source.modelRepetitionsPerLine ?? card.source.repetitionsPerLine
      ?? card.source.modelCycles ?? (base.level === 'A0' ? 5 : /^A/.test(base.level) ? 10 : /^B/.test(base.level) ? 15 : 21));
    payload.training = { defaultReps: reps };
    if (cues) payload.training.cues = cues;
    const prompt = card.source.responsePrompt ?? card.source.independentPrompt;
    if (typeof prompt === 'string') payload.tinyPrompt = prompt;
    else if (prompt && typeof prompt === 'object') payload.tinyPrompt = prompt.meaning ?? prompt.situation;
  } else if (card.source.modelHiddenVariation ?? card.source.variationPrompt)
    payload.variationPrompt = { en: card.source.modelHiddenVariation ?? card.source.variationPrompt };
  if (media?.duration) payload.durationSeconds = media.duration;
  return payload;
}

function textPayload(base, card, translations, variants) {
  const lines = card.lines;
  if (card.area === 'readable') {
    const primary = base.language;
    const secondary = primary === 'ko' ? 'en' : 'ko';
    return { ...base, paragraphs: lines.map(line => ({ [primary]: line.target, [secondary]: line.meaning })),
      ...(lines.some(line => line.expressionId) ? { expressionIds: lines.map(line => line.expressionId || null) } : {}),
      ...(Object.keys(translations).length ? { translations } : {}) };
  }
  if (card.area === 'storyCamp')
    return { ...base, type: 'story', story: { lines: lines.map(line => line.target),
      translation: lines.map(line => line.meaning), ...(Object.keys(translations).length ? { translations } : {}) } };
  const steps = lines.map((_, index) => {
    const stem = `clip_${String(index + 1).padStart(3, '0')}`;
    return { step: index + 1, variants: audioRatios.map(ratio => ({
      ratio, variant: ratio === 2.5 ? stem : `${stem}_${ratio.toFixed(1).replace('.', '_')}`
    })).filter(variant => variants.includes(variant.variant)) };
  });
  return { ...base, type: 'vocal',
    ...(lines.some(line => line.expressionId) ? { expressionIds: lines.map(line => line.expressionId || null) } : {}),
    lesson: { lines: lines.map(line => ({ id: line.id, text: line.target })),
    meanings: lines.map(line => line.meaning), steps,
    ...(Object.keys(translations).length ? { translations } : {}) } };
}

function mediaSpecsFor(entry, area, parts, partIndex) {
  if (area === 'guided' && parts) return parts[partIndex]?.audio ?? {};
  return entry?.audio ?? {};
}

export function buildPack(files, mediaManifest = { schemaVersion: 1, cards: {} }, pipeline = null,
  readableSupportFiles = [], editorialOverlay = null, options = {}) {
  if (!files.length) fail('No PPP001 drafts selected');
  if (mediaManifest.schemaVersion !== 1 || typeof mediaManifest.cards !== 'object' || !mediaManifest.cards)
    fail('Media manifest must have schemaVersion 1 and cards object');
  const drafts = files.map(file => normalizeDraft(file));
  mediaManifest = mergeEditorialOverlay(mediaManifest, editorialOverlay, drafts);
  mediaManifest = mergeAudioPipeline(mediaManifest, pipeline);
  const readableSupport = loadReadableSupport(readableSupportFiles);
  const waiver = options.readableReviewWaiver || null;
  if (waiver && (waiver.schemaVersion !== 1 || waiver.episode !== '001'
    || waiver.status !== 'waived-by-user' || waiver.humanReviewPerformed !== false
    || waiver.authorizedBy !== 'user' || !waiver.evidence
    || !/^[a-f0-9]{64}$/.test(waiver.sourceSha256 || '')
    || Object.keys(waiver.cards || {}).length !== 14))
    fail('PPP001 Readable human-review waiver needs explicit user evidence and 14 source-bound cards');
  const sourceKeys = new Set();
  for (const draft of drafts) {
    const key = `${draft.language}:${draft.level}`;
    if (sourceKeys.has(key)) fail(`Duplicate source ${key}`);
    sourceKeys.add(key);
  }
  drafts.sort((a, b) => a.language.localeCompare(b.language)
    || levels.indexOf(a.level) - levels.indexOf(b.level));
  const issues = [];
  if (pipeline && pipeline.status !== 'assembled-not-uploaded'
    && pipeline.status !== 'release-approved')
    issues.push(`Audio assembly status ${pipeline.status || 'missing'} is not publishable`);
  const usedKeys = new Set();
  const rows = [];
  const idMap = [];
  const artworkCandidates = Object.fromEntries(levels.map(level =>
    [level, artworkCandidateFor(level, issues)]));
  for (const draft of drafts) for (const area of areas) {
    const card = draft.cards[area];
    if (!card) continue;
    const entry = mediaManifest.cards[card.id];
    const suppliedParts = area === 'guided' && Array.isArray(entry?.parts) ? entry.parts : null;
    const partSpecs = suppliedParts?.length ? suppliedParts : [null];
    if (suppliedParts) {
      const all = partSpecs.flatMap(part => part.sourceIndices ?? []);
      const expected = card.lines.map((_, index) => index);
      if (JSON.stringify(all) !== JSON.stringify(expected)) fail(`${card.id}: Guided parts must cover consecutive source indices exactly once`);
    }
    if (entry?.editorialApproved !== true || !entry.editorialQcRecord)
      issues.push(`${card.id}: approved script and editorial QC record required`);
    if (area === 'readable' && (entry?.rightsApproved !== true || !entry.rightsQcRecord))
      issues.push(`${card.id}: Readable source-rights sign-off required`);
    const readableReview = area === 'readable'
      ? validateReadableSupport(card, draft.language, readableSupport.cards.get(card.id),
        editorialOverlay?.cards?.[card.id]?.readableSupportApproval, waiver, issues)
      : null;
    const artwork = imageFor(card.id, entry, issues);
    for (const [partIndex, part] of partSpecs.entries()) {
      const selected = part ? part.sourceIndices.map(index => card.lines[index]) : card.lines;
      const id = suppliedParts?.length > 1 ? `${card.id}-part${partIndex + 1}` : card.id;
      const title = suppliedParts?.length > 1 ? `${card.title} · Part ${partIndex + 1}` : card.title;
      const mediaSpecs = mediaSpecsFor(entry, area, suppliedParts, partIndex);
      const variants = requiredVariants(area, selected.length);
      const mediaRows = [];
      let main = null;
      for (const variant of variants) {
        const value = verifiedAudio(id, variant, mediaSpecs[variant], usedKeys, issues);
        if (!value) continue;
        mediaRows.push(value.row);
        if (variant === 'main') main = value;
        const matched = /^clip_(\d{3})/.exec(variant);
        const spoken = area === 'vocalCamp' && matched
          ? selected.slice(0, Number(matched[1])) : selected;
        const expectedHash = sha(spoken.map(line => line.target.trim()).join('\n'));
        if (value.sourceHash !== expectedHash)
          issues.push(`${id}: ${variant} sourceHash does not match the frozen target lines`);
      }
      let cues = null;
      if (area === 'guided' && main) {
        const reps = Number(card.source.modelRepetitionsPerLine ?? card.source.repetitionsPerLine
          ?? card.source.modelCycles ?? (draft.level === 'A0' ? 5 : /^A/.test(draft.level) ? 10 : /^B/.test(draft.level) ? 15 : 21));
        cues = guidedCues(id, main.cues, selected.length, reps, main.duration, issues);
        if (/^[AB]/.test(draft.level) && main.duration > 660) issues.push(`${id}: Guided duration exceeds 11 minutes`);
        if (/^C/.test(draft.level) && main.duration > 900) issues.push(`${id}: C-level Guided duration exceeds preferred 15 minutes`);
      }
      const base = { id, language: draft.language, level: draft.level, ordinal: 1,
        area: areaNames[area], title: text(title, `${id}.title`),
        ...(artwork ? { artwork: artwork.path, artworkAlt: artwork.alt } : {}) };
      const translations = approvedSupport(draft.draft, area, selected.map(line => line.target));
      const payload = area === 'guided' || area === 'miniTalks'
        ? soundPayload(base, card, selected, cues, main)
        : textPayload(base, { ...card, lines: selected }, translations, mediaRows.map(row => row.variant));
      if ((area === 'guided' || area === 'miniTalks') && Object.keys(translations).length)
        payload.translations = translations;
      rows.push({
        card: { card_id: id, language: draft.language, area: areaNames[area], level: draft.level,
          ordinal: 1, published: false, catalog_visible: false },
        content: { card_id: id, payload },
        media: mediaRows,
        artwork: artwork ? { ...artwork, qcRecord: entry.artwork.qcRecord } : null,
        editorialProof: editorialOverlay ? {
          sourceDraftSha256: editorialOverlay.cards[card.id].sourceDraftSha256,
          targetSourceSha256: editorialOverlay.cards[card.id].targetSourceSha256,
          editorialQcRecord: entry.editorialQcRecord,
          rightsQcRecord: entry.rightsQcRecord,
          reviewType: editorialOverlay.reviewType
        } : null,
        artworkCandidate: artworkCandidates[draft.level],
        ...(readableReview ? { readableReview } : {}),
        requiredMediaVariants: variants
      });
      idMap.push({ language: draft.language, level: draft.level, area: areaNames[area],
        draftProposedId: card.proposedId, finalId: id });
    }
  }
  const ids = rows.map(row => row.card.card_id);
  if (new Set(ids).size !== ids.length) fail('Duplicate final card ID');
  for (const level of levels) {
    const pair = drafts.filter(draft => draft.level === level).map(draft => draft.language).sort();
    if (JSON.stringify(pair) !== '["en","ko"]')
      issues.push(`${level}: English/Korean draft pair incomplete`);
    const paths = [...new Set(rows.filter(row => row.card.level === level)
      .map(row => row.artworkCandidate?.path).filter(Boolean))];
    if (paths.length !== 1) issues.push(`${level}: artwork candidate is not shared by both language paths`);
  }
  for (const [id, registry] of readableSupport.cards) {
    if (!rows.some(row => row.card.card_id === id))
      fail(`Readable-support registry has no draft card: ${id}`);
    if (registry.pairedMirrorId && readableSupport.cards.has(registry.pairedMirrorId)) {
      const mirror = readableSupport.cards.get(registry.pairedMirrorId);
      if (JSON.stringify(registry.source) !== JSON.stringify(mirror.translations?.[registry.sourceLanguage])
        || JSON.stringify(registry.translations?.[mirror.sourceLanguage]) !== JSON.stringify(mirror.source))
        fail(`${id}: paired Readable language directions are not exact mirrors`);
    }
  }
  return { schemaVersion: 1, release: 'PPP001-20261114', episode: '001',
    mode: options.stageMedia ? 'private-media-staging-only' : 'private-release-staging',
    releaseReady: !options.stageMedia && issues.length === 0,
    sourceFiles: drafts.map(({ file, sha256, language, level }) => ({ file, sha256, language, level })),
    readableSupportFiles: readableSupport.sourceFiles,
    audioAssembly: pipeline ? { status: pipeline.status, qcSha256: pipeline.qcSha256 || null } : null,
    editorialOverlay: editorialOverlay ? {
      reviewType: editorialOverlay.reviewType,
      sourceSha256: editorialOverlay.sourceSha256,
      cardCount: Object.keys(editorialOverlay.cards).length
    } : null,
    readableHumanReview: waiver ? { status: waiver.status, humanReviewPerformed: false,
      sourceSha256: waiver.sourceSha256, evidence: waiver.evidence } : null,
    artworkCandidates, idMap, rows, issues: [...new Set(issues)].sort() };
}

function args(argv) {
  const options = { files: [], directories: [], readableSupportFiles: [], out: null,
    media: null, audioPipeline: null, editorialOverlay: null,
    readableReviewWaiver: null, stageMedia: false, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--draft') options.files.push(resolve(argv[++i] || fail('--draft needs a file')));
    else if (arg === '--draft-dir') options.directories.push(resolve(argv[++i] || fail('--draft-dir needs a directory')));
    else if (arg === '--media') options.media = resolve(argv[++i] || fail('--media needs a file'));
    else if (arg === '--audio-pipeline') options.audioPipeline = resolve(argv[++i] || fail('--audio-pipeline needs a file'));
    else if (arg === '--editorial-overlay') options.editorialOverlay = resolve(argv[++i] || fail('--editorial-overlay needs a file'));
    else if (arg === '--readable-review-waiver') options.readableReviewWaiver = resolve(argv[++i] || fail('--readable-review-waiver needs a file'));
    else if (arg === '--stage-media') options.stageMedia = true;
    else if (arg === '--readable-support') options.readableSupportFiles.push(resolve(argv[++i] || fail('--readable-support needs a file')));
    else if (arg === '--out') options.out = resolve(argv[++i] || fail('--out needs a file'));
    else if (arg === '--strict') options.strict = true;
    else fail(`Unknown argument: ${arg}`);
  }
  if (!options.out) fail('--out is required');
  if (within(options.out, repository)) fail('Private payload output must be outside the site repository');
  for (const directory of options.directories) {
    const matches = readdirSync(directory).filter(name => /^(en|ko)-(a0|a1|a2|b1|b2|c1|c2)-001(?:\.draft)?\.json$/.test(name));
    options.files.push(...matches.map(name => join(directory, name)));
  }
  options.files = [...new Set(options.files)].sort();
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = args(process.argv.slice(2));
    const manifest = options.media ? JSON.parse(readFileSync(options.media, 'utf8')) : undefined;
    const pipeline = options.audioPipeline ? JSON.parse(readFileSync(options.audioPipeline, 'utf8')) : null;
    const overlay = options.editorialOverlay ? JSON.parse(readFileSync(options.editorialOverlay, 'utf8')) : null;
    const waiver = options.readableReviewWaiver ? (() => {
      const bytes = readFileSync(options.readableReviewWaiver);
      return { ...JSON.parse(bytes.toString('utf8')), sourceSha256: sha(bytes) };
    })() : null;
    const pack = buildPack(options.files, manifest, pipeline, options.readableSupportFiles,
      overlay, { stageMedia: options.stageMedia, readableReviewWaiver: waiver });
    writeFileSync(options.out, `${JSON.stringify(pack, null, 2)}\n`, { flag: 'w' });
    console.log(`${pack.rows.length} private payloads written to ${options.out}; ${pack.issues.length} release gates pending.`);
    if (options.strict && !pack.releaseReady) process.exitCode = 2;
  } catch (error) {
    console.error(`PPP001 payload build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
