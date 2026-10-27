#!/usr/bin/env python3
"""Assemble English Mini Talks A1/A2 002–010 from transcript-verified turns.

Each source MP3 contains exactly one complete dialogue turn.  No dialogue is cut
or inferred from a longer recording.  This program never publishes a card.
"""

import argparse
import array
import hashlib
import json
import pathlib
import re
import subprocess
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_WORK = pathlib.Path('/private/tmp/talktag-mini-talks-a1-a2-002-010')
AUTHORING = (
    ROOT / 'content/mini-talks/english-a1-002-010.authoring.json',
    ROOT / 'content/mini-talks/english-a2-002-010.authoring.json',
)
PILOT = ROOT / 'audio/guided/miniskit-pilot-20261012/SC-GLR-008-A1-MiniSkit-Too-Hot-US-US-Roger-Lauren.mp3'
RATE = 48000
START_DING_SECONDS = 0.52245
ENDING_DING_START = 255.27302
ENDING_DING_END = 256.402449


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def decode(source, target):
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-ac', '1', '-ar',
         str(RATE), '-c:a', 'pcm_s16le', str(target)])


def read_pcm(path):
    with wave.open(str(path), 'rb') as source:
        if (source.getnchannels(), source.getframerate(), source.getsampwidth()) != (1, RATE, 2):
            raise ValueError(f'Unexpected PCM format: {path}')
        samples = array.array('h')
        samples.frombytes(source.readframes(source.getnframes()))
        return samples


def write_pcm(path, samples):
    with wave.open(str(path), 'wb') as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(samples.tobytes())


def normalize(text):
    return re.sub(r'[^a-z0-9]+', ' ', text.casefold()).strip()


def silence(seconds):
    return array.array('h', [0]) * round(seconds * RATE)


def append(pieces, samples):
    pieces.append(samples)
    return len(samples) / RATE


def load_cards(paths):
    cards = []
    for path in paths:
        document = json.loads(path.read_text(encoding='utf-8'))
        if document.get('language') != 'en' or not isinstance(document.get('cards'), list):
            raise ValueError(f'Not an English Mini Talks authoring document: {path}')
        if document.get('status') not in ('script-approved', 'qc-approved-for-publication'):
            raise ValueError(f'Scripts are still drafts; approve before voice assembly: {path}')
        practice = document.get('practice', {})
        if practice.get('playthroughs') != 1 or practice.get('forcedRepetitions') != 0:
            raise ValueError(f'Mini Talks requires one playthrough and no forced repetitions: {path}')
        cards.extend(document['cards'])
    expected = {f'mt-en-{level}-{unit:03d}' for level in ('a1', 'a2') for unit in range(2, 11)}
    actual = [card.get('id') for card in cards]
    if len(actual) != 18 or set(actual) != expected:
        raise ValueError('Authoring must contain exactly A1/A2 002–010, once each')
    for card in cards:
        level = card['level'].lower()
        if card['id'] != f"mt-en-{level}-{int(card['id'][-3:]):03d}":
            raise ValueError(f"Level/ID mismatch: {card['id']}")
        speakers = {speaker['id'] for speaker in card['speakers']}
        lines = card['lines']
        if len(speakers) < 2 or not 4 <= len(lines) <= 12:
            raise ValueError(f"Invalid dialogue cast or length: {card['id']}")
        if len({line['id'] for line in lines}) != len(lines):
            raise ValueError(f"Duplicate line ID: {card['id']}")
        for line in lines:
            if line['speaker'] not in speakers or not line['en'].strip() or not line['ko'].strip():
                raise ValueError(f"Missing speaker/text/meaning: {card['id']} {line['id']}")
    return sorted(cards, key=lambda card: (card['level'], card['id']))


def check_words(card_id, line, proof, seconds):
    if normalize(proof.get('actual', '')) != normalize(line['en']):
        raise ValueError(f"Transcript mismatch: {card_id} {line['id']}")
    words = proof.get('words')
    if not isinstance(words, list) or not words:
        raise ValueError(f"Missing word timestamps: {card_id} {line['id']}")
    if normalize(' '.join(word.get('text', '') for word in words)) != normalize(line['en']):
        raise ValueError(f"Word-level transcript mismatch: {card_id} {line['id']}")
    previous_end = -1.0
    for word in words:
        start, end = word.get('start'), word.get('end')
        if not isinstance(start, (int, float)) or not isinstance(end, (int, float)) or start < 0 or end <= start or start < previous_end - 0.02:
            raise ValueError(f"Invalid word timestamps: {card_id} {line['id']}")
        previous_end = end
    if words[-1]['end'] > seconds + 0.12 or words[0]['start'] > 1.0:
        raise ValueError(f"Speech anchor outside source take: {card_id} {line['id']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=pathlib.Path, default=DEFAULT_WORK)
    parser.add_argument('--source', type=pathlib.Path, help='Folder with raw/<card-id>/<line-id>.mp3 and source-transcripts.json')
    parser.add_argument('--authoring', type=pathlib.Path, nargs=2, default=AUTHORING)
    args = parser.parse_args()
    source = args.source or args.work
    authoring_hashes = {
        'a1': hashlib.sha256(args.authoring[0].read_bytes()).hexdigest(),
        'a2': hashlib.sha256(args.authoring[1].read_bytes()).hexdigest(),
    }
    cards = load_cards(args.authoring)
    if authoring_hashes != {
        'a1': hashlib.sha256(args.authoring[0].read_bytes()).hexdigest(),
        'a2': hashlib.sha256(args.authoring[1].read_bytes()).hexdigest(),
    }:
        raise ValueError('Authoring changed while loading the scripts')
    transcript = json.loads((source / 'source-transcripts.json').read_text(encoding='utf-8'))
    proofs = {(item['cardId'], item['lineId']): item for item in transcript['lines']}
    expected_keys = {(card['id'], line['id']) for card in cards for line in card['lines']}
    if set(proofs) != expected_keys or len(transcript['lines']) != len(expected_keys):
        raise ValueError('Source transcript inventory differs from authored dialogue')

    out = args.work / 'assembled'
    out.mkdir(parents=True, exist_ok=True)
    ding_wav = out / 'ding-source.wav'
    decode(PILOT, ding_wav)
    ding_pcm = read_pcm(ding_wav)
    start_ding = array.array('h', (round(x * 0.65) for x in ding_pcm[:round(START_DING_SECONDS * RATE)]))
    end_ding = array.array('h', (round(x * 0.65) for x in ding_pcm[round(ENDING_DING_START * RATE):round(ENDING_DING_END * RATE)]))
    if len(start_ding) < RATE * 0.4 or len(end_ding) < RATE * 0.9:
        raise ValueError('Ding source is incomplete')

    manifest = []
    for card in cards:
        card_id = card['id']
        takes = []
        checks = []
        cast_voices = {}
        voice_names = {}
        for line in card['lines']:
            raw = source / 'raw' / card_id / f"{line['id']}.mp3"
            if not raw.is_file() or raw.stat().st_size < 1000:
                raise ValueError(f'Missing source take: {raw}')
            raw_sha256 = hashlib.sha256(raw.read_bytes()).hexdigest()
            decoded = out / f"{card_id}-{line['id']}-source.wav"
            decode(raw, decoded)
            samples = read_pcm(decoded)
            seconds = len(samples) / RATE
            proof = proofs[(card_id, line['id'])]
            if proof.get('sourceSha256') != raw_sha256:
                raise ValueError(f"Transcript evidence does not bind to this MP3: {card_id} {line['id']}")
            if proof.get('speakerId') != line['speaker']:
                raise ValueError(f"Speaker mismatch: {card_id} {line['id']}")
            voice_id = proof.get('voiceId')
            voice_name = proof.get('voiceName')
            if not isinstance(voice_id, str) or not voice_id.strip() or \
               not isinstance(voice_name, str) or not voice_name.strip():
                raise ValueError(f"Actual ElevenLabs voice ID/name missing: {card_id} {line['id']}")
            earlier_voice = cast_voices.setdefault(line['speaker'], voice_id)
            earlier_name = voice_names.setdefault(line['speaker'], voice_name)
            if earlier_voice != voice_id or earlier_name != voice_name:
                raise ValueError(f"Character voice changes mid-card: {card_id} {line['speaker']}")
            check_words(card_id, line, proof, seconds)
            takes.append(samples)
            checks.append({'lineId': line['id'], 'speakerId': line['speaker'],
                           'voiceId': voice_id, 'voiceName': voice_name,
                           'sourceSha256': raw_sha256,
                           'transcript': proof['actual'], 'wordCount': len(proof['words']),
                           'firstWord': proof['words'][0], 'lastWord': proof['words'][-1],
                           'decodedSeconds': round(seconds, 5)})
        if len(cast_voices) < 2 or len(set(cast_voices.values())) != len(cast_voices):
            raise ValueError(f"Every speaking character needs a distinct actual voice: {card_id}")

        pieces = []
        cursor = append(pieces, start_ding)
        cursor += append(pieces, silence(0.55))
        cues = []
        for index, take in enumerate(takes):
            start = cursor
            cursor += append(pieces, take)
            cues.append({'lineIndex': index, 'start': round(start, 5), 'end': round(cursor, 5)})
            cursor += append(pieces, silence(0.34 if index < len(takes) - 1 else 0.72))
        ending_start = cursor
        cursor += append(pieces, end_ding)
        master = array.array('h')
        for piece in pieces:
            master.extend(piece)
        master_wav = out / f'{card_id}-master.wav'
        pre_qc = out / f'{card_id}-single-mastered.mp3'
        write_pcm(master_wav, master)
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(master_wav), '-codec:a', 'libmp3lame',
             '-af', 'acompressor=threshold=0.08:ratio=2.5:attack=12:release=160,loudnorm=I=-16:TP=-1.5:LRA=11',
             '-ar', str(RATE), '-ac', '1', '-b:a', '128k', '-metadata', 'artist=TalkTag',
             '-metadata', 'album=Sound Check · Mini Talks', str(pre_qc)])
        manifest.append({'id': card_id, 'level': card['level'], 'unit': int(card_id[-3:]),
                         'title': card['title'], 'lineCount': len(takes), 'sourceChecks': checks,
                         'voiceCasting': [{'speakerId': speaker_id, 'voiceId': voice_id,
                                           'voiceName': voice_names[speaker_id]}
                                          for speaker_id, voice_id in cast_voices.items()],
                         'intro': cues, 'startCueEnd': round(len(start_ding) / RATE, 5),
                         'endingCueStart': round(ending_start, 5), 'decodedDuration': round(cursor, 5),
                         'masterWav': str(master_wav), 'preQcMp3': str(pre_qc)})
        print(f'{card_id}: {cursor:.2f}s, {len(takes)} turns, one playthrough')
    if authoring_hashes != {
        'a1': hashlib.sha256(args.authoring[0].read_bytes()).hexdigest(),
        'a2': hashlib.sha256(args.authoring[1].read_bytes()).hexdigest(),
    }:
        raise ValueError('Authoring changed during audio assembly; discard these outputs')
    (out / 'assembly-evidence.json').write_text(json.dumps({
        'schema': 'mini-talks-single-pass-batch-evidence-v1',
        'authoringSha256': authoring_hashes,
        'cards': manifest
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
