param (
    [string]$Path = "characters"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path $Path)) {
    Write-Error "路径不存在: $Path"
    exit 1
}

$files = @()
if ((Get-Item $Path).PSIsContainer) {
    $files = Get-ChildItem -Path $Path -Filter "*.md" -Recurse | Where-Object { $_.FullName -match '[\\/]chapters[\\/]' }
} else {
    $files = @(Get-Item $Path)
}

# 默认通用禁忌正则（夸张浮夸词与机械套路）
$regexStr = '灭顶|欲仙欲死|灵魂出窍|升天|濒死|如遭雷击|电流窜遍全身|白光炸开|世界崩塌|几乎昏过去|狂暴|炸裂|四肢百骸|死死'

# 本地私有 NSFW 规则存在时动态加载本地扩展正则
$localRules = @("rules/nsfw.local.md", "rules/wording.local.md")
foreach ($lr in $localRules) {
    if (Test-Path $lr) {
        $content = Get-Content -Path $lr -Raw -Encoding utf8
        if ($content -match '(?m)^\s*-\s*\*\*硬禁扫描正则\*\*[：:]\s*\r?\n\s*`?([^`\r\n]+)`?') {
            $regexStr = $matches[1].Trim().Trim('`')
            break
        }
    }
}

$forbiddenRegex = [regex]$regexStr
$biaoziRegex = [regex]'(?<!反差)婊子'
$bushiErshiRegex = [regex]'不是.*?而是|与其说是.*?不如说是|非.*?而是'

$hasViolations = $false
Write-Host "=========================================="
Write-Host " 硬禁词静态扫描 (0-Token Local Check)"
Write-Host "=========================================="

foreach ($file in $files) {
    $lines = Get-Content -Path $file.FullName -Encoding utf8
    $relPath = Resolve-Path -Path $file.FullName -Relative
    $fileViolations = @()

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $lineNum = $i + 1
        $lineText = $lines[$i]
        if ([string]::IsNullOrWhiteSpace($lineText)) { continue }

        $forbMatches = [System.Text.RegularExpressions.Regex]::Matches($lineText, $regexStr)
        foreach ($m in $forbMatches) {
            $fileViolations += "  [第 $lineNum 行] 命中硬禁词: '$($m.Value)' -> ...$($lineText.Trim())..."
        }

        $biaoMatches = [System.Text.RegularExpressions.Regex]::Matches($lineText, '(?<!反差)婊子')
        foreach ($m in $biaoMatches) {
            $fileViolations += "  [第 $lineNum 行] 命中单独'婊子' -> ...$($lineText.Trim())..."
        }

        $bushiMatches = [System.Text.RegularExpressions.Regex]::Matches($lineText, '不是.+?而是|与其说是.+?不如说是|非.+?而是')
        foreach ($m in $bushiMatches) {
            $fileViolations += "  [第 $lineNum 行] 命中禁用句式 '不是...而是/与其说...不如说' -> ...$($lineText.Trim())..."
        }
    }

    if ($fileViolations.Count -gt 0) {
        $hasViolations = $true
        Write-Host ("[FAIL] {0} (发现 {1} 处违规)" -f $relPath, $fileViolations.Count)
        foreach ($v in $fileViolations) {
            Write-Host $v
        }
    }
}

Write-Host "------------------------------------------"
if (-not $hasViolations) {
    Write-Host "所有章节扫描完成：全部 Clean，未发现硬禁词。"
} else {
    Write-Host "扫描完成：请根据上述提示修正硬禁词。"
}
Write-Host "=========================================="
