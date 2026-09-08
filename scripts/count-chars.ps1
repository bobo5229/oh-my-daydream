param (
    [string]$Path = "characters"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 统计指定文件或目录下的中文字符数（汉字）
if (-not (Test-Path $Path)) {
    Write-Error "路径不存在: $Path"
    exit 1
}

$files = @()
if ((Get-Item $Path).PSIsContainer) {
    $files = Get-ChildItem -Path $Path -Filter "*.md" -Recurse
} else {
    $files = @(Get-Item $Path)
}

$totalHanzi = 0
$totalChars = 0

Write-Host "=========================================="
Write-Host " 字数统计 (Markdown)"
Write-Host "=========================================="

foreach ($file in $files) {
    # 显式使用 UTF-8 读取
    $rawContent = Get-Content -Path $file.FullName -Raw -Encoding utf8
    
    # 去除 YAML frontmatter (如果存在)
    $contentWithoutYaml = $rawContent -replace '(?s)^---\r?\n.*?\r?\n---\r?\n', ''
    
    # 匹配汉字范围 (Unicode CJK Unified Ideographs)
    $hanziMatches = [regex]::Matches($contentWithoutYaml, '[\p{IsCJKUnifiedIdeographs}]')
    $hanziCount = $hanziMatches.Count
    
    # 统计可见非空白字符
    $nonSpaceMatches = [regex]::Matches($contentWithoutYaml, '\S')
    $nonSpaceCount = $nonSpaceMatches.Count
    
    $totalHanzi += $hanziCount
    $totalChars += $nonSpaceCount
    
    $relPath = Resolve-Path -Path $file.FullName -Relative
    Write-Host ("{0,-50} 汉字: {1,6} | 非空字符: {2,6}" -f $relPath, $hanziCount, $nonSpaceCount)
}

Write-Host "------------------------------------------"
Write-Host ("总计: 汉字 {0} 字 | 总非空字符 {1} 字" -f $totalHanzi, $totalChars)
Write-Host "=========================================="