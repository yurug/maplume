#!/bin/bash
# MaPlume Server Statistics
#
# Usage:
#   ./stats.sh                    # Uses DATABASE_URL from environment or prompts
#   ./stats.sh "postgresql://..." # Uses provided URL
#
# To get your DATABASE_URL for Scaleway Serverless SQL:
#   Format: postgres://ACCESS_KEY:SECRET_KEY@DATABASE_ID.pg.sdb.fr-par.scw.cloud:5432/maplume?sslmode=require
#
#   Get your credentials:
#   - Access Key: scw iam api-key list
#   - Secret Key: Found in ~/.config/scw/config.yaml or when you created the key
#   - Database ID: scw sdb-sql database list

cd "$(dirname "$0")"

if [ -n "$1" ]; then
    DATABASE_URL="$1"
elif [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not set."
    echo ""
    echo "You can either:"
    echo "  1. Set DATABASE_URL environment variable"
    echo "  2. Pass it as an argument: ./stats.sh 'postgresql://...'"
    echo ""
    echo "Scaleway connection string format:"
    echo "  postgres://ACCESS_KEY:SECRET_KEY@DB_ID.pg.sdb.fr-par.scw.cloud:5432/maplume?sslmode=require"
    echo ""
    echo "Get your values:"
    echo "  scw iam api-key list              # ACCESS_KEY"
    echo "  cat ~/.config/scw/config.yaml     # SECRET_KEY"
    echo "  scw sdb-sql database list         # DB_ID"
    exit 1
fi

export DATABASE_URL
npm run stats
