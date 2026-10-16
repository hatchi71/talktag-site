/* One-time, reversible progress migration when Korean GLR cards are split. */
(() => {
  'use strict';
  if (window.TalkTagNative?.language !== 'ko') return;

  const VERSION = 'ko-guided-splits-20261016-v1';
  const doneKey = 'talktag-native-guided-migration:' + VERSION;
  const backupKey = doneKey + ':backup';
  const completionKey = 'talktag-content-completions:v1';
  const oldCatalog = window.TalkTagKoreanGuidedLegacyCatalog;
  const newCatalog = window.TalkTagNativeCatalogs?.ko;
  const manifest = window.TalkTagKoreanGuidedVariants;
  if (!Array.isArray(oldCatalog) || !Array.isArray(newCatalog) ||
      !Array.isArray(manifest?.cards)) return;

  function getJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (_) { return fallback; }
  }

  function mapTime(source, target, variant, time) {
    if (!(time > 0)) return 0;
    const first = Number(target.legacySentenceStart || 1);
    const last = Number(target.legacySentenceEnd || source.expressions.length);
    const sourceCues = source.training?.cues || [];
    const sourceCue = sourceCues.find(cue => cue.s <= time && time < cue.e);
    if (!sourceCue) {
      if (time < (sourceCues[0]?.s || 0) && first === 1) {
        return Math.min(time, variant.cues[0]?.s || 0);
      }
      if (time >= source.training?.endingCueStart && last === source.expressions.length) {
        return Math.min(variant.durationSeconds - 0.1,
          variant.endingCueStart + time - source.training.endingCueStart);
      }
      return 0;
    }
    if (sourceCue.i + 1 < first || sourceCue.i + 1 > last) return 0;
    const targetCue = variant.cues.find(cue => cue.i === sourceCue.i - first + 1 && cue.r === sourceCue.r);
    if (!targetCue) return 0;
    if (time < sourceCue.voiceEnd) {
      const fraction = (time - sourceCue.s) / Math.max(0.001, sourceCue.voiceEnd - sourceCue.s);
      return targetCue.s + fraction * (targetCue.voiceEnd - targetCue.s);
    }
    const fraction = (time - sourceCue.voiceEnd) / Math.max(0.001, sourceCue.e - sourceCue.voiceEnd);
    return targetCue.voiceEnd + fraction * (targetCue.e - targetCue.voiceEnd);
  }

  function run() {
    if (localStorage.getItem(doneKey) === 'done') return;
    const oldById = new Map(oldCatalog.map(card => [card.id, card]));
    const newCards = newCatalog.filter(card => card.type === 'guided' && card.legacyCardId);
    const groups = new Map();
    for (const card of newCards) {
      const group = groups.get(card.legacyCardId) || [];
      group.push(card);
      groups.set(card.legacyCardId, group);
    }
    const affected = [...groups].filter(([id, cards]) => {
      const old = oldById.get(id);
      return old && (cards.length > 1 || cards[0].id !== id ||
        cards[0].expressions.length !== old.expressions.length);
    });
    if (!affected.length) return;
    if (affected.some(([, cards]) => cards.some(card =>
      !manifest.cards.some(item => item.id === card.id && item.variants?.length === 4)))) return;

    const previousBackup = getJson(backupKey, null);
    const originalCompletions = previousBackup?.completions || getJson(completionKey, {});
    const completions = { ...originalCompletions };
    const originalStates = previousBackup?.states || {};
    for (const [id, cards] of affected) {
      for (const keyId of [id, ...cards.map(card => card.id)]) {
        if (!(keyId in originalStates)) originalStates[keyId] = getJson('talktag-audio:' + keyId, {});
      }
    }
    try {
      if (!previousBackup) localStorage.setItem(backupKey, JSON.stringify({ completions: originalCompletions, states: originalStates }));
      for (const [id, cards] of affected) {
        const source = oldById.get(id);
        const sourceState = originalStates[id] || {};
        const sourceEntry = originalCompletions['audio:' + id];
        const complete = Boolean(sourceEntry) || Boolean(sourceState.completed);
        const ratio = [2, 2.5, 3, 3.5].includes(Number(sourceState.pauseMultiplier)) ?
          Number(sourceState.pauseMultiplier) : 2.5;
        for (const target of cards) {
          const variantSet = manifest.cards.find(card => card.id === target.id);
          const variant = variantSet.variants.find(item => Number(item.ratio) === ratio);
          const revision = String(variantSet.revision || manifest.revision ||
            manifest.releaseBase || 'native-glr-20261016');
          const mapped = Math.max(0, Math.min(variant.durationSeconds - 0.1,
            mapTime(source, target, variant, Number(sourceState.position || 0))));
          const nextState = { ...sourceState, position: mapped, completed: complete,
            pauseMultiplier: ratio, positionMode: 'native-variant', positionRatio: ratio,
            positionRevision: revision, guidedSplitMigration: VERSION };
          localStorage.setItem('talktag-audio:' + target.id, JSON.stringify(nextState));
          if (complete) {
            completions['audio:' + target.id] = sourceEntry ||
              { completedAt: new Date().toISOString(), source: 'manual' };
          } else {
            delete completions['audio:' + target.id];
          }
        }
      }
      localStorage.setItem(completionKey, JSON.stringify(completions));
      localStorage.setItem(doneKey, 'done');
    } catch (error) {
      console.error('TalkTag Korean GLR progress migration:', error);
    }
  }

  window.TalkTagNativeGuidedMigration = { run, mapTime };
  try { run(); } catch (error) { console.error('TalkTag Korean GLR progress migration:', error); }
})();
