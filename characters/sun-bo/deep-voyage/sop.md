---
title: SOP - Deep Voyage
type: story-sop
story: deep-voyage
character: sun-bo
updated: 2026-09-12
---

# 《deep-voyage》专属写作 SOP

本规范仅适用于 `characters/sun-bo/deep-voyage/` 故事目录。在此故事文件夹下工作时，严格遵循本文。
本文绝大部分沿用仓库全局 [`rules/sop-1.md`](file:///d:/VSCode/DayDream/rules/sop-1.md)，核心差异与定制要求如下。

---

## 核心差异（节拍提供方）

- **用户提供节拍**：所有节拍（Beats）均由**用户在对话中直接给出**或更新至 [`beats.md`](file:///d:/VSCode/DayDream/characters/sun-bo/deep-voyage/beats.md)。
- **助手严禁自写节拍**：
  - 助手**不需要、也不得**自行创作、推演或拟定新节拍大纲；
  - 助手的职责是：接收用户给出的节拍 $\rightarrow$ （按需）整理落盘至 [`beats.md`](file:///d:/VSCode/DayDream/characters/sun-bo/deep-voyage/beats.md) $\rightarrow$ 严格基于已定节拍撰写正文。

---

## 执行流程

1. **用户给出节拍**：
   - 用户在对话中给出本节（SEC）或本批次的完整节拍，或直接更新 [`beats.md`](file:///d:/VSCode/DayDream/characters/sun-bo/deep-voyage/beats.md)。
   - 助手如需更新 `beats.md`，仅做忠实同步与结构化排版，严禁私自增删剧情走向。
2. **正文落盘**：
   - 助手严格在用户给定的节拍范围内发挥细节（动作、心理、环境、对话与感官细节）。
   - 严格遵循 [`rules/style.md`](file:///d:/VSCode/DayDream/rules/style.md)（生活质感、去形容词化）与 [`rules/wording.md`](file:///d:/VSCode/DayDream/rules/wording.md)（硬禁词零容忍）。
   - 涉及架空模型 / 厂商 / 平台时，以 [`lore.md`](file:///d:/VSCode/DayDream/characters/sun-bo/deep-voyage/lore.md) 为准，不得与已登记设定矛盾；新架空实体当节顺手登记进 `lore.md`。
   - 正文直接落盘到当前章节 [`chapters/ch01.md`](file:///d:/VSCode/DayDream/characters/sun-bo/deep-voyage/chapters/ch01.md)。
3. **事实同步**：
   - 每写完一个完整 SEC，将该节发生的核心剧情事实同步追加到 [`worldview.md`](file:///d:/VSCode/DayDream/characters/sun-bo/deep-voyage/worldview.md) 的「七、已发生事实记录」中，维护严格的事实连续性。

---

## 正文规范与边界约束

1. **严格第一人称「我」（孙博）限制视角**：
   - 孙博是 2020 年秋季入学的西工大航海工程大类大一新生。
   - 严禁开上帝视角、严禁超前认知、严禁宏大顿悟。
   - 面对 Genesis-3，认知进化必须缓慢而曲折：从好玩的玩具 $\rightarrow$ 困惑于上下文续写 $\rightarrow$ 看不懂论文公式撞墙 $\rightarrow$ 回归大一工科生活日常。
2. **正文严禁 YAML**：
   - 正文文件（`chapters/chxx.md`）禁止包含任何 YAML frontmatter，直接从正文或 SEC 标记起笔。
3. **SEC 标识格式**：
   - 章节内 SEC 分节统一采用标准二级 Markdown 标题纯数字格式（适配 Obsidian 大纲索引与点击跳转）：
     `## 1`
   - 章节内连续编号，不写中文小节标题。
4. **生活质感与时代考据**：
   - 时代锚定：2020 年秋季。
   - 宿舍娱乐统一为手游《王者荣耀》（手机横屏、开黑四缺一、外放播报音等）。
   - 疫情痕迹自然克制，不编造过度精确的机制。
5. **SEC 篇幅与字数控制（默认 1500 字左右）**：
   - **默认基准**：无特殊说明时，常规推进目标 **1,500 字左右（浮动 1,200—1,800 纯汉字）**，利落推进不恋战。
   - **分档区间**：
     - 过渡、日常、模型更新类：**800—1,200 字**
     - 常规剧情推进类：**1,200—1,800 字**
     - 人物关系、重要认知变化类：**1,500—2,200 字**
     - 关键重头冲突类（如数模崩盘）：**2,000—2,800 字**（偶破 3,000）

---

## 对话与汇报纪律（0 额外 Token）

1. **禁止在对话中粘贴正文**：除非用户明确要求，对话中永远不要粘贴正文大段原文。
2. **必须汇报行号区间**：每次落盘后，必须使用标准 markdown 链接标明修改/写入的具体行号区间（如 `[ch01.md#L445-L515](file:///d:/VSCode/DayDream/characters/sun-bo/deep-voyage/chapters/ch01.md#L445-L515)`）。
3. **严禁输出自检过程**：不输出合规自检流水、禁词分析等，保持对话精炼。
4. **默认不自主 commit**：日常落盘不擅自执行 git commit，严格遵循用户指令。
