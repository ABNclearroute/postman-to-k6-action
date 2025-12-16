# AI Test Workflow Guide

This guide explains how to use the **Test AI Features (Manual)** workflow to test AI capabilities with different configurations.

## Overview

The `test-ai.yml` workflow is a manual workflow that allows you to:
- Test AI features with different providers (OpenAI, Claude, Perplexity, etc.)
- Configure all AI parameters at runtime
- Test profile generation and/or result analysis independently
- Use different API keys without modifying code

## How to Use

### Step 1: Navigate to Actions

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. Find **"Test AI Features (Manual)"** in the workflow list
4. Click on it

### Step 2: Run the Workflow

1. Click the **"Run workflow"** button (top right)
2. Select the branch (usually `main` or `master`)
3. Fill in the configuration inputs (see below)
4. Click **"Run workflow"**

### Step 3: View Results

1. Click on the running workflow instance
2. Watch the execution in real-time
3. Check the **Summary** section for AI-generated content
4. Download **Artifacts** for full results

## Configuration Inputs

### Basic Configuration

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `postman_collection` | Path to Postman collection | `postman/collection.json` | Yes |
| `load_profile` | Load profile type | `smoke` | No |

### AI Feature Toggles

| Input | Description | Default |
|-------|-------------|---------|
| `enable_ai_profile_generation` | Enable AI profile generation | `false` |
| `enable_ai_result_analysis` | Enable AI result analysis | `false` |

### AI Provider Configuration

| Input | Description | Default | Notes |
|-------|-------------|---------|-------|
| `ai_provider` | AI provider | `local` | `openai`, `claude`, or `local` |
| `ai_api_key` | API key | (empty) | **Enter your API key here** |
| `ai_model` | Model name | `sonar` | Provider-specific |
| `ai_base_url` | Base URL | `https://api.perplexity.ai` | For local/Perplexity |
| `ai_timeout` | Timeout (ms) | `30000` | API request timeout |
| `ai_max_retries` | Max retries | `2` | Retry attempts |

## Example Configurations

### Example 1: Test with Perplexity (Profile Generation Only)

```
postman_collection: postman/collection.json
load_profile: smoke
enable_ai_profile_generation: ✅ true
enable_ai_result_analysis: ❌ false
ai_provider: local
ai_api_key: pplx-your-key-here
ai_model: sonar
ai_base_url: https://api.perplexity.ai
ai_timeout: 30000
ai_max_retries: 2
```

### Example 2: Test with OpenAI (Both Features)

```
postman_collection: postman/collection.json
load_profile: smoke
enable_ai_profile_generation: ✅ true
enable_ai_result_analysis: ✅ true
ai_provider: openai
ai_api_key: sk-your-openai-key-here
ai_model: gpt-3.5-turbo
ai_base_url: (leave default)
ai_timeout: 30000
ai_max_retries: 2
```

### Example 3: Test with Claude (Result Analysis Only)

```
postman_collection: postman/collection.json
load_profile: load
enable_ai_profile_generation: ❌ false
enable_ai_result_analysis: ✅ true
ai_provider: claude
ai_api_key: sk-ant-your-claude-key-here
ai_model: claude-3-sonnet-20240229
ai_base_url: (leave default)
ai_timeout: 30000
ai_max_retries: 2
```

### Example 4: Test with Local/Ollama

```
postman_collection: postman/collection.json
load_profile: smoke
enable_ai_profile_generation: ✅ true
enable_ai_result_analysis: ✅ true
ai_provider: local
ai_api_key: (leave empty if not required)
ai_model: llama2
ai_base_url: http://localhost:11434/v1
ai_timeout: 60000
ai_max_retries: 2
```

## Provider-Specific Model Names

### Perplexity (use `local` provider)
- `sonar` - Fast and cost-effective
- `sonar-pro` - More capable
- `sonar-reasoning` - Complex reasoning
- `sonar-online` - Online search enabled

### OpenAI
- `gpt-4` - Most capable
- `gpt-4-turbo-preview` - Faster GPT-4
- `gpt-3.5-turbo` - Fast and cost-effective

### Claude
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fast and cost-effective

### Local/Ollama
- `llama2` - Llama 2 model
- `mistral` - Mistral model
- `codellama` - Code-focused model
- (Any model installed in your Ollama instance)

## Security Best Practices

⚠️ **Important**: This workflow accepts API keys as inputs for testing convenience. For production:

1. **Use GitHub Secrets** instead of workflow inputs
2. **Never commit API keys** to the repository
3. **Rotate API keys** regularly
4. **Monitor API usage** to detect unauthorized access

### Using Secrets (Recommended for Production)

Instead of entering API keys in workflow inputs, use secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add your API key (e.g., `PERPLEXITY_API_KEY`)
4. Modify the workflow to use: `${{ secrets.PERPLEXITY_API_KEY }}`

## Understanding Results

### Workflow Summary

The workflow generates a summary with:

1. **Configuration Display** - Shows all settings used
2. **Test Results** - k6 execution status
3. **AI Profile Generation** - Preview of generated profile (if enabled)
4. **AI Result Analysis** - Preview of insights report (if enabled)
5. **Artifacts** - Links to downloadable files

### Artifacts

Download artifacts to get:
- Generated k6 scripts
- AI-suggested load profiles (YAML)
- AI insights reports (Markdown + JSON)
- k6 test results

## Troubleshooting

### "API key not provided" Warning

- Ensure `ai_api_key` input is filled
- Check the API key is correct
- Verify the key hasn't expired

### "Invalid model" Error

- Check model name matches provider's available models
- For Perplexity, use simple names like `sonar`, not long format
- Refer to provider documentation for correct model names

### "Connection timeout" Error

- Increase `ai_timeout` value (try 60000 for slower models)
- Check network connectivity
- Verify `ai_base_url` is correct

### AI Features Not Running

- Ensure at least one AI feature toggle is enabled
- Check that `ai_api_key` is provided
- Review workflow logs for specific error messages

### Profile Generation Produces Invalid YAML

- AI may generate YAML with placeholder values
- Review and manually fix threshold values if needed
- The structure should be correct even if values need adjustment

## Quick Test Scenarios

### Scenario 1: Quick Perplexity Test

```
✅ enable_ai_profile_generation: true
❌ enable_ai_result_analysis: false
ai_provider: local
ai_api_key: [your-perplexity-key]
ai_model: sonar
ai_base_url: https://api.perplexity.ai
```

**Expected**: Profile generation completes in 10-30 seconds, generates YAML file

### Scenario 2: Full AI Test

```
✅ enable_ai_profile_generation: true
✅ enable_ai_result_analysis: true
ai_provider: local
ai_api_key: [your-perplexity-key]
ai_model: sonar-pro
ai_base_url: https://api.perplexity.ai
```

**Expected**: Both profile generation and result analysis complete, generates profile + insights report

### Scenario 3: Compare Providers

Run the workflow twice with different providers to compare:
- Response times
- Quality of suggestions
- Cost implications

## Tips

1. **Start Simple**: Test with profile generation only first
2. **Use Fast Models**: Start with `sonar` or `gpt-3.5-turbo` for quick feedback
3. **Check Costs**: Monitor API usage, especially with expensive models
4. **Review Outputs**: Always review AI-generated content before using in production
5. **Save Configurations**: Note down working configurations for future use

## Next Steps

After successful testing:

1. Integrate AI features into your main workflows
2. Use GitHub Secrets for API keys (not workflow inputs)
3. Set up scheduled workflows with AI analysis
4. Customize prompts if needed (modify scripts)
5. Share results with your team

Happy testing! 🚀

