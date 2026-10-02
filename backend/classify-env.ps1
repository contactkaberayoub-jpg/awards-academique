param(
  [string]$File
)
if (-not (Test-Path -LiteralPath $File)) { Write-Output 'MISSING'; exit 97 }

function Get-Preview([string]$v) {
  if ($v -eq '') { return '<EMPTY>' }
  if ($v.Length -ge 2) { return ($v.Substring(0, 2) + '**') }
  return ($v + '*')
}

$n = 0
foreach ($raw in Get-Content -LiteralPath $File) {
  $n++
  $m = [regex]::Match($raw, '^\s*(?:set\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$')
  if (-not $m.Success) { continue }
  $k = $m.Groups[1].Value
  $v = $m.Groups[2].Value.Trim().Trim('"', "'")
  $judged = 'CHECK-MANUALLY'
  if ($v -eq '') { $judged = 'EMPTY' }
  elseif ($v -match '^(\$\{?[A-Za-z0-9_]+\}?|\[.*\]|\(.*\))$') { $judged = 'ENV-REF/CONTAINER-VAR' }
  elseif ($v -match '^(?i)(your_|changeme|change_me|replace|placeholder|set_|xxx+|<[^>]+>|example|sample|dummy|mock|test_|n/a|null|see_.*|\.\.\..*|\(.*\))') { $judged = 'PLACEHOLDER-LIKE' }
  elseif ($v -ieq $k) { $judged = 'KEY-REPEATED-AS-VALUE' }
  if ($k -match '(?i)^(DATABASE_URL|JWT_SECRET|JWT_EXPIRATION|MAIL_APP_PASSWORD|GOOGLE_CLIENT_SECRET|GOOGLE_CLIENT_ID|PAYPAL_CLIENT_SECRET|PAYPAL_CLIENT_ID|PAYPAL_MAD_TO_USD_RATE|AI_API_KEY|AI_API_BASE_URL|FRONTEND_URL|CORS_ALLOWED_ORIGINS|RESEND_API_KEY|OPENAI_API_KEY|SMTP|MAIL|NODE_ENV)$') {
    Write-Output ('{0}:{1} {2} => {3} preview={4} len={5}' -f $File, $n, $k, $judged, (Get-Preview $v), $v.Length)
  }
}
