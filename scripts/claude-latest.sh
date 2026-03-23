#!/bin/bash
BASE="/Users/renatobreia/Library/Application Support/Claude/claude-code"

# Find the latest version directory
latest_dir="$(ls -d "$BASE"/*/ 2>/dev/null | sort -V | tail -1)"
if [[ -z "$latest_dir" ]]; then
  echo "Error: No Claude Code version found" >&2
  exit 1
fi

# Handle both layouts: direct binary or app bundle
if [[ -x "${latest_dir}claude" ]]; then
  exec "${latest_dir}claude" "$@"
elif [[ -x "${latest_dir}claude.app/Contents/MacOS/claude" ]]; then
  exec "${latest_dir}claude.app/Contents/MacOS/claude" "$@"
else
  echo "Error: No Claude Code binary found in ${latest_dir}" >&2
  exit 1
fi
