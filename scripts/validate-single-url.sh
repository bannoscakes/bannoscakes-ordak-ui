#!/bin/bash

# Validate Single URL Architecture
# This script ensures the single URL architecture is maintained

echo "🔍 Validating Single URL Architecture..."

# Check for forbidden URL patterns in source files
echo "📝 Checking for role-specific URLs..."

FORBIDDEN_PATTERNS=(
    "/workspace/staff"
    "/workspace/supervisor" 
    "/dashboard"
    "workspace/staff"
    "workspace/supervisor"
    "dashboard"
)

FOUND_VIOLATIONS=false

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if grep -r "$pattern" src/ --include="*.tsx" --include="*.ts" --exclude-dir=node_modules; then
        echo "❌ Found forbidden pattern: $pattern"
        FOUND_VIOLATIONS=true
    fi
done

if [ "$FOUND_VIOLATIONS" = true ]; then
    echo "🚨 VIOLATION: Role-specific URLs found!"
    echo "📖 See docs/SINGLE_URL_ARCHITECTURE.md for correct patterns"
    exit 1
fi

echo "✅ No role-specific URLs found"

# Run tests
echo "🧪 Running single URL architecture tests..."
npm run test:single-url

if [ $? -ne 0 ]; then
    echo "🚨 Tests failed!"
    exit 1
fi

echo "✅ All single URL architecture validations passed!"
echo "🔒 Single URL architecture is locked in and secure!"
