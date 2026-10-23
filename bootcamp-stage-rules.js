/* Boot Camp 001: each authored beat is one brief unit; never group old scripts. */
window.TalkTagBootCampStages = Object.freeze({
  boundaries(length, stages) {
    if (!Number.isInteger(length) || length !== stages) throw new Error(`Expected exactly ${stages} authored meaning units`);
    return Array.from({ length: stages }, (_, index) => index + 1);
  },
  units(lines, stages) {
    this.boundaries(lines.length, stages);
    return lines.slice();
  }
});
