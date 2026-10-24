# 《总谱》私人阅读器工程

Astro + TypeScript 本地静态阅读器，已实现正文、双模式、时间线、Lore、偏好设置和媒体／图库接口。当前内容为 6 章、3 篇 Interlude、31 个有来源实体；正式视觉资产为空。原稿继续放在相邻的 `../chapters/` 等既有路径中。阶段证据见 [工程验收报告](../reader-stages/acceptance-report.md)。

## 启动与验证

需要 Node.js 24.12 或更新版本、npm 9.6.5 或更新版本。以下命令在本目录执行：

```powershell
npm ci
npm run check
npm test
npm run content:check
npm run test:browser
npm run build
npm run dev
```

开发地址以终端输出为准，默认 `http://127.0.0.1:4321/`；打开根地址即可阅读，`/status.json` 用于健康检查。构建后可用 `npm run preview` 本地预览。开发与预览均绑定回环地址，没有托管注册或部署步骤。

`npm run check` 检查类型；`npm test` 使用 Node 原生 TypeScript 与测试工具；`content:check` 输出真实内容清单、来源映射及诊断；`build` 先校验内容，再受保护地构建到本工程 `dist/`。不接受通过附加构建参数改变输出路径。

## 日常使用

- `/`：无正文进度时显示首页，有有效正文进度时直接继续；`/home/` 始终显示作品首页。
- `/read/chNN/`：正文；顶部和左侧目录均可选纯小说／完整编年。模式在正文内原地切换，不强迫回头补读档案。
- `/contents/`：按当前模式展示正式目录；`/interlude/interlude-NN/`：正式编年档案。
- 右上「资料」：行业编年与 Lore。手动浏览时期后暂停跟随，点「返回当前故事时间」恢复。资料可展开为宽阅读视图，关闭后保留正文与抽屉位置。
- 「设置」：跟随系统／浅色／深色；字号 16–26px，行距 1.50–2.30；恢复默认排版为 18px／1.85。
- `/gallery/`：视觉资料库，也可从首页或左目录进入。当前为空；不展示测试图或编造作品素材。
- 大图支持按钮、滚轮、键盘 `+`／`-`／`0` 与方向键，以及拖动／双指缩放。`Esc` 关闭顶层覆盖视图。

右侧宽约 440px，窗口达到 1360px 时并排，空间不足时覆盖；左／右抽屉互斥。正文目标宽 780px，窄屏使用两侧留白。窄屏原资料表格可自身横向滚动，支持键盘聚焦。

浏览器进度和偏好保存在本机，按来源地址隔离。日常固定使用同一主机名和端口（如 `127.0.0.1:4321`）；换成 `localhost` 或其他端口会使用另一组浏览器记录。

| 存储键 | 用途 |
| --- | --- |
| `maestro.novel-progress.v1` | 唯一正文进度：章节、稳定块、块内比例及回退位置 |
| `maestro.reading-preferences.v1` | 三态主题、字号与行距 |
| `maestro.reading-mode.v1` | 纯小说／完整编年偏好 |

Interlude、Lore 和图库不写正文进度。存储损坏或禁用时仍可阅读；禁用时无法承诺跨次访问记忆。

## 内容和索引维护

1. 在相邻 `../chapters/` 增加 `chNN.md`，无需新增页面模板。正文直接从文本起笔，不为阅读器添加 YAML。
2. 运行 `npm run content:check`，检查章节、块锚点、档案与增强数据诊断。
3. 在 `data/timeline.yaml` 维护有出处的故事阶段／场景关联，在 `data/reading-order.yaml` 更新两套正式编排。未更新的新章节仍被发现，旧编排失配时会警告并回退到完整源顺序。
4. 新实体在 `data/entities.yaml` 建立有来源的记录；章节自动名称识别可通过 `entity-overrides.yaml` 补充、排除或消解重名。原资料标题改动后同步索引，不把新文字写回 Lore。
5. 已确认图片放在作品 `../assets/` 或章节目录中，登记 `data/assets.yaml`；Markdown 原有本地图片会自动发现。可选插图位置与档案模块分别维护在另外两份 YAML。
6. 运行类型、单元、相关浏览器检查，再 `npm run build`。索引字段与示例见 [data/README.md](data/README.md)。

原稿里每行都带 `>` 的独立加粗 `Interlude NN｜时期标签` 可被提取；允许紧接斜体副标题。重复编号是构建错误；不支持的引用格式会留在原位并警告。

## 验证与故障定位

`npm run test:browser` 使用本机 Chrome（`playwright.config.ts` 的 `channel: chrome`），不自动下载浏览器。测试截图和失败 trace 留在忽略目录 `.impeccable/review/`、`test-results/`。已核验 Windows Chrome；没有把这些检查描述成 Firefox／Safari 真机验收。

| 现象／诊断 | 处理 |
| --- | --- |
| `FALLBACK_CHAPTER_TITLE` | 原章无 H1 时使用编号标签；不必为此改原稿 |
| YAML／实体／场景／模块失配 | 看诊断文件名和代码，修正索引；可选增强失效时保留原文字 |
| `READING_ORDER_FALLBACK` | 补齐或修正正式编排；回退序列会覆盖全部真实正文与档案 |
| `ASSET_UNAVAILABLE` | 检查文件、关联路径与 SVG 支持范围；缺图显示占位，正文继续可读 |
| 内容编码损坏、重复编号或源片段不完整 | 构建会停止；检查原始文件与诊断，不用脚本自动覆盖或截断原稿 |
| 构建报告源文件变化 | 保留现场；先确认是否与作者编辑同时发生，再重新构建，不自动回滚源文件 |
| 看似失去进度 | 核对浏览器、主机名和端口；损坏位置会按块序号或比例回退 |

回退增强改动时，先恢复相应 YAML 的上一份有效版本，或保留合法的空 `assets`／`placements`／`modules` 数组，再验证构建。不要用删除原段落的方式解决索引问题；不要清空浏览器存储来代替定位故障。

## 内容读取契约

统一入口位于 `src/content/index.ts`：

```typescript
import { loadReaderContent, assertUsableContent } from './src/content/index.ts';

const content = await loadReaderContent();
assertUsableContent(content);
const chapter = content.chapters.find(item => item.id === 'ch03');
// chapter.novel.html：纯小说内容；chapter.html：含嵌入式档案的原始章节展示。
// content.interludes：派生档案；chapter.segments：完整源片段及分段视图。
```

默认源根为当前工作目录的父目录，因此 npm 命令必须从 `reader/` 运行；独立调用者可显式传入 `{ sourceRoot: absolutePath }`。加载器只扫描源根 `chapters/chNN.md`，按编号排序；新增真实章节自动进入清单。它不扫描节拍、未来规划或历史审查文件作为小说。

| 字段／模型 | 契约 |
| --- | --- |
| `ReaderContent.status` | `ready` 没有诊断；`degraded` 有警告但可阅读；`invalid` 有错误，`assertUsableContent` 会阻止构建 |
| `chapters` | 按数值顺序的 `DerivedChapter[]`，包含稳定 `id`、`ordinal`、源有章标题或编号标签 |
| `source` | 相对路径、含 BOM 的 `raw`、仅去 BOM 的 `markdown`、原字节数与 SHA-256；不规范化后写回原稿 |
| `tree`、`blocks`、`html` | Markdown 结构、顶层内容块与安全 HTML；代码被转义，原始脚本／危险 URL 不执行，资料 frontmatter 不作为正文显示 |
| `novel` | 去掉可靠识别 Interlude 后的派生正文视图；未识别的引用继续显示 |
| `interludes` | 派生 ID、编号、原有标题、源章节、源范围、原始引用片段和去掉外层引用的独立 HTML |
| `segments` | 按源顺序排列的小说／档案片段，含原始间隙、BOM 和分隔线；所有 `raw` 直接拼接必须逐字节重建原稿 |
| `diagnostics` | `severity`、`code`、相对文件路径、原因及可选源位置；编码损坏、重复编号与完整性失配有明确错误 |

## 标识与位置

- 章节 ID 来自真实文件名，如 `ch03`，不依赖标题或索引表格。缺标题时使用“第三章”等编号标签，不新增故事章名。
- 可识别的档案使用 `interlude-01` 等编号 ID；全书编号重复时，相关引用都保留原位并报错，不静默挑选一篇。
- 内容块 ID 为 `r-章节ID-b-散列`。散列取块内 Markdown 去首尾空白、统一换行后的 SHA-256 前 16 位；前插其他段落不会改变未编辑块的 ID。相同块按出现次序加后缀并警告，截短散列冲突则报错。
- 安全 HTML 的可见顶层块带对应 `id`。元数据和引用定义等不单独显示的节点仍有源映射，但不保证独立 DOM 元素。稳定 ID 用于阅读定位；源行号只用于诊断。
- `SourceSpan.start.offset`／`end.offset` 是原始解码字符串中的 UTF-16 下标，包含 BOM 偏移，结束位置不含尾字符；不是 UTF-8 字节下标。行、列对应去 BOM 后的 Markdown 视图。字节完整性使用 `byteLength` 和 SHA-256 核验。

## Interlude 识别与回退

只识别顶层引用块：首行是独立加粗的 `Interlude NN｜原有时间标签`，允许下一行紧接斜体副标题，之后需要实际内容。整个源块各行都须显式带 `>`。时间标签按原文保存，不推断事件日期、故事阶段或正式阅读顺序。

普通引用、代码样本不提取；未知标题形式、只有标题的空档案、未带引用标记的懒续行会保留在小说原位置并诊断。引用后的空行和分隔线保留在小说源片段；ch01 的 BOM 前缀可能形成没有显示内容的小说片段，后续导航应依据可见内容判断，不把它当独立篇目。

本次真实位置：Interlude 01 在 ch01 L1–L12；02 在 ch03 L29–L38，前后都有正文；03 在 ch05 L3–L12。位置是当前审计证据，不是解析硬编码。

## 构建与源文件保护

解析模块仅使用文件读取接口。`scripts/build.ts` 限制输出与缓存路径位于工程内，检查目录链接不能将输出指向外部；构建前后核对源根顶层文件、`chapters/` 和可选 `assets/` 的路径集合及字节哈希。源目录链接不被跟随。

发现文件增加、删除或内容变化时构建失败并保留现场，不自动恢复文件；构建同期的作者编辑也会被报告。快照每次重新建立，允许作者在两次构建之间正常维护原稿。依赖、框架缓存、构建产物与临时结果由本工程 `.gitignore` 排除。

## Stage 00 验证记录

2026-10-24：类型检查通过，0 errors／warnings／hints；18 项测试全部通过，覆盖真实五章、三处提取、逐字节重组、常见 Markdown、异常回退、稳定锚点、契约失配检测、源变动检测和输出链接越界。静态构建及开发健康检查通过；审计中的 16 份源文件 SHA-256 均保持不变。

上述为 Stage 00 历史记录。当前 ch01–ch03 仍使用编号章标题，3 条 FALLBACK_CHAPTER_TITLE 警告属于已知回退；后续结果以工程验收报告为准。作者已验收 Stage 00，并授权后续自动检查通过后依序推进；工程检查不冒充长期人工阅读体验。
