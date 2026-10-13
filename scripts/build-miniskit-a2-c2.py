#!/usr/bin/env python3
"""Assemble original MiniSkit source dialogues into protocol-checked GLR cards."""
import array
import json
import math
import pathlib
import re
import subprocess
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "_local-audio/miniskit-008-010/raw"
OUT = ROOT / "audio/guided/miniskit-20261013"
WORK = ROOT / "_local-audio/miniskit-008-010/assembly"
CONTENT = json.loads((ROOT / "content/guided-miniskit-008-010-a2-c2.json").read_text(encoding="utf-8"))
RATE = 44100
PILOT = ROOT / "audio/guided/miniskit-pilot-20261012/SC-GLR-008-A1-MiniSkit-Too-Hot-US-US-Roger-Lauren.mp3"
START_DING_SECONDS = 0.52245
ENDING_DING_START = 255.27302
ENDING_DING_END = 256.402449

WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

def run(args, capture=False):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                          stderr=subprocess.PIPE if capture else subprocess.DEVNULL)

def decode(mp3, wav_path):
    run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", str(RATE), "-c:a", "pcm_s16le", str(wav_path)])

def read_pcm(path):
    with wave.open(str(path), "rb") as f:
        assert (f.getnchannels(), f.getframerate(), f.getsampwidth()) == (1, RATE, 2)
        data = array.array("h")
        data.frombytes(f.readframes(f.getnframes()))
        return data

def write_pcm(path, data):
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes(data.tobytes())

def activity_bounds(data):
    block = int(RATE * 0.01)
    active = []
    for start in range(0, len(data), block):
        part = data[start:start + block]
        if not part:
            continue
        rms = math.sqrt(sum(x * x for x in part) / len(part))
        if rms >= 140:
            active.append(start)
    if not active:
        raise ValueError("No speech detected in a dialogue turn")
    return max(0, active[0] - int(0.02 * RATE)), min(len(data), active[-1] + block + int(0.04 * RATE))

def duration(path):
    value = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)], text=True)
    return float(value.strip())

def silence_windows(path, full_duration):
    result = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "silencedetect=noise=-35dB:d=0.18", "-f", "null", "-"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    starts = [float(v) for v in re.findall(r"silence_start: ([0-9.]+)", result.stderr)]
    ends = [float(v) for v in re.findall(r"silence_end: ([0-9.]+)", result.stderr)]
    windows = [(s, e) for s, e in zip(starts, ends) if e - s >= 0.18 and e < full_duration - 0.04]
    return windows

def select_turn_boundaries(card, windows, full_duration):
    weights = [max(1, len(re.findall(r"[A-Za-z0-9]+(?:['’][A-Za-z]+)?", en))) for en, _ in card["utterances"]]
    total = sum(weights)
    targets = [full_duration * sum(weights[:i + 1]) / total for i in range(len(weights) - 1)]
    candidates = [((s + e) / 2, s, e) for s, e in windows]
    # Dynamic programming chooses distinct, chronological silence windows nearest
    # the cumulative spoken-word positions, rather than cutting through speech.
    states = {j: ((candidates[j][0] - targets[0]) ** 2, [j]) for j in range(len(candidates))}
    for boundary in range(1, len(targets)):
        next_states = {}
        for j, (mid, _, _) in enumerate(candidates):
            best = None
            for prev, (cost, path) in states.items():
                if prev >= j:
                    continue
                proposal = cost + (mid - targets[boundary]) ** 2
                if best is None or proposal < best[0]:
                    best = (proposal, path + [j])
            if best is not None:
                next_states[j] = best
        states = next_states
    if not states:
        raise ValueError(f"Could not align {card['episode']:03d} {card['level']} turns to pauses")
    _, path = min(states.values(), key=lambda item: item[0])
    chosen = [candidates[j] for j in path]
    for target, (mid, start, end) in zip(targets, chosen):
        if abs(mid - target) > max(1.25, full_duration * 0.12):
            raise ValueError(f"Weak turn-boundary estimate at {mid:.2f}s for expected {target:.2f}s in {card['episode']:03d} {card['level']}")
    return [((start + end) / 2) for _, start, end in chosen], targets, chosen

def encode(master_wav, target_mp3):
    run(["ffmpeg", "-y", "-v", "error", "-i", str(master_wav), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(RATE), "-ac", "1", "-b:a", "128k", "-metadata", "artist=TalkTag", "-metadata", "album=Sound Check · MiniSkit", str(target_mp3)])

def validate_gaps(mp3, cues):
    decoded = WORK / (mp3.stem + "-check.wav")
    decode(mp3, decoded)
    data = read_pcm(decoded)
    for cue in cues:
        minimum = max(3.0, 2.5 * (cue["voiceEnd"] - cue["s"]))
        assert cue["e"] - cue["voiceEnd"] >= minimum - 0.005, (mp3.name, cue)
        left, right = int((cue["voiceEnd"] + 0.12) * RATE), int((cue["e"] - 0.12) * RATE)
        region = data[left:right]
        assert len(region) >= int((minimum - 0.5) * RATE), (mp3.name, cue)
        rms = math.sqrt(sum(x * x for x in region) / len(region))
        assert rms <= 100, (mp3.name, cue, rms)

def slug(text):
    return re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")

def clock(seconds):
    total = round(seconds)
    return f"{total // 60}:{total % 60:02d}"

pilot_wav = WORK / "ding-source.wav"
decode(PILOT, pilot_wav)
pilot_pcm = read_pcm(pilot_wav)
start_ding = pilot_pcm[:int(START_DING_SECONDS * RATE)]
ending_ding = pilot_pcm[int(ENDING_DING_START * RATE):int(ENDING_DING_END * RATE)]
assert len(start_ding) and len(ending_ding)

audio_cards = []
alignment_log = []
for card in CONTENT["cards"]:
    episode = int(card["episode"])
    level = card["level"]
    raw = next((p for p in RAW.glob(f"{episode:03d}-{level}-*.mp3")), None)
    if raw is None:
        raise FileNotFoundError(f"Missing source dialogue for {episode:03d} {level}")
    decoded_path = WORK / f"{episode:03d}-{level}-source.wav"
    decode(raw, decoded_path)
    source = read_pcm(decoded_path)
    full_duration = len(source) / RATE
    windows = silence_windows(raw, full_duration)
    cuts, targets, chosen = select_turn_boundaries(card, windows, full_duration)
    edges = [0] + [int(c * RATE) for c in cuts] + [len(source)]
    utterances = []
    for index, ((en, ko), left, right) in enumerate(zip(card["utterances"], edges, edges[1:])):
        segment = source[left:right]
        begin, end = activity_bounds(segment)
        speech = segment[begin:end]
        utterances.append((en, ko, speech))
    reps = 10 if level.startswith("A") else 15 if level.startswith("B") else 21
    pair = CONTENT["pairings"][f"{episode:03d}"]
    card_speakers = card.get("speakers", pair)
    line_data = []
    for index, (en, ko, speech) in enumerate(utterances):
        speaker = card_speakers[index % len(card_speakers)]
        speech_seconds = len(speech) / RATE
        gap_seconds = math.ceil((max(3.0, 2.5 * speech_seconds) + 0.20) * RATE) / RATE
        silence = array.array("h", [0]) * int(round(gap_seconds * RATE))
        line_data.append({"en": en, "ko": ko, "speech": speech, "silence": silence,
                          "speaker": speaker, "speechSeconds": speech_seconds,
                          "gapSeconds": len(silence) / RATE,
                          "estimatedSeconds": (speech_seconds + len(silence) / RATE) * reps})

    # Split only between complete dialogue turns. Keep every turn's entire repeat
    # cycle together and reserve room for the card's own opening/ending dings.
    target = 570 if level[0] in "AB" else 840
    hard_limit = 600 if level[0] in "AB" else 900
    groups, start, running = [], 0, len(start_ding) / RATE + len(ending_ding) / RATE
    for index, line in enumerate(line_data):
        if running + line["estimatedSeconds"] > target and index > start:
            groups.append((start, index))
            start, running = index, len(start_ding) / RATE + len(ending_ding) / RATE
        running += line["estimatedSeconds"]
    groups.append((start, len(line_data)))
    if any(sum(line_data[i]["estimatedSeconds"] for i in range(a, b)) + len(start_ding) / RATE + len(ending_ding) / RATE > hard_limit for a, b in groups):
        raise ValueError(f"A single complete turn exceeds the card duration limit for {episode:03d} {level}")

    accents = card["accentTag"].split("+")
    voice_name = " / ".join(pair)
    for group_index, (first, last) in enumerate(groups, 1):
        selected = line_data[first:last]
        is_split = len(groups) > 1
        part_suffix = f"-Part-{group_index:02d}" if is_split else ""
        title = f"{card['title']} · Part {group_index}" if is_split else card["title"]
        chunks = [start_ding]
        cursor = len(start_ding) / RATE
        cues = []
        for local_index, line in enumerate(selected):
            for repetition in range(1, reps + 1):
                begin = cursor
                chunks.append(line["speech"]); cursor += line["speechSeconds"]
                voice_end = cursor
                chunks.append(line["silence"]); cursor += line["gapSeconds"]
                cues.append({"s": round(begin, 5), "voiceEnd": round(voice_end, 5), "e": round(cursor, 5), "i": local_index, "r": repetition})
        ending_start = cursor
        chunks.append(ending_ding)
        assembled = array.array("h")
        for chunk in chunks:
            assembled.extend(chunk)
        master_wav = WORK / f"{episode:03d}-{level}-{group_index:02d}-master.wav"
        write_pcm(master_wav, assembled)
        filename = f"SC-GLR-{episode:03d}-{level}-MiniSkit-{slug(card['title'])}{part_suffix}-{'-'.join(accents)}-{slug(voice_name)}.mp3"
        target_mp3 = OUT / filename
        encode(master_wav, target_mp3)
        actual_duration = duration(target_mp3)
        validate_gaps(target_mp3, cues)
        if actual_duration > hard_limit:
            raise ValueError(f"Duration {actual_duration:.2f}s exceeds {hard_limit}s for {filename}")
        audio_path = "/English/guided/miniskit-20261013/" + filename
        audio_cards.append({
            "id": f"guided-{level.lower()}-{episode:02d}-miniskit" + (f"-part{group_index}" if is_split else ""),
            "type": "guided", "level": level, "part": episode, "chapter": group_index, "unit": episode,
            "partIndex": group_index if is_split else None, "partCount": len(groups) if is_split else None,
            "sentenceStart": first + 1, "sentenceEnd": last, "title": title,
            "art": f"{episode:03d}-{level.lower()}", "description": card["description"],
            "summary": "장면 속 대화를 듣고, 한 대사씩 맡아 말해 보세요.",
            "durationLabel": clock(actual_duration), "durationLong": clock(actual_duration),
            "audio": "https://audio.talktag.co.kr" + audio_path, "accentTag": card["accentTag"],
            "accentTags": accents, "voiceName": voice_name, "sourceFilename": filename,
            "protocolVersion": 3 if level.startswith("C") else 2,
            "contentRevision": CONTENT["revision"], "expressions": [line["en"] for line in selected],
            "meanings": [line["ko"] for line in selected], "speakers": [line["speaker"] for line in selected],
            "format": "miniskit",
            "training": {"kind": "sentence-repeat", "defaultReps": reps, "silenceMultiplier": 2.5,
                         "startCueEnd": round(len(start_ding) / RATE, 5), "endingCueStart": round(ending_start, 5),
                         "cues": cues, "cardDings": True, "durationSeconds": actual_duration,
                         "minimumGapSeconds": 3}, "releaseDurationSeconds": actual_duration,
            "scene": card["scene"], "briefing": card["briefing"]
        })
        alignment_log.append({"file": filename, "source": raw.name, "turns": len(selected), "repetitionsPerTurn": reps,
                              "sourceSilenceWindows": [[round(s, 3), round(e, 3)] for _, s, e in chosen],
                              "targetWordPositions": [round(t, 3) for t in targets],
                              "speechSecondsPerTurn": [round(line["speechSeconds"], 3) for line in selected],
                              "durationSeconds": actual_duration, "gapCheck": "PASS"})
        print(f"PASS {filename}: {actual_duration:.1f}s; {len(selected)} dialogue turns × {reps}; source boundaries={','.join(f'{c:.2f}' for c in cuts)}")

module = "/* New original A2–C2 MiniSkits, assembled with measured per-line response gaps and independent dings. */\n"
module += "window.TalkTagAudioLessons=(window.TalkTagAudioLessons||[]).concat(" + json.dumps(audio_cards, ensure_ascii=False, separators=(",", ":")) + ");\n"
(ROOT / "guided-miniskit-a2-c2.js").write_text(module, encoding="utf-8")
(WORK / "alignment-and-qc.json").write_text(json.dumps(alignment_log, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
