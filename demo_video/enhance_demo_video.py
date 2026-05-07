from __future__ import annotations

import math
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH = 1920
HEIGHT = 1080
FPS = 30
BG = (7, 19, 28)
BG_2 = (10, 30, 46)
ACCENT = (221, 183, 106)
TEXT = (245, 242, 232)
SUBTEXT = (214, 210, 201)
OUTPUT_DIR = Path('/home/ubuntu/webdev-static-assets/chcg-enableos-demo-demo-video')
BASE_VIDEO = OUTPUT_DIR / 'enableos_demo_walkthrough.mp4'
MUSIC_PARTS = [
    OUTPUT_DIR / 'enableos_bg_part1.mp3',
    OUTPUT_DIR / 'enableos_bg_part2.mp3',
]
FINAL_VIDEO = OUTPUT_DIR / 'enableos_demo_walkthrough_branded.mp4'
INTRO_MP4 = OUTPUT_DIR / 'enableos_intro_animation.mp4'
OUTRO_MP4 = OUTPUT_DIR / 'enableos_outro_animation.mp4'
TEMP = Path('/tmp/enableos_demo_enhance')
INTRO_FRAMES = TEMP / 'intro_frames'
OUTRO_FRAMES = TEMP / 'outro_frames'
CONCAT_VIDEO = TEMP / 'concat_video.mp4'
MUSIC_BED = TEMP / 'music_bed.mp3'
MANIFEST = TEMP / 'music_manifest.txt'

for path in [OUTPUT_DIR, TEMP, INTRO_FRAMES, OUTRO_FRAMES]:
    path.mkdir(parents=True, exist_ok=True)


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def ffprobe_duration(path: Path) -> float:
    result = subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(path)
    ], text=True).strip()
    return float(result)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if bold:
        candidates.extend([
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            '/usr/share/fonts/truetype/tlwg/Loma-Bold.ttf',
            '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf',
        ])
    else:
        candidates.extend([
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/tlwg/Loma.ttf',
            '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf',
        ])
    for candidate in candidates:
        if os.path.exists(candidate):
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


TITLE_FONT = load_font(118, bold=True)
SUBTITLE_FONT = load_font(52)
TAG_FONT = load_font(28, bold=True)
FOOTER_FONT = load_font(30)


def ease_out_cubic(x: float) -> float:
    return 1 - pow(1 - max(0.0, min(1.0, x)), 3)



def make_background(progress: float, reverse: bool = False) -> Image.Image:
    img = Image.new('RGBA', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    for y in range(HEIGHT):
        blend = y / HEIGHT
        r = int(BG[0] * (1 - blend) + BG_2[0] * blend)
        g = int(BG[1] * (1 - blend) + BG_2[1] * blend)
        b = int(BG[2] * (1 - blend) + BG_2[2] * blend)
        draw.line((0, y, WIDTH, y), fill=(r, g, b, 255))

    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    shift = (1 - progress) if reverse else progress
    cx = int(WIDTH * (0.32 + 0.18 * math.sin(shift * math.pi)))
    cy = int(HEIGHT * (0.30 + 0.08 * math.cos(shift * math.pi * 0.9)))
    radius = 330 + int(90 * shift)
    glow_draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(35, 95, 150, 145))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=110))
    img = Image.alpha_composite(img, glow)

    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    line_offset = int(140 * shift)
    for i in range(7):
        x1 = 180 + i * 210 - line_offset
        y1 = -120
        x2 = x1 + 420
        y2 = HEIGHT + 120
        alpha = 38 + i * 8
        overlay_draw.line((x1, y1, x2, y2), fill=ACCENT + (alpha,), width=3)
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, overlay)

    panel = Image.new('RGBA', (WIDTH - 240, HEIGHT - 220), (5, 17, 27, 148))
    panel = panel.filter(ImageFilter.GaussianBlur(radius=2))
    img.paste(panel, (120, 110), panel)
    return img



def draw_centered_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, y: int, fill: tuple[int, int, int, int], tracking: int = 0) -> None:
    if tracking == 0:
        bbox = draw.textbbox((0, 0), text, font=font)
        x = (WIDTH - (bbox[2] - bbox[0])) // 2
        draw.text((x, y), text, font=font, fill=fill)
        return

    widths = []
    for ch in text:
        bbox = draw.textbbox((0, 0), ch, font=font)
        widths.append(bbox[2] - bbox[0])
    total = sum(widths) + tracking * max(0, len(text) - 1)
    x = (WIDTH - total) // 2
    for idx, ch in enumerate(text):
        draw.text((x, y), ch, font=font, fill=fill)
        x += widths[idx] + tracking



def render_brand_frames(frame_dir: Path, duration: float, title: str, subtitle: str, footer: str, reverse: bool = False) -> None:
    if frame_dir.exists():
        shutil.rmtree(frame_dir)
    frame_dir.mkdir(parents=True, exist_ok=True)
    total_frames = int(duration * FPS)

    for frame_index in range(total_frames):
        t = frame_index / max(total_frames - 1, 1)
        progress = 1 - t if reverse else t
        eased = ease_out_cubic(progress)
        canvas = make_background(eased, reverse=reverse)
        draw = ImageDraw.Draw(canvas)

        tag_alpha = int(220 * min(1.0, max(0.0, (t - 0.05) / 0.25)))
        title_alpha = int(255 * min(1.0, max(0.0, (t - 0.14) / 0.32)))
        subtitle_alpha = int(235 * min(1.0, max(0.0, (t - 0.28) / 0.32)))
        footer_alpha = int(210 * min(1.0, max(0.0, (t - 0.42) / 0.28)))
        if reverse:
            tag_alpha = int(tag_alpha * (1 - max(0.0, (t - 0.72) / 0.28)))
            title_alpha = int(title_alpha * (1 - max(0.0, (t - 0.78) / 0.22)))
            subtitle_alpha = int(subtitle_alpha * (1 - max(0.0, (t - 0.80) / 0.20)))
            footer_alpha = int(footer_alpha * (1 - max(0.0, (t - 0.84) / 0.16)))

        tag_box = (120, 118, 560, 172)
        draw.rounded_rectangle(tag_box, radius=24, fill=(12, 30, 46, 220), outline=ACCENT + (190,), width=2)
        draw.text((150, 131), 'CHCG ENABLEOS DEMO', font=TAG_FONT, fill=ACCENT + (tag_alpha,))

        title_y = 290 + int(40 * (1 - eased))
        subtitle_y = 540 + int(30 * (1 - eased))
        footer_y = 866 + int(20 * (1 - eased))
        shadow = (0, 0, 0, 150)
        draw_centered_text(draw, title, TITLE_FONT, title_y + 4, shadow)
        draw_centered_text(draw, title, TITLE_FONT, title_y, TEXT + (title_alpha,))
        draw_centered_text(draw, subtitle, SUBTITLE_FONT, subtitle_y + 3, shadow)
        draw_centered_text(draw, subtitle, SUBTITLE_FONT, subtitle_y, SUBTEXT + (subtitle_alpha,))
        draw_centered_text(draw, footer, FOOTER_FONT, footer_y, ACCENT + (footer_alpha,), tracking=2)

        frame_path = frame_dir / f'{frame_index:04d}.png'
        canvas.convert('RGB').save(frame_path, quality=94)



def render_motion_clip(frame_dir: Path, output_path: Path, duration: float) -> None:
    run([
        'ffmpeg', '-y', '-framerate', str(FPS), '-i', str(frame_dir / '%04d.png'),
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', str(FPS),
        '-c:a', 'aac', '-b:a', '192k', '-shortest', '-t', f'{duration:.2f}', str(output_path),
    ])



def build_music_bed(target_duration: float) -> None:
    playlist: list[Path] = []
    total = 0.0
    i = 0
    while total < target_duration + 2.0:
        part = MUSIC_PARTS[i % len(MUSIC_PARTS)]
        playlist.append(part)
        total += ffprobe_duration(part)
        i += 1
    MANIFEST.write_text(''.join([f"file '{path}'\n" for path in playlist]), encoding='utf-8')
    run([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(MANIFEST),
        '-af', f'volume=0.23,afade=t=in:st=0:d=1.8,afade=t=out:st={max(target_duration - 3.5, 0):.2f}:d=3.5,atrim=0:{target_duration:.2f}',
        '-c:a', 'libmp3lame', '-q:a', '2', str(MUSIC_BED),
    ])



def concat_video_sections(intro_path: Path, main_path: Path, outro_path: Path) -> None:
    run([
        'ffmpeg', '-y',
        '-i', str(intro_path),
        '-i', str(main_path),
        '-i', str(outro_path),
        '-filter_complex',
        '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]',
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
        str(CONCAT_VIDEO),
    ])



def mix_music(video_path: Path, music_path: Path, output_path: Path) -> None:
    run([
        'ffmpeg', '-y', '-i', str(video_path), '-i', str(music_path),
        '-filter_complex',
        '[1:a][0:a]sidechaincompress=threshold=0.018:ratio=10:attack=20:release=350[ducked];'
        '[0:a][ducked]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[mix]',
        '-map', '0:v', '-map', '[mix]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        str(output_path),
    ])



def main() -> None:
    if not BASE_VIDEO.exists():
        raise FileNotFoundError(f'Missing base video: {BASE_VIDEO}')
    for part in MUSIC_PARTS:
        if not part.exists():
            raise FileNotFoundError(f'Missing music segment: {part}')

    intro_duration = 7.0
    outro_duration = 6.0
    render_brand_frames(
        INTRO_FRAMES,
        intro_duration,
        'CHCG EnableOS',
        'Turn enablement into a live performance mission.',
        'LEARNER  •  TRAINING  •  COACH  •  AGENT  •  MANAGER',
        reverse=False,
    )
    render_brand_frames(
        OUTRO_FRAMES,
        outro_duration,
        'Closed-Loop Enablement',
        'Targeted retraining, structured coaching, and clear oversight in one system.',
        'CHCG ENABLEOS',
        reverse=True,
    )
    render_motion_clip(INTRO_FRAMES, INTRO_MP4, intro_duration)
    render_motion_clip(OUTRO_FRAMES, OUTRO_MP4, outro_duration)

    concat_video_sections(INTRO_MP4, BASE_VIDEO, OUTRO_MP4)
    total_duration = ffprobe_duration(CONCAT_VIDEO)
    build_music_bed(total_duration)
    mix_music(CONCAT_VIDEO, MUSIC_BED, FINAL_VIDEO)
    print(f'Enhanced video written to {FINAL_VIDEO} ({total_duration:.1f}s)')


if __name__ == '__main__':
    main()
