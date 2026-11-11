# 집 PC(미니PC)에서 글을 모아 GitHub에 올립니다. 예약 작업이 30분마다 실행합니다.
# 에펨코리아는 GitHub 서버를 막기 때문에, 집 인터넷에서 모은 결과를 올려 주어야 새 글이 들어옵니다.
#
# 주의: 이 스크립트는 실행할 때마다 이 폴더를 GitHub의 최신 상태로 되돌립니다(git reset --hard).
#       수집 전용으로 받은 폴더에서만 쓰세요. 직접 고친 파일이 있으면 사라집니다.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$repo = Split-Path -Parent $PSScriptRoot
$log = Join-Path $repo 'minipc-collect.log'
function Log($message) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message" | Add-Content -LiteralPath $log -Encoding utf8
}

try {
  Set-Location -LiteralPath $repo

  git fetch --quiet origin main
  if ($LASTEXITCODE -ne 0) { throw 'GitHub에서 최신 내용을 받지 못했습니다 (git fetch)' }
  git reset --hard --quiet origin/main
  if ($LASTEXITCODE -ne 0) { throw '최신 상태로 맞추지 못했습니다 (git reset)' }

  node scripts/collect.mjs | ForEach-Object { Log $_ }
  if ($LASTEXITCODE -ne 0) { throw '글 수집에 실패했습니다 (collect.mjs)' }

  git add src/collected.json
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { Log '바뀐 내용이 없어 올리지 않았습니다'; exit 0 }

  git commit --quiet -m "Collect posts $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  if ($LASTEXITCODE -ne 0) { throw '저장하지 못했습니다 (git commit)' }
  git push --quiet origin main
  if ($LASTEXITCODE -ne 0) { throw 'GitHub에 올리지 못했습니다 (git push)' }
  Log '올렸습니다. 몇 분 뒤 사이트에 반영됩니다.'
} catch {
  Log "오류: $_"
  exit 1
} finally {
  # 기록 파일이 끝없이 커지지 않게 최근 500줄만 남깁니다.
  if (Test-Path -LiteralPath $log) {
    $tail = Get-Content -LiteralPath $log -Tail 500 -Encoding utf8
    $tail | Set-Content -LiteralPath $log -Encoding utf8
  }
}
