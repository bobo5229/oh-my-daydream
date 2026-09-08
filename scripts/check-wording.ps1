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

$forbiddenRegex = [regex]'阴茎|阳具|假阳具|柱身|阴阜|花心|爱液|肉褶|硅胶棒|骚水|后穴|卵蛋|白浊|白沫|臀|贱|浪货|浪逼|荡妇|淫妇|淫货|精壶|肉套子|精马桶|母猪|破鞋|公用|操穴|甬道|逼口|交合处|逼肉|水液|软肉|泥泞不堪|内里|硬物|死死|灭顶|欲仙欲死|灵魂出窍|升天|濒死|如遭雷击|电流窜遍全身|白光炸开|世界崩塌|几乎昏过去|狂暴|炸裂|浪潮|酥麻'
$biaoziRegex = [regex]'(?<!反差)婊子'

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

        $matches = $forbiddenRegex.Matches($lineText)
        foreach ($m in $matches) {
            $fileViolations += "  [第 $lineNum 行] 命中硬禁词: '$($m.Value)' -> ...$($lineText.Trim())..."
        }

        $biaoMatches = $biaoziRegex.Matches($lineText)
        foreach ($m in $biaoMatches) {
            $fileViolations += "  [第 $lineNum 行] 命中单独'婊子' -> ...$($lineText.Trim())..."
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
