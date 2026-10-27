#!/usr/bin/env python3
"""Fail-closed technical QC for the six single-pass English Mini Talks 001 cards."""

import array
import json
import math
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/private/tmp/talktag-mini-talks-001-single-pass')
EVIDENCE = json.loads((WORK / 'assembled/assembly-evidence.json').read_text())['cards']
SCRIPT = json.loads((ROOT / 'content/mini-talks/english-001.authoring.json').read_text())['cards']
REPORTS = pathlib.Path('/Users/eungjukim/Desktop/TalkTag Audio QC Studio/02_WORKING/reports')
APPROVED = WORK / 'qc-approved'
RATE = 48000


def pcm(path):
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'],
                            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    samples = array.array('h')
    samples.frombytes(result.stdout)
    return samples


def rms(samples, start, end):
    portion = samples[round(start * RATE):round(end * RATE)]
    return math.sqrt(sum(int(x) * int(x) for x in portion) / len(portion)) if portion else 0


for evidence, script in zip(EVIDENCE, SCRIPT):
    assert evidence['id'] == script['id']
    assert len(evidence['sourceChecks']) == len(script['lines'])
    assert len(evidence['intro']) == len(script['lines'])
    assert 'cycles' not in evidence and 'outro' not in evidence
    path = APPROVED / f"{evidence['id']}-single-mastered.mp3"
    report = json.loads((REPORTS / f"{evidence['id']}-single-mastered.qc.json").read_text())
    assert report['decision'] == 'original'
    assert report['input']['assessment']['grade'] == 'pass'
    metrics = report['input']['metrics']
    assert abs(metrics['inputLufs'] - (-16)) <= 1.0, (evidence['id'], metrics['inputLufs'])
    assert metrics['inputTruePeak'] <= -1.0, (evidence['id'], metrics['inputTruePeak'])
    assert abs(metrics['duration'] - evidence['decodedDuration']) < 0.10
    assert path.stat().st_size > 100_000
    samples = pcm(path)
    assert abs(len(samples) / RATE - evidence['decodedDuration']) < 0.10
    assert rms(samples, 0.05, evidence['startCueEnd'] - 0.05) > 30
    assert rms(samples, evidence['endingCueStart'] + 0.05, metrics['duration'] - 0.05) > 30
    source_voice = {}
    for check in evidence['sourceChecks']:
        source_voice[check['lineId']] = check['decodedSeconds']
        assert check['wordCount'] >= 2
        assert check['lastWord']['end'] <= check['decodedSeconds'] + 0.12
    last_end = evidence['startCueEnd']
    for index, cue in enumerate(evidence['intro']):
        line = script['lines'][index]
        assert cue['lineIndex'] == index
        assert cue['start'] >= last_end + 0.30
        assert abs((cue['end'] - cue['start']) - source_voice[line['id']]) < 0.01
        assert rms(samples, cue['start'] + 0.03, cue['end'] - 0.03) > 100
        last_end = cue['end']
    assert abs(evidence['endingCueStart'] - last_end - 0.72) < 0.02
    assert rms(samples, last_end + 0.12, evidence['endingCueStart'] - 0.12) < 35
    assert evidence['endingCueStart'] < metrics['duration']
    print(f"{evidence['id']}: PASS; one dialogue; {metrics['duration']:.2f}s; {metrics['inputLufs']:.2f} LUFS; {metrics['inputTruePeak']:.2f} dBTP")
