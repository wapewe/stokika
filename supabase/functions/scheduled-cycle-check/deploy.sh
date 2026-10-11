#!/bin/bash

# Deployment script for scheduled-cycle-check Edge Function
# 
# Usage:
#   ./deploy.sh [environment]
#
# Arguments:
#   environment - Optional. Either "staging" or "production". Default: production
#
# Examples:
#   ./deploy.sh              # Deploy to production
#   ./deploy.sh staging      # Deploy to staging
#   ./deploy.sh production   # Deploy to production

set -e  # Exit on error

ENVIRONMENT=${1:-production}
FUNCTION_NAME="scheduled-cycle-check"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Scheduled Cycle Check - Deployment Script                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Function: $FUNCTION_NAME"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo "  # or"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "index.ts" ]; then
    echo "❌ Error: Must run from scheduled-cycle-check directory"
    echo ""
    echo "Current directory: $(pwd)"
    echo "Expected: .../supabase/functions/scheduled-cycle-check"
    exit 1
fi

# Link to Supabase project (if not already linked)
echo "🔗 Checking Supabase project link..."
if ! supabase status &> /dev/null; then
    echo "⚠️  Not linked to a Supabase project"
    echo ""
    read -p "Enter your Supabase project reference: " PROJECT_REF
    supabase link --project-ref "$PROJECT_REF"
    echo ""
fi

# Deploy the function
echo "📦 Deploying $FUNCTION_NAME to $ENVIRONMENT..."
echo ""

if [ "$ENVIRONMENT" = "staging" ]; then
    # Deploy with staging environment variables (if different)
    supabase functions deploy $FUNCTION_NAME
elif [ "$ENVIRONMENT" = "production" ]; then
    # Deploy with production environment variables
    supabase functions deploy $FUNCTION_NAME
else
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo "Valid options: staging, production"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""

# Get the function URL
PROJECT_REF=$(supabase projects list | grep '│' | tail -1 | awk '{print $4}')
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}"

echo "📋 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Function Name: $FUNCTION_NAME"
echo "Environment: $ENVIRONMENT"
echo "Function URL: $FUNCTION_URL"
echo ""

# Test the function
echo "🧪 Testing function..."
echo ""
read -p "Do you want to test the function now? (y/n): " TEST_CONFIRM

if [ "$TEST_CONFIRM" = "y" ] || [ "$TEST_CONFIRM" = "Y" ]; then
    echo ""
    read -s -p "Enter your service role key: " SERVICE_KEY
    echo ""
    echo ""
    echo "Invoking function..."
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        "$FUNCTION_URL")
    
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
fi

# Setup cron job
echo ""
echo "⏰ Cron Job Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Do you want to setup a cron job? (y/n): " CRON_CONFIRM

if [ "$CRON_CONFIRM" = "y" ] || [ "$CRON_CONFIRM" = "Y" ]; then
    echo ""
    echo "Choose a scheduling method:"
    echo "  1) PostgreSQL pg_cron (recommended for Supabase)"
    echo "  2) GitHub Actions"
    echo "  3) System cron"
    echo "  4) Skip"
    echo ""
    read -p "Enter choice (1-4): " CRON_CHOICE
    
    case $CRON_CHOICE in
        1)
            echo ""
            echo "PostgreSQL pg_cron setup:"
            echo ""
            echo "Run this SQL in your Supabase SQL editor:"
            echo ""
            echo "-- Enable pg_cron extension"
            echo "CREATE EXTENSION IF NOT EXISTS pg_cron;"
            echo ""
            echo "-- Schedule daily at 3 AM (after scoring update at 2 AM)"
            echo "SELECT cron.schedule("
            echo "  'daily-cycle-check',"
            echo "  '0 3 * * *',"
            echo "  \$\$"
            echo "    SELECT net.http_post("
            echo "      url := '${FUNCTION_URL}',"
            echo "      headers := '{\"Authorization\": \"Bearer YOUR_SERVICE_KEY\"}'::jsonb"
            echo "    );"
            echo "  \$\$"
            echo ");"
            echo ""
            echo "NOTE: This runs at 3 AM, after the scoring update at 2 AM"
            echo ""
            ;;
        2)
            echo ""
            echo "GitHub Actions setup:"
            echo ""
            echo "Create .github/workflows/daily-cycle-check.yml:"
            echo ""
            cat << 'EOF'
name: Daily Cycle Check

on:
  schedule:
    - cron: '0 3 * * *'  # Every day at 3:00 AM UTC
  workflow_dispatch:

jobs:
  check-cycles:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cycle Check
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            FUNCTION_URL_HERE
EOF
            echo ""
            echo "Replace FUNCTION_URL_HERE with: $FUNCTION_URL"
            echo ""
            ;;
        3)
            echo ""
            echo "System cron setup:"
            echo ""
            echo "Run: crontab -e"
            echo ""
            echo "Add this line (runs at 3 AM daily):"
            echo "0 3 * * * curl -X POST -H \"Authorization: Bearer YOUR_SERVICE_KEY\" ${FUNCTION_URL}"
            echo ""
            ;;
        *)
            echo "Skipping cron setup"
            ;;
    esac
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All done!"
echo ""
echo "Next steps:"
echo "  1. Verify the function is deployed: supabase functions list"
echo "  2. Check logs: supabase functions logs $FUNCTION_NAME --tail"
echo "  3. Set up scheduled invocation (if not done above)"
echo "  4. Monitor first scheduled run"
echo ""
echo "Important:"
echo "  • This function should run AFTER scheduled-scoring-update (2 AM)"
echo "  • Ensure calculate-vendor-score function is deployed"
echo "  • Check audit_logs table for cycle status changes"
echo ""
echo "Documentation: ./README.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
