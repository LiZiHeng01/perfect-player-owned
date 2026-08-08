import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


root = Path("assets/images/Player/ai-avatars")
files = sorted(root.glob("avatar-*.png"))
if len(files) != 18:
    raise RuntimeError(f"Expected 18 character avatars, found {len(files)}")

groups = ["亚洲"] * 6 + ["白人"] * 6 + ["黑人"] * 6
hashes = set()
records = []
tile = 256
label_height = 30
columns = 6
sheet = Image.new("RGB", (columns * tile, 3 * (tile + label_height)), "#111827")

for index, (file, group) in enumerate(zip(files, groups), start=1):
    expected = f"avatar-{index:02d}.png"
    if file.name != expected:
        raise RuntimeError(f"Expected {expected}, found {file.name}")
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    if digest in hashes:
        raise RuntimeError(f"Duplicate avatar bytes: {file}")
    hashes.add(digest)

    with Image.open(file) as source:
        if source.format != "PNG" or source.mode != "RGBA" or source.size != (512, 512):
            raise RuntimeError(f"Invalid avatar: {file} {source.format} {source.mode} {source.size}")
        image = source.copy()
    alpha = image.getchannel("A")
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((511, 0)), alpha.getpixel((0, 511)), alpha.getpixel((511, 511))]
    if corners != [0, 0, 0, 0]:
        raise RuntimeError(f"Corners are not transparent: {file} {corners}")
    pixels = list(image.get_flattened_data())
    visible = sum(1 for _, _, _, a in pixels if a > 8)
    visible_ratio = visible / (512 * 512)
    if not 0.35 <= visible_ratio <= 0.58:
        raise RuntimeError(f"Implausible coverage: {file} {visible_ratio:.4f}")
    green_spill = sum(1 for r, g, b, a in pixels if a > 8 and g > max(r, b) + 20)
    if green_spill / max(visible, 1) > 0.002:
        raise RuntimeError(f"Excessive green spill: {file} {green_spill / visible:.4%}")

    preview = Image.new("RGB", (tile, tile), "#d9d9d9")
    draw = ImageDraw.Draw(preview)
    cell = 16
    for y in range(0, tile, cell):
        for x in range(0, tile, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#f2f2f2")
    thumb = image.copy()
    thumb.thumbnail((tile, tile), Image.Resampling.LANCZOS)
    preview.paste(thumb, ((tile - thumb.width) // 2, tile - thumb.height), thumb)
    x = ((index - 1) % columns) * tile
    y = ((index - 1) // columns) * (tile + label_height)
    sheet.paste(preview, (x, y))
    ImageDraw.Draw(sheet).text((x + 8, y + tile + 7), f"#{index:02d}  {group}", fill="white")

    records.append({
        "id": f"avatar-{index:02d}",
        "group": group,
        "photoLocal": f"assets/images/Player/ai-avatars/{file.name}",
        "sha256": digest,
    })

output = Path("output/character-avatars-contact-sheet.png")
output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(output, format="PNG", optimize=True)

manifest = Path("assets/data/character-avatar-manifest.json")
manifest.write_text(json.dumps({
    "version": 1,
    "count": 18,
    "format": "PNG",
    "width": 512,
    "height": 512,
    "transparent": True,
    "groups": {"亚洲": 6, "白人": 6, "黑人": 6},
    "avatars": records,
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print(json.dumps({"count": len(records), "unique": len(hashes), "contactSheet": str(output), "manifest": str(manifest)}))
