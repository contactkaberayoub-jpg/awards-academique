param(
  [string]$File
)
if (-not (Test-Path -LiteralPath $File)) { Write-Output 'MISSING'; exit 97 }

function Get-Prev([string]$v) {
  if ($v -eq '') { return '<empty>' }
  if ($v.Length -ge 2) { return ($v.Substring(0,2) + '**') }
  return ($v + '*')
}

function Get-Verdict([string]$k, [string]$v) {
  if ($v -eq '') { return 'EMPTY-OK' }
  $lv = $v.ToLower()
  # env-ref like ${VAR}, $(VAR), '${VAR}', or plain non-placeholder letters/digits only
  if ($v -match '^\$\{?[A-Za-z0-9_]+\}?$' -or $v -match '^[A-Za-z0-9_]+$') {
    if ($v -match '^\$\{.*\}$') { return 'ENV-REF-OK' }
    # single-ident like the key itself or a bare word - treat as low-risk unless suspicious
  }
  if ($v -match '^(""|''''|)$') { return 'EMPTY-OK' }
  if ($v -match '^\$\{?[A-Za-z0-9_]+\}?$') { return 'ENV-REF-OK' }
  if ($v -match '(?i)^(your[_\-]?|changeme|change[_\-]?me|replace[_\-]?me|placeholder|<[^>]+>|xxx+|n/a|null|example|sample|dummy|mock|test|foo|bar|set\-|\bYOURS?\b)') { return 'PLACEHOLDER-LIKELY' }
  if ($v -match '^\$\{?[A-Za-z0-9_]+\}?$') { return 'ENV-REF-OK' }
  if ($v -match '^[A-Za-z0-9]{1,10}$') { return 'SHORT-TOKENS' }
  if ($v -match 'eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+') { return 'JWT-SHAPED *** REAL? ***' }
  if ($v -Length -gt 40 -and $v -notmatch '\s') { return 'LONG-DENSE *** CHECK ***' }
  return 'LOW-CONFIDENCE'
}

$n = 0
foreach ($l in Get-Content -LiteralPath $File) {
  if ($l.Trim() -eq '' -or $l.Trim().StartsWith('#')) { continue }
  if ($l -notmatch '^\s*(?:set\s+)?([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*"?([^"#\r\n]*)"?') { continue }
  $n++
  $k = $Matches[1]
  $v = $Matches[2].Trim().Trim('"').Trim("'")
  $vrd = Get-Verdict $k $v
  Write-Output ('{0}: {1} = {2}  [line-no skipped for values]' -f ($k), (Get-Prev $v), $vrd)
}
Write-Output ('keys_scanned={0}' -f $n)
