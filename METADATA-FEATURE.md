# API Metadata Feature

## Overview

The API metadata feature enhances AI-powered load profile generation by incorporating domain context, business impact, and endpoint-specific information. This allows the AI to generate more accurate and context-aware load testing profiles.

## What Was Added

### 1. New Input Parameter

- **`api-metadata-file`**: Optional path to a JSON metadata file containing domain and business context information

### 2. New Script: `scripts/parse-metadata.js`

A metadata parser that:
- Parses JSON metadata files
- Extracts domain information from API URLs (fallback when metadata not provided)
- Matches endpoints to metadata entries
- Formats metadata for AI prompts

### 3. Enhanced Collection Analyzer

- Updated `scripts/analyze-collection.js` to include URL information in request analysis
- Enhanced `formatAnalysisForAI()` to accept and include metadata in prompts

### 4. Enhanced AI Profile Generator

- Updated `scripts/ai-profile-generator.js` to:
  - Accept metadata file path
  - Parse and incorporate metadata into AI prompts
  - Use domain and business impact information for better recommendations

### 5. Updated AI Prompt

The AI prompt now considers:
- Domain context (e.g., payment APIs need stricter thresholds)
- Business impact and criticality
- Expected traffic patterns and peak hours
- Endpoint-specific SLAs and requirements

### 6. Documentation Updates

- **`AI-FEATURES.md`**: Added comprehensive metadata file documentation
- **`AI-PROMPTS.md`**: Updated to reflect enhanced prompts with metadata
- **`README.md`**: Added `api-metadata-file` input to inputs table
- **`api-metadata.example.json`**: Example metadata file

## Metadata File Format

See `api-metadata.example.json` for a complete example. The file supports:

- **Domain**: API domain (e.g., "e-commerce", "payment", "healthcare")
- **Business Context**: Industry, criticality, peak hours, expected traffic
- **Endpoint-Specific Metadata**: Business impact, criticality, SLA, expected RPS per endpoint

## Usage

### Basic Usage (without metadata)

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    enable-ai-profile-generation: true
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

The AI will infer domain from API URLs and use general best practices.

### Enhanced Usage (with metadata)

```yaml
- uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    enable-ai-profile-generation: true
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
    api-metadata-file: 'api-metadata.json'
```

The AI will use the provided metadata to generate more accurate, domain-specific load profiles.

## Benefits

1. **Domain-Specific Recommendations**: Payment APIs get stricter thresholds, analytics APIs can be more lenient
2. **Business-Aware Configuration**: Critical endpoints get more conservative load profiles
3. **Traffic Pattern Awareness**: Peak hours and expected traffic inform ramp-up strategies
4. **Endpoint-Specific Tuning**: Individual endpoints can have different SLAs and thresholds
5. **Better Defaults**: More accurate initial load profile suggestions

## Implementation Details

### Domain Extraction (Fallback)

When metadata is not provided, the system attempts to infer domain from API URLs by matching against common patterns:
- Payment: payment, pay, stripe, paypal, checkout, billing
- E-commerce: shop, store, cart, product, order
- Healthcare: health, medical, patient, clinic, hospital
- Finance: bank, account, transaction, wallet
- Analytics: analytics, metrics, stats, dashboard
- And more...

### Endpoint Matching

The system matches endpoints to metadata entries by:
1. Exact name match (case-insensitive)
2. Method and path pattern matching (supports `{id}` placeholders)

## Files Modified

1. `action.yml` - Added `api-metadata-file` input and updated AI profile generation step
2. `scripts/parse-metadata.js` - New file for metadata parsing
3. `scripts/analyze-collection.js` - Enhanced to include URL info and accept metadata
4. `scripts/ai-profile-generator.js` - Updated to use metadata in prompts
5. `AI-FEATURES.md` - Added metadata documentation
6. `AI-PROMPTS.md` - Updated prompt documentation
7. `README.md` - Added input to inputs table
8. `api-metadata.example.json` - Example metadata file

## Backward Compatibility

✅ **Fully backward compatible**: The metadata file is optional. Existing workflows continue to work without changes. The system gracefully falls back to URL-based domain inference when metadata is not provided.

