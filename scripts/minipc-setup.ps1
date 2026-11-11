# 미니PC에서 한 번만 실행합니다. 30분마다 글을 모아 올리는 예약 작업을 등록합니다.
# 먼저 Git, Node.js, GitHub CLI를 설치하고 'gh auth login'으로 로그인해 두어야 합니다.
# 자세한 순서는 '외부에서_보는_방법.md'의 "미니PC에서 에펨코리아 글까지 모으기"를 보세요.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$repo = Split-Path -Parent $PSScriptRoot
$taskName = 'MOA collect'

# 1. 필요한 프로그램 확인
$missing = @()
foreach ($tool in 'git', 'node', 'gh') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { $missing += $tool }
}
if ($missing.Count) {
  Write-Host "설치되지 않은 프로그램: $($missing -join ', ')" -ForegroundColor Red
  Write-Host '아래 명령으로 설치한 뒤 PowerShell 창을 새로 열고 다시 실행하세요.'
  Write-Host '  winget install --id Git.Git -e'
  Write-Host '  winget install --id OpenJS.NodeJS.LTS -e'
  Write-Host '  winget install --id GitHub.cli -e'
  exit 1
}

# 2. GitHub 로그인 확인
$ErrorActionPreference = 'Continue' # gh가 로그인 안 됨을 알리는 출력을 오류로 취급하지 않도록
gh auth status *> $null
$loggedIn = $LASTEXITCODE -eq 0
$ErrorActionPreference = 'Stop'
if (-not $loggedIn) {
  Write-Host 'GitHub에 로그인되어 있지 않습니다. 먼저 아래 명령을 실행하세요.' -ForegroundColor Red
  Write-Host '  gh auth login --hostname github.com --git-protocol https --web'
  exit 1
}

# 3. 이 폴더의 git 설정 (올릴 때 실제 이메일 대신 GitHub의 비공개용 주소를 씁니다)
Set-Location -LiteralPath $repo
gh auth setup-git
$login = gh api user --jq .login
$id = gh api user --jq .id
git config user.name $login
git config user.email "$id+$login@users.noreply.github.com"
git config core.autocrlf false

# 4. 30분마다 실행하는 예약 작업 등록 (이 사용자로 로그인해 있는 동안 실행됩니다)
$script = Join-Path $repo 'scripts\minipc-collect.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(30) -RepetitionInterval (New-TimeSpan -Minutes 30)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "예약 작업 '$taskName'을 등록했습니다 (30분마다)." -ForegroundColor Green

# 5. 지금 한 번 실행해서 결과 확인 (에펨코리아는 천천히 읽어서 1~2분 걸립니다)
Write-Host '지금 한 번 모아 봅니다. 1~2분 걸립니다...'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script
$ok = $LASTEXITCODE -eq 0
Write-Host ''
Get-Content -LiteralPath (Join-Path $repo 'minipc-collect.log') -Tail 8 -Encoding utf8
Write-Host ''
if ($ok) {
  Write-Host '완료. 위에 "에펨 ..." 줄에 오류가 없으면 에펨코리아 글도 모이고 있는 것입니다.' -ForegroundColor Green
} else {
  Write-Host '첫 실행에 실패했습니다. 위 기록의 "오류:" 줄을 확인하세요.' -ForegroundColor Red
}
Write-Host "그만두려면: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
