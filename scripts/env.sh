# Source from bash/zsh: source ./scripts/env.sh
if [ -n "${ZSH_VERSION:-}" ]; then
  CODEX_PET_ROOT="$(cd "$(dirname "${(%):-%x}")/.." && pwd)"
else
  CODEX_PET_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi
export CODEX_PET_ROOT
export PATH="$CODEX_PET_ROOT/.tools/node/bin:$CODEX_PET_ROOT/.tools/pnpm/node_modules/.bin:$CODEX_PET_ROOT/.venv/bin:$PATH"
