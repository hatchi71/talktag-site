#!/usr/bin/env python3
"""Build single-pass English Mini Talks 001 masters from verified single-turn takes.

Each source MP3 contains exactly one utterance. Its separate, word-timestamped
transcript must match the corresponding script line before any assembly starts.
There are no inferred or proportional dialogue cuts.
"""

import array
import json
import pathlib
import re
import subprocess
import sys
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/private/tmp/talktag-mini-talks-001-single-pass')
SOURCE = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path('/private/tmp/talktag-mini-talks-001')
CONTENT = json.loads((ROOT / 'content/mini-talks/english-001.authoring.json').read_text(encoding='utf-8'))
EVIDENCE = json.loads((SOURCE / 'source-transcripts.json').read_text(encoding='utf-8'))
RATE = 48000
PILOT = ROOT / 'audio/guided/miniskit-pilot-20261012/SC-GLR-008-A1-MiniSkit-Too-Hot-US-US-Roger-Lauren.mp3'
START_DING_SECONDS = 0.52245
ENDING_DING_START = 255.27302
ENDING_DING_END = 256.402449
OUT = WORK / 'assembled'
OUT.mkdir(parents=True, exist_ok=True)


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def decode(source, target):
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-ac', '1', '-ar', str(RATE), '-c:a', 'pcm_s16le', str(target)])


def read_pcm(path):
    with wave.open(str(path), 'rb') as src:
        if (src.getnchannels(), src.getframerate(), src.getsampwidth()) != (1, RATE, 2):
            raise ValueError(f'Unexpected PCM format: {path}')
        result = array.array('h')
        result.frombytes(src.readframes(src.getnframes()))
        return result


def write_pcm(path, pcm):
    with wave.open(str(path), 'wb') as dst:
        dst.setnchannels(1)
        dst.setsampwidth(2)
        dst.setframerate(RATE)
        dst.writeframes(pcm.tobytes())


def normalize(text):
    return re.sub(r'[^a-z0-9]+', ' ', text.casefold()).strip()


evidence = {(line['level'], line['id']): line for line in EVIDENCE['lines']}
pilot_wav = OUT / 'ding-source.wav'
decode(PILOT, pilot_wav)
pilot_pcm = read_pcm(pilot_wav)
# Keep the familiar TalkTag cue sound, but lower it so short lines remain central.
start_ding = array.array('h', (round(x * 0.65) for x in pilot_pcm[:round(START_DING_SECONDS * RATE)]))
end_ding = array.array('h', (round(x * 0.65) for x in pilot_pcm[round(ENDING_DING_START * RATE):round(ENDING_DING_END * RATE)]))


def silence(seconds):
    return array.array('h', [0]) * round(seconds * RATE)


def append(chunks, piece):
    chunks.append(piece)
    return len(piece) / RATE


manifest = []
for card in CONTENT['cards']:
    level = card['level']
    takes = []
    source_checks = []
    for line in card['lines']:
        source = SOURCE / 'raw' / level.lower() / f"{line['id']}.mp3"
        if not source.is_file() or source.stat().st_size < 1000:
            raise ValueError(f'Missing generated source: {source}')
        proof = evidence.get((level, line['id']))
        if not proof or normalize(proof['actual']) != normalize(line['en']) or not proof.get('words'):
            raise ValueError(f'{level} line {line["id"]}: transcript is missing or differs from script')
        wav = OUT / f'{level.lower()}-{line["id"]}-source.wav'
        decode(source, wav)
        pcm = read_pcm(wav)
        speech_end = proof['words'][-1]['end']
        if speech_end > len(pcm) / RATE + 0.12:
            raise ValueError(f'{level} line {line["id"]}: word timestamps exceed source length')
        takes.append(pcm)
        source_checks.append({'lineId': line['id'], 'speakerId': line['speaker'],
                              'transcript': proof['actual'], 'wordCount': len(proof['words']),
                              'firstWord': proof['words'][0], 'lastWord': proof['words'][-1],
                              'decodedSeconds': round(len(pcm) / RATE, 5)})

    pieces = []
    cursor = append(pieces, start_ding)
    cursor += append(pieces, silence(0.55))
    intro = []
    for index, take in enumerate(takes):
        start = cursor
        cursor += append(pieces, take)
        intro.append({'lineIndex': index, 'start': round(start, 5), 'end': round(cursor, 5)})
        cursor += append(pieces, silence(0.34 if index < len(takes) - 1 else 0.72))

    ending_start = cursor
    cursor += append(pieces, end_ding)

    master = array.array('h')
    for part in pieces:
        master.extend(part)
    wav_path = OUT / f'{card["id"]}-master.wav'
    mp3_path = OUT / f'{card["id"]}-single-mastered.mp3'
    write_pcm(wav_path, master)
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav_path), '-codec:a', 'libmp3lame',
         '-af', 'acompressor=threshold=0.08:ratio=2.5:attack=12:release=160,loudnorm=I=-16:TP=-1.5:LRA=11',
         '-b:a', '128k', '-metadata', 'artist=TalkTag', '-metadata', 'album=Sound Check · Mini Talks', str(mp3_path)])
    manifest.append({'id': card['id'], 'level': level, 'title': card['title'],
                     'lineCount': len(takes), 'sourceChecks': source_checks,
                     'intro': intro,
                     'startCueEnd': round(len(start_ding) / RATE, 5),
                     'endingCueStart': round(ending_start, 5),
                     'decodedDuration': round(cursor, 5),
                     'masterWav': str(wav_path), 'preQcMp3': str(mp3_path)})

(OUT / 'assembly-evidence.json').write_text(json.dumps({'schema': 'mini-talks-single-pass-evidence-v2', 'cards': manifest}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for item in manifest:
    print(f"{item['id']}: {item['decodedDuration']:.2f}s, {item['lineCount']} lines, one natural playthrough")
