#!/bin/bash
# Invoicer Backup Script
# Creates a portable backup of the database, uploads, and configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="invoicer_backup_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo "=== Invoicer Backup Script ==="
echo "Backup location: $BACKUP_PATH"
echo ""

# Create backup directory
mkdir -p "$BACKUP_PATH"

# 1. Backup the PostgreSQL database
echo "[1/4] Backing up database..."
docker exec invoicer-db pg_dump -U invoicer -d invoicer -F c -f /tmp/invoicer_db.dump
docker cp invoicer-db:/tmp/invoicer_db.dump "$BACKUP_PATH/database.dump"
docker exec invoicer-db rm /tmp/invoicer_db.dump
echo "      Database backup complete."

# 2. Backup uploads (logos, etc.)
echo "[2/4] Backing up uploads..."
if docker exec invoicer-api test -d /app/uploads 2>/dev/null; then
    docker cp invoicer-api:/app/uploads "$BACKUP_PATH/uploads"
    echo "      Uploads backup complete."
else
    mkdir -p "$BACKUP_PATH/uploads/logos"
    echo "      No uploads found, created empty directory."
fi

# 3. Backup environment configuration
echo "[3/4] Backing up configuration..."
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$BACKUP_PATH/.env"
    echo "      Environment file backed up."
else
    echo "      No .env file found (using defaults)."
fi

# Copy essential project files for restoration
cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_PATH/"
cp -r "$PROJECT_DIR/docker" "$BACKUP_PATH/"

# 4. Create the archive
echo "[4/4] Creating archive..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

FINAL_BACKUP="$BACKUP_DIR/$BACKUP_NAME.tar.gz"
BACKUP_SIZE=$(du -h "$FINAL_BACKUP" | cut -f1)

echo ""
echo "=== Backup Complete ==="
echo "File: $FINAL_BACKUP"
echo "Size: $BACKUP_SIZE"
echo ""
echo "To restore on another machine:"
echo "  1. Copy $BACKUP_NAME.tar.gz to the new machine"
echo "  2. Run: ./scripts/restore.sh $BACKUP_NAME.tar.gz"
