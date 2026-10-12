#!/usr/bin/env python3
"""Assemble the two approved A1 MiniSkit pilots with measured speaking gaps."""
import array
import json
import math
import pathlib
import subprocess
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
TMP = ROOT / "_local-audio" / "miniskit-pilot"
TMP.mkdir(parents=True, exist_ok=True)
SOURCE = pathlib.Path("/Users/eungjukim/Documents/Codex/2026-09-19/referenced-chatgpt-conversation-this-is-an/output")
RATE = 44100

def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def decode(mp3, wav_path):
    run(["ffmpeg", "-y", "-i", str(mp3), "-ac", "1", "-ar", str(RATE), "-c:a", "pcm_s16le", str(wav_path)])

def read_pcm(path):
    with wave.open(str(path), "rb") as f:
        assert f.getnchannels() == 1 and f.getframerate() == RATE and f.getsampwidth() == 2
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
        part = data[start:start+block]
        if not part:
            continue
        rms = math.sqrt(sum(x*x for x in part) / len(part))
        if rms >= 140:  # about -47 dBFS, deliberately retain quiet speech tails
            active.append(start)
    if not active:
        raise ValueError("No audible speech detected")
    pre = int(RATE * 0.02)
    post = int(RATE * 0.04)
    begin = max(0, active[0] - pre)
    end = min(len(data), active[-1] + block + post)
    return begin, end

def ding_pcm(source, start, end):
    in_wav = TMP / "ding-source.wav"
    decode(source, in_wav)
    data = read_pcm(in_wav)
    return data[int(start*RATE):int(end*RATE)]

def encode_master(wav_in, mp3_out):
    run(["ffmpeg", "-y", "-i", str(wav_in), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(RATE), "-ac", "1", "-b:a", "128k", "-metadata", "artist=TalkTag", "-metadata", "album=Sound Check · MiniSkit Pilot", str(mp3_out)])

def validate_decoded_silence(mp3_path, cues):
    decoded = TMP / (mp3_path.stem + "-decoded.wav")
    decode(mp3_path, decoded)
    samples = read_pcm(decoded)
    for cue in cues:
        minimum = max(3.0, 2.5 * (cue["voiceEnd"] - cue["s"]))
        if cue["e"] - cue["voiceEnd"] + 1e-6 < minimum:
            raise AssertionError(f"Cue metadata gap too short: {cue}")
        # Exclude the speech-edge/MP3 encoder cushion and measure the interior
        # of every actual response gap from the decoded, normalized MP3.
        start = int((cue["voiceEnd"] + 0.12) * RATE)
        end = int((cue["e"] - 0.12) * RATE)
        gap = samples[start:end]
        if len(gap) < int((minimum - 0.5) * RATE):
            raise AssertionError(f"Decoded silence is unexpectedly short: {cue}")
        rms = math.sqrt(sum(x*x for x in gap) / len(gap))
        if rms > 100:
            raise AssertionError(f"Response gap contains audible signal (RMS {rms:.1f}): {cue}")
    print(f"Decoded QC PASS: {mp3_path.name} · {len(cues)} actual response gaps ≥ {minimum:.2f}s rule")

source_007 = ROOT / "_local-audio" / "miniskit-pilot" / "source-007.mp3"
start_ding = ding_pcm(source_007, 0, 0.52245)
end_ding = ding_pcm(source_007, 292.94257, 294.072)
assets = []
pilots = [
    {
        "unit": 8, "title": "Too Hot in Here", "description": "더운 방에서 창문을 열어 환기해요.", "voiceName": "Roger / Lauren", "accentTag": "US", "accentTags": ["US"], "sourceFilename": "SC-GLR-008-A1-MiniSkit-Too-Hot-US-US-Roger-Lauren.mp3", "base": "008", "speakers": ["Roger", "Lauren", "Roger", "Lauren"],
        "expressions": ["It's hot in here.", "Want me to open a window?", "This one won't open. Let's try the other one.", "There we go. Is that better?"],
        "meanings": ["여기 좀 덥다.", "창문 열어 줄까?", "이 창문은 안 열리네. 다른 창문으로 해 보자.", "됐다. 이제 좀 나아?"],
        "image": "guided-a1-08.webp", "briefing": "더운 방에서 친구 둘이 창문을 열어 환기하려고 합니다. 한쪽 창문이 열리지 않아 다른 창문을 열어 봅니다.",
    },
    {
        "unit": 9, "title": "Looking for My Keys", "description": "외출 전 현관에서 열쇠를 찾고 함께 나서요.", "voiceName": "Roger / Alice", "accentTag": "US+BK", "accentTags": ["US", "BK"], "sourceFilename": "SC-GLR-009-A1-MiniSkit-Looking-for-My-Keys-US-BK-Roger-Alice.mp3", "base": "009", "speakers": ["Roger", "Alice", "Roger", "Alice"],
        "expressions": ["Are you ready to go?", "Almost. I'm looking for my keys.", "They're on the table.", "Found them. Let's go."],
        "meanings": ["이제 갈 준비 됐어?", "거의 다 됐어. 열쇠를 찾고 있어.", "탁자 위에 있어.", "찾았다. 가자."],
        "image": "guided-a1-09.webp", "briefing": "외출을 앞둔 친구 둘이 현관에서 열쇠를 찾고, 탁자 위에서 발견한 뒤 함께 나섭니다.",
    },
]

for pilot in pilots:
    chunks = [start_ding]
    cues = []
    cursor = len(start_ding) / RATE
    for index, (line, speaker) in enumerate(zip(pilot["expressions"], pilot["speakers"])):
        src_mp3 = SOURCE / ("glr-008-miniskit-pilot" if pilot["unit"] == 8 else "glr-009-miniskit-pilot") / f"{pilot['base']}-{index+1:02d}.mp3"
        temp_wav = TMP / f"{pilot['base']}-{index+1:02d}.wav"
        decode(src_mp3, temp_wav)
        raw = read_pcm(temp_wav)
        begin, end = activity_bounds(raw)
        speech = raw[begin:end]
        speech_duration = len(speech) / RATE
        gap = math.ceil((max(3.0, 2.5 * speech_duration) + 0.20) * RATE) / RATE
        for repetition in range(1, 11):
            cue_start = cursor
            chunks.append(speech)
            cursor += speech_duration
            voice_end = cursor
            silence = [0] * int(round(gap * RATE))
            chunks.append(silence)
            cursor += len(silence) / RATE
            cues.append({"s": round(cue_start, 5), "voiceEnd": round(voice_end, 5), "e": round(cursor, 5), "i": index, "r": repetition})
        print(f"{pilot['base']} turn {index+1}: {speaker} {speech_duration:.3f}s × 10; response gap {gap:.3f}s")
    ending_start = cursor
    chunks.append(end_ding)
    pcm = array.array("h")
    for chunk in chunks:
        pcm.extend(chunk)
    wav_out = TMP / f"{pilot['base']}-master.wav"
    mp3_out = TMP / pilot["sourceFilename"]
    write_pcm(wav_out, pcm)
    encode_master(wav_out, mp3_out)
    probe = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(mp3_out)], text=True)
    duration = float(probe.strip())
    validate_decoded_silence(mp3_out, cues)
    pilot["metadata"] = {"audio": "/audio/guided/miniskit-pilot-20261012/" + pilot["sourceFilename"], "duration": duration, "endingStart": ending_start, "dingEnd": duration, "cues": cues, "reps": 10}
    assets.append(pilot)

out = TMP / "pilot-metadata.json"
out.write_text(json.dumps(assets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
def clock(seconds):
    total = int(round(seconds))
    return f"{total // 60}:{total % 60:02d}"

cards = []
for pilot in assets:
    data = pilot["metadata"]
    unit = pilot["unit"]
    cards.append({
        "id": f"guided-a1-{unit:02d}-miniskit-pilot", "type": "guided", "level": "A1", "part": unit,
        "chapter": 1, "unit": unit, "title": pilot["title"], "art": f"{unit:02d}",
        "description": pilot["description"],
        "summary": "짧은 장면 속 대화를 듣고, 한 대사씩 맡아 말해 보세요.",
        "durationLabel": clock(data["duration"]), "durationLong": clock(data["duration"]),
        "audio": data["audio"], "accentTag": pilot["accentTag"], "accentTags": pilot["accentTags"], "voiceName": pilot["voiceName"],
        "sourceFilename": pilot["sourceFilename"], "protocolVersion": 2, "contentRevision": "miniskit-pilot-20261012",
        "expressions": pilot["expressions"], "meanings": pilot["meanings"], "speakers": pilot["speakers"],
        "format": "miniskit", "pilot": True,
        "training": {"kind": "sentence-repeat", "defaultReps": 10, "silenceMultiplier": 2.5,
                     "startCueEnd": round(len(start_ding) / RATE, 5), "endingCueStart": round(data["endingStart"], 5),
                     "cues": data["cues"], "cardDings": True, "durationSeconds": data["duration"], "minimumGapSeconds": 3},
        "releaseDurationSeconds": data["duration"]
    })
module = "/* Two original A1 MiniSkit pilots; assembled with measured response gaps and independent dings. */\n"
module += "window.TalkTagAudioLessons=(window.TalkTagAudioLessons||[]).concat(" + json.dumps(cards, ensure_ascii=False, separators=(",", ":")) + ");\n"
(ROOT / "guided-miniskit-pilots.js").write_text(module, encoding="utf-8")
print("Built pilots:", ", ".join(p["metadata"]["audio"] for p in assets))
