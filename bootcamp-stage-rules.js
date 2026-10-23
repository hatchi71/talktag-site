/* Boot Camp 001: group existing, approved script lines into authored meaning units. */
window.TalkTagBootCampStages = Object.freeze({
  boundaries(length, stages) {
    if (!Number.isInteger(length) || length < stages) throw new Error('Not enough meaning units');
    return Array.from({ length: stages }, (_, index) => Math.ceil((index + 1) * length / stages));
  },
  units(lines, stages) {
    const ends = this.boundaries(lines.length, stages);
    return ends.map((end, index) => lines.slice(index ? ends[index - 1] : 0, end).join(' '));
  }
});
