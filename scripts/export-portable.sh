#!/bin/bash
# Invoicer Portable Export Script
# Creates a complete portable package with source code, Docker images, and data
# Use this when the target machine may not have internet access

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXPORT_DIR="${1:-$PROJECT_DIR/exports}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_NAME="invoicer_portable_$TIMESTAMP"
EXPORT_PATH="$EXPORT_DIR/$EXPORT_NAME"

echo "=== Invoicer Portable Export ==="
echo "This creates a complete portable package including Docker images."
echo "Export location: $EXPORT_PATH"
echo ""

# Create export directory
mkdir -p "$EXPORT_PATH"

# 1. Export source code (excluding node_modules, etc.)
echo "[1/5] Exporting source code..."
cd "$PROJECT_DIR"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='exports' \
    --exclude='dist' \
    --exclude='*.tar.gz' \
    -czf "$EXPORT_PATH/source.tar.gz" .
echo "      Source code exported."

# 2. Backup the database
echo "[2/5] Backing up database..."
docker exec invoicer-db pg_dump -U invoicer -d invoicer -F c -f /tmp/invoicer_db.dump
docker cp invoicer-db:/tmp/invoicer_db.dump "$EXPORT_PATH/database.dump"
docker exec invoicer-db rm /tmp/invoicer_db.dump
echo "      Database backup complete."

# 3. Backup uploads
echo "[3/5] Backing up uploads..."
if docker exec invoicer-api test -d /app/uploads 2>/dev/null; then
    docker cp invoicer-api:/app/uploads "$EXPORT_PATH/uploads"
    echo "      Uploads backup complete."
else
    mkdir -p "$EXPORT_PATH/uploads/logos"
    echo "      No uploads found, created empty directory."
fi

# 4. Backup environment
echo "[4/5] Backing up configuration..."
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$EXPORT_PATH/.env"
fi

# 5. Save Docker images
echo "[5/5] Saving Docker images (this may take a while)..."
docker save invoicer-api invoicer-web postgres:16-alpine nginx:alpine -o "$EXPORT_PATH/docker-images.tar"
echo "      Docker images saved."

# Create setup script for target machine
cat > "$EXPORT_PATH/setup.sh" << 'SETUP_EOF'
#!/bin/bash
# Invoicer Setup Script for Portable Export
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Invoicer Portable Setup ==="
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Determine install directory
INSTALL_DIR="${1:-$HOME/invoicer}"
echo "Installing to: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Extract source code
echo "[1/5] Extracting source code..."
tar -xzf "$SCRIPT_DIR/source.tar.gz" -C "$INSTALL_DIR"

# Restore .env
echo "[2/5] Restoring configuration..."
if [ -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env" "$INSTALL_DIR/.env"
    echo "      Environment file restored."
    echo "      IMPORTANT: Update .env with new machine settings if needed!"
fi

# Load Docker images
echo "[3/5] Loading Docker images..."
docker load -i "$SCRIPT_DIR/docker-images.tar"
echo "      Docker images loaded."

# Start database
echo "[4/5] Starting database..."
cd "$INSTALL_DIR"
docker compose up -d db
echo "      Waiting for database..."
sleep 10

# Restore database
echo "[5/5] Restoring database..."
docker cp "$SCRIPT_DIR/database.dump" invoicer-db:/tmp/database.dump
docker exec invoicer-db bash -c "dropdb -U invoicer --if-exists invoicer && createdb -U invoicer invoicer" 2>/dev/null || true
docker exec invoicer-db pg_restore -U invoicer -d invoicer -c --if-exists /tmp/database.dump 2>/dev/null || true
docker exec invoicer-db rm /tmp/database.dump

# Start all services
docker compose up -d

# Restore uploads
if [ -d "$SCRIPT_DIR/uploads" ]; then
    sleep 3
    docker cp "$SCRIPT_DIR/uploads/." invoicer-api:/app/uploads/
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Invoicer is now running at: http://localhost:8080"
echo "(or the PORT configured in .env)"
echo ""
echo "Useful commands:"
echo "  cd $INSTALL_DIR"
echo "  docker compose ps      # Check status"
echo "  docker compose logs    # View logs"
echo "  docker compose down    # Stop services"
SETUP_EOF

chmod +x "$EXPORT_PATH/setup.sh"

# Create final archive
echo ""
echo "Creating final archive..."
cd "$EXPORT_DIR"
tar -czf "$EXPORT_NAME.tar.gz" "$EXPORT_NAME"
rm -rf "$EXPORT_PATH"

FINAL_EXPORT="$EXPORT_DIR/$EXPORT_NAME.tar.gz"
EXPORT_SIZE=$(du -h "$FINAL_EXPORT" | cut -f1)

echo ""
echo "=== Export Complete ==="
echo "File: $FINAL_EXPORT"
echo "Size: $EXPORT_SIZE"
echo ""
echo "To deploy on another machine:"
echo "  1. Copy $EXPORT_NAME.tar.gz to the target machine"
echo "  2. Extract: tar -xzf $EXPORT_NAME.tar.gz"
echo "  3. Run: cd $EXPORT_NAME && ./setup.sh [install_directory]"
