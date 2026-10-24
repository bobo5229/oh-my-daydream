# S00-T02｜阅读器工程技术方案与位置

> 日期：2026-10-24\
> 状态：作者已批准方案 A 与推荐位置；最小工程骨架验证通过，已随 Stage 00 获作者验收\
> 输入：[内容审计](content-audit.md) · [Stage 00](stage-00-foundation.md#s00-t02) · [产品设计共识](../reader-design.md)

## 1. 已确认的选择

2026-10-24，作者在方案选择中明确采用 **方案 A：Astro + TypeScript 的本地静态阅读器**；采用问题中推荐的工程位置 `characters/sun-bo/maestro/reader/`。以独立只读模块加载原稿，生成章节和资料页面；进度、抽屉、偏好等交互使用浏览器脚本。

本次 `/goal` 已授权按 Stage、Task 顺序推进。需要作者补充的是总纲第 9 节明确保留的技术栈与工程位置选择，不是重新请求每个常规实现步骤的权限。选型时审计已完成静态检查，本次确认解除工程创建的阻塞；随后作者已明确验收包含审计在内的 Stage 00。

## 2. 已比较的方案

| 方案 | 内容与构建方式 | 对当前阅读器的好处 | 代价 |
| --- | --- | --- | --- |
| A．Astro + TypeScript（推荐） | Node 构建时读取原稿与 Markdown 结构，按路由输出静态 HTML；原生浏览器脚本承担局部交互 | 独立章节页面自然，正文可在脚本前显示，页面模板可复用，便于后续资料独立视图 | 增加 Astro 框架依赖；嵌入式 Interlude 仍需独立解析模块，不能只靠默认 Markdown 页面 |
| B．Vite + 原生 TypeScript | Node 预生成派生 JSON，Vite 打包浏览器阅读器；章节页由客户端路由／数据加载展示 | 原生 DOM 与交互状态集中，抽屉和模式切换容易共享状态，无 UI 框架依赖 | 需要自行维护路由、首次内容装载与导航状态；应用脚本失败时正文回退需额外设计 |
| C．原生 HTML/CSS/JavaScript + 小型 Node 静态生成脚本 | 构建脚本调用 Markdown 解析器与模板生成独立 HTML，本地静态 HTTP 预览 | 页面代码直接，没有前端框架；可控制所有生成步骤 | 页面模板、资源处理、监听重建和诊断都需自己维护；后续功能增多时自建工具成本较高 |

三个方案都只在本地运行，无账号、数据库、远端 API 或常驻业务服务要求；生产结果是静态文件。这里的技术适配判断是结合审计与产品目标的工程建议，不是框架官方对本项目的保证。

推荐 A 的理由是本项目以长篇正文、独立章节和资料文章为主，交互只占局部。Astro 官方将内容站点和默认少量客户端 JavaScript 列为主要设计方向；Vite 官方同时提供原生 TypeScript 起点，适合作为 B 的构建工具。[Astro 设计原则](https://docs.astro.build/en/concepts/why-astro/) · [Vite 入门](https://vite.dev/guide/)

## 3. 解析依赖建议

不论选择 A、B 或 C，都建议让内容接口独立于页面框架，避免把含章中 Interlude 的源文件直接变成不可分割的网页。

| 依赖或工具 | 建议职责 | 引入时机 |
| --- | --- | --- |
| TypeScript | 定义章节、源位置、派生片段与诊断的数据类型 | S00-T02 工程骨架，选型批准后 |
| `unified`、`remark-parse` | 将 Markdown 解析为可检查的语法树，保留源位置 | S00-T03 |
| `remark-gfm` | 支持 Lore 与参考资料中的表格等 GFM 语法 | S00-T03 |
| `remark-frontmatter` | 将资料文件开头的 YAML 块识别为独立节点，不展示为正文 | S00-T03；此时不解释未来阅读器 YAML 字段 |
| `remark-rehype`、`rehype-sanitize`、`rehype-stringify` | 在派生结构上生成安全 HTML，转义代码、过滤不允许的内容 | S00-T03 |
| Node 内置 `fs`、`crypto`、`test` | 只读加载、字节哈希、内容回归测试 | 从 S00-T03 起按需求使用 |
| YAML 解析与字段校验 | 未来阅读器关联元数据，和原稿 frontmatter 分开处理 | Stage 03；当前不先行锁定库或完整 Schema |

解析库按职责列出，具体安装与验证在对应 Task 记录。`remark` 以语法树检查和转换 Markdown；GFM 与 HTML 清理各有明确插件职责。[remark](https://github.com/remarkjs/remark) · [remark-gfm](https://github.com/remarkjs/remark-gfm) · [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize)

工程已核对注册表兼容要求并建立 lockfile：Astro `7.4.2`、`@astrojs/check` `0.9.12`、TypeScript `5.9.3`，类型检查工具接受 TypeScript 5 或 6，未选不匹配的 TypeScript 7。本机已有 Node `v24.13.0` 与 npm `11.6.2`，安装、类型检查与静态构建已实测通过。[Astro 安装要求](https://docs.astro.build/en/install-and-setup/)

## 4. 已确认的工程位置与隔离

选择 `maestro/reader/` 的原因是现有 Git 仅放行 maestro 子树，不必为工程扩大根目录跟踪范围，且原稿与代码能通过相邻目录明确隔离。这里是新增代码工程，不是把正文搬进代码目录。

```text
characters/sun-bo/maestro/
  chapters/                 # 既有原稿，只读
  lore.md                   # 既有 Canon，只读
  worldview.md              # 既有人物资料，只读
  reader-stages/            # 既有阶段计划、审计与决策记录
  reader/                   # 已获批准的工程
    package.json
    package-lock.json
    .gitignore              # 忽略 node_modules、dist 与框架缓存
    astro.config.mjs        # 仅方案 A
    tsconfig.json
    src/
      content/              # S00-T03 起的只读加载／解析模块
      pages/                # Stage 01 起的页面路由
    tests/                  # 内容保护与解析回归
    dist/                   # 构建产物，不跟踪
```

不在仓库根目录新增项目说明书；不覆盖既有根目录 Docsify `index.html`；不新增远端仓库或发布配置。Stage 00 的骨架只建立启动与检查所需文件，页面功能仍按 Stage 01 的 Task 顺序增加。

## 5. 只读数据与输出规则

1. 内容加载器的源根固定为工程相邻的 maestro 目录，按显式类别读取 `chapters/*.md`、`lore.md`、`worldview.md` 等已授权来源，不将整个目录递归发布。
2. 源文件只使用读取接口。BOM 去除、换行规范化、frontmatter 分离和 Interlude 识别全部在内存或派生结构上进行，不调用源文件写回路径。
3. 构建、缓存和派生输出限定在工程目录内部。解析模块与内容源路径不接受任意外部写入目标；安全校验在 S00-T05 验证。
4. 读取与构建前后对源文件路径集合及字节哈希进行核对，检测文件增加、删除或变动；长期运行不把本次审计哈希当作禁止作者编辑原稿的永久锁。
5. 当前 5 章与 3 篇 Interlude 必须保持来源映射。识别有歧义时保留可阅读原文并报告，不能为了通过构建而丢弃节点。
6. 网页读取构建产物；进度和偏好保存在浏览器本地。没有编辑原稿或反向同步能力。
7. 本地预览绑定回环地址。现阶段不注册托管 Site、不上传小说、不部署；发布需要单独明确目标与授权。

## 6. 批准方案 A 后的预期命令

以下为本地运行命令；依赖安装、静态健康入口与基础检查的实测结果在决策记录中更新。`test` 在 S00-T03 建立实际回归后提供。

```powershell
Set-Location D:\VSCode\DayDream\characters\sun-bo\maestro\reader
npm ci
npm run dev -- --host 127.0.0.1
npm run check
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

首次建立 lockfile 时执行 `npm install`；之后用 `npm ci` 按锁定依赖重建。`check` 负责类型／工程检查，`test` 负责已实现的内容回归，`build` 只生成工程内 `dist/`。每项脚本随相应 Task 落地后才记录实测证据，不添加空脚本充当验证结果。

Stage 00 先交付独立内容接口与测试。Stage 01 接入页面前，再应用已有产品共识中的中文阅读布局；Stage 02 完成主题和排版设置。框架选择不替代这些功能的逐项验收。

## 7. 当前验收与下一步

- 已有：3 个方案的比较、依赖职责、推荐目录与只读数据流，以及批准后的预期启动方式。
- 已决定：方案 A，工程位置 `characters/sun-bo/maestro/reader/`。
- 已完成：最小工程骨架、依赖锁定、类型检查、静态构建与本地开发健康检查；Interlude 算法和未来 YAML 字段仍由对应 Task 处理。
- 顺序：S00-T01 审计已检查，S00-T02 选型已确认；完成最小骨架验证后进入 S00-T03。后续抽屉、默认阅读模式等未定项到对应 Task 再讨论。

## 8. 决策记录

| 项目 | 当前值 |
| --- | --- |
| 作者选择 | 方案 A：Astro + TypeScript |
| 工程位置 | `characters/sun-bo/maestro/reader/` |
| 批准日期 | 2026-10-24 |
| 依赖安装／基础启动证据 | 骨架阶段安装 267 个包；`npm run check` 0 errors／warnings／hints；`npm run build` 生成 `dist/status.json`；`npm run dev -- --port 4321` 启动后 `/status.json` 返回 HTTP 200 与 ready 状态。源文件 16 项字节哈希不变。 |
