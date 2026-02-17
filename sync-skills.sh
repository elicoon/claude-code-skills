#!/bin/sh
# Sync skills from this repo to Claude Code's skills cache.
# Run after creating or renaming skills.
#
# Usage: ./sync-skills.sh

SKILLS_SRC="$(cd "$(dirname "$0")/skills" && pwd)"
SKILLS_CACHE="$HOME/.claude/skills"
PLUGINS_JSON="$HOME/.claude/plugins/installed_plugins.json"

if [ ! -d "$SKILLS_CACHE" ]; then
  echo "Error: Skills cache not found at $SKILLS_CACHE"
  exit 1
fi

added=0
updated=0
for skill_dir in "$SKILLS_SRC"/*/; do
  skill_name=$(basename "$skill_dir")
  dest_dir="$SKILLS_CACHE/$skill_name"
  mkdir -p "$dest_dir"
  for src_file in "$skill_dir"*; do
    [ -f "$src_file" ] || continue
    fname=$(basename "$src_file")
    dest_file="$dest_dir/$fname"
    if [ ! -f "$dest_file" ]; then
      cp "$src_file" "$dest_file"
      echo "  + $skill_name/$fname"
      added=$((added + 1))
    elif ! cmp -s "$src_file" "$dest_file"; then
      cp "$src_file" "$dest_file"
      echo "  ~ $skill_name/$fname (updated)"
      updated=$((updated + 1))
    fi
  done
done

if [ "$added" -eq 0 ] && [ "$updated" -eq 0 ]; then
  echo "Skills cache is up to date."
else
  echo "Synced $added new, $updated updated skill file(s) to cache."
  # Bump lastUpdated in installed_plugins.json so Claude Code re-scans
  NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  if command -v sed >/dev/null 2>&1; then
    sed -i.bak "s/\"lastUpdated\": \"[^\"]*\"/\"lastUpdated\": \"$NOW\"/" "$PLUGINS_JSON" 2>/dev/null
    rm -f "$PLUGINS_JSON.bak"
  fi
fi
