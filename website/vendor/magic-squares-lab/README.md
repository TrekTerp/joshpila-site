# Magic Squares Lab: editable source

This package unpacks the combined v3 HTML without changing the lesson content,
page scripts, artwork, glossary, or navigation model. The public experience
remains one page with the existing tabs. No dependencies or build service are
required.

## Open the Lab

Open `dist/magic_squares_lab_combined.html` directly in a browser. It still
contains everything needed for offline use, including the original download
button. Only this generated HTML file is needed for publication.

## Edit and rebuild

Edit the relevant source file, then run:

```sh
python3 build.py
```

The command rebuilds `dist/magic_squares_lab_combined.html`.

| File or folder | Contents |
| --- | --- |
| `src/views/learn.html` | Lessons and their existing scripts and styles |
| `src/views/lab.html` | Puzzle and transformation tools |
| `src/views/glossary.html` | Interactive glossary |
| `src/views/sources.html` | Bibliography |
| `src/assets/` | Ten original image files, decoded without recompression |
| `src/documents/` | Downloadable Markdown glossary |
| `src/shell.html` | Shared page structure |
| `src/shell.css` | Shared page styling |
| `src/shell.js` | Navigation, embedded views, storage, and downloads |
| `src/anchors.json` | Anchor-to-view routing |
| `src/package.json` | Source paths and image MIME types |

The view files are source templates for the shell, not separate standalone
pages. Their `__LAB_ASSET_...__` placeholders are intentional. The shell resolves
them to the images when a view opens.

## What changed

The original file placed almost the entire package on one 3,843,452-character
line. The new build splits long JSON strings into short `$labText` arrays. A
JSON reviver rejoins those chunks exactly before the existing app runs. HTML
newlines, script text, image bytes, document content, and route data are
preserved. This is a packaging change, not a new lesson or interface design.

The generated file is larger because it includes whitespace and chunk markers.
That is deliberate: it removes the single enormous line while keeping the
download portable. The separate source files are the preferred editing format.

For AI-assisted edits, read the relevant `src/` file in bounded excerpts. Do
not dump the complete generated HTML or image data into a conversation. Newlines
prevent a single-line output explosion; they do not reduce total context size.

The website assembly script rebuilds this package and publishes it at
`/patterns/magic-squares/`, adding canonical metadata and return links to
Patterns and the Orrery. Edit this source directory for future changes; the
generated `dist/` folder is intentionally not tracked.
