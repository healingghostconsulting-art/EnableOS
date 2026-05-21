from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path('/home/ubuntu/chcg-enableos-demo/references/enableos_compact_ui_mockup.png')

W, H = 1900, 1220
img = Image.new('RGB', (W, H), '#f4f1ea')
draw = ImageDraw.Draw(img)


def font(size, bold=False):
    primary = '/usr/share/fonts/truetype/tlwg/Loma.ttf'
    fallback = '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'
    path = primary if Path(primary).exists() else fallback
    return ImageFont.truetype(path, size)


def rounded_box(xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text(xy, s, size=24, fill='#20323a', bold=False, anchor=None):
    draw.text(xy, s, font=font(size, bold), fill=fill, anchor=anchor)


def pill(x, y, w, h, label, fill='#edf0ea', outline='#d9d7ce', color='#55666b'):
    rounded_box((x, y, x+w, y+h), h//2, fill, outline)
    bbox = draw.textbbox((0, 0), label, font=font(18, False))
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((x + (w-tw)/2, y + (h-th)/2 - 1), label, font=font(18, False), fill=color)


def callout(n, x, y):
    draw.ellipse((x, y, x+34, y+34), fill='#18353f')
    text((x+17, y+17), str(n), size=19, fill='#f6f4ef', bold=True, anchor='mm')

# Header
text((72, 44), 'EnableOS compact UI direction', size=40, bold=True)
text((72, 93), 'Pre-implementation mockup for alignment before the next scroll-reduction pass', size=22, fill='#59686d')

# Main panels
left = (56, 150, 934, 1128)
right = (966, 150, 1844, 1128)
rounded_box(left, 34, '#fbfaf7', outline='#ddd8cb', width=2)
rounded_box(right, 34, '#fbfaf7', outline='#ddd8cb', width=2)
text((84, 172), 'A. Compact Mission Hub / Library', size=27, bold=True)
text((994, 172), 'B. Focused Training Player', size=27, bold=True)
text((84, 208), 'Goal: show more actionable training in one screen and reduce browse-to-launch friction.', size=18, fill='#67787d')
text((994, 208), 'Goal: isolate learning from page clutter and keep progress, outline, and next action persistent.', size=18, fill='#67787d')

# Left panel mockup
lx1, ly1, lx2, ly2 = left
nav = (84, 246, 220, 1088)
rounded_box(nav, 26, '#173842')
text((108, 274), 'EnableOS', size=24, fill='#f7f3eb', bold=True)
pill(108, 312, 88, 30, 'LIVE', fill='#214d58', outline='#2f6270', color='#d9f2ef')
nav_items = ['Command', 'Workspaces', 'Tracks', 'Training', 'Library', 'Coaching', 'Proof']
for i, item in enumerate(nav_items):
    y = 382 + i*86
    fill = '#f4f1ea' if item == 'Training' else '#204751'
    label = '#173842' if item == 'Training' else '#d8e8e7'
    rounded_box((100, y, 204, y+52), 18, fill)
    text((118, y+14), item, size=19, fill=label, bold=(item == 'Training'))

# Left content header/search
rounded_box((246, 246, 902, 318), 24, '#f4f1ea', outline='#ddd8cb')
text((272, 267), 'Search training, missions, KPI, or coaching prompts', size=18, fill='#66787d')
pill(270, 278, 156, 26, 'Search-first entry', fill='#ffffff', outline='#ded9cf')
pill(436, 278, 142, 26, 'Compact rows', fill='#ffffff', outline='#ded9cf')
pill(588, 278, 162, 26, 'Fewer scroll jumps', fill='#ffffff', outline='#ded9cf')
rounded_box((776, 260, 878, 304), 20, '#173842')
text((827, 274), 'Launch next', size=18, fill='#f7f3eb', bold=True, anchor='ma')

# Metric strip
for i, (title, value) in enumerate([
    ('Ready to launch', '12'), ('Due this week', '4'), ('Avg. progress', '61%'), ('In coaching', '9')
]):
    x = 246 + i*160
    rounded_box((x, 338, x+146, 426), 24, '#f8f6f0', outline='#ddd8cb')
    text((x+18, 360), title, size=16, fill='#6a787b')
    text((x+18, 386), value, size=30, fill='#173842', bold=True)

# Split content
rounded_box((246, 446, 584, 1088), 28, '#f7f4ee', outline='#ddd8cb')
rounded_box((602, 446, 902, 1088), 28, '#eff3f1', outline='#d7ddd8')
text((270, 468), 'Training queue', size=23, bold=True)
text((624, 468), 'Selected module detail', size=23, bold=True)

rows = [
    ('Unlocking the Power of Data', 'Leadership', '45 min left', '61% complete'),
    ('Real-time Coaching', 'Leadership', 'Start now', 'Not started'),
    ('Performance Management', 'Leadership', '20 min left', '82% complete'),
    ('Engagement & Empowering', 'Leadership', 'Queued', 'Assigned'),
    ('QA Essentials', 'Agent', 'Review', '56% complete'),
    ('Soft Skills Foundation', 'Agent', 'Resume', '74% complete'),
]
for i, (name, family, time_left, status) in enumerate(rows):
    y = 512 + i*88
    rounded_box((262, y, 568, y+70), 20, '#ffffff', outline='#ddd8cb')
    text((280, y+12), name, size=20, bold=True)
    text((280, y+39), family, size=16, fill='#6c7a7e')
    pill(450, y+14, 98, 24, status, fill='#edf3f0', outline='#d4ddd7', color='#486269')
    text((450, y+43), time_left, size=16, fill='#66787d')

text((624, 512), 'Unlocking the Power of Data', size=30, bold=True)
text((624, 555), 'A compact side detail keeps the syllabus, progress, proof, and one primary action in view without pushing users into a full new page.', size=18, fill='#5f7074')
for i, label in enumerate(['4 parts', '2 activities', '1 final quiz', '45 min remaining']):
    pill(624 + (i%2)*140, 610 + (i//2)*40, 128, 28, label, fill='#ffffff', outline='#d7ddd8')
rounded_box((624, 692, 880, 760), 22, '#173842')
text((752, 711), 'Resume module', size=22, fill='#f7f3eb', bold=True, anchor='ma')
rounded_box((624, 780, 880, 950), 24, '#ffffff', outline='#d7ddd8')
text((646, 802), 'Inside this module', size=22, bold=True)
for i, section in enumerate(['Signal interpretation', 'Benchmark reading', 'Coaching implications', 'Final decision challenge']):
    y = 840 + i*24
    text((648, y), f'• {section}', size=18, fill='#5e6f74')
rounded_box((624, 970, 880, 1052), 22, '#ffffff', outline='#d7ddd8')
text((646, 992), 'Why this is faster', size=20, bold=True)
text((646, 1020), 'Users can scan many modules, inspect one, and launch in one surface.', size=17, fill='#5e6f74')

callout(1, 820, 232)
callout(2, 532, 468)
callout(3, 870, 680)

# Right panel mockup
rx1, ry1, rx2, ry2 = right
rounded_box((994, 246, 1812, 316), 24, '#173842')
text((1024, 266), 'Unlocking the Power of Data', size=28, fill='#f7f3eb', bold=True)
text((1024, 298), 'Part 2 of 4 • 61% complete • final quiz gated at 75%', size=18, fill='#d7e5e3')

rounded_box((994, 338, 1188, 1088), 28, '#f5f2eb', outline='#ddd8cb')
rounded_box((1210, 338, 1626, 1088), 28, '#eef3f1', outline='#d7ddd8')
rounded_box((1648, 338, 1812, 1088), 28, '#f5f2eb', outline='#ddd8cb')
text((1018, 360), 'Module outline', size=22, bold=True)
outline = [
    ('1. Why signal literacy matters', False),
    ('2. Reading trend movement', True),
    ('3. Coaching response pattern', False),
    ('4. Final challenge', False),
]
for i, (item, active) in enumerate(outline):
    y = 414 + i*92
    fill = '#173842' if active else '#ffffff'
    label = '#f7f3eb' if active else '#173842'
    rounded_box((1012, y, 1170, y+66), 20, fill, outline='#ddd8cb')
    text((1030, y+18), item, size=18, fill=label, bold=active)
    text((1030, y+41), 'checkpoint included', size=15, fill=('#d7e5e3' if active else '#6b7a7d'))

text((1236, 360), 'Lesson canvas', size=22, bold=True)
rounded_box((1234, 392, 1602, 590), 26, '#173842')
text((1418, 430), 'Primary visual / chart / slide fragment', size=22, fill='#f7f3eb', bold=True, anchor='ma')
text((1418, 470), 'The player becomes the focus instead of living inside a long page.', size=17, fill='#d6e5e3', anchor='ma')
for x in [1260, 1324, 1388, 1452]:
    rounded_box((x, 520, x+44, 568), 12, '#6ff0e1')
for x in [1516, 1580]:
    rounded_box((x, 500, x+44, 568), 12, '#cdd7d8')
rounded_box((1234, 616, 1602, 836), 24, '#ffffff', outline='#d7ddd8')
text((1256, 640), 'Short teaching block', size=22, bold=True)
text((1256, 678), 'Copy stays concise inside the player. Deeper notes, definitions, or evidence can expand on demand rather than forcing every learner through a vertical content wall.', size=18, fill='#5e6f74')
rounded_box((1234, 862, 1602, 1038), 24, '#ffffff', outline='#d7ddd8')
text((1256, 886), 'Checkpoint interaction', size=22, bold=True)
text((1256, 922), 'A quick interaction sits in the same frame with immediate scoring and retry cues. Users do not scroll away from the lesson to complete it.', size=18, fill='#5e6f74')
rounded_box((1450, 976, 1582, 1016), 16, '#173842')
text((1516, 987), 'Submit', size=18, fill='#f7f3eb', bold=True, anchor='ma')

text((1670, 360), 'Progress rail', size=22, bold=True)
for i, (k, v) in enumerate([('Next', 'Coaching response pattern'), ('Time left', '18 min'), ('Score', '82%'), ('Reward', 'Insight +1')]):
    y = 408 + i*118
    rounded_box((1662, y, 1798, y+92), 20, '#ffffff', outline='#ddd8cb')
    text((1678, y+18), k, size=16, fill='#6b7a7d')
    text((1678, y+46), v, size=20, bold=True)
rounded_box((1662, 910, 1798, 1018), 22, '#173842')
text((1730, 934), 'Continue', size=22, fill='#f7f3eb', bold=True, anchor='ma')
text((1670, 1042), 'Right rail stays short and actionable rather than adding another long content section.', size=17, fill='#5e6f74')

callout(4, 1770, 232)
callout(5, 1118, 828)
callout(6, 1770, 908)

# Bottom legend
rounded_box((56, 1146, 1844, 1190), 20, '#fbfaf7', outline='#ddd8cb')
text((80, 1158), 'Callouts: 1 = smaller top shell, 2 = denser browse rows, 3 = side detail instead of full-page detour, 4 = focused player header, 5 = in-frame lesson + checkpoint, 6 = persistent progress / next action.', size=18, fill='#596a6f')

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT)
print(str(OUT))
