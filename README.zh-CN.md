# Tiny Grid Viewer

语言：[English](README.md) | [中文](README.zh-CN.md) | [Deutsch](README.de.md)

Tiny Grid Viewer 是一个 VS Code 扩展，用递归网格方式打开 XML、JSON、JSONL、JSONC、GeoJSON、YAML、INI、TOML 以及 `tree` 命令输出文件。项目受 [`json-grid-viewer`](https://github.com/dutchigor/json-grid-viewer) 启发，界面使用 Vue webview。

## 功能

- 以嵌套网格显示结构化数据：对象、数组、XML 元素、INI section、TOML table 和 tree 节点都可以递归展开。
- 支持 `.xml`、`.xsd`、`.svg`、`.wsdl`、`.json`、`.jsonc`、`.geojson`、`.jsonl`、`.yaml`、`.yml`、`.ini`、`.cfg`、`.conf`、`.config`、`.properties`、`.toml` 和 `.tree`。
- XML 属性显示为 `@attribute` 行，同时显示文本、注释、CDATA 和 processing instruction。
- XML 中重复的同名兄弟元素会合并显示为 `Array[n]`。
- 数组支持列表视图和表格视图切换。
- 在完整加载文档时支持标量 cell 编辑。
- 支持拖动边框调整列宽、双击自适应列宽。
- 支持递归展开、Shift 点击深度展开、搜索 overlay 和 viewport minimap。
- 通过可配置限制、JSONL 预览模式和 GeoJSON 坐标压缩，避免大文件卡死 VS Code。

## 使用

打开受支持的文件后，在编辑器或资源管理器右键菜单选择 **Open With... > Tiny Grid Viewer**。

双击可编辑 cell 可以直接修改值。

XML 编辑支持元素名、processing-instruction 名称、属性、叶子节点值、文本节点、注释、CDATA 和 processing-instruction 值。JSON、JSONL、YAML、INI 和 TOML 当前支持标量值编辑。tree 命令输出是只读的。

## 大文件

Tiny Grid Viewer 会构建递归 grid model 并发送到 VS Code webview。这里没有一个通用的绝对文件大小上限：深层嵌套文件或包含大量坐标的文件，可能用不大的字节数生成非常多的 grid 节点。

默认保护参数：

- `tinyGridViewer.maxFileSizeMB`: `100`
- `tinyGridViewer.maxJsonlRows`: `1000000`
- `tinyGridViewer.maxGridNodes`: `1000000`
- `tinyGridViewer.jsonlPreviewRows`: `1000`

除了 `tinyGridViewer.jsonlPreviewRows` 必须至少为 `1`，其他保护参数可以设为 `0` 表示关闭。

超大的 JSONL 文件会以只读预览模式打开，只显示前面配置数量的非空行。界面会显示说明面板，并在右上角固定显示 **Read-only preview** 徽标。其他超过限制的文件会显示可读的拒绝信息，而不是尝试渲染一个空白或无响应的编辑器。

对于 `.geojson` 文件，`coordinates` 数组默认显示为只读摘要，避免大型几何数据展开成几十万甚至更多数字 cell。

## 当前限制

- JSONL 预览模式是只读的。
- GeoJSON `coordinates` 摘要是只读的。
- 包含子元素的 XML 元素不能直接编辑自身 value。
- 暂不支持新增、删除、移动节点。
- 编辑后的结构化文档不保证保留原始格式。
- 从 grid 保存时，格式可能会被 parser/serializer 重写。

## 开发

```sh
npm install
npm test
npm run lint
npm run build
```

本地调试扩展时，先执行 `npm install`，然后用 VS Code 打开本目录并从调试器启动 Extension Host。

## 构建扩展

```sh
npm install
npm test
npm run build
npm run vscode:prepublish
vsce package
```

## 从 GitHub 下载 VSIX

仓库包含 GitHub Actions workflow，会自动构建 `.vsix` 包。

推送类似 `v0.1.0` 的版本 tag 后，workflow 会创建或更新对应的 GitHub Release，并把生成的 `.vsix` 文件附加到 Release assets。

## 发布流程

1. 更新 `package.json` 和 `package-lock.json` 中的版本号。
2. 提交并推送版本更新。
3. 创建并推送类似 `v0.1.0` 的版本 tag。
4. 等待 **Build VSIX** workflow 完成。
5. 从 Release assets 下载 `.vsix` 文件。

## 说明

- 构建脚本保留了 `NODE_OPTIONS=--openssl-legacy-provider`，与参考扩展在现代 Node 版本下使用 Vue CLI 4 的做法一致。
- 发布前建议检查 `.vscodeignore`，并使用 `vsce ls` 确认打包内容。
