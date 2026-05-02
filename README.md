# Tiny Grid Viewer

Languages: [English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de.md)

Tiny Grid Viewer is a VS Code extension for opening XML, JSON, JSONL, JSONC, GeoJSON, YAML, INI, TOML and `tree` command output as compact recursive grids. It is inspired by [`json-grid-viewer`](https://github.com/dutchigor/json-grid-viewer) and uses a Vue webview.

## Features

- Shows structured data as nested grids: objects, arrays, XML elements, INI sections, TOML tables and tree nodes open recursively.
- Supports `.xml`, `.xsd`, `.svg`, `.wsdl`, `.json`, `.jsonc`, `.geojson`, `.jsonl`, `.yaml`, `.yml`, `.ini`, `.cfg`, `.conf`, `.config`, `.properties`, `.toml` and `.tree`.
- Shows XML attributes as `@attribute` rows, alongside text, comments, CDATA and processing instructions.
- Groups repeated XML sibling elements as `Array[n]`.
- Lets arrays switch between list and table views.
- Supports cell editing for scalar values where the full document is loaded.
- Supports border-based column resizing and double-click auto-fit.
- Provides recursive expand, Shift-click deep expand, search overlay and a viewport minimap.
- Protects VS Code from large-file freezes with configurable limits, JSONL preview mode and compact GeoJSON coordinate summaries.

## Usage

Open a supported file, then choose **Open With... > Tiny Grid Viewer** from the editor or Explorer context menu.

Double-click editable cells to edit values in place.

XML editing supports element names, processing-instruction names, attributes, leaf values, text nodes, comments, CDATA and processing-instruction values. JSON, JSONL, YAML, INI and TOML editing currently supports scalar value edits. Tree command output is read-only.

## Large Files

Tiny Grid Viewer builds a recursive grid model and sends it to a VS Code webview. There is no single universal file-size ceiling: a deeply nested or coordinate-heavy file can create far more grid nodes than its byte size suggests.

Default guards:

- `tinyGridViewer.maxFileSizeMB`: `100`
- `tinyGridViewer.maxJsonlRows`: `1000000`
- `tinyGridViewer.maxGridNodes`: `1000000`
- `tinyGridViewer.jsonlPreviewRows`: `1000`

Set guard values to `0` to disable them, except `tinyGridViewer.jsonlPreviewRows`, which must be at least `1`.

Oversized JSONL files open in read-only preview mode and show the first configured non-empty rows. The viewer displays a notice panel and a fixed **Read-only preview** badge. Other files beyond configured limits show a readable refusal message instead of attempting to render a blank or unresponsive editor.

For `.geojson` files, `coordinates` arrays are shown as compact read-only summaries. This prevents large geometry payloads from expanding into hundreds of thousands of individual numeric cells.

## Current Limits

- Preview-mode JSONL is read-only.
- GeoJSON `coordinates` summaries are read-only.
- Elements that contain child elements cannot have their value edited directly.
- Adding, deleting and moving nodes are not supported yet.
- Exact original formatting is not preserved for edited structured documents.
- Saving from the grid may rewrite formatting through the parser/serializer.

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

When a version tag such as `v0.1.0` is pushed, the workflow creates or updates the matching GitHub Release and attaches the generated `.vsix` file to the Release assets.

## Release Process

1. Update the version in `package.json` and `package-lock.json`.
2. Commit and push the version change.
3. Create and push a version tag such as `v0.1.0`.
4. Wait for the **Build VSIX** workflow to finish.
5. Download the `.vsix` file from the Release assets.

## Notes

- The build script keeps `NODE_OPTIONS=--openssl-legacy-provider`, matching the reference extensions' Vue CLI 4 setup on modern Node versions.
- Review `.vscodeignore` and use `vsce ls` before publishing to confirm package contents.
