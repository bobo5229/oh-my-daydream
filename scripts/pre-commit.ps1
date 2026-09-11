<#
.SYNOPSIS
    Git pre-commit 检查脚本：防止本地私有文件与 NSFW 内容意外提交至 Git 仓库。
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=========================================="
Write-Host " Running Git Pre-commit Hook..."
Write-Host "=========================================="

# 1. 获取本次暂存（staged）的新增/修改文件列表
$stagedFiles = git diff --cached --name-only --diff-filter=ACM
if (-not $stagedFiles) {
    Write-Host "[INFO] 暂存区无新增或修改文件，跳过检查。"
    exit 0
}

$failed = $false

# 2. 检查暂存区是否包含了被忽略或本地私有文件
$forbiddenFilePatterns = @(
    '(\.|\/)local\.md$',
    '^trials/',
    '^rules/local/',
    '^rules/nsfw\.md$',
    '^rules/nsfw\.local\.md$'
)

foreach ($file in $stagedFiles) {
    foreach ($pattern in $forbiddenFilePatterns) {
        if ($file -match $pattern) {
            Write-Host "[FAIL] 禁止将本地私有/忽略文件提交入 Git: $file" -ForegroundColor Red
            $failed = $true
        }
    }
}

# 3. 检查暂存区 Markdown 内容文件是否包含 NSFW 敏感词汇
# 覆盖生殖器官、体液、性行为、露骨性羞辱
$nsfwPattern = '阴茎|阳具|假阳具|柱身|阴阜|花心|爱液|肉褶|硅胶棒|骚水|后穴|卵蛋|白浊|白浆|操穴|甬道|逼口|交合处|逼肉|肉套子|精马桶|公用|反差婊|肉便器|精盆|飞机杯|假鸡巴|骚逼|骚货|母狗|鸡巴|阴道|阴蒂|奶子|精液|抽送|内射|做爱|性爱|荡妇|淫妇|淫货|浪货|浪逼'

$nsfwRegex = [regex]$nsfwPattern

foreach ($file in $stagedFiles) {
    # 仅针对文档内容文件（.md）进行 NSFW 内容扫描
    if ($file -match '\.md$') {
        $diffLines = git diff --cached -U0 -- $file
        foreach ($line in $diffLines) {
            # 只检查以 + 开头的新增行（排除 diff 头部 +++）
            if ($line -match '^\+[^+]' -and -not ($line -match '^\+\+\+')) {
                $addedText = $line.Substring(1)
                $m = $nsfwRegex.Match($addedText)
                if ($m.Success) {
                    Write-Host "[FAIL] 暂存区改动包含 NSFW 敏感内容 (文件: $file): 命中 '$($m.Value)'" -ForegroundColor Red
                    $failed = $true
                    break
                }
            }
        }
    }
}

Write-Host "------------------------------------------"
if ($failed) {
    Write-Host "[ERROR] Pre-commit 检查未通过：请将私有文件从暂存区移除（git restore --staged <file>）或清理敏感内容后重试。" -ForegroundColor Red
    exit 1
}

Write-Host "[PASS] Pre-commit 检查通过：暂存区未发现私有文件或 NSFW 敏感内容。" -ForegroundColor Green
Write-Host "=========================================="
exit 0
