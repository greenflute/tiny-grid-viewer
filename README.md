# tiny-grid-viewer

Inspired by [`json-grid-viewer`](https://github.com/dutchigor/json-grid-viewer), this VS Code extension opens XML, JSON, JSONL, YAML, INI, TOML and tree command output files in a recursive grid-oriented custom editor backed by Vue.

- Shows structured data as nested grids: each object, array, XML element, INI section, TOML table or tree node opens as a table recursively.
- For XML, shows attributes as `@attribute` rows alongside child nodes, plus values, comments, CDATA and processing instructions.
- For XML, groups repeated sibling elements as `Array[n]`; arrays can switch between Array and Table views.
- Preserves XML comments while parsing.
- Accepts common loose XML conveniences supported by `fast-xml-parser`, JSON/HJSON, JSONL, YAML, INI, TOML and `tree` command output.
- Updates the grid live when the underlying document changes and remains valid.
- Supports border-based column resizing, double-click column reset, array/table view switching and basic cell editing.

## Usage

Open an `.xml`, `.xsd`, `.svg`, `.wsdl`, `.json`, `.jsonl`, `.jsonc`, `.yaml`, `.yml`, `.ini`, `.cfg`, `.conf`, `.config`, `.properties`, `.toml` or `.tree` file, then right click the editor or file and choose **Open With... > Tiny Grid Viewer**.

Double click editable cells to update values in place. XML editing supports:

- Element and processing-instruction names.
- Element and processing-instruction attributes, using normal XML attribute text such as `id="book-1" enabled="true"`.
- Leaf element values.
- Text, comment, CDATA and processing-instruction values.

JSON, JSONL, YAML, INI and TOML editing currently supports scalar value edits. Tree command output is read-only. The grid refreshes whenever the document is valid. If parsing fails, the webview displays the parser error instead of stale data.

Current editing limits:

- Elements that contain child elements cannot have their value edited directly.
- Adding, deleting, moving nodes and preserving exact original whitespace are not supported yet.
- Saving from the grid rewrites the XML document through the parser/builder, so formatting may change.

## Development

```sh
npm install
npm test
npm run lint
npm run build
```

For local extension testing, open this folder in VS Code and run the extension host from the debugger after `npm install`.

## Build Extension

```sh
npm install
npm test
npm run build
npm run vscode:prepublish
vsce package
```

## Download VSIX from GitHub

This repository includes a GitHub Actions workflow that builds a `.vsix` package automatically.

### From a GitHub Release

When a version tag such as `v0.1.0` is pushed, the workflow creates or updates the matching GitHub Release and attaches the generated `.vsix` file to the Release assets.

1. Open the repository's **Releases** page.
2. Open the target release.
3. Download the attached `.vsix` file from **Assets**.

## Release Process

1. Update the version in `package.json` and `package-lock.json`.
2. Commit and push the version change to GitHub.
3. Create and push a version tag such as `v0.1.0`.
4. Wait for the **Build VSIX** workflow to finish.
5. Download the `.vsix` file from the Release **Assets** section.

## Note

- The build script keeps `NODE_OPTIONS=--openssl-legacy-provider`, matching the reference extensions' Vue CLI 4 setup on modern Node versions.
- Review `.vscodeignore` and use `vsce ls` before publishing to confirm the package contents.
