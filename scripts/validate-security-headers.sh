#!/bin/bash

##############################################################################
# Security Headers Validation Script
# Purpose: Validate that all required security headers are present
# Usage: bash validate-security-headers.sh [URL]
# Example: bash validate-security-headers.sh https://stokika.com/signin.html
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default URL if not provided
URL="${1:-https://stokika.com/signin.html}"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}Security Headers Validation${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Testing URL: ${YELLOW}${URL}${NC}\n"

# Function to check if a header exists
check_header() {
    local header_name="$1"
    local expected_value="$2"
    local response=$(curl -s -I "$URL" | grep -i "^${header_name}:")
    
    if [ -z "$response" ]; then
        echo -e "${RED}✗${NC} ${header_name}: ${RED}MISSING${NC}"
        return 1
    else
        local actual_value=$(echo "$response" | cut -d':' -f2- | sed 's/^[[:space:]]*//' | tr -d '\r')
        if [ -n "$expected_value" ]; then
            if echo "$actual_value" | grep -qi "$expected_value"; then
                echo -e "${GREEN}✓${NC} ${header_name}: ${GREEN}${actual_value}${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠${NC} ${header_name}: ${YELLOW}${actual_value}${NC}"
                echo -e "   Expected: ${expected_value}"
                return 2
            fi
        else
            echo -e "${GREEN}✓${NC} ${header_name}: ${GREEN}${actual_value}${NC}"
            return 0
        fi
    fi
}

# Check HTTP status
echo -e "${BLUE}[1] Checking HTTPS Connection...${NC}"
http_status=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$http_status" = "200" ]; then
    echo -e "${GREEN}✓${NC} HTTPS Connection: ${GREEN}OK (HTTP $http_status)${NC}\n"
else
    echo -e "${RED}✗${NC} HTTPS Connection: ${RED}FAILED (HTTP $http_status)${NC}\n"
fi

# Check HTTPS redirect
echo -e "${BLUE}[2] Checking HTTPS Redirect...${NC}"
http_url="${URL/https:/http:}"
redirect_location=$(curl -s -I "$http_url" | grep -i "^location:" | cut -d':' -f2- | sed 's/^[[:space:]]*//' | tr -d '\r')
if echo "$redirect_location" | grep -q "https://"; then
    echo -e "${GREEN}✓${NC} HTTP -> HTTPS Redirect: ${GREEN}WORKING${NC}"
    echo -e "   Redirects to: ${redirect_location}\n"
else
    echo -e "${RED}✗${NC} HTTP -> HTTPS Redirect: ${RED}NOT WORKING${NC}\n"
fi

# Check required security headers
echo -e "${BLUE}[3] Checking Security Headers...${NC}"

passed=0
warned=0
failed=0

# HSTS
if check_header "Strict-Transport-Security" "max-age=31536000"; then
    ((passed++))
else
    ((failed++))
fi

# X-Frame-Options
if check_header "X-Frame-Options" "DENY"; then
    ((passed++))
else
    ((failed++))
fi

# X-Content-Type-Options
if check_header "X-Content-Type-Options" "nosniff"; then
    ((passed++))
else
    ((failed++))
fi

# X-XSS-Protection
if check_header "X-XSS-Protection" "1; mode=block"; then
    ((passed++))
else
    ((failed++))
fi

# Referrer-Policy
if check_header "Referrer-Policy" "strict-origin-when-cross-origin"; then
    ((passed++))
else
    ((failed++))
fi

# Permissions-Policy
if check_header "Permissions-Policy" ""; then
    ((passed++))
else
    ((failed++))
fi

# CSP (Content-Security-Policy)
if check_header "Content-Security-Policy" ""; then
    ((passed++))
else
    ((failed++))
fi

echo ""

# Check sensitive file protection
echo -e "${BLUE}[4] Checking Sensitive File Protection...${NC}"

sensitive_files=(
    "/.env"
    "/.user.ini"
    "/api/config.ini"
    "/test.log"
    "/backup.sql"
)

base_url=$(echo "$URL" | sed 's|^\(https\?://[^/]*\).*|\1|')

for file in "${sensitive_files[@]}"; do
    test_url="${base_url}${file}"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$test_url")
    
    if [ "$status" = "403" ] || [ "$status" = "404" ]; then
        echo -e "${GREEN}✓${NC} ${file}: ${GREEN}Blocked (HTTP $status)${NC}"
    else
        echo -e "${RED}✗${NC} ${file}: ${RED}Accessible (HTTP $status)${NC}"
    fi
done

echo ""

# Summary
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}Passed:${NC} $passed"
echo -e "${YELLOW}Warnings:${NC} $warned"
echo -e "${RED}Failed:${NC} $failed"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}All security headers are configured correctly!${NC}"
    exit 0
else
    echo -e "${RED}Some security headers are missing or misconfigured.${NC}"
    echo -e "${YELLOW}Please review the .htaccess configuration.${NC}"
    exit 1
fi
