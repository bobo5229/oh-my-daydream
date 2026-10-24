# 《总谱》私人阅读器

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

作者于 2026-10-24 选择 Astro + TypeScript，本地静态构建。工程在 `maestro/reader/`，读取相邻 Markdown；无账号、数据库或远端内容服务。

## Users

作者本人，在电脑或窄窗口中阅读、回看已写小说，随时查阅行业编年和世界观资料。

## Product Purpose

正文保持连续、可读和可恢复，辅助资料按需打开。新增真实章节通过内容接口进入阅读器，无需手工复制页面。

## Operating Context

`../reader-design.md` 是产品共识，`../reader-stages/` 定义任务顺序。小说原稿、Lore 与人物资料只读；外部阅读索引不改写 Canon。

## Capabilities and Constraints

- 独立章节自然纵向阅读；左侧章节抽屉及独立目录；首次首页与本地进度恢复。
- 已实现主题／排版设置、行业时间线、两种阅读模式、31 项有来源的 Lore 索引与统一视觉资料库；正式视觉资产为空。
- 当前章节 6 篇、嵌入式 Interlude 3 篇；目前无正式封面、图片、Logo 或字体资产，不补造设定。
- 作者已确认默认纯小说、右侧固定约 440px 且自适应、左右抽屉互斥；时间关联与双序列由 data/ 中的 YAML 描述；章中档案以源片段派生虚拟阅读节点。
- Stage 00 已获作者验收；之后按自动检查结果依序推进，尚未确定的产品决策再询问作者。

## Evidence on Hand

`../chapters/` 是已写正文；`../lore.md` 与 `../worldview.md` 是资料权威；`../chapters-index.md` 只作参考。阅读器已有无损分段、源映射与构建源文件保护。

## Product Principles

- 阅读与查阅时保留正文位置。
- 原稿是唯一文本权威，索引失效时保留可读原文。
- 功能按 Stage、Task 顺序增加，未写章节不进入目录。
- 中文、现代、克制，产品界面不展示开发流程或校验细节。
