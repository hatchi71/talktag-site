#!/usr/bin/env python3
"""Fail-closed technical QC for English Mini Talks A1/A2 002–010."""

import argparse
import array
import hashlib
import json
import math
import pathlib
import statistics
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_WORK = pathlib.Path('/private/tmp/talktag-mini-talks-a1-a2-002-010')
DEFAULT_REPORTS = pathlib.Path('/Users/eungjukim/Desktop/TalkTag Audio QC Studio/02_WORKING/reports')
AUTHORING = (
    ROOT / 'content/mini-talks/english-a1-002-010.authoring.json',
    ROOT / 'content/mini-talks/english-a2-002-010.authoring.json',
)
RATE = 48000


def samples_from(path):
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1',
                             '-ar', str(RATE), '-f', 's16le', '-'], check=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    samples = array.array('h')
    samples.frombytes(result.stdout)
    return samples


def rms(samples, start, end):
    chunk = samples[round(start * RATE):round(end * RATE)]
    return math.sqrt(sum(int(sample) ** 2 for sample in chunk) / len(chunk)) if chunk else 0


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fail(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=pathlib.Path, default=DEFAULT_WORK)
    parser.add_argument('--reports', type=pathlib.Path, default=DEFAULT_REPORTS)
    parser.add_argument('--authoring', type=pathlib.Path, nargs=2, default=AUTHORING)
    args = parser.parse_args()
    evidence = json.loads((args.work / 'assembled/assembly-evidence.json').read_text(encoding='utf-8'))
    fail(evidence.get('schema') == 'mini-talks-single-pass-batch-evidence-v1', 'Unexpected assembly evidence schema')
    authoring_hashes = evidence.get('authoringSha256')
    fail(isinstance(authoring_hashes, dict) and set(authoring_hashes) == {'a1', 'a2'},
         'Assembly evidence must bind both exact authoring files')
    for level, authoring in zip(('a1', 'a2'), args.authoring):
        fail(authoring_hashes[level] == sha256(authoring),
             f'{level.upper()} authoring changed after audio assembly; rebuild and re-QC')
    scripts = {}
    for authoring in args.authoring:
        for card in json.loads(authoring.read_text(encoding='utf-8'))['cards']:
            fail(card['id'] not in scripts, f"Duplicate authored card {card['id']}")
            scripts[card['id']] = card
    expected = {f'mt-en-{level}-{unit:03d}' for level in ('a1', 'a2') for unit in range(2, 11)}
    fail(set(scripts) == expected, 'Authoring is not the complete 18-card A1/A2 batch')
    fail(len(evidence['cards']) == 18 and {card['id'] for card in evidence['cards']} == expected,
         'Assembly evidence is not the complete 18-card batch')
    approved = args.work / 'qc-approved'
    results = []
    for card in evidence['cards']:
        card_id = card['id']
        script = scripts[card_id]
        report_path = args.reports / f'{card_id}-single-mastered.qc.json'
        report = json.loads(report_path.read_text(encoding='utf-8'))
        fail(report.get('status') == 'approved', f'{card_id}: QC report not approved')
        decision = report.get('decision')
        fail(decision in ('original', 'processed'), f'{card_id}: QC decision must be original or processed')
        side = report['input'] if decision == 'original' else report['output']
        metrics = side['metrics']
        fail(side['assessment']['grade'] == 'pass', f'{card_id}: Audio QC Studio grade failed')
        final = approved / f'{card_id}-single-mastered.mp3'
        fail(final.is_file() and final.stat().st_size > 100_000, f'{card_id}: approved MP3 missing')
        digest = sha256(final)
        fail(digest == side['sha256'], f'{card_id}: approved MP3 differs from QC decision')
        fail(abs(metrics['inputLufs'] + 16) <= 1.0 and metrics['inputTruePeak'] <= -1.0,
             f'{card_id}: finished encoded loudness/peak failed')
        fail(abs(metrics['duration'] - card['decodedDuration']) < 0.12,
             f'{card_id}: assembled/QC duration mismatch')
        fail(card['lineCount'] == len(script['lines']) == len(card['sourceChecks']) == len(card['intro']),
             f'{card_id}: dialogue line count mismatch')
        cast = {item['speakerId']: (item['voiceId'], item['voiceName']) for item in card.get('voiceCasting', [])}
        fail(len(cast) == len(script['speakers']) and len({voice[0] for voice in cast.values()}) == len(cast),
             f'{card_id}: actual speaker-to-voice casting is missing or repeated')
        fail('cycles' not in card and 'outro' not in card,
             f'{card_id}: forced replay is forbidden')
        pcm = samples_from(final)
        fail(abs(len(pcm) / RATE - metrics['duration']) < 0.10,
             f'{card_id}: decoded duration differs from QC report')
        start_cue_rms = rms(pcm, 0.05, card['startCueEnd'] - 0.05)
        ending_cue_rms = rms(pcm, card['endingCueStart'] + 0.05, metrics['duration'] - 0.05)
        fail(start_cue_rms > 30,
             f'{card_id}: start cue missing')
        fail(ending_cue_rms > 30,
             f'{card_id}: ending cue missing')
        last_end = card['startCueEnd']
        voice_rms = []
        for index, (line, check, cue) in enumerate(zip(script['lines'], card['sourceChecks'], card['intro'])):
            fail(check['lineId'] == line['id'] and check['speakerId'] == line['speaker']
                 and cue['lineIndex'] == index, f'{card_id}: line/speaker/cue order mismatch')
            fail((check.get('voiceId'), check.get('voiceName')) == cast.get(line['speaker']),
                 f'{card_id} {line["id"]}: source take voice differs from assigned character')
            fail(len(check.get('sourceSha256', '')) == 64,
                 f'{card_id} {line["id"]}: source take checksum missing')
            fail(check['wordCount'] >= 1 and check['lastWord']['end'] <= check['decodedSeconds'] + 0.12,
                 f'{card_id} {line["id"]}: word-level source proof failed')
            fail(cue['start'] >= last_end + 0.30, f'{card_id} {line["id"]}: turn gap too short')
            fail(abs((cue['end'] - cue['start']) - check['decodedSeconds']) < 0.02,
                 f'{card_id} {line["id"]}: turn duration mismatch')
            turn_rms = rms(pcm, cue['start'] + 0.03, cue['end'] - 0.03)
            fail(turn_rms > 80,
                 f'{card_id} {line["id"]}: speech region unexpectedly quiet')
            voice_rms.append(turn_rms)
            if index:
                fail(rms(pcm, last_end + 0.08, cue['start'] - 0.08) < 50,
                     f'{card_id} {line["id"]}: no clean silence at join')
            last_end = cue['end']
        fail(abs(card['endingCueStart'] - last_end - 0.72) < 0.02,
             f'{card_id}: ending gap mismatch')
        fail(rms(pcm, last_end + 0.12, card['endingCueStart'] - 0.12) < 50,
             f'{card_id}: ending gap contains unexpected audio')
        cue_to_speech_db = 20 * math.log10(max(start_cue_rms, ending_cue_rms) / statistics.median(voice_rms))
        fail(cue_to_speech_db <= 10.0,
             f'{card_id}: start/end cue dominates dialogue by {cue_to_speech_db:.1f} dB')
        warnings = ([f'Cue is {cue_to_speech_db:.1f} dB RMS above median dialogue; check playback balance']
                    if cue_to_speech_db > 6.0 else [])
        results.append({'id': card_id, 'status': 'technical-pass', 'sha256': digest,
                        'bytes': final.stat().st_size, 'durationSeconds': metrics['duration'],
                        'integratedLufs': metrics['inputLufs'], 'truePeakDbtp': metrics['inputTruePeak'],
                        'audioQcStudioDecision': decision, 'lineCount': len(script['lines']),
                        'cueToMedianSpeechRmsDb': round(cue_to_speech_db, 2), 'warnings': warnings})
        print(f'{card_id}: PASS; {metrics["duration"]:.2f}s; {metrics["inputLufs"]:.2f} LUFS; {metrics["inputTruePeak"]:.2f} dBTP')
    summary = {'schema': 'mini-talks-batch-qc-v1', 'status': 'technical-pass',
               'scope': 'English A1/A2 002–010', 'humanListening': False, 'cards': results}
    (args.work / 'qc-report.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
