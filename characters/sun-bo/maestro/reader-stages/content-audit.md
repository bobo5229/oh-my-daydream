# S00-T01｜现有内容与风险清单

> 审计日期：2026-10-24\
> 状态：审计已交付、自检通过，已随 Stage 00 获作者验收；后续工程验证见 [内容契约](../reader/README.md)\
> 依据：[Stage 00](stage-00-foundation.md#s00-t01) · [产品设计共识](../reader-design.md)

## 1. 结论与范围

现有可读小说为 `chapters/ch01.md` 至 `chapters/ch05.md`，共 5 章；已写 Interlude 共 3 篇，均嵌入章节引用块。ch03 的 Interlude 位于章中，前后都有小说正文。没有独立 Interlude 正文文件，也没有可复用的图片、SVG、封面或字体文件。

本次只读取源文件并建立清单，不修复索引、不拆分章节、不新增故事设定、不初始化前端。下表路径相对于 `characters/sun-bo/maestro/`；行号只作为本次审计证据，不能用作运行时内容标识。

## 2. 章节文件清单

| 源路径 | 字节数 | 行数 | 标题现状 | 编码与换行 |
| --- | ---: | ---: | --- | --- |
| [chapters/ch01.md](../chapters/ch01.md) | 11,154 | 106 | 无 H1；目录可用既有“第一章”标签 | UTF-8 BOM，CRLF |
| [chapters/ch02.md](../chapters/ch02.md) | 14,906 | 163 | 无 H1；目录可用既有“第二章”标签 | UTF-8 BOM，CRLF |
| [chapters/ch03.md](../chapters/ch03.md) | 22,605 | 206 | 无 H1；目录可用既有“第三章”标签 | UTF-8，CRLF |
| [chapters/ch04.md](../chapters/ch04.md) | 28,174 | 213 | L1：第四章｜一根不肯工作的管道 | UTF-8，CRLF |
| [chapters/ch05.md](../chapters/ch05.md) | 21,140 | 174 | L1：第五章｜一封发出去的邮件 | UTF-8，CRLF |

5 章均无 YAML frontmatter。小说清单必须以真实章节文件为准；没有 ch06 或更后的正文，不从节拍或未来规划生成虚假章节。

## 3. 嵌入式 Interlude 对照

| 派生候选 | 源路径 | 引用块范围 | 在本章的位置 | 源有标题所述时间 | 相邻结构 |
| --- | --- | --- | --- | --- | --- |
| Interlude 01 | `chapters/ch01.md` | L1–L12 | 篇首，没有前置小说正文 | 2021 年 9 月 | L13 空行，L14 分隔线，L15 空行，L16 起小说正文 |
| Interlude 02 | `chapters/ch03.md` | L29–L38 | 章中；L1–L27 已有小说正文 | 2022 年 1 月 | L28 空行；块后 L39 空行，L40 分隔线，L41 空行，L42 起接续正文 |
| Interlude 03 | `chapters/ch05.md` | L3–L12 | 章标题之后、小说正文之前 | 2021 年 12 月—2022 年 3 月 | L1 章标题，L2 空行；块后 L13 空行，L14 分隔线，L15 空行，L16 起小说正文 |

三块均以 `> **Interlude NN｜…**` 开始，下一行紧接斜体副标题，CommonMark 会把这两行合成同一个段落。每一行都有引用标记，包括空引用行。引用块后的分隔线是独立源内容，其归属不能通过“删掉 Interlude 附近若干行”处理。标题里的时间只记录原文标签，不能直接代替故事时间、关联阶段或阅读编排位置。

在这 5 章中没有其他引用块；资料和写作文件中存在普通引用块。后续仍需要人工构造普通引用、未知 Interlude 格式、相邻引用等测试样本，不能把当前章节中的“所有引用”都认作 Interlude。

本节是 S00-T01 的位置清单。S00-T03 至 S00-T05 随后已实现语法树识别、分隔线归属和内容散列锚点，规则与验证见工程内容契约；源文件未物理拆分。

## 4. 资料与控制文件

| 路径 | 字节数／行数 | 用途与边界 |
| --- | --- | --- |
| [chapters-index.md](../chapters-index.md) | 9,342／70 | 章节摘要、时间检索参考；L11–L17 链接覆盖全部 5 章，不能当作严格结构化清单 |
| [lore.md](../lore.md) | 24,909／238 | 企业、基础模型、Harness、产品与技术时间线的 Canon；L1–L3 有 frontmatter |
| [worldview.md](../worldview.md) | 5,762／56 | 人物设定与人物状态的权威资料；L1–L9 有 frontmatter |
| [lore-maintenance.md](../lore-maintenance.md) | 4,241／57 | 设定维护规则，仅供开发核对边界，不能自动发布为 Lore 条目 |
| [industry-timeline.md](../industry-timeline.md) | 3,157／24 | 行业事件检索参考，含小说当前进度之后的已定行业事件及明确未定项；不等于已写 Interlude |
| [character-growth-timeline.md](../character-growth-timeline.md) | 14,173／89 | 人物成长台账与写作参考，不生成虚构正文或自动推断新增 Canon |
| [future-arcs.md](../future-arcs.md) | 12,567／68 | 后续规划与约束，不属于已写章节 |
| [beats.md](../beats.md) | 14,807／117 | 本轮写作节拍，不是阅读器章节 |
| [interlude-anti-defensive-writing.md](../interlude-anti-defensive-writing.md) | 12,309／151 | Interlude 写作规则，不是行业档案原文 |
| [ch02-fidelity-review-2026-10-21.md](../ch02-fidelity-review-2026-10-21.md) | 6,463／96 | 历史审查意见，不属于小说或 Lore 正文 |
| [reader-design.md](../reader-design.md) | 15,437／228 | 产品共识，约束工程；不是小说 Canon 或阅读内容 |
| `reader-stages/README.md`、`TASKS.md`、`stage-00` 至 `stage-07` | 10 个规划文件 | 执行路线与状态，不进入阅读内容；本次审计新增文档同理 |

上述文件除 ch01、ch02 外均为不带 BOM 的 UTF-8，换行为 CRLF。读取可以在内存中处理 BOM 与换行，但不能据此重新保存源文件。

## 5. 实际 Markdown 形态

| 形态 | 发现位置 | 后续解析要求 |
| --- | --- | --- |
| 普通中文段落、空行 | 全部章节 | 维持段落顺序，不按换行或标点擅自切改文本 |
| ATX 标题 | ch04、ch05、各类资料 | 标题可用于展示；缺失时不得取 Interlude 标题充当章名 |
| 引用与加粗 | 三处 Interlude；普通资料引用 | 在结构节点上区分候选；普通引用原样保留 |
| 行内代码 | ch01–ch04、Lore、摘要等 | 保留代码文本、标点及 HTML 转义，避免当作标签执行 |
| 水平分隔线 | ch01 L14、ch03 L40、ch05 L14，以及资料文件 | 区分正文分隔线与文件起始 frontmatter |
| GFM 表格 | Lore、章节索引、行业索引、成长台账 | 需要表格支持；不能假设已有表格始终列数齐整 |
| 无序／有序列表、相对 Markdown 链接 | 资料文件 | 保留层级，校验目标，后续再映射阅读器路由 |
| YAML frontmatter | Lore、worldview | 与正文节点分离；不要求给章节补 frontmatter |
| 图片、SVG、围栏代码块、原始 HTML 块 | 本故事现有 Markdown 未发现 | S00-T03 以合成样本验证图片与代码；缺少真实样本不等于未来不支持 |

这里的 Markdown 盘点使用只读文本扫描，尚未构成 Markdown AST 解析验收。强调嵌套、转义、懒续行引用与完整图片语法仍需由选型后的解析器测试覆盖。

## 6. 资源与已有工程

- 故事目录没有图片、SVG、字体文件；对工作区排除 `.git` 后按常见图片／字体后缀补查，也没有发现资产。现有 Markdown 没有内嵌图片引用，因此目前没有“已引用但丢失”的图片路径。
- 不能为填充图库发明人物图、Logo 或技术图；Stage 06 可先接受真实空集，再接入作者提供的资产。
- 仓库根目录 `index.html` 是既有 Docsify 通用预览入口，默认打开 `AGENTS.md`，通过外部 CDN 加载依赖；它不是《总谱》阅读器，且被现有 Git 忽略规则排除。保留此入口，不在其上直接扩建。
- 根目录没有包清单或构建配置；`scripts/` 中仅发现 `count-chars.ps1`，没有现成阅读器解析接口。
- 当前 Git 只放行 `characters/sun-bo/maestro/`。工程若放到根目录新文件夹将被忽略；若放到 `maestro/reader/`，需在工程内忽略依赖、缓存和生成产物。
- 本机只读探测：Node.js `v24.13.0`、npm `11.6.2`、Python `3.13.11`。这些是可用工具记录，不代表框架选型已确定或安装已验证。

## 7. 数据流边界

```text
chapters/*.md ───────────────┐
lore.md、worldview.md ───────┼─ 只读加载 → Markdown 结构与源映射 → 派生数据 → 阅读页面
已有参考索引 ── 校验、参考 ──┘                              ↑
未来外部 YAML、真实视觉资产 ───────────── 展示／关联增强 ─────┘

阅读进度、主题、排版偏好 → 浏览器本地存储
诊断、缓存、构建产物     → 获批准的工程目录内
```

箭头不反向连接到原稿。章节清单来自真实文件；既有索引仅作为核对来源。派生 Interlude 继续追溯所属章节和原始片段；未来 YAML 不反向改写 Canon。网页不默认暴露节拍、历史审查意见和维护规则。

## 8. 风险与交接

| 风险 | 证据 | 对后续 Task 的约束 |
| --- | --- | --- |
| BOM 使首个标记匹配失败 | ch01、ch02 有 UTF-8 BOM | 内存解码明确处理 BOM；保留源字节和哈希 |
| 章标题缺失或重名 | ch01–ch03 无 H1 | 先用既有章节编号兜底；稳定章节 ID 不依赖标题 |
| 将章中 Interlude 误作章首 | ch03 L29–L38 | 验证前后正文、切片覆盖与阅读位置映射 |
| 引用边界或分隔线误删 | 三处引用块后均有 `---` | 派生切片必须完整覆盖源内容；未知格式原样保留并诊断 |
| 索引不能直接作为严格表格数据 | 章节索引 L9–L10 为 5 列，L11–L13、L15、L17 仅 4 列，中间还有空行 | 不按固定列下标提取章节名、字数或摘要；先扫描真实章节，不改索引 |
| 旧索引分类与现有文件不一致 | ch05 存在，但其细化摘要仍位于“后续章节衔接规划”下 | 不按大标题判断章节是否已写；不把旧字数当实时统计 |
| 时间语义混用 | Interlude 03 跨月；行业索引包含未来事件 | 故事时间、事件时间、关联阶段、正式阅读编排分别建模，字段等待 Stage 03 决策 |
| 将写作资料误发布成小说 | 多份维护、节拍与规划 Markdown 同目录 | 建立来源白名单和分类，不能把整个故事目录直接当文章集合 |
| 源行号随编辑漂移 | 各章是持续维护的 Markdown | 行号只用于诊断；稳定锚点策略留至解析／契约 Task 决定 |
| 资源与离线字体为空 | 没有本地资产 | 先使用系统中文字体与文字首页；不强依赖远程 CDN |
| 构建范围污染写作目录 | Git 仅跟踪 maestro 子树；根目录已有通用预览 | 工程目录单独隔离，输出目标受约束；不复用写作文件作缓存 |

## 9. 检查结果与复核入口

- 文件核对通过：仅发现 ch01–ch05，5 个章节索引链接均有真实目标；并检查章节索引、行业索引、Lore、worldview 的 Markdown 本地链接目标存在。
- 位置核对通过：3 个 Interlude 标题对应上表连续引用块；ch02、ch04 没有 Interlude，ch03 有前置与接续小说段落。
- 编码检查通过：全部被盘点文件可按 UTF-8 解码，BOM 与 CRLF 按文件记录。
- 资产补查结果：常见图片、SVG、字体后缀命中 0 个；不是对压缩包或任意二进制内嵌资产的扫描。
- 原稿保护：下列 SHA-256 为读取时的字节基线；交付前逐项重算并与此表比对。本文不添加新的解析器测试或前端构建脚本。
- S00-T01 交付时尚未执行框架安装或 AST 解析；随后作者已选择方案 A，S00-T02 至 S00-T05 的接口、构建与自动检查已完成，证据见工程内容契约。Stage 00 没有阅读页面，未进行浏览器视觉验收。

可在故事目录使用以下只读命令复核章节与哈希；命令本身不写文件：

```powershell
Get-ChildItem -LiteralPath .\chapters -File -Filter *.md | Sort-Object Name
Get-ChildItem -LiteralPath . -File -Filter *.md | Get-FileHash -Algorithm SHA256
Get-ChildItem -LiteralPath .\chapters -File -Filter *.md | Get-FileHash -Algorithm SHA256
```

| 源路径 | SHA-256 |
| --- | --- |
| `chapters/ch01.md` | `cba4d4d2c6a8d6110bde500df7d7a7245e8e58e2911e03723f77a16fc935c730` |
| `chapters/ch02.md` | `5ae05c447c44c2b3e306e52f0533dd60ae39eb75002e649d7476b6faac8d39e5` |
| `chapters/ch03.md` | `ccaa3db2bfeb416530bdbf8f16220c78ffd65b128b1bf4ed1a1f9bb15a175332` |
| `chapters/ch04.md` | `179d1d3cfdcf5e59198995f5df119d8cdf07bdfff62418a403a5ead9dc4de7f1` |
| `chapters/ch05.md` | `2cd763666a7455bbeff6a954d31eb3fc4475a9cc52fada51a12b485ba618c985` |
| `chapters-index.md` | `fb1416b7fd6c8e63cf65d0c21b151e640076e1598155ba72a87b155c382b8af7` |
| `lore.md` | `365220adcf1c1635aef0c88aa4efcc86b9f79fa3b420a5738f8f915bb788fb7a` |
| `worldview.md` | `3b9fdad13a83308712232a0551b1e636052cfb193a01a3155dcee8574a4cd811` |
| `lore-maintenance.md` | `2eca47891706f86f4dac7437ebb9fc656d046e5c48fee18874def1728f32495c` |
| `industry-timeline.md` | `d5ab3140e0155ce5bd3a66d19572048e549062dcd933acc6acb7a86b30d83e3e` |
| `character-growth-timeline.md` | `1b37cde7f426546e1d68fa3cb6d6bb7188ce1024308012c6d1524268abd5da6b` |
| `future-arcs.md` | `e088a6e7ea1eb429a586b9b47d00bcba73329826f7e8879f7be7fd77e04a552d` |
| `beats.md` | `1dbc29c350df585b9c5107e1a2ba13976164bd69c6a45fd2f4b891c719695f61` |
| `interlude-anti-defensive-writing.md` | `c7d9d4cc2441e3e9bd3db6f9160564da11a13174d047821e4cd91342e6f1d6ff` |
| `ch02-fidelity-review-2026-10-21.md` | `9da44c0c1504dcf51dc00b7977e890fe5e2069b643cab3f0c37fbdc323c09796` |
| `reader-design.md` | `efecd7ed5975b8633fefe26d0cc913ebf0a9bf01adf1561aeccd5b794326f25b` |
