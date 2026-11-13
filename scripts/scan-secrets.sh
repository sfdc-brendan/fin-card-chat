#!/usr/bin/env bash
# Fails if anything that looks like a credential or a private org detail is about to be published.
# Scans tracked and untracked (not ignored) files, so run it before every commit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  FILES=()
  while IFS= read -r -d '' f; do FILES+=("$f"); done < <(git ls-files -z --cached --others --exclude-standard)
else
  FILES=()
  while IFS= read -r -d '' f; do FILES+=("$f"); done < <(find . -type f -not -path '*/node_modules/*' -not -path './.git/*' -not -path '*/dist/*' -print0)
fi

# The scanner itself lists the patterns, so it is skipped.
SCAN=()
for f in "${FILES[@]}"; do
  [[ "$f" == *scripts/scan-secrets.sh ]] && continue
  [[ "$f" == *package-lock.json ]] && continue
  SCAN+=("$f")
done

PATTERNS=(
  # Intercom / Fin access tokens and generic bearer tokens
  'dG9rO[0-9A-Za-z+/=_-]{20,}'
  'Bearer [0-9A-Za-z._~+/=-]{24,}'
  # Salesforce session IDs, refresh tokens, consumer secrets
  '00D[0-9A-Za-z]{12}![0-9A-Za-z._]{40,}'
  '5Aep[0-9A-Za-z._]{40,}'
  '(consumerSecret|clientSecret|client_secret|refresh_token)["'"'"' ]*[:=]["'"'"' ]*[0-9A-Za-z]{16,}'
  # Org-specific details from the original demo org
  '00DgL00000ezBKT'
  'trailsignup-[0-9a-f]+'
  'admin105@'
  '@finservice\.demo'
  # Private keys and common cloud keys
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'AKIA[0-9A-Z]{16}'
  'xox[abposr]-[0-9A-Za-z-]{10,}'
  'gh[pousr]_[0-9A-Za-z]{30,}'
)

FAILED=0
for pattern in "${PATTERNS[@]}"; do
  if [[ ${#SCAN[@]} -gt 0 ]] && grep -nIE -- "$pattern" "${SCAN[@]}" 2>/dev/null; then
    echo "^ matches: $pattern" >&2
    FAILED=1
  fi
done

for f in "${SCAN[@]}"; do
  case "$f" in
    *.env|*.env.*|*.pem|*.key|*.private.txt|*/.sf/*|*/.sfdx/*|.sf/*|.sfdx/*)
      echo "Credential-type file would be published: $f" >&2
      FAILED=1
      ;;
  esac
done

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --no-git --source . --redact --no-banner || FAILED=1
fi

if [[ $FAILED -ne 0 ]]; then
  echo "Secret scan FAILED. Remove the values above before publishing." >&2
  exit 1
fi
echo "Secret scan passed (${#SCAN[@]} files)."
