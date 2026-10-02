param([string]$File)
if (-not (Test-Path -LiteralPath $File)) { Write-Output 'MISSING'; return }
function Masked([string]$v) {
  if ($v -eq '' -or $v -eq $null) { return '<EMPTY>' }
  if ($v.Length -lt 4) { return ($v.Substring(0,1) + '***') }
  return ($v.Substring(0,2) + '***')
}
$n = 0
foreach ($l in Get-Content -LiteralPath $File) {
  $n++
  $m = [regex]::Match($l, '^\s*(?:set\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$')
  if (-not $m.Success) { continue }
  $key = $m.Groups[1].Value
  $val = $m.Groups[2].Value.Trim().Trim('"', "'")
  if ($val -eq '') { $verdict='EMPTY-OK'; $len=0 }
  elseif ($val -match '^\$\{?[A-Za-z0-9_]+\}?$') { $verdict='ENV-REF-OK'; $len=$val.Length }
  elseif ($val -match '^(?i)(your_|changeme|change_me|replace|placeholder|<[^>]*>|xxx+|n\/a|null|example|sample|dummy|mock|test_|fixed|token_|\.\.\.|\(\.\.\.\)|set_|put_)') { $verdict='PLACEHOLDER'; $len=$val.Length }
  elseif ($key -match 'DATABASE_URL|JWT|MAIL_APP_PASSWORD|GOOGLE_CLIENT_SECRET|PAYPAL_CLIENT_SECRET') { $verdict='*** REAL-LOOKING ? ***'; $len=$val.Length }
  else { $verdict='unclassified'; $len=$val.Length }
  Write-Output ('L{0,-4} {1,-28} len={2,-4} {3} preview={4}' -f $n, $key, $len, $verdict, (Masked $val))
}
