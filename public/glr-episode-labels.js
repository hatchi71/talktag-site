(function () {
  "use strict";

  window.TalkTagGLREpisodeLabels = function (catalog, episodeNumber) {
    const episodes = new Map();
    for (const card of catalog) {
      const episode = episodeNumber(card);
      const key = `${card.level}:${episode}`;
      if (!episodes.has(key)) {
        episodes.set(key, { label: String(episode).padStart(3, "0"), cards: [] });
      }
      episodes.get(key).cards.push(card);
    }

    const labels = new Map();
    for (const { label, cards } of episodes.values()) {
      if (cards.length === 1) {
        labels.set(cards[0].id, label);
        continue;
      }
      const parts = cards.map(card => Number(card.partIndex));
      const hasPartNumbers = parts.every(part => Number.isInteger(part) && part > 0)
        && new Set(parts).size === cards.length;
      cards.forEach((card, index) => {
        const part = hasPartNumbers ? parts[index] : index + 1;
        labels.set(card.id, `${label}–${String(part).padStart(2, "0")}`);
      });
    }
    return labels;
  };
})();
