# AI-Powered Features Documentation

This document describes the optional AI-powered features available in the Postman-to-k6 action.

## Overview

The action includes two optional AI-powered capabilities:

1. **Intelligent Load Profile Generation**: AI analyzes your Postman collection and suggests optimal load profiles, stages, and thresholds
2. **Intelligent Result Analysis**: AI analyzes k6 test results to detect anomalies, identify bottlenecks, and provide actionable insights

**Important**: All AI features are **OPTIONAL** and **DISABLED BY DEFAULT**. They must be explicitly enabled and configured.

## Features

### 1. Intelligent Load Profile Generation

Automatically analyzes your Postman collection and suggests optimal load testing configurations.

**What it does:**
- Analyzes collection structure (endpoints, HTTP methods, complexity)
- Detects patterns (CRUD operations, RESTful APIs, authentication requirements)
- Incorporates domain context and business impact (if metadata provided)
- Extracts domain information from API URLs (if metadata not provided)
- Suggests appropriate load profiles with optimal:
  - Virtual user counts
  - Ramp-up patterns
  - Test durations
  - Performance thresholds
  - Domain-specific considerations (e.g., payment APIs need stricter thresholds)

**When to use:**
- Starting load testing for a new API
- Need help determining optimal load test parameters
- Want AI-assisted configuration recommendations

### 2. Intelligent Result Analysis

Analyzes k6 test results to provide comprehensive insights and recommendations.

**What it does:**
- Detects performance anomalies and outliers
- Identifies bottlenecks and slow endpoints
- Analyzes threshold violations and their significance
- Provides root cause analysis
- Suggests optimization recommendations
- Assesses production readiness and risks

**When to use:**
- After running load tests
- Need help interpreting test results
- Want automated insights and recommendations
- Identifying performance issues and optimization opportunities

## API Metadata File (Optional)

To provide better context for AI-powered load profile generation, you can optionally provide a metadata file containing domain information, business context, and endpoint-specific business impact.

### Metadata File Format

Create a JSON file (e.g., `api-metadata.json`) with the following structure:

```json
{
  "domain": "e-commerce",
  "businessContext": {
    "industry": "retail",
    "criticality": "high",
    "peakHours": "09:00-21:00",
    "expectedTraffic": "high",
    "description": "E-commerce platform serving retail customers"
  },
  "endpoints": [
    {
      "name": "Get Product Details",
      "path": "/products/{id}",
      "method": "GET",
      "businessImpact": "high",
      "criticality": "critical",
      "sla": "p95<500ms",
      "expectedRps": 500,
      "description": "Customer-facing product page endpoint"
    }
  ]
}
```

### Supported Fields

**Top-level:**
- `domain`: API domain (e.g., "e-commerce", "payment", "healthcare", "finance", "analytics")
- `businessContext`: Overall business context (optional)
  - `industry`: Industry type
  - `criticality`: Overall criticality level ("critical", "high", "medium", "low")
  - `peakHours`: Peak traffic hours (e.g., "09:00-17:00", "24/7")
  - `expectedTraffic`: Expected traffic level ("low", "medium", "high", "very-high")
  - `description`: Business context description

**Endpoints array:**
- `name`: Endpoint name (matches Postman request name)
- `path`: API path pattern (supports `{id}` placeholders)
- `method`: HTTP method (GET, POST, etc.)
- `businessImpact`: Business impact level ("critical", "high", "medium", "low")
- `criticality`: Endpoint criticality ("critical", "high", "medium", "low")
- `sla`: Performance SLA (e.g., "p95<500ms")
- `expectedRps`: Expected requests per second
- `description`: Endpoint description

### Benefits

When metadata is provided, the AI can:
- Generate domain-specific load profiles (e.g., stricter thresholds for payment APIs)
- Consider business criticality when setting VU counts and thresholds
- Account for expected traffic patterns and peak hours
- Apply endpoint-specific recommendations based on business impact
- Suggest more appropriate SLAs and thresholds

**Without metadata:** The AI will infer domain from API URLs and use general best practices.

See `api-metadata.example.json` for a complete example.

## Configuration

### GitHub Actions

#### Basic Configuration

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    load-profile: 'smoke'
    # Enable AI features
    enable-ai-profile-generation: true
    enable-ai-result-analysis: true
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
    ai-provider: 'openai'
    ai-model: 'gpt-4'
    # Optional: Provide metadata for better AI recommendations
    api-metadata-file: 'api-metadata.json'
```

#### Using OpenAI (Default)

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    enable-ai-profile-generation: true
    enable-ai-result-analysis: true
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
    ai-provider: 'openai'
    ai-model: 'gpt-4'  # or 'gpt-3.5-turbo' for faster/cheaper
```

#### Using Anthropic Claude

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    enable-ai-profile-generation: true
    enable-ai-result-analysis: true
    ai-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    ai-provider: 'claude'
    ai-model: 'claude-3-sonnet-20240229'
```

#### Using Local/OpenAI-compatible API (Ollama)

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    enable-ai-profile-generation: true
    enable-ai-result-analysis: true
    ai-provider: 'local'
    ai-base-url: 'http://localhost:11434/v1'
    ai-model: 'llama2'
    ai-timeout: '60000'  # Longer timeout for local models
```

### GitLab CI/CD

#### Basic Configuration

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
    AI_API_KEY: $OPENAI_API_KEY  # Set in GitLab CI/CD Variables
    AI_PROVIDER: "openai"
    AI_MODEL: "gpt-4"
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `enable-ai-profile-generation` | boolean | No | `false` | Enable AI-powered load profile generation |
| `enable-ai-result-analysis` | boolean | No | `false` | Enable AI-powered result analysis |
| `ai-api-key` | string | Conditional | `''` | API key for AI provider (required if AI features enabled) |
| `ai-provider` | string | No | `'openai'` | AI provider: `'openai'`, `'claude'`, or `'local'` |
| `ai-model` | string | No | provider default | Specific model to use (provider-specific) |
| `ai-base-url` | string | No | provider default | Custom API base URL (required for `'local'` provider) |
| `ai-timeout` | number | No | `30000` | API request timeout in milliseconds |
| `ai-max-retries` | number | No | `2` | Maximum retry attempts for API calls |

## Outputs

| Output | Description |
|--------|-------------|
| `ai-suggested-profile` | Path to AI-generated load profile YAML (if profile generation enabled) |
| `ai-insights-report` | Path to AI insights report markdown file (if result analysis enabled) |

## Supported AI Providers

### OpenAI

**Models:**
- `gpt-4` - Most capable, slower, more expensive
- `gpt-4-turbo-preview` - Faster GPT-4 variant
- `gpt-3.5-turbo` - Fast and cost-effective (recommended for most use cases)

**Configuration:**
- Base URL: `https://api.openai.com/v1` (default)
- API Key: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

**Best for:**
- General purpose use
- Balanced performance and cost
- Most reliable and well-supported

### Anthropic Claude

**Models:**
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced (recommended)
- `claude-3-haiku-20240307` - Fast and cost-effective

**Configuration:**
- Base URL: `https://api.anthropic.com` (default)
- API Key: Get from [Anthropic Console](https://console.anthropic.com/)

**Best for:**
- Complex analysis tasks
- Detailed explanations
- Alternative to OpenAI

### Local/OpenAI-compatible APIs

**Supported Systems:**
- [Perplexity API](https://www.perplexity.ai/) - OpenAI-compatible API (see [Perplexity Test Guide](PERPLEXITY-TEST.md))
- [Ollama](https://ollama.ai/) - Local LLM runner
- [LocalAI](https://localai.io/) - OpenAI-compatible API server
- Any OpenAI-compatible API endpoint

**Configuration:**
- Base URL: Your API endpoint (e.g., `https://api.perplexity.ai` for Perplexity, or `http://localhost:11434/v1` for Ollama)
- Model: Model name available on your API provider
- Timeout: Recommended `30000` for cloud APIs, `60000` or higher for local models

**Best for:**
- Perplexity: Fast responses, online search capabilities
- Local models: Privacy-sensitive environments, cost savings (no API costs), offline/air-gapped systems

## Security Considerations

1. **API Keys**: Always use GitHub Secrets or GitLab CI/CD Variables for API keys
   ```yaml
   # GitHub Actions
   ai-api-key: ${{ secrets.OPENAI_API_KEY }}
   
   # GitLab CI
   AI_API_KEY: $OPENAI_API_KEY  # Set in CI/CD Variables
   ```

2. **Never commit API keys** to version control

3. **Rate limiting**: Be aware of API rate limits to avoid unexpected costs

4. **Data privacy**: Local providers keep data on-premises; cloud providers process data through their APIs

## Usage Examples

### Example 1: AI Profile Generation Only

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    enable-ai-profile-generation: true
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
    ai-provider: 'openai'
    ai-model: 'gpt-3.5-turbo'
    # Result analysis disabled - uses default profile selection
```

### Example 2: AI Result Analysis Only

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    load-profile: 'load'
    enable-ai-result-analysis: true
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
    ai-provider: 'openai'
    # Profile generation disabled - uses manually selected profile
```

### Example 3: Both AI Features Enabled with Metadata

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    enable-ai-profile-generation: true
    enable-ai-result-analysis: true
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
    ai-provider: 'openai'
    ai-model: 'gpt-4'
    ai-timeout: '60000'
    ai-max-retries: '3'
    api-metadata-file: 'api-metadata.json'  # Optional: for better AI recommendations
```

## Generated Files

### AI Profile Generation Output

When enabled, generates:
- `.k6-config/ai-suggested-profile.yaml` - Suggested load profiles in YAML format

This file can be used as your `profiles-config` input or merged with existing profiles.

### AI Result Analysis Output

When enabled, generates:
- `.k6-config/ai-insights-report.md` - Human-readable markdown report
- `.k6-config/ai-insights-report.json` - Structured JSON report with metrics and insights

Both files are included in workflow artifacts for easy access.

## Troubleshooting

### AI Features Not Running

**Problem**: AI features don't seem to execute

**Solutions:**
1. Verify `enable-ai-profile-generation` or `enable-ai-result-analysis` is set to `true`
2. Check that `ai-api-key` is provided (for cloud providers)
3. Review workflow logs for error messages

### API Key Issues

**Problem**: "API key not provided" warnings

**Solutions:**
1. Ensure API key is set in GitHub Secrets or GitLab CI/CD Variables
2. Verify the secret/variable name matches what you're using
3. Check that the secret/variable is accessible to the workflow

### API Rate Limits

**Problem**: Rate limit errors from AI provider

**Solutions:**
1. Reduce retry attempts (`ai-max-retries`)
2. Use a less expensive/faster model (e.g., `gpt-3.5-turbo` instead of `gpt-4`)
3. Implement delays between API calls if running multiple workflows
4. Consider using local provider for high-frequency usage

### Local Provider Connection Issues

**Problem**: Cannot connect to local AI provider

**Solutions:**
1. Verify the `ai-base-url` is correct and accessible
2. Check that the local AI service is running
3. Increase `ai-timeout` for slower local models
4. Test the endpoint manually with curl or Postman

### AI Analysis Timeout

**Problem**: AI analysis times out

**Solutions:**
1. Increase `ai-timeout` value (default: 30000ms)
2. Use a faster model
3. Check network connectivity
4. For local models, use longer timeout (60000ms or higher)

## Cost Considerations

### OpenAI Pricing (as of 2024)

- `gpt-4`: ~$0.03 per 1K tokens (input), ~$0.06 per 1K tokens (output)
- `gpt-3.5-turbo`: ~$0.0015 per 1K tokens (input), ~$0.002 per 1K tokens (output)

**Estimated costs per use:**
- Profile generation: ~$0.01-0.05 (GPT-3.5) or $0.10-0.50 (GPT-4)
- Result analysis: ~$0.02-0.10 (GPT-3.5) or $0.20-1.00 (GPT-4)

### Claude Pricing (as of 2024)

- `claude-3-opus`: ~$0.015 per 1K tokens (input), ~$0.075 per 1K tokens (output)
- `claude-3-sonnet`: ~$0.003 per 1K tokens (input), ~$0.015 per 1K tokens (output)
- `claude-3-haiku`: ~$0.00025 per 1K tokens (input), ~$0.00125 per 1K tokens (output)

### Local Providers

- **No API costs** - runs on your infrastructure
- Consider compute costs if running on cloud instances

## Best Practices

1. **Start with GPT-3.5-turbo or Claude Haiku** for cost-effectiveness
2. **Use GPT-4 or Claude Opus** only when you need more sophisticated analysis
3. **Enable AI features selectively** - profile generation OR result analysis, not always both
4. **Review AI suggestions** before applying them to production
5. **Use local providers** for sensitive data or high-frequency usage
6. **Monitor API usage** to control costs
7. **Cache AI suggestions** when possible to avoid redundant API calls

## Limitations

- AI suggestions are recommendations, not guarantees
- Performance depends on AI provider availability and response times
- Requires internet connectivity (unless using local provider)
- Costs apply for cloud AI providers
- API rate limits may affect high-frequency usage

## Support

For issues or questions about AI features:
- Check workflow logs for detailed error messages
- Review this documentation
- Open an issue on the repository
- Check AI provider status pages for outages

