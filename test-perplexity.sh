#!/bin/bash

# Quick test script for Perplexity API integration
# Usage: ./test-perplexity.sh <your-perplexity-api-key>

set -e

PERPLEXITY_API_KEY="${PERPLEXITY_API_KEY:-$1}"

if [ -z "$PERPLEXITY_API_KEY" ]; then
  echo "❌ Error: PERPLEXITY_API_KEY not set"
  echo ""
  echo "Usage:"
  echo "  ./test-perplexity.sh <your-api-key>"
  echo "  OR"
  echo "  export PERPLEXITY_API_KEY='your-api-key' && ./test-perplexity.sh"
  echo ""
  exit 1
fi

echo "🧪 Testing Perplexity API integration..."
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed or not in PATH"
  exit 1
fi

# Check if collection exists
if [ ! -f "postman/collection.json" ]; then
  echo "⚠️  Warning: postman/collection.json not found"
  echo "   Creating a minimal test collection..."
  mkdir -p postman
  cat > postman/collection.json << 'EOF'
{
  "info": {
    "name": "Test Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Test Request",
      "request": {
        "method": "GET",
        "url": {
          "raw": "https://jsonplaceholder.typicode.com/posts/1"
        }
      }
    }
  ]
}
EOF
  echo "✅ Created test collection"
fi

# Build AI config JSON
AI_CONFIG='{"provider":"local","apiKey":"'$PERPLEXITY_API_KEY'","baseUrl":"https://api.perplexity.ai","model":"sonar","timeout":30000,"maxRetries":2}'

echo "📋 Step 1: Testing collection analysis..."
if node scripts/analyze-collection.js postman/collection.json > /dev/null 2>&1; then
  echo "✅ Collection analysis works"
else
  echo "❌ Collection analysis failed"
  exit 1
fi

echo ""
echo "🤖 Step 2: Testing AI profile generation with Perplexity..."
echo "   (This may take 10-30 seconds...)"

OUTPUT_DIR=".k6-config"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/perplexity-test-profile.yaml"

if node scripts/ai-profile-generator.js postman/collection.json "$AI_CONFIG" "$OUTPUT_FILE" 2>&1; then
  if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ AI profile generation successful!"
    echo ""
    echo "📄 Generated profile preview:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    head -30 "$OUTPUT_FILE" | sed 's/^/   /'
    if [ $(wc -l < "$OUTPUT_FILE") -gt 30 ]; then
      echo "   ... (truncated, see full file: $OUTPUT_FILE)"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Full profile saved to: $OUTPUT_FILE"
  else
    echo "⚠️  AI call completed but output file not created"
    exit 1
  fi
else
  echo "❌ AI profile generation failed"
  echo "   Check your API key and network connection"
  exit 1
fi

echo ""
echo "✨ All tests passed!"
echo ""
echo "Next steps:"
echo "1. Review the generated profile: cat $OUTPUT_FILE"
echo "2. Use it in your workflow by setting:"
echo "   - ai-provider: 'local'"
echo "   - ai-base-url: 'https://api.perplexity.ai'"
echo "   - ai-api-key: \${{ secrets.PERPLEXITY_API_KEY }}"
echo "   - ai-model: 'sonar'"
echo ""
echo "See PERPLEXITY-TEST.md for full configuration examples."

