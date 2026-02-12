: << 'CMDBLOCK'
@echo off
node "%~dp0context-monitor.js" %*
exit /b 0
CMDBLOCK

# Unix: node is cross-platform, just call it directly
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "${SCRIPT_DIR}/context-monitor.js" "$@" || true
