#!/bin/bash
# Invoicer Restore Script
# Restores a backup created by backup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Example: $0 invoicer_backup_20260127_150000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    # Try looking in backups directory
    if [ -f "$PROJECT_DIR/backups/$BACKUP_FILE" ]; then
        BACKUP_FILE="$PROJECT_DIR/backups/$BACKUP_FILE"
    else
        echo "Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

echo "=== Invoicer Restore Script ==="
echo "Restoring from: $BACKUP_FILE"
echo ""

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo "[1/5] Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls "$TEMP_DIR")
BACKUP_PATH="$TEMP_DIR/$BACKUP_DIR"
echo "      Extraction complete."

# Restore .env if present
echo "[2/5] Restoring configuration..."
if [ -f "$BACKUP_PATH/.env" ]; then
    if [ -f "$PROJECT_DIR/.env" ]; then
        echo "      Existing .env found. Creating backup as .env.old"
        cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.old"
    fi
    cp "$BACKUP_PATH/.env" "$PROJECT_DIR/.env"
    echo "      Environment file restored."
else
    echo "      No .env in backup. Using existing or defaults."
fi

# Start/restart containers (need db running for restore)
echo "[3/5] Starting database container..."
cd "$PROJECT_DIR"
docker compose up -d db
echo "      Waiting for database to be ready..."
sleep 5

# Wait for database to be healthy
for i in {1..30}; do
    if docker exec invoicer-db pg_isready -U invoicer > /dev/null 2>&1; then
        break
    fi
    echo "      Waiting for database... ($i/30)"
    sleep 2
done

# Restore database
echo "[4/5] Restoring database..."
if [ -f "$BACKUP_PATH/database.dump" ]; then
    # Drop existing data and restore
    docker cp "$BACKUP_PATH/database.dump" invoicer-db:/tmp/database.dump
    docker exec invoicer-db bash -c "dropdb -U invoicer --if-exists invoicer && createdb -U invoicer invoicer"
    docker exec invoicer-db pg_restore -U invoicer -d invoicer -c --if-exists /tmp/database.dump 2>/dev/null || true
    docker exec invoicer-db rm /tmp/database.dump
    echo "      Database restored."
else
    echo "      No database dump found in backup."
fi

# Restore uploads
echo "[5/5] Restoring uploads..."
if [ -d "$BACKUP_PATH/uploads" ]; then
    # Start api container briefly to copy files
    docker compose up -d api
    sleep 3
    docker cp "$BACKUP_PATH/uploads/." invoicer-api:/app/uploads/
    echo "      Uploads restored."
else
    echo "      No uploads found in backup."
fi

# Start all services
echo ""
echo "Starting all services..."
docker compose up -d

echo ""
echo "=== Restore Complete ==="
echo ""
echo "Services are starting. Check status with:"
echo "  docker compose ps"
echo ""
echo "Access the application at the configured URL (default: http://localhost:8080)"
