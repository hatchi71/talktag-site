"""Check each independently generated Korean line before drill assembly."""
import json
import hashlib
import pathlib
import re
from difflib import SequenceMatcher
from faster_whisper import WhisperModel

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = ROOT / '_local-audio/korean-glr-002'
config = json.loads((ROOT / 'content/native-glr-ko-002.json').read_text())
model = WhisperModel('/private/tmp/talktag-multilingual-models/models--Systran--faster-whisper-small/snapshots/536b0662742c02347bc0e980a01041f333bce120', device='cpu', compute_type='int8', cpu_threads=4)
normalize = lambda text: re.sub(r'[^가-힣a-zA-Z0-9]', '', text)
reports = []
for card in config['cards']:
    for index, line in enumerate(card['lines'], 1):
        source = WORK / 'raw' / card['level'] / f"{index:02d}-{line['speaker']}.mp3"
        segments, info = model.transcribe(str(source), language='ko', beam_size=5, word_timestamps=True, condition_on_previous_text=False, vad_filter=False)
        segments = list(segments)
        actual = ' '.join(s.text.strip() for s in segments)
        expected = line['ko']
        similarity = SequenceMatcher(None, normalize(expected), normalize(actual)).ratio()
        report = {'level':card['level'], 'line':index, 'speaker':line['speaker'], 'source':str(source), 'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(), 'expected':expected, 'recognized':actual, 'similarity':similarity,
                  'exactNormalizedMatch': normalize(expected)==normalize(actual), 'segments':[{'s':s.start,'e':s.end,'text':s.text,'words':[{'s':w.start,'e':w.end,'text':w.word} for w in s.words or []]} for s in segments]}
        reports.append(report)
        (WORK / 'speech-audit.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2)+'\n')
        print(card['level'], index, f'{similarity:.3f}', repr(expected), '=>', repr(actual), flush=True)
