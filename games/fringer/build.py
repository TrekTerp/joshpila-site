from pathlib import Path
root=Path(__file__).parent
src=root/'src'
html=(src/'page.html').read_text()
for marker,name,tag in [('STYLE','style.css','style'),('ENGINE','engine.js','script'),('ART_DATA','art-data.js','script'),('EVOLVED_ART','evolved-art.js','script'),('APP','app.js','script')]:
    html=html.replace(f'<!-- {marker} -->',f'<{tag}>\n'+(src/name).read_text()+f'\n</{tag}>')
longest=max(map(len,html.splitlines()))
assert longest<=2048, f'Line exceeds safe export limit: {longest}'
(root/'index.html').write_text(html)
print(f'Built Fringer: {len(html):,} bytes, longest line {longest} chars.')
