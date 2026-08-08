import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


def checkerboard(size: int, cell: int = 12) -> Image.Image:
    image = Image.new("RGB", (size, size), "#d9d9d9")
    draw = ImageDraw.Draw(image)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#f2f2f2")
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", default="assets/images/Player/generated-rookies")
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument("--contact-sheet", default="output/generated-rookies-contact-sheet.png")
    parser.add_argument("--manifest", default="assets/data/generated-rookie-headshots.json")
    args = parser.parse_args()

    directory = Path(args.directory)
    files = sorted(directory.glob("generated-rookie-*.png"))
    if len(files) != args.count:
        raise RuntimeError(f"Expected {args.count} headshots, found {len(files)}")

    hashes = set()
    records = []
    tile_size = 216
    label_height = 24
    columns = 10
    rows = (len(files) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_size, rows * (tile_size + label_height)), "#111827")

    for index, file in enumerate(files, start=1):
        expected_name = f"generated-rookie-{index:03d}.png"
        if file.name != expected_name:
            raise RuntimeError(f"Expected {expected_name}, found {file.name}")
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        if digest in hashes:
            raise RuntimeError(f"Duplicate image bytes: {file}")
        hashes.add(digest)

        with Image.open(file) as source:
            if source.format != "PNG" or source.size != (216, 216) or source.mode != "RGBA":
                raise RuntimeError(f"Invalid image format: {file} {source.format} {source.mode} {source.size}")
            image = source.copy()
        alpha = image.getchannel("A")
        corners = [alpha.getpixel((0, 0)), alpha.getpixel((215, 0)), alpha.getpixel((0, 215)), alpha.getpixel((215, 215))]
        if corners != [0, 0, 0, 0]:
            raise RuntimeError(f"Corners are not transparent: {file} {corners}")
        pixels = list(image.get_flattened_data())
        visible = sum(1 for _, _, _, a in pixels if a > 8)
        visible_ratio = visible / (216 * 216)
        if not 0.35 <= visible_ratio <= 0.58:
            raise RuntimeError(f"Implausible subject coverage: {file} {visible_ratio:.4f}")
        green_spill = sum(1 for r, g, b, a in pixels if a > 8 and g > max(r, b) + 20)
        if green_spill / max(visible, 1) > 0.002:
            raise RuntimeError(f"Excessive green spill: {file} {green_spill / visible:.4%}")

        background = checkerboard(tile_size)
        background.paste(image, (0, 0), image)
        x = ((index - 1) % columns) * tile_size
        y = ((index - 1) // columns) * (tile_size + label_height)
        sheet.paste(background, (x, y))
        label_draw = ImageDraw.Draw(sheet)
        label_draw.text((x + 8, y + tile_size + 5), f"#{index:03d}", fill="white")
        records.append({
            "id": f"generated-rookie-{index:03d}",
            "photoLocal": f"assets/images/Player/generated-rookies/{file.name}",
            "sha256": digest,
        })

    contact_sheet = Path(args.contact_sheet)
    contact_sheet.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(contact_sheet, format="PNG", optimize=True)

    manifest = Path(args.manifest)
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({
        "version": 1,
        "count": len(records),
        "format": "PNG",
        "width": 216,
        "height": 216,
        "transparent": True,
        "usage": "future-generated-rookies",
        "headshots": records,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"count": len(records), "unique": len(hashes), "contactSheet": str(contact_sheet), "manifest": str(manifest)}))


if __name__ == "__main__":
    main()
