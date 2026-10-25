/* Boot Camp 001: each authored beat is one brief unit; never group old scripts. */
window.TalkTagBootCampStages = Object.freeze({
  vocalRepetitions(level) {
    if (/^A[12]$/.test(level)) return 10;
    if (/^B[12]$/.test(level)) return 12;
    if (/^C[12]$/.test(level)) return 15;
    throw new Error(`Unknown Vocal Camp level: ${level}`);
  },
  boundaries(length, stages) {
    if (!Number.isInteger(length) || length !== stages) throw new Error(`Expected exactly ${stages} authored meaning units`);
    return Array.from({ length: stages }, (_, index) => index + 1);
  },
  units(lines, stages) {
    this.boundaries(lines.length, stages);
    return lines.slice();
  }
});
