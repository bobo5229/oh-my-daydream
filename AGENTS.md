---
title: Agents
type: meta
tags:
  - daydreamer/meta
updated: 2026-09-06
---

# Agents

本库是轻量 NSFW **写作工作区**（不是酒馆卡组工程）。助手进入任务时 **先读本文**，再按路由打开专项规则；不要把未点名的规范文件整份塞进上下文。

**根目录只保留本文。** 全部写作规则在 `rules/`。

## 规则路由

| 需求 | 打开 |
| --- | --- |
| 写什么 / 不能写什么（安全、可写范围、协作） | `rules/boundaries.md` |
| 怎么写（现代小说、生活气息、禁止的段落风、去形容词化） | `rules/style.md` |
| 用哪个词（硬禁、分档、自检） | `rules/wording.md` |
| 流程：提示词 → 节拍 → 中文正文 | `rules/sop-1.md` |
| 流程：节拍 → 英文草稿 → 翻译入正文 | `rules/sop-2.md`（仅 SOP 2：A = 本助手写英文；B = Gemini 译入正文。SOP 1 不启用 B） |
| 汉字字数统计 | `scripts/count-chars.ps1` |
| 用词合规静态扫描 | `scripts/check-wording.ps1` |
| 当前节写什么（节拍） | 该故事下 `beats.md` |
| 下一节节拍灵感（若使用） | 该故事下 `inspiration.md` |
| 背景、人物、已有走向 | 该故事下 `worldview.md` |
| 成稿 | 该故事下 `chapters/chxx.md` |
| 组句（若已放入） | 句式文档 |

**不维护** `taboos.md` / 雷区。路数与是否展开某玩法由提示词/节拍决定；临时加禁只做加法，不能解除 `rules/wording.md` 硬禁。

## 全局注意

### 命名与语言

- **文件夹 / 文件名：** 英文；人物与故事目录用 `romanized-name`
- **规则与正文内容：** 中文（SOP 2 的英文草稿除外）
- 组织性说明用中文写；机器字段（YAML）可用英文

### 目录约定

```text
AGENTS.md                       # 仅此文件在仓库根目录（规则路由）
rules/                          # 全部写作规则
  boundaries.md
  style.md
  wording.md
  sop-1.md
  sop-2.md
scripts/                        # 仓库脚本（如 count-chars.ps1）
characters/
  <romanized>/
    <story>/                    # 多主角：最多 3 个 romanized 名用 _ 拼接，挂在排序第一的人物下
      worldview.md
      beats.md                  # 该故事当前节拍
      draft.md                  # 可选（仅 SOP 2 临时英文草稿，单次覆盖）
      inspiration.md            # 可选
      chapters/
        ch01.md                 # 一章一文件；默认不分 SEC，章内连续推进
        ch02.md
```

不按「故事」在根目录建库。

### 写作默认

- 维护重心：**正文、世界观**（worldview 一份文档含背景、人物、已有走向）
- **正文严禁 YAML**：正文文件（`chapters/chxx.md`）禁止出现任何 YAML frontmatter / 元数据块，直接从正文起笔
- 无人物级跨故事 `profile`；人设写在该故事 `worldview.md`
- 提示词给到哪，就写到哪；不擅自补玩法、人物、转折
- **流程默认**：选用 `sop-1` 或 `sop-2` 由当次指定；未特别指定时，**默认执行 SOP 1**（提示词 → 节拍 → 确认 → 中文正文）

### 对话纪律（全局）

- **除非用户明确要求**，对话中 **不要粘贴** 节拍原文、正文原文，或 SOP 2 的大段英文草稿
- 只汇报已完成项并明确标明修改/写入的具体行号区间（格式如 `[chxx.md#Lxx-Lyy](file:///...)`）；请用户打开对应文件查看


### 安全与文风（摘要，细则见专文）

- 性相关角色 **18+**；禁止未成年性化；见 `rules/boundaries.md`
- 中文现代小说 + 生活气息；偏文言词可接受，禁止成句成段文言及其他禁止段落风；见 `rules/style.md`
- 落词前过 `rules/wording.md` 硬禁与分档

### 助手行为

- 保持仓库轻量：不主动搭复杂架构、不写未要求的说明书
- 改规则只改 `rules/` 下对应文件；路由变更时同步更新本文
- 单文件删除可做；禁止对目录树做递归强制删除
