# Tiny Grid Viewer

Sprachen: [English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de.md)

Tiny Grid Viewer ist eine VS-Code-Erweiterung, die XML, JSON, JSONL, JSONC, GeoJSON, YAML, INI, TOML und Ausgaben des Befehls `tree` als kompakte rekursive Tabellen öffnet. Das Projekt ist von [`json-grid-viewer`](https://github.com/dutchigor/json-grid-viewer) inspiriert und verwendet ein Vue-Webview.

## Funktionen

- Zeigt strukturierte Daten als verschachtelte Tabellen: Objekte, Arrays, XML-Elemente, INI-Sections, TOML-Tabellen und tree-Knoten lassen sich rekursiv öffnen.
- Unterstützt `.xml`, `.xsd`, `.svg`, `.wsdl`, `.json`, `.jsonc`, `.geojson`, `.jsonl`, `.yaml`, `.yml`, `.ini`, `.cfg`, `.conf`, `.config`, `.properties`, `.toml` und `.tree`.
- Zeigt XML-Attribute als `@attribute`-Zeilen sowie Text, Kommentare, CDATA und Processing Instructions.
- Gruppiert wiederholte XML-Geschwisterelemente als `Array[n]`.
- Arrays können zwischen Listen- und Tabellenansicht wechseln.
- Unterstützt Cell-Editing für skalare Werte, wenn das vollständige Dokument geladen wurde.
- Unterstützt Spaltenbreiten per Zellgrenze, inklusive Doppelklick für Auto-Fit.
- Bietet rekursives Aufklappen, Shift-Klick für tiefes Aufklappen, Such-Overlay und eine Viewport-Minimap.
- Schützt VS Code bei großen Dateien durch konfigurierbare Limits, JSONL-Vorschau und kompakte GeoJSON-Koordinatenzusammenfassungen.

## Verwendung

Öffne eine unterstützte Datei und wähle im Editor- oder Explorer-Kontextmenü **Open With... > Tiny Grid Viewer**.

Bearbeitbare Zellen können per Doppelklick direkt geändert werden.

XML-Bearbeitung unterstützt Elementnamen, Namen von Processing Instructions, Attribute, Blattwerte, Textknoten, Kommentare, CDATA und Werte von Processing Instructions. JSON, JSONL, YAML, INI und TOML unterstützen derzeit die Bearbeitung skalarer Werte. Ausgaben des Befehls `tree` sind schreibgeschützt.

## Große Dateien

Tiny Grid Viewer baut ein rekursives Grid-Modell auf und sendet es an ein VS-Code-Webview. Es gibt keine universelle Dateigrößengrenze: Eine tief verschachtelte oder koordinatenlastige Datei kann deutlich mehr Grid-Knoten erzeugen, als ihre Größe in Bytes vermuten lässt.

Standard-Limits:

- `tinyGridViewer.maxFileSizeMB`: `100`
- `tinyGridViewer.maxJsonlRows`: `1000000`
- `tinyGridViewer.maxGridNodes`: `1000000`
- `tinyGridViewer.jsonlPreviewRows`: `1000`

Schutzwerte können auf `0` gesetzt werden, um sie zu deaktivieren. `tinyGridViewer.jsonlPreviewRows` muss mindestens `1` sein.

Zu große JSONL-Dateien werden im schreibgeschützten Vorschaumodus geöffnet und zeigen die ersten konfigurierten nicht leeren Zeilen. Die Oberfläche zeigt einen Hinweisbereich und ein festes **Read-only preview**-Badge. Andere Dateien oberhalb der Limits zeigen eine lesbare Ablehnungsmeldung, statt einen leeren oder nicht reagierenden Editor zu rendern.

Bei `.geojson`-Dateien werden `coordinates`-Arrays standardmäßig als kompakte schreibgeschützte Zusammenfassungen angezeigt. Dadurch werden große Geometriedaten nicht in Hunderttausende einzelne numerische Zellen expandiert.

## Aktuelle Grenzen

- JSONL-Vorschaumodus ist schreibgeschützt.
- GeoJSON-`coordinates`-Zusammenfassungen sind schreibgeschützt.
- XML-Elemente mit Kindelementen können ihren eigenen Wert nicht direkt bearbeiten.
- Hinzufügen, Löschen und Verschieben von Knoten wird noch nicht unterstützt.
- Die exakte ursprüngliche Formatierung bearbeiteter strukturierter Dokumente wird nicht garantiert.
- Speichern aus dem Grid kann die Formatierung über Parser/Serializer neu schreiben.

## Entwicklung

```sh
npm install
npm test
npm run lint
npm run build
```

Für lokale Erweiterungstests diesen Ordner in VS Code öffnen und nach `npm install` den Extension Host über den Debugger starten.

## Erweiterung Bauen

```sh
npm install
npm test
npm run build
npm run vscode:prepublish
vsce package
```

## VSIX von GitHub Herunterladen

Dieses Repository enthält einen GitHub-Actions-Workflow, der automatisch ein `.vsix`-Paket baut.

Wenn ein Versionstag wie `v0.1.0` gepusht wird, erstellt oder aktualisiert der Workflow das passende GitHub Release und hängt die erzeugte `.vsix`-Datei an die Release-Assets an.

## Release-Prozess

1. Version in `package.json` und `package-lock.json` aktualisieren.
2. Versionsänderung committen und pushen.
3. Einen Versionstag wie `v0.1.0` erstellen und pushen.
4. Auf den Abschluss des Workflows **Build VSIX** warten.
5. Die `.vsix`-Datei aus den Release-Assets herunterladen.

## Hinweise

- Das Build-Skript behält `NODE_OPTIONS=--openssl-legacy-provider` bei, passend zum Vue-CLI-4-Setup der Referenzerweiterungen auf modernen Node-Versionen.
- Vor dem Veröffentlichen `.vscodeignore` prüfen und mit `vsce ls` den Paketinhalt kontrollieren.
