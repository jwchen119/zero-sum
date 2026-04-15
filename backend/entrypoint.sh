#!/bin/sh
# Seed the analysis volume with bundled files if the mount is empty.
# The docker-compose volume mount overwrites the image's /app/static_analysis/
# with an empty host directory on first deploy. This copies the pre-generated
# analysis files into it so they're available immediately.

SEED_DIR="/app/_seed_analysis"
TARGET_DIR="/app/static_analysis"

if [ -d "$SEED_DIR" ] && [ -d "$TARGET_DIR" ]; then
    # Only copy files that don't already exist in the target
    for f in "$SEED_DIR"/*.json; do
        [ -f "$f" ] || continue
        base=$(basename "$f")
        if [ ! -f "$TARGET_DIR/$base" ]; then
            cp "$f" "$TARGET_DIR/$base"
        fi
    done
fi

exec "$@"
