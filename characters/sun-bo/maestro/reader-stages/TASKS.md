# 《总谱》私人网页阅读器｜Task 总索引

> 当前：**Stage 00 已获作者验收，Stage 01–07 工程自动验收通过；36 个 Task 已按顺序完成**。详尽的「输入／修改边界／只做这些／交付物／验收／不做」以各 Stage 文档对应小节为准。\
> 返回：[Stage 总览](README.md) · [产品设计总纲](../reader-design.md)

| ID | 子 Task | 所属 Stage | 前置 Task | 状态 |
| --- | --- | --- | --- | --- |
| [S00-T01](stage-00-foundation.md#s00-t01) | 现有内容与风险清单 | 内容审计与工程基础 | 无 | 已验收 |
| [S00-T02](stage-00-foundation.md#s00-t02) | 工程技术方案与位置确认 | 内容审计与工程基础 | S00-T01 | 已验收 |
| [S00-T03](stage-00-foundation.md#s00-t03) | 只读 Markdown 内容接口 | 内容审计与工程基础 | S00-T02 | 已验收 |
| [S00-T04](stage-00-foundation.md#s00-t04) | 嵌入式 Interlude 无损识别 | 内容审计与工程基础 | S00-T03 | 已验收 |
| [S00-T05](stage-00-foundation.md#s00-t05) | 内容契约与防回写验收 | 内容审计与工程基础 | S00-T03、S00-T04 | 已验收 |
| [S01-T01](stage-01-core-reader.md#s01-t01) | 章节渲染与阅读路由 | 最小可用小说阅读器 | S00-T05 | 已验收 |
| [S01-T02](stage-01-core-reader.md#s01-t02) | 章节目录与上下篇导航 | 最小可用小说阅读器 | S01-T01 | 已验收 |
| [S01-T03](stage-01-core-reader.md#s01-t03) | 首次首页与继续阅读入口 | 最小可用小说阅读器 | S01-T01、S01-T02 | 已验收 |
| [S01-T04](stage-01-core-reader.md#s01-t04) | 章节位置保存与恢复 | 最小可用小说阅读器 | S01-T01、S01-T03 | 已验收 |
| [S02-T01](stage-02-reading-design.md#s02-t01) | 视觉令牌与正文排版 | 中文阅读视觉与偏好设置 | S01-T04 | 已验收 |
| [S02-T02](stage-02-reading-design.md#s02-t02) | 系统跟随与手动主题覆盖 | 中文阅读视觉与偏好设置 | S02-T01 | 已验收 |
| [S02-T03](stage-02-reading-design.md#s02-t03) | 字号行距与恢复默认 | 中文阅读视觉与偏好设置 | S02-T01 | 已验收 |
| [S02-T04](stage-02-reading-design.md#s02-t04) | 基本自适应与阅读回归 | 中文阅读视觉与偏好设置 | S02-T02、S02-T03 | 已验收 |
| [S03-T01](stage-03-interlude-timeline.md#s03-t01) | 时间关联 YAML 与校验 | Interlude 时间线与抽屉 | S00-T05 | 已验收 |
| [S03-T02](stage-03-interlude-timeline.md#s03-t02) | 当前阅读时间解析器 | Interlude 时间线与抽屉 | S03-T01、S01-T04 | 已验收 |
| [S03-T03](stage-03-interlude-timeline.md#s03-t03) | 时间线抽屉与跟随状态 | Interlude 时间线与抽屉 | S03-T01、S03-T02 | 已验收 |
| [S03-T04](stage-03-interlude-timeline.md#s03-t04) | 抽屉全文与独立阅读视图 | Interlude 时间线与抽屉 | S03-T03、S00-T04 | 已验收 |
| [S03-T05](stage-03-interlude-timeline.md#s03-t05) | 并排与覆盖式响应布局 | Interlude 时间线与抽屉 | S03-T03、S03-T04 | 已验收 |
| [S04-T01](stage-04-reading-modes.md#s04-t01) | 双序列数据与章内切片规则 | 双阅读模式与正式编排 | S03-T01、S00-T04 | 已验收 |
| [S04-T02](stage-04-reading-modes.md#s04-t02) | 模式状态与双入口 | 双阅读模式与正式编排 | S04-T01 | 已验收 |
| [S04-T03](stage-04-reading-modes.md#s04-t03) | 按模式导航与位置映射 | 双阅读模式与正式编排 | S04-T01、S04-T02 | 已验收 |
| [S04-T04](stage-04-reading-modes.md#s04-t04) | 共享进度和切换回归 | 双阅读模式与正式编排 | S04-T02、S04-T03 | 已验收 |
| [S05-T01](stage-05-lore.md#s05-t01) | 实体规范索引 | Lore 上下文资料库 | S00-T05 | 已验收 |
| [S05-T02](stage-05-lore.md#s05-t02) | 正文识别与 YAML 修正 | Lore 上下文资料库 | S05-T01、S00-T03 | 已验收 |
| [S05-T03](stage-05-lore.md#s05-t03) | 分类目录与统一搜索 | Lore 上下文资料库 | S05-T01 | 已验收 |
| [S05-T04](stage-05-lore.md#s05-t04) | 章节上下文与分层详情 | Lore 上下文资料库 | S05-T02、S05-T03 | 已验收 |
| [S05-T05](stage-05-lore.md#s05-t05) | 完整档案展开与状态回归 | Lore 上下文资料库 | S05-T04 | 已验收 |
| [S06-T01](stage-06-visual-archive.md#s06-t01) | 统一视觉资产清单 | 视觉资产、图表与图库 | S05-T01 | 已验收 |
| [S06-T02](stage-06-visual-archive.md#s06-t02) | 正文场景插图的自然嵌入 | 视觉资产、图表与图库 | S06-T01、S00-T05 | 已验收 |
| [S06-T03](stage-06-visual-archive.md#s06-t03) | Interlude 视觉增强组件 | 视觉资产、图表与图库 | S03-T04、S06-T01 | 已验收 |
| [S06-T04](stage-06-visual-archive.md#s06-t04) | 统一大图查看器 | 视觉资产、图表与图库 | S06-T01 | 已验收 |
| [S06-T05](stage-06-visual-archive.md#s06-t05) | 独立视觉资料库与复用回归 | 视觉资产、图表与图库 | S06-T01、S06-T04 | 已验收 |
| [S07-T01](stage-07-integration.md#s07-t01) | 全功能端到端回归 | 整合回归与长期维护 | S04-T04、S05-T05、S06-T05 | 已验收 |
| [S07-T02](stage-07-integration.md#s07-t02) | 响应式可读性与无障碍 | 整合回归与长期维护 | S07-T01 | 已验收 |
| [S07-T03](stage-07-integration.md#s07-t03) | 内容扩展与构建稳定性 | 整合回归与长期维护 | S07-T01 | 已验收 |
| [S07-T04](stage-07-integration.md#s07-t04) | 维护文档与最终验收 | 整合回归与长期维护 | S07-T02、S07-T03 | 已验收 |

## 任务边界说明

- 每个 Task **只负责单个验收目标或一组不可拆开的紧耦合操作**，不隐含未来 Stage 的实现。
- Task 可以修复自己范围内的缺陷；跨阶段的设计变更先交回作者确认。
- 在本索引上改变 Task 状态时，也要同步更新对应 Stage 文档中的状态说明，避免「索引已完成，细节仍未启动」。
- 不将建议性参数、待定 Schema 或候选框架认作最终共识。
