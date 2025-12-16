#!/usr/bin/env node

/**
 * AI-Powered Load Profile Generator
 * Uses AI to analyze Postman collection and suggest optimal load profiles
 * 
 * Usage: node ai-profile-generator.js <collection-file> <ai-config-json>
 */

const fs = require('fs');
const path = require('path');
const { analyzeCollection, formatAnalysisForAI } = require('./analyze-collection');
const { callAI } = require('./ai-utils');

/**
 * Extract YAML from AI response (handles markdown code blocks)
 */
function extractYAML(response) {
  // Remove markdown code block markers if present
  let yamlContent = response.trim();
  
  // Check for ```yaml or ``` code blocks
  const yamlBlockRegex = /```(?:yaml)?\s*\n([\s\S]*?)\n```/;
  const match = yamlContent.match(yamlBlockRegex);
  if (match) {
    yamlContent = match[1];
  }
  
  // Also handle cases where AI returns just the YAML without markers
  // Remove any leading/trailing explanatory text
  const yamlStart = yamlContent.indexOf('profiles:');
  if (yamlStart > 0) {
    yamlContent = yamlContent.substring(yamlStart);
  }
  
  return yamlContent.trim();
}

/**
 * Generate AI prompt for profile generation
 */
function generateProfilePrompt(analysis) {
  const analysisText = formatAnalysisForAI(analysis);
  
  return `You are a performance testing expert. Analyze this Postman collection and suggest optimal load testing configuration.

${analysisText}

Based on this analysis, please suggest appropriate load testing profiles. Consider:
1. The number of endpoints suggests initial load capacity
2. API complexity affects how aggressively we can ramp up virtual users
3. Authentication requirements may add overhead
4. CRUD vs read-heavy patterns affect test duration

Please generate YAML configuration for load profiles following this exact structure:

profiles:
  smoke:
    name: "Smoke Test"
    description: "Quick validation test"
    stages:
      - duration: "1m"
        target: <number>
        rampUp: "10s"
    thresholds:
      http_req_duration: ["p(95)<<ms>>"]
      http_req_failed: ["rate<<threshold>>"]
  
  load:
    name: "Load Test"
    description: "Normal expected load conditions"
    stages:
      - duration: "<duration>"
        target: <number>
        rampUp: "<duration>"
      - duration: "<duration>"
        target: <number>
    thresholds:
      http_req_duration: ["p(95)<<ms>>"]
      http_req_failed: ["rate<<threshold>>"]
  
  stress:
    name: "Stress Test"
    description: "Test system limits"
    stages:
      - duration: "<duration>"
        target: <number>
        rampUp: "<duration>"
      - duration: "<duration>"
        target: <number>
        rampUp: "<duration>"
    thresholds:
      http_req_duration: ["p(95)<<ms>>"]
      http_req_failed: ["rate<<threshold>>"]
  
  spike:
    name: "Spike Test"
    description: "Sudden traffic surge"
    stages:
      - duration: "<duration>"
        target: <number>
        rampUp: "<duration>"
      - duration: "<duration>"
        target: <number>
        rampUp: "<duration>"
    thresholds:
      http_req_duration: ["p(95)<<ms>>"]
      http_req_failed: ["rate<<threshold>>"]

Important guidelines:
- Smoke test: 1-5 VUs, 1 minute duration, very lenient thresholds
- Load test: 10-50 VUs, gradual ramp-up over 5-10 minutes, moderate thresholds
- Stress test: 50-200 VUs, progressive ramp-up over 10-20 minutes, lenient thresholds
- Spike test: Rapid spike to 50-100 VUs within 30-60 seconds, then quick drop
- Response time thresholds: Use p(95) percentile, typical values: 1000ms for smoke, 2000ms for load, 5000ms for stress
- Error rate thresholds: 0.01 (1%) for smoke, 0.05 (5%) for load, 0.10 (10%) for stress

Generate ONLY the YAML configuration, without any additional explanation or markdown formatting outside code blocks.`;
}

/**
 * System prompt for AI
 */
const SYSTEM_PROMPT = `You are an expert performance testing consultant specializing in load testing APIs. 
You analyze API characteristics and recommend optimal load testing configurations including virtual user counts, 
ramp-up patterns, test durations, and performance thresholds. 
You always provide practical, production-ready recommendations based on API complexity and usage patterns.`;

/**
 * Generate load profile using AI
 */
async function generateProfile(collectionPath, aiConfig, outputPath = null) {
  try {
    console.log(`Analyzing collection: ${collectionPath}`);
    const analysis = analyzeCollection(collectionPath);
    
    console.log(`Collection analyzed: ${analysis.totalEndpoints} endpoints, complexity: ${analysis.patterns.complexity}`);
    
    console.log('Generating load profile suggestions using AI...');
    const prompt = generateProfilePrompt(analysis);
    const response = await callAI(aiConfig, prompt, SYSTEM_PROMPT);
    
    // Extract YAML from response
    const yamlContent = extractYAML(response);
    
    if (!yamlContent || !yamlContent.includes('profiles:')) {
      throw new Error('AI response did not contain valid YAML profile configuration');
    }
    
    // If output path provided, save to file
    if (outputPath) {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, yamlContent, 'utf8');
      console.log(`Generated profile saved to: ${outputPath}`);
    }
    
    return {
      success: true,
      yaml: yamlContent,
      analysis: analysis
    };
  } catch (error) {
    console.error(`Error generating profile: ${error.message}`);
    return {
      success: false,
      error: error.message,
      yaml: null
    };
  }
}

// CLI usage
if (require.main === module) {
  const collectionPath = process.argv[2];
  const aiConfigJson = process.argv[3];
  const outputPath = process.argv[4] || '.k6-config/ai-suggested-profile.yaml';
  
  if (!collectionPath || !aiConfigJson) {
    console.error('Usage: node ai-profile-generator.js <collection-file> <ai-config-json> [output-path]');
    console.error('Example: node ai-profile-generator.js collection.json \'{"provider":"openai","apiKey":"sk-...","model":"gpt-4"}\'');
    process.exit(1);
  }
  
  let aiConfig;
  try {
    aiConfig = JSON.parse(aiConfigJson);
  } catch (e) {
    console.error(`Error parsing AI config JSON: ${e.message}`);
    process.exit(1);
  }
  
  generateProfile(collectionPath, aiConfig, outputPath)
    .then(result => {
      if (result.success) {
        console.log('\n=== AI-Generated Load Profile ===\n');
        console.log(result.yaml);
        process.exit(0);
      } else {
        console.error(`Failed to generate profile: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`Unexpected error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  generateProfile,
  generateProfilePrompt,
  extractYAML
};

