---
name: "《总谱》私人阅读器"
description: "为中文长篇阅读提供安静、连续且可恢复的界面。"
colors:
  surface: "light-dark(#f7f7f5, #202124)"
  foreground: "light-dark(#30332f, #dadcd6)"
  muted-color: "light-dark(#61685f, #afb6ab)"
  line-color: "light-dark(#dcded8, #454b43)"
  accent-color: "light-dark(#435a49, #c2d4c1)"
  focus-color: "light-dark(#526e59, #afc8aa)"
  hover-surface: "light-dark(#e9ece5, #2b302b)"
  selected-surface: "light-dark(#e3e9df, #303b2f)"
  selected-ink: "light-dark(#2f4936, #d3e2cf)"
  code-surface: "light-dark(#eaece6, #2b2f2c)"
  selection-surface: "light-dark(#dce5dc, #475b43)"
  selection-ink: "light-dark(#27332a, #edf3e9)"
  button-surface: "light-dark(#374b3c, #c2d4c1)"
  button-ink: "light-dark(#f7f7f5, #26322a)"
  button-hover: "light-dark(#293d2e, #d2e0d0)"
  scroll-thumb: "light-dark(#b3b8af, #626e5f)"
  scrim: "light-dark(rgb(30 34 29 / 24%), rgb(0 0 0 / 45%))"
typography:
  display:
    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "clamp(64px, 8vw, 88px)"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
  title:
    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "18px"
    lineHeight: 1.85
  label:
    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "13px"
  action:
    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', system-ui, sans-serif"
    fontSize: "16px"
rounded:
  code: "3px"
  field: "4px"
  control: "5px"
  action: "6px"
  panel: "8px"
spacing:
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "40": "40px"
  "48": "48px"
  "64": "64px"
components:
  reader-navigation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    padding: "10px 24px"
  primary-link:
    backgroundColor: "{colors.button-surface}"
    textColor: "{colors.button-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "12px 28px"
  quiet-button:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  text-button:
    backgroundColor: "transparent"
    textColor: "{colors.accent-color}"
    padding: "8px 0"
  chapter-link-current:
    backgroundColor: "{colors.selected-surface}"
    textColor: "{colors.selected-ink}"
    rounded: "{rounded.control}"
    padding: "13px 12px"
  search-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  resource-tab-selected:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    padding: "12px 0"
  timeline-entry-selected:
    backgroundColor: "{colors.selected-surface}"
    textColor: "{colors.selected-ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  settings-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "24px"
    width: "min(300px, calc(100vw - 32px))"
---

# Design System: 《总谱》私人阅读器

## Overview

**Creative North Star: "安静书页"**

阅读器把注意力留给连续中文正文。柔和灰白与石墨灰承载浅色、深色主题，苔绿只作交互信号；统一的中文无衬线和细分隔线让界面清楚，但不争正文。正文默认居中单栏，资料按需打开，阅读位置可保留和恢复。

系统以同一字体栈连接正文、标题和控件，字号与行距可以调整。视口变窄时收紧外围留白和导航密度；正文仍按原有段落顺序连续呈现。

**Key Characteristics:**
- 单栏中文正文，默认宽度 780px、字号 18px、行距 1.85。
- 一套中文无衬线字体栈贯穿正文、标题和界面控件。
- 双主题灰白与石墨底色、低饱和苔绿交互色、细边线和克制圆角。

## Colors

色彩由浅色纸面与深色石墨底色构成，苔绿色用于交互、焦点和当前状态；变量随浅色或深色主题切换。

### Primary
- **苔绿强调色**（accent-color）：用于链接、表单强调、当前资料标签和主要操作；深色主题转为浅鼠尾草绿。
- **焦点绿**（focus-color）：用于键盘焦点描边，和一般强调色区分。
- **主操作色**（button-surface、button-ink、button-hover）：开始阅读入口使用有对比度的填充色，悬停时再加深或变浅。

**The Moss Signal Rule.** 苔绿只标示链接、焦点、选中状态和主要操作，不扩作装饰色。

### Neutral
- **纸面与石墨**（surface、foreground）：承载阅读区、抽屉和控件，并提供正文主文字颜色。
- **次级文字与分隔线**（muted-color、line-color）：用于说明文字、计数、边界和章节分隔。
- **悬停与选中层**（hover-surface、selected-surface、selected-ink）：分别标示可操作行的悬停和当前目录、编年条目的选中状态。
- **代码与文本选区**（code-surface、selection-surface、selection-ink）：用于正文内代码块和浏览器文字选区。
- **滚动与遮罩**（scroll-thumb、scrim）：保持滚动条可辨，并在模态抽屉后压低背景。

## Typography

**Display Font:** Noto Sans SC（回退 Source Han Sans SC、Microsoft YaHei、system-ui、sans-serif）  
**Body Font:** 同一中文无衬线字体栈  
**Label/Mono Font:** 未设置独立标签或代码字体；代码沿用浏览器等宽默认。

**Character:** 字形保持现代、清楚、不过度装饰。正文与界面共用一套中文无衬线字体，层级主要由字号、字重和留白区分。

### Hierarchy
- **Display**（500，clamp(64px, 8vw, 88px)，行高 1.4，字距 0.08em）：只用于作品首页标题。
- **Title**（600，28px，行高 1.5）：用于章节标题；窄屏章节标题缩至 25px。
- **Body**（常规字重，18px，行高 1.85）：用于小说正文，默认字号与行距可由阅读设置调整。
- **Action**（16px）：用于首页主要阅读入口。
- **Label**（12–15px）：用于计数、控件标签、来源信息和次级说明。

## Layout

正文列最大宽度为 780px，居中放在带 24px 两侧留白的阅读区域内；页面顶部导航最大宽度为 1200px，高度至少 68px。常见间距取自反复出现的 8–40px 数值，章节与页面之间使用更大的 48–64px 留白。

左侧章节目录最多 360px 宽，并随窄视口收缩。右侧资料面板宽度最多 440px：视口达到 1360px 时停靠右侧并为正文让出空间，较窄时覆盖页面；左右抽屉互斥，开合后保留正文位置。600px 以下收紧导航和页面边距，380px 以下进一步压缩导航控件。

## Elevation & Depth

界面主要靠 1px 细分隔线区分区域，模态抽屉使用主题遮罩；只有阅读设置浮层使用柔和阴影（0 12px 36px，颜色取 scrim）。阅读正文和普通行项保持平面。

**The Quiet Depth Rule.** 层次由细分隔线和模态遮罩表达；阴影只用于阅读设置浮层。

## Shapes

控件和列表项使用轻微圆角（5px），输入框内部的设置选择器为 4px，主要阅读入口为 6px，设置浮层为 8px。正文内代码仅用 3px 圆角。抽屉保持直角边缘，区域分界使用 1px 细线，不用厚边框或夸张投影。

## Components

### Primary Action
首页开始阅读入口是唯一填充式主要动作；使用主题按钮色、6px 圆角、12px 28px 内边距，最小高度 48px。悬停时切换到按钮悬停色，键盘焦点沿用全局 2px 焦点描边，外偏移 4px。

### Quiet and Icon Buttons
目录、设置等低优先级控制保持透明背景、继承前景色和 5px 圆角，最小点击区域为 44px。悬停出现轻微表面色，键盘焦点显示 2px 焦点描边并外偏移 4px。只含图标的关闭按钮沿用同一触控尺寸。

### Chapter Navigation
目录项为连续列表行，最小高度 48px，内边距 13px 12px、圆角 5px。悬停显示轻微底色，当前章节使用选中底色与前景色，并提高字重。

### Search Field
资料搜索和筛选字段使用主题表面、1px 细边线、5px 圆角，最小高度 44px；键盘聚焦时显示全局焦点描边。

### Resource Tabs and Timeline Entries
资料标签以底边线标出当前页签；编年条目按阶段连续排列，悬停与选中状态有独立表面色。返回或恢复操作使用强调色文字和下划线；当前阶段标签仅加重字重和强调色，不额外加卡片。

### Settings Panel
设置面板贴近触发项浮出，宽度最多 300px，使用 24px 内边距、1px 边线、8px 圆角和柔和阴影。选择框与搜索字段保持相同边线语言，调节控件采用强调色。

## Do's and Don'ts

### Do:
- **Do** 将正文保持为居中连续单栏，默认阅读宽度为 780px。
- **Do** 在抽屉打开和返回时保留当前正文位置。
- **Do** 保留可见焦点描边，苔绿用于链接、焦点、选中状态和主要操作。

### Don't:
- **Don't** 将小说正文放入卡片网格或宣传面板。
- **Don't** 给正文添加隐藏式入场动画；当前动效仅用于章节抽屉。
