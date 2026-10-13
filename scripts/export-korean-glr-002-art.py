import json
import pathlib
from PIL import Image, ImageOps, ImageDraw

root=pathlib.Path(__file__).resolve().parents[1]
images=json.loads((root/'_local-audio/korean-glr-002/images.json').read_text())
config=json.loads((root/'content/native-glr-ko-002.json').read_text())
local=pathlib.Path('/Users/eungjukim/Desktop/Snowbaling자료작업실/1. TakTag 자료실/Korean/1. Korean Sound Check/1. Guided Listen & Repeat/002 Korean (Min-joon-Leejin)')
montage=Image.new('RGB',(1080,800),'#fffdf7')
for i,card in enumerate(config['cards']):
    level=card['level'].lower()
    image=Image.open(images[level]).convert('RGB')
    image.thumbnail((720,480),Image.Resampling.LANCZOS)
    target=root/'assets/glr-scenes'/f'ko-002-{level}.webp'
    image.save(target,format='WEBP',quality=88)
    folder=local/f"002 {card['title']} {card['level']} (Korean) Min-joon-Leejin"/'05 Artwork'
    folder.mkdir(parents=True,exist_ok=True)
    image.save(folder/target.name,format='WEBP',quality=88)
    preview=ImageOps.contain(image,(350,350))
    left=(i%3)*360+5;top=(i//3)*400+30
    montage.paste(preview,(left,top))
    ImageDraw.Draw(montage).text((left,top-22),card['level']+' - '+card['title'],fill='#173968')
montage.save(root/'_local-audio/korean-glr-002/art-review.png')
