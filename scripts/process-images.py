#!/usr/bin/env python3
"""Copy and process product photography for the product pages.

    python3 scripts/process-images.py            # process new/changed images
    python3 scripts/process-images.py --force    # reprocess everything

Reads each record's images[].file (relative to ~/Downloads/Product Images/, or
"repo:<path>" for a master kept in this repo), and writes to assets/images/products/<slug>/:

    <name>.webp         full size, up to 1600px wide (never upscaled)
    <name>.jpg          JPEG fallback at the same size
    <name>-thumb.webp   400px wide
    manifest.json       pixel dimensions, for width/height attributes

Sources are only ever read — nothing is moved or modified. Each image keeps
its own aspect ratio and is never cropped. The studio background is evened
out and shifted to the site background (#FAFAF7) so blank plates and branded
shots sit on the same ground. Requires Pillow.
"""
import json
import sys
from statistics import median

from PIL import Image, ImageMath

from productlib import IMAGES_DIR, ROOT, BuildError, load_records, source_path, web_name

TARGET = (0xFA, 0xFA, 0xF7)
FULL_WIDTH = 1600
THUMB_WIDTH = 400
GRID = (48, 32)            # resolution of the background gain map
GAIN_LIMITS = (0.94, 1.22)  # keeps the levels adjustment gentle
OUTLIER = 14               # border samples this far off the corner-to-corner line are ignored


def _edge_curve(samples):
    """Clean one border's samples: drop anything that isn't background, then smooth."""
    n = len(samples)
    first, last = median(samples[:3]), median(samples[-3:])
    line = [first + (last - first) * i / (n - 1) for i in range(n)]
    cleaned = [s if abs(s - l) <= OUTLIER else l for s, l in zip(samples, line)]
    return [sum(cleaned[max(0, i - 2):i + 3]) / len(cleaned[max(0, i - 2):i + 3]) for i in range(n)]


def _gain_map(channel, target):
    """Per-pixel gain that lifts this channel's studio background to `target`.

    The four borders are sampled and blended across the frame (a Coons patch),
    so an uneven backdrop — brighter towards the key light — comes out level
    without touching the product's own contrast.
    """
    gw, gh = GRID
    small = channel.resize((gw * 4, gh * 4), Image.BOX)
    px = small.load()
    block = lambda x0, y0, w, h: median(px[x, y] for x in range(x0, x0 + w) for y in range(y0, y0 + h))
    top = _edge_curve([block(i * 4, 0, 4, 3) for i in range(gw)])
    bottom = _edge_curve([block(i * 4, gh * 4 - 3, 4, 3) for i in range(gw)])
    left = _edge_curve([block(0, j * 4, 3, 4) for j in range(gh)])
    right = _edge_curve([block(gw * 4 - 3, j * 4, 3, 4) for j in range(gh)])
    c00, c10 = (top[0] + left[0]) / 2, (top[-1] + right[0]) / 2
    c01, c11 = (bottom[0] + left[-1]) / 2, (bottom[-1] + right[-1]) / 2
    lo, hi = GAIN_LIMITS
    values = []
    for j in range(gh):
        v = j / (gh - 1)
        for i in range(gw):
            u = i / (gw - 1)
            surface = ((1 - v) * top[i] + v * bottom[i] + (1 - u) * left[j] + u * right[j]
                       - ((1 - u) * (1 - v) * c00 + u * (1 - v) * c10 + (1 - u) * v * c01 + u * v * c11))
            values.append(min(hi, max(lo, target / max(surface, 1))))
    gain = Image.new('F', GRID)
    gain.putdata(values)
    return gain.resize(channel.size, Image.BICUBIC)


def normalise_background(image):
    if image.mode in ('RGBA', 'LA', 'P'):
        rgba = image.convert('RGBA')
        flat = Image.new('RGB', rgba.size, TARGET)
        flat.paste(rgba, mask=rgba.getchannel('A'))
        image = flat
    image = image.convert('RGB')
    channels = []
    for channel, target in zip(image.split(), TARGET):
        gain = _gain_map(channel, target)
        channels.append(ImageMath.lambda_eval(
            lambda args: args['convert'](args['min'](args['float'](args['im']) * args['gain'] + 0.5, 255), 'L'),
            im=channel, gain=gain))
    return Image.merge('RGB', channels)


def _resized(image, width):
    if image.width <= width:
        return image
    return image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)


def process(source, out_dir, name):
    with Image.open(source) as opened:
        image = normalise_background(opened)
    full = _resized(image, FULL_WIDTH)
    thumb = _resized(image, THUMB_WIDTH)
    full.save(out_dir / f'{name}.webp', 'WEBP', quality=82, method=6)
    full.save(out_dir / f'{name}.jpg', 'JPEG', quality=84, optimize=True, progressive=True)
    thumb.save(out_dir / f'{name}-thumb.webp', 'WEBP', quality=82, method=6)
    return {'width': full.width, 'height': full.height,
            'thumb_width': thumb.width, 'thumb_height': thumb.height}


def main(force=False):
    problems = []
    for path, record in load_records():
        slug = record['slug']
        out_dir = IMAGES_DIR / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = out_dir / 'manifest.json'
        manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
        wanted = {}
        for entry in record['images']:
            wanted.setdefault(entry['file'], entry.get('optional', False))
        fresh = {}
        for file, optional in wanted.items():
            source, name = source_path(file), web_name(file)
            if name in fresh:
                problems.append(f'{slug}: two source files map to the same web name "{name}"')
                continue
            if not source.exists():
                if optional:
                    print(f'  pending  {slug}/{name} — optional shot not delivered yet ({file})')
                else:
                    problems.append(f'{slug}: source image missing — {source}')
                continue
            outputs = [out_dir / f'{name}{suffix}' for suffix in ('.webp', '.jpg', '-thumb.webp')]
            current = (not force and name in manifest
                       and all(o.exists() and o.stat().st_mtime >= source.stat().st_mtime for o in outputs))
            if current:
                fresh[name] = manifest[name]
                continue
            fresh[name] = process(source, out_dir, name)
            print(f'  wrote    {slug}/{name}  {fresh[name]["width"]}×{fresh[name]["height"]}')
        manifest_path.write_text(json.dumps(fresh, indent=2, sort_keys=True) + '\n')
        keep = {'manifest.json'} | {f'{name}{suffix}' for name in fresh for suffix in ('.webp', '.jpg', '-thumb.webp')}
        for stale in sorted(p for p in out_dir.iterdir() if p.name not in keep):
            stale.unlink()  # this folder is build output: drop images the record no longer references
            print(f'  removed  {slug}/{stale.name}')
        print(f'{slug}: {len(fresh)} image(s) in {out_dir.relative_to(ROOT)}')
    if problems:
        raise BuildError('\n'.join(problems))


if __name__ == '__main__':
    try:
        main(force='--force' in sys.argv[1:])
    except BuildError as err:
        sys.exit(f'IMAGE PROCESSING FAILED\n{err}')
