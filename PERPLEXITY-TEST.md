# Testing with Perplexity API

This guide shows you how to test the AI features using Perplexity API keys.

## Perplexity API Setup

Perplexity API is OpenAI-compatible, so it works with the `local` provider option by setting the Perplexity API endpoint as the base URL.

## Configuration

### Step 1: Get Your Perplexity API Key

1. Log in to [Perplexity](https://www.perplexity.ai/)
2. Navigate to API settings in your account
3. Generate a new API key
4. Copy the API key (keep it secure!)

### Step 2: Set Up GitHub Actions Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `PERPLEXITY_API_KEY`
5. Value: Your Perplexity API key
6. Click **Add secret**

### Step 3: Configure the Action

#### GitHub Actions Example

```yaml
name: Load Testing with Perplexity AI

on:
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Postman to k6 Load Test with Perplexity AI
        uses: ./
        with:
          postman-collection: 'postman/collection.json'
          load-profile: 'smoke'
          # Enable AI features
          enable-ai-profile-generation: true
          enable-ai-result-analysis: true
          # Perplexity API configuration
          ai-provider: 'local'
          ai-base-url: 'https://api.perplexity.ai'
          ai-api-key: ${{ secrets.PERPLEXITY_API_KEY }}
          ai-model: 'sonar'
          ai-timeout: '30000'
```

#### Available Perplexity Models

Perplexity offers several models. Common ones include:

- `sonar` - Fast and cost-effective (recommended for most use cases)
- `sonar-pro` - More capable, slightly slower
- `sonar-reasoning` - For complex reasoning tasks
- `sonar-online` - Online search enabled version

**Note**: Model names are simple like `sonar`, not the longer format. Check [Perplexity API documentation](https://docs.perplexity.ai/getting-started/models) for the latest available models.

### Step 4: Run the Workflow

1. Go to the **Actions** tab in your repository
2. Select your workflow
3. Click **Run workflow**
4. Watch the execution - AI features will analyze and generate insights

## GitLab CI Configuration

For GitLab CI/CD:

```yaml
include:
  - local: 'gitlab-ci-template.yml'

stages:
  - test

load-test:
  extends: .postman-to-k6
  variables:
    POSTMAN_COLLECTION: "postman/collection.json"
    LOAD_PROFILE: "smoke"
    # Enable AI features
    ENABLE_AI_PROFILE_GENERATION: "true"
    ENABLE_AI_RESULT_ANALYSIS: "true"
    # Perplexity API configuration
    AI_PROVIDER: "local"
    AI_BASE_URL: "https://api.perplexity.ai"
    AI_API_KEY: $PERPLEXITY_API_KEY  # Set in GitLab CI/CD Variables
    AI_MODEL: "sonar"
    AI_TIMEOUT: "30000"
```

Set `PERPLEXITY_API_KEY` in GitLab CI/CD Variables (Settings → CI/CD → Variables).

## Testing Locally (Quick Test)

You can test the scripts directly on your machine:

### 1. Test Collection Analysis

```bash
node scripts/analyze-collection.js postman/collection.json
```

This should output the collection analysis without needing AI.

### 2. Test AI Profile Generation

```bash
# Set your Perplexity API key as an environment variable
export PERPLEXITY_API_KEY="your-api-key-here"

# Build AI config JSON
AI_CONFIG='{"provider":"local","apiKey":"'$PERPLEXITY_API_KEY'","baseUrl":"https://api.perplexity.ai","model":"llama-3.1-sonar-large-32k-online","timeout":30000,"maxRetries":2}'

# Run profile generator
node scripts/ai-profile-generator.js postman/collection.json "$AI_CONFIG" .k6-config/perplexity-profile.yaml
```

### 3. Test Result Analysis (if you have k6 results)

First, run a k6 test to generate results:

```bash
k6 run --out json=.k6-config/k6-results.json your-k6-script.js
```

Then analyze with Perplexity:

```bash
AI_CONFIG='{"provider":"local","apiKey":"'$PERPLEXITY_API_KEY'","baseUrl":"https://api.perplexity.ai","model":"llama-3.1-sonar-large-32k-online","timeout":30000,"maxRetries":2}'

node scripts/ai-result-analyzer.js .k6-config/k6-results.json "$AI_CONFIG" smoke
```

## Expected Results

### Profile Generation

The AI should generate a YAML file like:

```yaml
profiles:
  smoke:
    name: "Smoke Test"
    description: "Quick validation test"
    stages:
      - duration: "1m"
        target: 5
        rampUp: "10s"
    thresholds:
      http_req_duration: ["p(95)<1000"]
      http_req_failed: ["rate<0.01"]
  # ... more profiles
```

### Result Analysis

You should get:
- `ai-insights-report.md` - Human-readable markdown report
- `ai-insights-report.json` - Structured JSON report

Both files will be in `.k6-config/` directory.

## Troubleshooting

### "API key not provided" Error

- Ensure the API key is set correctly in secrets/variables
- Check the variable name matches (`PERPLEXITY_API_KEY`)
- Verify the secret is accessible to the workflow

### "Connection refused" or "Timeout" Errors

- Verify the base URL: `https://api.perplexity.ai`
- Check your Perplexity API key is valid and active
- Increase `ai-timeout` if using slower models
- Check network connectivity in CI/CD environment

### "Model not found" Error

- Verify the model name is correct
- Check [Perplexity API docs](https://docs.perplexity.ai/) for available models
- Try a different model name

### Rate Limiting

Perplexity API has rate limits. If you hit them:

- Reduce retry attempts: `ai-max-retries: '1'`
- Add delays between requests
- Use a less resource-intensive model
- Check your Perplexity API plan limits

## Cost Considerations

Perplexity API has usage-based pricing. Typical costs per use:

- Profile generation: ~$0.01-0.03
- Result analysis: ~$0.02-0.05

Check [Perplexity pricing](https://www.perplexity.ai/pricing) for current rates.

## Quick Verification Script

Create a test file `test-perplexity.sh`:

```bash
#!/bin/bash

# Test Perplexity API connection
PERPLEXITY_API_KEY="${PERPLEXITY_API_KEY:-$1}"

if [ -z "$PERPLEXITY_API_KEY" ]; then
  echo "Error: PERPLEXITY_API_KEY not set"
  echo "Usage: ./test-perplexity.sh <your-api-key>"
  exit 1
fi

echo "Testing Perplexity API connection..."

AI_CONFIG='{"provider":"local","apiKey":"'$PERPLEXITY_API_KEY'","baseUrl":"https://api.perplexity.ai","model":"llama-3.1-sonar-large-32k-online","timeout":30000,"maxRetries":2}'

# Test with a simple collection
if [ -f "postman/collection.json" ]; then
  echo "Testing profile generation..."
  node scripts/ai-profile-generator.js postman/collection.json "$AI_CONFIG" test-output.yaml
  
  if [ -f "test-output.yaml" ]; then
    echo "✅ Success! Profile generated: test-output.yaml"
    head -20 test-output.yaml
    rm test-output.yaml
  else
    echo "❌ Failed to generate profile"
    exit 1
  fi
else
  echo "Warning: postman/collection.json not found, skipping profile generation test"
fi

echo "✅ Perplexity API test complete!"
```

Make it executable and run:

```bash
chmod +x test-perplexity.sh
./test-perplexity.sh your-perplexity-api-key
```

## Next Steps

Once testing is successful:

1. Update your workflow files with Perplexity configuration
2. Set up secrets/variables in your CI/CD platform
3. Run a full workflow test
4. Review generated profiles and analysis reports
5. Adjust model selection and timeouts as needed

Happy testing! 🚀

