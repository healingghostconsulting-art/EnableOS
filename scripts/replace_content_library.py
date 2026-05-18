from pathlib import Path

root = Path('/home/ubuntu/chcg-enableos-demo')
source = root / 'client/src/pages/EnableOSViews.tsx'
replacement = root / 'references/content-library-mission-control.tsx'

original = source.read_text()
new_block = replacement.read_text().strip() + '\n\n'
start_marker = 'export function ContentLibraryView() {'
end_marker = '\nfunction DocumentationFeed({ entries }: { entries: any[] }) {'

start = original.index(start_marker)
end = original.index(end_marker)
updated = original[:start] + new_block + original[end:]
source.write_text(updated)
