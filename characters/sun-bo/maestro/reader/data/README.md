# 阅读器增强索引

YAML 只描述显示与关联，不修改相邻的小说和世界观。字段 ID 必须指向内容加载器的真实清单；不使用源行号定位。

`timeline.yaml` 的 `version` 为 1：

- `stages`：有序故事阶段，`id`、`label`、`source`（事实出处）。阶段不必等于自然月。
- `chapters`：`chapterId` 与默认 `stageId`；可选 `scenes` 以正文稳定 `anchorId` 覆盖后续场景的阶段，按实际内容块排序。
- `interludes`：`interludeId`、原文的 `eventPeriod` 和查阅关联 `stageIds`。关联到四月不表示四月有新发布事件。

故事阶段、行业事件时期、档案关联各自独立；这里不定义正式编年阅读顺序。失配增强会警告并忽略；无关联档案仍能查阅，原文不截断。修改段落后如锚点失效，运行 `npm run content:check` 查诊断，再从内容清单选取新锚点。未标注的新章节仍可阅读，不自动猜测其时间。

## 各文件职责

| 文件 | 维护内容 |
| --- | --- |
| `timeline.yaml` | 故事阶段、章节默认、场景覆盖、行业事件时期与档案查阅关联 |
| `reading-order.yaml` | 两套正式阅读顺序，独立于任何日期排序 |
| `entities.yaml` | 有来源的实体、类型、规范名、别称、原文摘录选择与相关条目 |
| `entity-overrides.yaml` | 每章名称识别的补充、排除与重名消解 |
| `assets.yaml` | 单一源视觉资产及人物／章节／档案关联 |
| `illustrations.yaml` | 在正文稳定块之后放入已确认插图 |
| `visual-enhancements.yaml` | 可选的 Interlude 时间线、摘录卡片、图片或技术图表 |

均使用 `version: 1`。不使用 YAML 锚点／别名；重复键或解析错误会诊断并降级，不执行 YAML 中的代码。ID 使用英文小写、数字和连字符。

## 正式编排

`novel` 是章节 ID 数组。`chronicle` 每项只指定一种引用：`{ chapter: chNN }`、`{ segment: chNN-novel-N }` 或 `{ interlude: interlude-NN }`。完整编年必须恰好覆盖全部小说块及每篇档案，并保持小说块次序。ch03 通过两个源派生片段夹入 Interlude 02；不编辑、不复制维护正文。

新增／删除章节后旧序列不完整时，阅读器会警告并使用完整源顺序。恢复精确编排只需修正 YAML，无需改组件。空的 BOM 前缀不成为独立阅读节点。

## 实体与章节修正

`sources` 将短 ID 映射到 `lore.md` 或 `worldview.md` 的精确标题；来源片段持续到下一个同级或更高标题。实体包含 `id`、`type`、`name`、`aliases`、`source`、`related`，可选 `excerptMatch`。名称与别称必须在来源中可核对；摘录直接取包含选择文字的原段落或列表项，不生成新简介。

类型：`person`、`company`、`model`、`harness`、`product`、`technology`。不把现实对标公司当别名，不把网页产品当基础模型。缺摘要可查看完整来源，缺图不补造。

章节修正每项包含 `chapterId`，可选 `include: [id]`、`exclude: [id]`、`resolve: { 歧义名称: 选定ID }`。排除在补充后应用。扫描避开代码、内联代码、HTML 和图片地址；优先最长名称，英文词内不匹配，极短别称不自动识别。同名未消解时不擅自选择单个实体。

## 资产、插图与模块

正式素材当前为空；以下是字段格式，不能直接当作已存在的作品素材。

```yaml
version: 1
assets:
  - id: approved-diagram
    type: diagram
    file: assets/approved-diagram.svg
    alt: 作者确认的图像说明
    caption: 可选图注
    entityIds: [已存在的实体ID]
    chapterIds: [已存在的章节ID]
    interludeIds: [已存在的档案ID]
```

图像类型：`character`、`scene`、`logo`、`diagram`。支持 PNG／JPEG／WebP／GIF／AVIF 和无脚本、无外部引用的自包含 SVG。文件限定在作品 `assets/` 或 `chapters/` 内，不跟随文件／目录链接，不下载远端图片。每个源文件只有一个索引与 `/media/ID.扩展名` URL，可被多个视图复用。Markdown 图片引用优先使用同一路径索引；未登记图片按源路径派生稳定 ID。

`illustrations.yaml` 的 `placements` 项为 `{ chapterId, after, assetId }`，`after` 来自正文块锚点。失效锚点不把图随意追加到章尾；文字照常显示，错误关联给诊断。

`visual-enhancements.yaml` 的 `modules` 项必须包含 `id`、`interludeId`、`after`、`kind`，可选 `title`：

- `image`／`diagram`：指定 `assetId`；图表类型必须指向 `diagram` 资产。
- `timeline`／`cards`：指定 `items: [{ label, quote }]`；`quote` 和非空 `label` 必须能在对应 Interlude 原文中核对，不能借模块补写事件。

档案内 `after` 使用 `i-interlude-NN-b-散列` 稳定块 ID。正文锚点、档案锚点和源行号分开；完整清单由 `npm run content:check` 输出。模块与图片均可选，现有三个档案没有强制配置。

## 校验与回退

页面和受保护构建预检共用 `src/presentation.ts`。可选 YAML 解析、关联或资源错误会输出带代码的警告并保留文字；原稿 UTF-8、编号、块覆盖或源完整性错误会停止构建。修复索引，不自动修复 Canon。修改后先看 `npm run content:check`，再运行对应测试和 `npm run build`。
