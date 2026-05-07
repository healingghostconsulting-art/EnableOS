from __future__ import annotations

import asyncio
import json
import math
import os
import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import edge_tts

ROOT = Path('/home/ubuntu/chcg-enableos-demo/demo_video')
ASSETS = ROOT / 'assets'
OUTPUT = ROOT / 'output'
SCENE_IMAGE_DIR = OUTPUT / 'scene_images'
SCENE_AUDIO_DIR = OUTPUT / 'scene_audio'
SCENE_CLIP_DIR = OUTPUT / 'scene_clips'

WIDTH = 1920
HEIGHT = 1080
FPS = 30
VOICE = 'en-US-AvaMultilingualNeural'
BG_COLOR = '#07131c'
ACCENT = '#ddb76a'
TEXT = '#f5f2e8'
SUBTEXT = '#d7d3cb'
CARD = (5, 17, 27, 224)
TOP_CARD = (6, 16, 26, 205)

for directory in [ASSETS, OUTPUT, SCENE_IMAGE_DIR, SCENE_AUDIO_DIR, SCENE_CLIP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


@dataclass
class Scene:
    slug: str
    title: str
    kicker: str
    caption: str
    image_path: str | None
    crop: tuple[float, float, float, float] | None
    narration: str


SCENES: list[Scene] = [
    Scene(
        slug='01-title',
        title='EnableOS Demo Walkthrough',
        kicker='Closed-loop enablement workflow',
        caption='Learner training, coach documentation, agent take-aways, and manager oversight in one sequence.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-55-43_9998.webp',
        crop=(0.20, 0.00, 0.98, 0.82),
        narration='CHCG EnableOS brings training delivery, coaching actions, and leadership review into one enterprise workflow. In the next few minutes, I will walk through the learner experience, the guided training player, the coaching log handoff, and the manager oversight layer.',
    ),
    Scene(
        slug='02-learner-assignment',
        title='Learner Journey: Targeted Retraining',
        kicker='Urgent assignment pinned first',
        caption='The learner sees the module, due window, and action to start retraining immediately.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-55-43_9998.webp',
        crop=(0.20, 0.20, 0.97, 0.86),
        narration='We begin in the learner journey. The most urgent retraining is pinned at the top, so the agent does not need to hunt through a catalog to know what matters right now. The assignment shows the specific module, the due window, and the action to start immediately.',
    ),
    Scene(
        slug='03-learner-context',
        title='Performance Context Stays Visible',
        kicker='Readiness, progress, and interventions together',
        caption='The workspace keeps the learner’s current state visible instead of separating training from performance signals.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-55-56_4612.webp',
        crop=(0.18, 0.06, 0.98, 0.96),
        narration='As the learner moves down the workspace, EnableOS keeps readiness, journey progress, and intervention context visible together. That means the agent can see not just the assigned content, but also why it matters in the broader performance path.',
    ),
    Scene(
        slug='04-learner-actions',
        title='Assigned Actions Tie to Live Follow-Through',
        kicker='Interventions stay connected to practice',
        caption='Training is shown as part of the enablement journey, with clear operational next steps beside it.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-56-06_7666.webp',
        crop=(0.18, 0.06, 0.98, 0.96),
        narration='The active enablement journey keeps required retraining and open interventions connected. Instead of treating training as a disconnected event, the platform shows the operational actions that still need follow-through after the lesson.',
    ),
    Scene(
        slug='05-training-overview',
        title='Interactive Training Simulator',
        kicker='Deck content becomes guided training',
        caption='Learners enter a course player built for lesson flow, practice, evidence, and checkpoints.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-54-11_3137.webp',
        crop=(0.18, 0.00, 0.98, 0.90),
        narration='When the learner opens training, the experience shifts into a dedicated course player. Deck content is reformatted into a guided sequence, so learners stay inside the platform while moving through briefing, practice, evidence, and applied coaching moments.',
    ),
    Scene(
        slug='06-training-checkpoints',
        title='Narration, Reveal Cues, and Checkpoints',
        kicker='Interactive stages inside the lesson flow',
        caption='Slides can combine narration controls, reveal panels, and gated challenge steps before the learner advances.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-54-11_3137.webp',
        crop=(0.22, 0.42, 0.98, 0.98),
        narration='Inside the training player, each stage can combine lesson visuals, narration, reveal cues, and checkpoint logic. That makes the training feel less like a static slide deck and more like a live, structured rehearsal of the target behavior.',
    ),
    Scene(
        slug='07-coach-overview',
        title='Coach Workspace',
        kicker='Bridge between training and field coaching',
        caption='Coaches see readiness, learner focus, weekly logs, and training-transfer context in one operating view.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-54-56_1315.webp',
        crop=(0.18, 0.00, 0.98, 0.92),
        narration='Next, we move into the coach workspace. This is where a supervisor connects performance signals, retraining assignments, and field coaching. The coach can see readiness, learner focus, weekly logs, and training transfer context in one operating view.',
    ),
    Scene(
        slug='08-coach-history',
        title='Historical Coaching Context',
        kicker='Signals and prior retraining stay attached',
        caption='Before intervening, the coach can review signal trends and completed retraining in the same lane.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-55-08_6007.webp',
        crop=(0.18, 0.00, 0.98, 0.98),
        narration='Coaches also keep historical retraining outcomes attached to the same supervision lane. Before they intervene, they can review prior completions, signal trends, and recent pathway activity, which helps them build coaching that reflects what has already happened.',
    ),
    Scene(
        slug='09-coach-guidance',
        title='Explainable AI Guidance with Human Override',
        kicker='Suggested intervention, still coach-controlled',
        caption='The coach sees why the recommendation surfaced and can approve or override the suggested guidance.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-55-17_7961.webp',
        crop=(0.52, 0.02, 0.98, 0.96),
        narration='EnableOS also supports explainable AI guidance. Here, the coach receives a suggested intervention tied to verification confidence and closing discipline, but the coach still has the authority to approve the guidance or override it with a different call.',
    ),
    Scene(
        slug='10-coaching-log',
        title='Structured Weekly Coaching Log',
        kicker='Document the coaching touchpoint once',
        caption='Attendance, follow-up, comments, SMART commitments, support needs, and copy recipients live in the same coaching record.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-57-29_9038.webp',
        crop=(0.30, 0.42, 0.98, 0.98),
        narration='When it is time to document the conversation, the structured coaching log captures the weekly touchpoint. The coach records attendance, prior-goal follow-up, observed behaviors, SMART commitments, support needed, and who should receive the distributed copy.',
    ),
    Scene(
        slug='11-agent-receipt',
        title='Agent Receives the Coaching Signal',
        kicker='Learner reflection closes the loop',
        caption='The learner gets the coaching context back inside their own workspace instead of losing it in a manager-only tool.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-55-43_9998.webp',
        crop=(0.20, 0.30, 0.98, 0.92),
        narration='That coaching record does not disappear into a manager-only system. The learner receives the relevant coaching context back in their own workspace, including the chance to save personal takeaways. This closes the loop between coaching intent and learner reflection.',
    ),
    Scene(
        slug='12-manager-overview',
        title='Manager Intervention Workspace',
        kicker='Leadership view of the same workflow',
        caption='Managers monitor active signals, interventions, coaching follow-ups, and direct-report readiness together.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-57-10_8613.webp',
        crop=(0.18, 0.00, 0.98, 0.92),
        narration='From the manager side, the platform rolls everything up into an intervention workspace. Leaders can monitor active signals, open interventions, coaching follow-ups, and direct-report readiness without losing the context created by the coach and learner steps.',
    ),
    Scene(
        slug='13-manager-review',
        title='Manager Reviews a Coach\'s Agent',
        kicker='Oversight reaches the coaching detail',
        caption='Managers can inspect the structured record for one of their coach’s agents and confirm that follow-through is real.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-57-29_9038.webp',
        crop=(0.24, 0.28, 0.98, 0.98),
        narration='Managers can also review coaching detail more directly. In this view, the oversight lane makes it possible to inspect one of a coach’s agents, confirm the structured coaching record, and verify that the assigned intervention is backed by real follow-through.',
    ),
    Scene(
        slug='14-close',
        title='Assignment to Oversight, End to End',
        kicker='Training, coaching, and review stay connected',
        caption='EnableOS links targeted retraining, interactive practice, coaching documentation, learner take-aways, and managerial review in one system.',
        image_path='/home/ubuntu/screenshots/3000-io3w3lh7gagqmn4_2026-05-07_13-57-10_8613.webp',
        crop=(0.22, 0.10, 0.98, 0.86),
        narration='That is the EnableOS loop: assign targeted retraining, guide the learner through interactive practice, capture the coaching action, return the learning signal to the agent, and give managers a clear oversight view of what happened next.',
    ),
]


def run(cmd: str) -> None:
    subprocess.run(cmd, shell=True, check=True)


def ffprobe_duration(path: Path) -> float:
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        str(path),
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    return float(out)


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
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


TITLE_FONT = load_font(68, bold=True)
KICKER_FONT = load_font(28, bold=True)
CAPTION_FONT = load_font(40)
BODY_FONT = load_font(30)
SMALL_FONT = load_font(24)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ''
    for word in words:
        test = word if not current else f'{current} {word}'
        width = draw.textbbox((0, 0), test, font=font)[2]
        if width <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def cover_crop(image: Image.Image, target_width: int, target_height: int) -> Image.Image:
    src_ratio = image.width / image.height
    tgt_ratio = target_width / target_height
    if src_ratio > tgt_ratio:
        new_height = target_height
        new_width = int(new_height * src_ratio)
    else:
        new_width = target_width
        new_height = int(new_width / src_ratio)
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    left = (new_width - target_width) // 2
    top = (new_height - target_height) // 2
    return resized.crop((left, top, left + target_width, top + target_height))


def prepare_background(scene: Scene) -> Image.Image:
    if scene.image_path is None:
        return Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    base = Image.open(scene.image_path).convert('RGB')
    if scene.crop:
        x1, y1, x2, y2 = scene.crop
        crop_box = (
            int(base.width * x1),
            int(base.height * y1),
            int(base.width * x2),
            int(base.height * y2),
        )
        base = base.crop(crop_box)
    bg = cover_crop(base, WIDTH, HEIGHT)
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    base_dim = Image.new('RGBA', (WIDTH, HEIGHT), (4, 10, 16, 58))
    overlay = Image.alpha_composite(overlay, base_dim)

    gradient_top = Image.new('L', (1, HEIGHT), 0)
    for y in range(HEIGHT):
        alpha = int(200 * (1 - min(1, y / 430))) if y < 430 else 0
        gradient_top.putpixel((0, y), alpha)
    gradient_top = gradient_top.resize((WIDTH, HEIGHT))
    overlay.paste((2, 10, 18, 0), (0, 0), gradient_top)

    gradient_bottom = Image.new('L', (1, HEIGHT), 0)
    for y in range(HEIGHT):
        if y < HEIGHT - 430:
            alpha = 0
        else:
            progress = (y - (HEIGHT - 430)) / 430
            alpha = int(220 * min(1, progress))
        gradient_bottom.putpixel((0, y), alpha)
    gradient_bottom = gradient_bottom.resize((WIDTH, HEIGHT))
    overlay.paste((3, 10, 16, 0), (0, 0), gradient_bottom)

    bg = Image.alpha_composite(bg.convert('RGBA'), overlay)

    top_card = Image.new('RGBA', (WIDTH - 140, 260), TOP_CARD)
    top_blurred = top_card.filter(ImageFilter.GaussianBlur(radius=2))
    bg.paste(top_blurred, (70, 46), top_blurred)

    card = Image.new('RGBA', (WIDTH - 140, 330), CARD)
    blurred = card.filter(ImageFilter.GaussianBlur(radius=2))
    bg.paste(blurred, (70, HEIGHT - 380), blurred)
    return bg.convert('RGBA')


def draw_text_with_shadow(draw: ImageDraw.ImageDraw, position: tuple[int, int], text: str, font: ImageFont.ImageFont, fill: str, shadow: tuple[int, int, int, int] = (0, 0, 0, 180), offset: int = 3) -> None:
    x, y = position
    draw.text((x + offset, y + offset), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=fill)



def render_scene_image(scene: Scene, index: int) -> Path:
    canvas = prepare_background(scene)
    draw = ImageDraw.Draw(canvas)

    kicker_box = (86, 70, 660, 122)
    draw.rounded_rectangle(kicker_box, radius=18, fill=(18, 31, 44, 230), outline=(221, 183, 106, 190), width=2)
    draw_text_with_shadow(draw, (104, 81), scene.kicker.upper(), KICKER_FONT, ACCENT, offset=2)

    title_lines = wrap_text(draw, scene.title, TITLE_FONT, WIDTH - 260)
    y = 150
    for line in title_lines:
        draw_text_with_shadow(draw, (96, y), line, TITLE_FONT, TEXT, offset=3)
        y += 82

    caption_lines = wrap_text(draw, scene.caption, CAPTION_FONT, WIDTH - 280)
    caption_y = HEIGHT - 322
    for line in caption_lines:
        draw_text_with_shadow(draw, (104, caption_y), line, CAPTION_FONT, TEXT, offset=2)
        caption_y += 50

    footer = 'CHCG EnableOS Demo  •  Learner → Training → Coach → Agent → Manager'
    draw_text_with_shadow(draw, (104, HEIGHT - 78), footer, SMALL_FONT, SUBTEXT, offset=2)
    scene_no = f'Scene {index:02d}'
    bbox = draw.textbbox((0, 0), scene_no, font=SMALL_FONT)
    draw_text_with_shadow(draw, (WIDTH - 104 - (bbox[2] - bbox[0]), HEIGHT - 78), scene_no, SMALL_FONT, SUBTEXT, offset=2)

    out_path = SCENE_IMAGE_DIR / f'{index:02d}_{scene.slug}.png'
    canvas.convert('RGB').save(out_path, quality=95)
    return out_path


async def generate_audio(scene: Scene, index: int) -> Path:
    out_path = SCENE_AUDIO_DIR / f'{index:02d}_{scene.slug}.mp3'
    communicate = edge_tts.Communicate(text=scene.narration, voice=VOICE, rate='-2%')
    await communicate.save(str(out_path))
    return out_path


def render_clip(image_path: Path, audio_path: Path, index: int, slug: str) -> Path:
    duration = ffprobe_duration(audio_path) + 0.8
    total_frames = max(1, math.ceil(duration * FPS))
    output_path = SCENE_CLIP_DIR / f'{index:02d}_{slug}.mp4'
    vf = (
        f"scale=2000:-1,zoompan="
        f"z='min(1.0+on*0.00018,1.08)':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={total_frames}:s={WIDTH}x{HEIGHT}:fps={FPS},"
        f"fade=t=in:st=0:d=0.4,fade=t=out:st={max(duration-0.45,0):.2f}:d=0.45"
    )
    af = f"afade=t=in:st=0:d=0.25,afade=t=out:st={max(duration-0.35,0):.2f}:d=0.35"
    cmd = (
        f"ffmpeg -y -loop 1 -i {shlex.quote(str(image_path))} -i {shlex.quote(str(audio_path))} "
        f"-vf \"{vf}\" -af \"{af}\" -c:v libx264 -pix_fmt yuv420p -r {FPS} "
        f"-c:a aac -b:a 192k -t {duration:.2f} -shortest {shlex.quote(str(output_path))}"
    )
    run(cmd)
    return output_path


def concat_clips(clips: Iterable[Path], output_path: Path) -> None:
    manifest = OUTPUT / 'concat_manifest.txt'
    manifest.write_text(''.join([f"file '{clip}'\n" for clip in clips]), encoding='utf-8')
    cmd = f"ffmpeg -y -f concat -safe 0 -i {shlex.quote(str(manifest))} -c copy {shlex.quote(str(output_path))}"
    run(cmd)


async def main() -> None:
    scene_manifest = []
    clip_paths: list[Path] = []
    for index, scene in enumerate(SCENES, start=1):
        image_path = render_scene_image(scene, index)
        audio_path = await generate_audio(scene, index)
        clip_path = render_clip(image_path, audio_path, index, scene.slug)
        clip_paths.append(clip_path)
        scene_manifest.append({
            'scene': index,
            'slug': scene.slug,
            'image': str(image_path),
            'audio': str(audio_path),
            'clip': str(clip_path),
            'duration_seconds': round(ffprobe_duration(audio_path), 2),
        })
    output_video = OUTPUT / 'enableos_demo_walkthrough.mp4'
    concat_clips(clip_paths, output_video)
    (OUTPUT / 'scene_manifest.json').write_text(json.dumps(scene_manifest, indent=2), encoding='utf-8')
    total = sum(item['duration_seconds'] for item in scene_manifest)
    print(f'Rendered {output_video} with narration runtime {total:.1f} seconds')


if __name__ == '__main__':
    asyncio.run(main())
