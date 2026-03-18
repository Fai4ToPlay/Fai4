#!/usr/bin/env bash
set -euo pipefail

# FAI4 all-in-one bootstrap/check/run script
# Usage:
#   ./ONE_FILE_START_CHECK.sh setup   # install deps + prepare env
#   ./ONE_FILE_START_CHECK.sh db      # apply DB schema
#   ./ONE_FILE_START_CHECK.sh check   # syntax checks + health checklist
#   ./ONE_FILE_START_CHECK.sh run     # run API + WEB
#   ./ONE_FILE_START_CHECK.sh desktop # run Electron desktop shell

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

API_ENV_FILE="apps/api/.env"
WEB_ENV_FILE="apps/web/.env.local"

print_header() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

setup_env_files() {
  if [[ ! -f "$API_ENV_FILE" ]]; then
    cat > "$API_ENV_FILE" <<'EOT'
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fai4
JWT_SECRET=super-secret
WEB_URL=http://localhost:3000
EOT
    echo "[setup] Created $API_ENV_FILE"
  else
    echo "[setup] Exists: $API_ENV_FILE"
  fi

  if [[ ! -f "$WEB_ENV_FILE" ]]; then
    cat > "$WEB_ENV_FILE" <<'EOT'
NEXT_PUBLIC_API_URL=http://localhost:4000/api
EOT
    echo "[setup] Created $WEB_ENV_FILE"
  else
    echo "[setup] Exists: $WEB_ENV_FILE"
  fi
}

cmd_setup() {
  print_header "SETUP"
  setup_env_files
  npm install
  echo "[setup] Done"
}

cmd_db() {
  print_header "DATABASE SCHEMA APPLY"
  : "${DATABASE_URL:=postgres://postgres:postgres@localhost:5432/fai4}"
  echo "[db] Using DATABASE_URL=$DATABASE_URL"
  psql "$DATABASE_URL" -f db/schema.sql
  echo "[db] Schema applied"
}

cmd_check() {
  print_header "CHECK"
  node --check apps/api/src/server.js
  node --check apps/api/src/controllers/acts.controller.js
  node --check apps/api/src/controllers/contractors.controller.js
  node --check apps/api/src/controllers/system.controller.js
  node --check apps/api/src/controllers/auth.controller.js
  node --check apps/api/src/routes/index.js
  node --check apps/api/src/services/excel.service.js
  node --check apps/api/src/services/pdf.service.js
  node --check apps/desktop/src/main.js

  echo "[check] Core JS syntax checks passed"

  cat <<'EOT'
[checklist] Manual verification:
1) API:    npm run dev -w apps/api
2) WEB:    npm run dev -w apps/web
3) Open:   http://localhost:3000
4) Login:  POST /api/auth/login, save token to localStorage('token')
5) UI:     Create contractor + create act + export PDF/Excel
6) Import: POST /api/system/import/excel (multipart field=file)
EOT
}

cmd_run() {
  print_header "RUN API + WEB"
  echo "[run] Starting API and WEB in parallel"
  npm run dev
}

cmd_desktop() {
  print_header "RUN DESKTOP"
  echo "[desktop] Ensure web is running on http://localhost:3000"
  npm run dev -w apps/desktop
}

case "${1:-}" in
  setup) cmd_setup ;;
  db) cmd_db ;;
  check) cmd_check ;;
  run) cmd_run ;;
  desktop) cmd_desktop ;;
  *)
    cat <<'EOT'
FAI4 one-file launcher/checker

Commands:
  setup   install dependencies + create env files
  db      apply PostgreSQL schema
  check   run syntax checks + print manual validation checklist
  run     run API + WEB
  desktop run Electron desktop app

Examples:
  ./ONE_FILE_START_CHECK.sh setup
  ./ONE_FILE_START_CHECK.sh db
  ./ONE_FILE_START_CHECK.sh check
  ./ONE_FILE_START_CHECK.sh run
EOT
    exit 1
    ;;
esac
