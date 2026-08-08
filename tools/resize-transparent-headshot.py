import argparse
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--size", type=int, default=216)
    args = parser.parse_args()

    source = Path(args.input)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        cleaned = []
        for red, green, blue, alpha_value in rgba.get_flattened_data():
            if alpha_value and alpha_value < 254:
                green = min(green, (red + blue) // 2 + 6)
            elif alpha_value and green > max(red, blue) + 10:
                green = max(red, blue) + 6
            cleaned.append((red, green, blue, alpha_value))
        rgba.putdata(cleaned)
        alpha = rgba.getchannel("A")
        bbox = alpha.getbbox()
        if not bbox:
            raise RuntimeError(f"No visible subject found in {source}")

        subject = rgba.crop(bbox)
        max_width = int(args.size * 0.96)
        max_height = int(args.size * 0.98)
        subject.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
        x = (args.size - subject.width) // 2
        y = args.size - subject.height
        canvas.alpha_composite(subject, (x, y))
        canvas.save(target, format="PNG", optimize=True)

        out_alpha = canvas.getchannel("A")
        alpha_extrema = out_alpha.getextrema()
        corner_alpha = [
            out_alpha.getpixel((0, 0)),
            out_alpha.getpixel((args.size - 1, 0)),
            out_alpha.getpixel((0, args.size - 1)),
            out_alpha.getpixel((args.size - 1, args.size - 1)),
        ]
        visible_ratio = sum(1 for value in out_alpha.get_flattened_data() if value > 8) / (args.size * args.size)

    print(json.dumps({
        "path": str(target),
        "size": [args.size, args.size],
        "alphaExtrema": alpha_extrema,
        "cornerAlpha": corner_alpha,
        "visibleRatio": round(visible_ratio, 4),
    }))


if __name__ == "__main__":
    main()
