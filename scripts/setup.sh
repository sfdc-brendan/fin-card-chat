#!/usr/bin/env bash
# Builds Fin Card Studio, deploys Fin Card Chat, and assigns permission sets.
# Never asks for or stores the Fin API key: you add it in Setup afterwards (docs/INSTALL.md, step 4).
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/setup.sh -o <org alias> [--sample] [--seed] [--site "<Experience site name>"] [--skip-build] [--dry-run]

  -o, --target-org   Salesforce CLI alias or username of the target org (required)
  --sample           Also deploy sample-data/stargrid (StarGrid starter cards and image CSP site)
  --seed             Load the StarGrid starter cards (implies --sample)
  --site NAME        Assign Fin_Card_Chat_Guest to the guest user of this Experience Cloud site
  --skip-build       Deploy the existing Fin Card Studio build in dist/
  --dry-run          Validate the deployment and run tests without saving anything
EOF
}

ORG=""
SAMPLE=false
SEED=false
SITE=""
BUILD=true
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--target-org) ORG="${2:-}"; shift 2 ;;
    --sample) SAMPLE=true; shift ;;
    --seed) SEED=true; SAMPLE=true; shift ;;
    --site) SITE="${2:-}"; shift 2 ;;
    --skip-build) BUILD=false; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$ORG" ]]; then
  usage >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STUDIO="$ROOT/force-app/main/default/uiBundles/FinCardStudio"
cd "$ROOT"

command -v sf >/dev/null || { echo "Install the Salesforce CLI: https://developer.salesforce.com/tools/salesforcecli" >&2; exit 1; }

step() { printf '\n==> %s\n' "$1"; }

if $BUILD; then
  command -v npm >/dev/null || { echo "Install Node.js 22 or later to build Fin Card Studio." >&2; exit 1; }
  step "Building Fin Card Studio"
  (cd "$STUDIO" && npm ci --no-audit --no-fund && npm run build)
fi
[[ -f "$STUDIO/dist/index.html" ]] || { echo "Fin Card Studio is not built. Run without --skip-build." >&2; exit 1; }

DEPLOY_ARGS=(--source-dir force-app --target-org "$ORG" --wait 30)
if $SAMPLE; then
  DEPLOY_ARGS+=(--source-dir sample-data/stargrid)
fi

if $DRY_RUN; then
  step "Validating deployment (nothing is saved)"
  sf project deploy validate "${DEPLOY_ARGS[@]}" --test-level RunLocalTests
  exit 0
fi

step "Deploying Fin Card Chat"
sf project deploy start "${DEPLOY_ARGS[@]}"

# Prints the first field of the first record, or nothing.
query_value() {
  sf data query --target-org "$ORG" --json --query "$1" 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const r=JSON.parse(s).result.records;if(r.length){const k=Object.keys(r[0]).find(k=>k!=="attributes");process.stdout.write(String(r[0][k]??""))}}catch(e){}})'
}

# assign_permset <permission set> <user id> <username>
assign_permset() {
  local existing
  existing="$(query_value "SELECT Id FROM PermissionSetAssignment WHERE AssigneeId = '$2' AND PermissionSet.Name = '$1' LIMIT 1")"
  if [[ -n "$existing" ]]; then
    echo "$1 is already assigned to $3."
  else
    sf org assign permset --name "$1" --on-behalf-of "$3" --target-org "$ORG"
  fi
}

step "Assigning Fin_Card_Studio_Admin to you"
ME="$(sf org display --target-org "$ORG" --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).result.username))')"
ME_ID="$(query_value "SELECT Id FROM User WHERE Username = '$ME'")"
assign_permset Fin_Card_Studio_Admin "$ME_ID" "$ME"

if [[ -n "$SITE" ]]; then
  step "Assigning Fin_Card_Chat_Guest to the guest user of \"$SITE\""
  SAFE_SITE="${SITE//\'/\\\'}"
  GUEST_ID="$(query_value "SELECT GuestUserId FROM Site WHERE Name = '$SAFE_SITE' OR MasterLabel = '$SAFE_SITE' LIMIT 1")"
  if [[ -z "$GUEST_ID" ]]; then
    echo "No Experience site named \"$SITE\" was found. Assign Fin_Card_Chat_Guest to the guest user manually (docs/INSTALL.md, step 6)." >&2
  else
    assign_permset Fin_Card_Chat_Guest "$GUEST_ID" "$(query_value "SELECT Username FROM User WHERE Id = '$GUEST_ID'")"
  fi
fi

if $SEED; then
  step "Loading StarGrid starter cards"
  echo "System.debug(LoggingLevel.ERROR, 'Starter cards created: ' + FinCardSeeder.seed());" \
    | sf apex run --target-org "$ORG" | grep -E "Starter cards created|Error" || true
fi

cat <<EOF

Deployed. Finish the setup in docs/INSTALL.md:
  4. Add your Fin API key to the Fin Agent API external credential (never commit it)
  5. Create the Fin Agent Settings org defaults (webhook secret, brand, site URL)
  7. Add the Fin Card Chat component to your Experience site and publish
  8. Point the Fin Agent API webhook at your site
EOF
