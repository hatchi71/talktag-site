#!/usr/bin/env python3
"""Assemble and validate Korean Mini Talks, one verified dialogue card at a time.

This script never generates speech or publishes media. Supply one MP3 per turn at
  WORK/raw/CARD_ID/01.mp3 ... NN.mp3
and WORK/source-transcripts.json with the same per-line shape as the English
Mini Talks source-transcripts file: cardId, lineId, speakerId, voiceId,
voiceName, sourceSha256, actual, and Scribe words [{text,start,end}]. Its
schema is mini-talks-batch-source-transcripts-v1 and its status must be
exact-source-verified. The Scribe transcript must match the approved Korean
script; there are no proportional cuts or inferred dialogue boundaries.

Usage:
  python3 scripts/build-korean-mini-talks-001.py assemble --card-id mt-ko-a2-001 --work /private/tmp/talktag-mini-talks-ko-a2-001
  python3 scripts/build-korean-mini-talks-001.py validate --card-id mt-ko-a2-001 --work /private/tmp/talktag-mini-talks-ko-a2-001

For validate, first process/approve the assembled MP3 in TalkTag Audio QC
Studio, then place its approved output at WORK/qc-approved/CARD_ID-single-mastered.mp3.
Use --authoring and --voice-roster for an exact script or extended verified voice
roster. Use --qc-report and --approved to supply other exact paths. A technical
pass does not assert a human listened to the card.
"""

import argparse
import array
import hashlib
import json
import math
import pathlib
import re
import statistics
import subprocess
import unicodedata
import wave


ROOT = pathlib.Path(__file__).resolve().parents[1]
AUTHORING = ROOT / 'content/mini-talks/korean-a1-001.authoring.json'
ROSTER = ROOT / 'content/mini-talks/korean-001-voice-roster.json'
PILOT = ROOT / 'audio/guided/miniskit-pilot-20261012/SC-GLR-008-A1-MiniSkit-Too-Hot-US-US-Roger-Lauren.mp3'
DEFAULT_WORK = pathlib.Path('/private/tmp/talktag-mini-talks-ko-a1-001')
DEFAULT_REPORTS = pathlib.Path('/Users/eungjukim/Desktop/TalkTag Audio QC Studio/02_WORKING/reports')
CARD_ID = 'mt-ko-a1-001'
LEVEL = 'A1'
SERIES = '001'
RATE = 48000
START_DING_SECONDS = 0.52245
ENDING_DING_START = 255.27302
ENDING_DING_END = 256.402449
LEGACY_VOICE_BY_SPEAKER = {'minjun': 'Min-joon', 'soyeon': 'Leejin'}


def assembly_schema():
    return ('mini-talks-korean-001-assembly-evidence-v1' if CARD_ID == 'mt-ko-a1-001'
            else 'mini-talks-korean-assembly-evidence-v2')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalized_korean(text):
    """Ignore spacing/punctuation, but never discard Hangul or other letters."""
    return ''.join(character for character in unicodedata.normalize('NFC', text)
                   if character.isalnum()).casefold()


def run(command):
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL,
                   stderr=subprocess.PIPE)


def decode_wav(source, target):
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-ac', '1',
         '-ar', str(RATE), '-c:a', 'pcm_s16le', str(target)])


def read_pcm(path):
    with wave.open(str(path), 'rb') as source:
        require((source.getnchannels(), source.getframerate(), source.getsampwidth())
                == (1, RATE, 2), f'Unexpected PCM format: {path}')
        samples = array.array('h')
        samples.frombytes(source.readframes(source.getnframes()))
        return samples


def write_pcm(path, samples):
    with wave.open(str(path), 'wb') as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(samples.tobytes())


def silence(seconds):
    return array.array('h', [0]) * round(seconds * RATE)


def load_authoring():
    document = json.loads(AUTHORING.read_text(encoding='utf-8'))
    card = document.get('card', {})
    practice = document.get('practice', {})
    require(document.get('language') == 'ko' and document.get('level') == LEVEL
            and document.get('series') == SERIES and card.get('id') == CARD_ID,
            f'Authoring file does not match {CARD_ID}')
    require(document.get('status') in ('local-review-draft', 'authoring-draft',
                                       'script-approved', 'qc-approved-for-publication'),
            'Unexpected authoring status')
    require(practice.get('playthroughs') == 1 and practice.get('forcedRepeats') == 0,
            'Mini Talks must have one playthrough and no forced repeats')
    lines = card.get('lines', [])
    require(len(lines) >= 4 and [line.get('id') for line in lines]
            == [f'{index:02d}' for index in range(1, len(lines) + 1)],
            'Expected four or more consecutively numbered dialogue turns')
    role_list = card.get('speakerRoles', [])
    roles = {role['id']: role for role in role_list}
    require(len(roles) == len(role_list) and len(roles) >= 2,
            'Expected two or more uniquely identified character roles')
    counts = {speaker: 0 for speaker in roles}
    for line in lines:
        speaker = line.get('speaker')
        require(speaker in roles and normalized_korean(line.get('ko', ''))
                and line.get('en', '').strip(),
                f'Missing role, Korean speech or English meaning: {line.get("id")}')
        require(any('가' <= character <= '힣' for character in line['ko']),
                f'Korean script contains no Hangul: {line["id"]}')
        counts[speaker] += 1
    require(all(count > 0 for count in counts.values()),
            f'Every character must have at least one unique spoken line: {counts}')
    return document, card, roles


def approved_voices(roles):
    roster = json.loads(ROSTER.read_text(encoding='utf-8'))['voices']
    voices = {}
    for speaker, role in roles.items():
        roster_name = (role.get('approvedVoice') or role.get('voiceName')
                       or (LEGACY_VOICE_BY_SPEAKER.get(speaker)
                           if CARD_ID == 'mt-ko-a1-001' else None))
        require(isinstance(roster_name, str) and roster_name.strip(),
                f'No approved voice chosen for character {speaker}')
        voice = roster.get(roster_name, {})
        require(voice.get('id') and voice.get('gender') == role.get('gender')
                and voice.get('accent') == 'Standard Korean',
                f'Approved Korean voice metadata mismatch: {speaker}')
        require(not role.get('voiceId') or role['voiceId'] == voice['id'],
                f'Authoring voice ID does not match approved roster: {speaker}')
        voices[speaker] = {'voiceId': voice['id'], 'voiceName': roster_name,
                           'gender': voice['gender'], 'accent': voice['accent']}
    require(len({voice['voiceId'] for voice in voices.values()}) == len(roles),
            'Every distinct character requires a distinct approved voice ID')
    return voices


def load_transcripts(work, card, voices):
    source_path = work / 'source-transcripts.json'
    document = json.loads(source_path.read_text(encoding='utf-8'))
    require(document.get('schema') == 'mini-talks-batch-source-transcripts-v1'
            and document.get('status') == 'exact-source-verified',
            'Source transcript evidence must be exact-source-verified')
    entries = document.get('lines', [])
    keys = [(entry.get('cardId'), entry.get('lineId')) for entry in entries]
    require(len(entries) == len(card['lines']) and len(set(keys)) == len(keys)
            and set(keys) == {(CARD_ID, line['id']) for line in card['lines']},
            'Source evidence must cover every authored turn exactly once')
    proofs = {entry['lineId']: entry for entry in entries}
    for line in card['lines']:
        proof = proofs[line['id']]
        speaker = line['speaker']
        require(proof.get('speakerId') == speaker
                and proof.get('voiceId') == voices[speaker]['voiceId']
                and proof.get('voiceName') == voices[speaker]['voiceName'],
                f'Actual voice/speaker mismatch: {line["id"]}')
        expected = normalized_korean(line['ko'])
        actual = normalized_korean(proof.get('actual', ''))
        words = proof.get('words')
        require(actual == expected and expected,
                f'Scribe transcript differs from Korean script: {line["id"]}')
        require(isinstance(words, list) and words
                and normalized_korean(''.join(word.get('text', '') for word in words)) == expected,
                f'Scribe word sequence differs from Korean script: {line["id"]}')
        prior_end = -1.0
        for word in words:
            start, end = word.get('start'), word.get('end')
            require(isinstance(start, (int, float)) and not isinstance(start, bool)
                    and isinstance(end, (int, float)) and not isinstance(end, bool)
                    and math.isfinite(start) and math.isfinite(end)
                    and start >= 0 and end > start and start >= prior_end - 0.02,
                    f'Invalid word timestamps: {line["id"]}')
            prior_end = end
        raw = work / 'raw' / CARD_ID / f'{line["id"]}.mp3'
        require(raw.is_file() and raw.stat().st_size > 1000,
                f'Missing or empty raw voice take: {raw}')
        require(proof.get('sourceSha256') == sha256(raw),
                f'Scribe evidence is not bound to this MP3: {line["id"]}')
    return proofs, sha256(source_path)


def assemble(work):
    document, card, roles = load_authoring()
    voices = approved_voices(roles)
    proofs, transcript_hash = load_transcripts(work, card, voices)
    authoring_hash = sha256(AUTHORING)
    output = work / 'assembled'
    output.mkdir(parents=True, exist_ok=True)
    ding_wav = output / 'ding-source.wav'
    decode_wav(PILOT, ding_wav)
    ding = read_pcm(ding_wav)
    start_ding = array.array('h', (round(value * 0.65)
                                   for value in ding[:round(START_DING_SECONDS * RATE)]))
    end_ding = array.array('h', (round(value * 0.65)
                                 for value in ding[round(ENDING_DING_START * RATE):
                                                   round(ENDING_DING_END * RATE)]))
    require(len(start_ding) >= RATE * 0.4 and len(end_ding) >= RATE * 0.9,
            'Start or end cue source is incomplete')

    pieces = [start_ding, silence(0.55)]
    cursor = sum(len(part) for part in pieces) / RATE
    cues = []
    checks = []
    source_seconds = {speaker: 0.0 for speaker in voices}
    for index, line in enumerate(card['lines']):
        proof = proofs[line['id']]
        raw = work / 'raw' / CARD_ID / f'{line["id"]}.mp3'
        decoded = output / f'{CARD_ID}-{line["id"]}-source.wav'
        decode_wav(raw, decoded)
        take = read_pcm(decoded)
        seconds = len(take) / RATE
        require(0.45 <= seconds <= 30.0,
                f'Implausible source-turn duration: {line["id"]} ({seconds:.2f}s)')
        require(proof['words'][0]['start'] <= 1.0
                and proof['words'][-1]['end'] <= seconds + 0.12
                and proof['words'][-1]['end'] >= seconds - 0.65,
                f'Speech anchors outside source take: {line["id"]}')
        start = cursor
        pieces.append(take)
        cursor += seconds
        cues.append({'lineIndex': index, 'start': round(start, 5),
                     'end': round(cursor, 5)})
        source_seconds[line['speaker']] += seconds
        checks.append({'lineId': line['id'], 'speakerId': line['speaker'],
                       'voiceId': proof['voiceId'], 'voiceName': proof['voiceName'],
                       'sourceSha256': sha256(raw), 'transcript': proof['actual'],
                       'wordCount': len(proof['words']),
                       'firstWord': proof['words'][0], 'lastWord': proof['words'][-1],
                       'decodedSeconds': round(seconds, 5)})
        gap = 0.34 if index < len(card['lines']) - 1 else 0.72
        pieces.append(silence(gap))
        cursor += len(pieces[-1]) / RATE
    ending_start = cursor
    pieces.append(end_ding)
    cursor += len(end_ding) / RATE
    master = array.array('h')
    for piece in pieces:
        master.extend(piece)
    wav = output / f'{CARD_ID}-master.wav'
    mp3 = output / f'{CARD_ID}-single-mastered.mp3'
    write_pcm(wav, master)
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-codec:a', 'libmp3lame',
         '-af', 'acompressor=threshold=0.08:ratio=2.5:attack=12:release=160,'
                'loudnorm=I=-16:TP=-1.5:LRA=11',
         '-ar', str(RATE), '-ac', '1', '-b:a', '128k',
         '-metadata', 'artist=TalkTag',
         '-metadata', 'album=Sound Check · Mini Talks', str(mp3)])
    require(sha256(AUTHORING) == authoring_hash
            and sha256(work / 'source-transcripts.json') == transcript_hash,
            'Authoring or transcript evidence changed during assembly; discard output')
    evidence = {
        'schema': assembly_schema(),
        'status': 'local-preview-only' if document['status'] == 'local-review-draft'
                  else 'assembled-awaiting-qc',
        'authoringSha256': authoring_hash,
        'sourceTranscriptsSha256': transcript_hash,
        'card': {
            'id': CARD_ID, 'level': LEVEL, 'lineCount': len(checks),
            'voiceCasting': [{'speakerId': speaker, **voice}
                             for speaker, voice in voices.items()],
            'sourceChecks': checks,
            'intro': cues,
            'startCueEnd': round(len(start_ding) / RATE, 5),
            'endingCueStart': round(ending_start, 5),
            'decodedDuration': round(cursor, 5),
            'uniqueLinesBySpeaker': {
                speaker: sum(line['speaker'] == speaker for line in card['lines'])
                for speaker in voices},
            'sourceSpeechSecondsBySpeaker': {speaker: round(seconds, 5)
                                             for speaker, seconds in source_seconds.items()},
            'preQcMp3': str(mp3), 'masterWav': str(wav),
        },
        'humanListening': False,
    }
    (output / 'assembly-evidence.json').write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{CARD_ID}: assembled {len(checks)} distinct turns, {cursor:.2f}s, one playthrough')
    print('Local preview only; process/approve the MP3 in TalkTag Audio QC Studio before release.')


def decoded_samples(path):
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1',
                             '-ar', str(RATE), '-f', 's16le', '-'], check=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    samples = array.array('h')
    samples.frombytes(result.stdout)
    return samples


def rms(samples, start, end):
    chunk = samples[round(start * RATE):round(end * RATE)]
    return math.sqrt(sum(int(value) ** 2 for value in chunk) / len(chunk)) if chunk else 0


def validate(work, report_path, approved_path):
    document, card, roles = load_authoring()
    voices = approved_voices(roles)
    proofs, transcript_hash = load_transcripts(work, card, voices)
    evidence = json.loads((work / 'assembled/assembly-evidence.json').read_text(encoding='utf-8'))
    require(evidence.get('schema') == assembly_schema()
            and evidence.get('authoringSha256') == sha256(AUTHORING)
            and evidence.get('sourceTranscriptsSha256') == transcript_hash,
            'Assembly evidence no longer matches script and source takes')
    item = evidence.get('card', {})
    line_count = len(card['lines'])
    require(item.get('id') == CARD_ID and item.get('level') == LEVEL
            and item.get('lineCount') == line_count
            and len(item.get('intro', [])) == line_count
            and len(item.get('sourceChecks', [])) == line_count
            and 'cycles' not in item and 'outro' not in item,
            'Assembly evidence is not the authored single-pass Mini Talk')
    report = json.loads(report_path.read_text(encoding='utf-8'))
    decision = report.get('decision')
    require(report.get('status') == 'approved' and decision in ('original', 'processed'),
            'TalkTag Audio QC Studio has not approved this exact card')
    side = report['input'] if decision == 'original' else report['output']
    metrics = side['metrics']
    require(side['assessment']['grade'] == 'pass', 'Audio QC Studio assessment failed')
    require(approved_path.is_file() and approved_path.stat().st_size > 50000
            and sha256(approved_path) == side['sha256'],
            'Approved MP3 does not match the QC Studio decision')
    require(abs(metrics['inputLufs'] + 16) <= 1.0 and metrics['inputTruePeak'] <= -1.0,
            'Finished encoded MP3 is outside −16 LUFS/≤−1 dBTP release tolerance')
    require(abs(metrics['duration'] - item['decodedDuration']) < 0.12,
            'Audio QC Studio duration differs from assembly evidence')
    samples = decoded_samples(approved_path)
    require(abs(len(samples) / RATE - metrics['duration']) < 0.10,
            'Decoded approved MP3 duration differs from QC Studio report')
    start_rms = rms(samples, 0.05, item['startCueEnd'] - 0.05)
    end_rms = rms(samples, item['endingCueStart'] + 0.05, metrics['duration'] - 0.05)
    require(start_rms > 30 and end_rms > 30, 'Start or end ding is missing')
    last_end = item['startCueEnd']
    speech_rms = []
    seconds_by_speaker = {speaker: 0.0 for speaker in voices}
    for index, (line, check, cue) in enumerate(zip(card['lines'], item['sourceChecks'], item['intro'])):
        proof = proofs[line['id']]
        require(check['lineId'] == line['id'] and check['speakerId'] == line['speaker']
                and check['voiceId'] == voices[line['speaker']]['voiceId']
                and check['sourceSha256'] == proof['sourceSha256']
                and normalized_korean(check['transcript']) == normalized_korean(line['ko'])
                and cue['lineIndex'] == index,
                f'Script, voice or cue order differs at turn {line["id"]}')
        require(check['wordCount'] == len(proof['words'])
                and check['firstWord'] == proof['words'][0]
                and check['lastWord'] == proof['words'][-1],
                f'Word-level source evidence changed at turn {line["id"]}')
        require(cue['start'] >= last_end + 0.30
                and abs(cue['end'] - cue['start'] - check['decodedSeconds']) < 0.02,
                f'Unverified turn boundary at {line["id"]}')
        if index:
            require(rms(samples, last_end + 0.08, cue['start'] - 0.08) < 50,
                    f'Unexpected sound in inter-turn gap before {line["id"]}')
        voice_rms = rms(samples, cue['start'] + 0.03, cue['end'] - 0.03)
        require(voice_rms > 80, f'Speech unexpectedly quiet at turn {line["id"]}')
        speech_rms.append(voice_rms)
        seconds_by_speaker[line['speaker']] += check['decodedSeconds']
        last_end = cue['end']
    require(abs(item['endingCueStart'] - last_end - 0.72) < 0.02
            and rms(samples, last_end + 0.12, item['endingCueStart'] - 0.12) < 50,
            'Unverified gap before ending ding')
    cue_to_speech_db = 20 * math.log10(max(start_rms, end_rms) / statistics.median(speech_rms))
    require(cue_to_speech_db <= 10.0,
            f'Dings dominate dialogue by {cue_to_speech_db:.1f} dB')
    counts_by_gender = {gender: sum(voices[line['speaker']]['gender'] == gender
                                    for line in card['lines'])
                        for gender in ('male', 'female')}
    seconds_by_gender = {gender: round(sum(seconds
                                           for speaker, seconds in seconds_by_speaker.items()
                                           if voices[speaker]['gender'] == gender), 5)
                         for gender in ('male', 'female')}
    result = {
        'schema': ('mini-talks-korean-001-qc-v1' if CARD_ID == 'mt-ko-a1-001'
                   else 'mini-talks-korean-qc-v2'), 'status': 'technical-pass',
        'cardId': CARD_ID, 'authoringStatus': document['status'],
        'humanListening': False, 'audioQcStudioDecision': decision,
        'sha256': sha256(approved_path), 'bytes': approved_path.stat().st_size,
        'durationSeconds': metrics['duration'],
        'integratedLufs': metrics['inputLufs'], 'truePeakDbtp': metrics['inputTruePeak'],
        'cueToMedianSpeechRmsDb': round(cue_to_speech_db, 2),
        'uniqueLinesByGender': counts_by_gender,
        'sourceSpeechSecondsByGender': seconds_by_gender,
        'publication': 'not-published',
    }
    (work / 'qc-report.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{CARD_ID}: TECHNICAL PASS; {metrics["duration"]:.2f}s; '
          f'{metrics["inputLufs"]:.2f} LUFS; {metrics["inputTruePeak"]:.2f} dBTP')
    print('Publication is not checked by this local QC validator. Human listening/pronunciation review was not performed.')


def main():
    global AUTHORING, ROSTER, CARD_ID, LEVEL, SERIES
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('preflight', 'assemble', 'validate'))
    parser.add_argument('--card-id', default='mt-ko-a1-001',
                        help='Stable Korean Mini Talk ID, e.g. mt-ko-b2-001')
    parser.add_argument('--authoring', type=pathlib.Path,
                        help='Authoring JSON; default resolves from --card-id')
    parser.add_argument('--voice-roster', type=pathlib.Path,
                        help='Verified approved-voice roster JSON')
    parser.add_argument('--work', type=pathlib.Path,
                        help='Private workspace containing raw takes and transcript evidence')
    parser.add_argument('--qc-report', type=pathlib.Path)
    parser.add_argument('--approved', type=pathlib.Path)
    args = parser.parse_args()
    match = re.fullmatch(r'mt-ko-(a1|a2|b1|b2|c1|c2)-(\d{3})', args.card_id)
    require(match, f'Invalid Korean Mini Talk card ID: {args.card_id}')
    CARD_ID = args.card_id
    LEVEL = match.group(1).upper()
    SERIES = match.group(2)
    AUTHORING = args.authoring or ROOT / f'content/mini-talks/korean-{LEVEL.lower()}-{SERIES}.authoring.json'
    ROSTER = args.voice_roster or ROSTER
    require(AUTHORING.is_file() and ROSTER.is_file(),
            f'Authoring file or approved voice roster is missing: {AUTHORING}, {ROSTER}')
    work = args.work or pathlib.Path(f'/private/tmp/talktag-mini-talks-ko-{LEVEL.lower()}-{SERIES}')
    if args.action == 'preflight':
        _, card, roles = load_authoring()
        voices = approved_voices(roles)
        counts = {speaker: sum(line['speaker'] == speaker for line in card['lines'])
                  for speaker in voices}
        print(json.dumps({'cardId': CARD_ID, 'level': LEVEL,
                          'authoringSha256': sha256(AUTHORING),
                          'voiceRosterSha256': sha256(ROSTER),
                          'lineCount': len(card['lines']),
                          'uniqueLinesBySpeaker': counts,
                          'voiceCasting': [{'speakerId': speaker, **voice}
                                           for speaker, voice in voices.items()],
                          'requiredRawTakeDirectory': str(work / 'raw' / CARD_ID),
                          'requiredTranscriptEvidence': str(work / 'source-transcripts.json')},
                         ensure_ascii=False, indent=2))
    elif args.action == 'assemble':
        assemble(work)
    else:
        report_path = args.qc_report or DEFAULT_REPORTS / f'{CARD_ID}-single-mastered.qc.json'
        approved_path = args.approved or work / 'qc-approved' / f'{CARD_ID}-single-mastered.mp3'
        validate(work, report_path, approved_path)


if __name__ == '__main__':
    main()
