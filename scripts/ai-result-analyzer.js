#!/usr/bin/env node

/**
 * AI-Powered Result Analyzer
 * Uses AI to analyze k6 test results and provide insights
 * 
 * Usage: node ai-result-analyzer.js <k6-results-json> <ai-config-json> [profile-name]
 */

const fs = require('fs');
const path = require('path');
const { parseK6Results, formatMetricsForAI } = require('./parse-k6-results');
const { callAI } = require('./ai-utils');

/**
 * Generate AI prompt for result analysis
 */
function generateAnalysisPrompt(metrics, profileName = 'unknown') {
  const metricsText = formatMetricsForAI(metrics);
  
  return `You are a performance testing analyst. Analyze these k6 load test results and provide comprehensive insights.

${metricsText}

Please analyze the results and provide:

1. **Performance Assessment**
   - Overall performance health (excellent/good/fair/poor)
   - Key strengths and weaknesses
   - Comparison against typical performance benchmarks

2. **Anomalies Detection**
   - Any unexpected spikes or drops in response times
   - Unusual error patterns
   - Performance degradation trends
   - Outliers in metrics

3. **Bottleneck Identification**
   - Slowest endpoints or operations
   - High error rates and their likely causes
   - Resource constraints indicated by metrics
   - Potential scalability issues

4. **Threshold Analysis**
   - Threshold violations and their significance
   - Whether thresholds are too strict or too lenient
   - Recommendations for threshold adjustments

5. **Root Cause Analysis**
   - Likely causes of performance issues (if any)
   - Connection between different metrics
   - System limitations or configuration issues

6. **Optimization Recommendations**
   - Specific actionable recommendations
   - Priority of recommendations (high/medium/low)
   - Expected impact of each recommendation

7. **Risk Assessment**
   - Production readiness assessment
   - Risks if deployed as-is
   - Critical issues that need immediate attention

Format your response as a structured analysis with clear sections and bullet points. Be specific and actionable.`;
}

/**
 * System prompt for AI
 */
const SYSTEM_PROMPT = `You are an expert performance testing analyst with deep knowledge of load testing, 
API performance, and system scalability. You analyze test results to identify performance issues, 
bottlenecks, and optimization opportunities. Your analysis is always practical, actionable, and 
based on evidence from the metrics provided.`;

/**
 * Parse AI response into structured format
 */
function parseAIResponse(response) {
  // Try to extract structured sections
  const sections = {
    performanceAssessment: extractSection(response, 'Performance Assessment', 'Anomalies Detection'),
    anomalies: extractSection(response, 'Anomalies Detection', 'Bottleneck Identification'),
    bottlenecks: extractSection(response, 'Bottleneck Identification', 'Threshold Analysis'),
    thresholdAnalysis: extractSection(response, 'Threshold Analysis', 'Root Cause Analysis'),
    rootCause: extractSection(response, 'Root Cause Analysis', 'Optimization Recommendations'),
    recommendations: extractSection(response, 'Optimization Recommendations', 'Risk Assessment'),
    riskAssessment: extractSection(response, 'Risk Assessment', null)
  };
  
  return {
    raw: response,
    sections: sections,
    summary: response.split('\n').slice(0, 5).join('\n') // First few lines as summary
  };
}

/**
 * Extract a section from text between two headers
 */
function extractSection(text, startHeader, endHeader) {
  const startIndex = text.indexOf(startHeader);
  if (startIndex === -1) return null;
  
  const start = text.indexOf('\n', startIndex) + 1;
  let end = text.length;
  
  if (endHeader) {
    const endIndex = text.indexOf(endHeader, start);
    if (endIndex !== -1) {
      end = text.lastIndexOf('\n', endIndex);
    }
  }
  
  return text.substring(start, end).trim();
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(insights, metrics, profileName) {
  const timestamp = new Date().toISOString();
  
  return `# k6 Load Test Analysis Report

**Profile**: ${profileName}  
**Generated**: ${timestamp}  
**Test Duration**: ${metrics.testConfig.options?.duration || 'N/A'}  
**Max Virtual Users**: ${metrics.testConfig.options?.maxVus || 'N/A'}

## Executive Summary

${insights.summary}

## Performance Assessment

${insights.sections.performanceAssessment || insights.raw.split('\n\n')[0] || 'No assessment available'}

## Anomalies Detection

${insights.sections.anomalies || 'No anomalies detected'}

## Bottleneck Identification

${insights.sections.bottlenecks || 'No significant bottlenecks identified'}

## Threshold Analysis

${insights.sections.thresholdAnalysis || 'No threshold analysis available'}

## Root Cause Analysis

${insights.sections.rootCause || 'No root cause analysis available'}

## Optimization Recommendations

${insights.sections.recommendations || 'No recommendations available'}

## Risk Assessment

${insights.sections.riskAssessment || 'No risk assessment available'}

---

## Raw Metrics Summary

- Total Requests: ${metrics.summary.totalRequests}
- Success Rate: ${metrics.derived.successRate}%
- Average Response Time: ${metrics.summary.responseTimes.avg.toFixed(2)}ms
- 95th Percentile: ${metrics.summary.responseTimes.p95.toFixed(2)}ms
- Error Rate: ${(metrics.summary.errorRate * 100).toFixed(2)}%
- Throughput: ${metrics.summary.requestRate.toFixed(2)} req/s

*Report generated by AI-powered analysis*
`;
}

/**
 * Analyze k6 results using AI
 */
async function analyzeResults(resultsPath, aiConfig, profileName = 'unknown', outputDir = '.k6-config') {
  try {
    console.log(`Parsing k6 results: ${resultsPath}`);
    const metrics = parseK6Results(resultsPath);
    
    console.log(`Results parsed: ${metrics.summary.totalRequests} requests, ${metrics.derived.successRate}% success rate`);
    
    console.log('Analyzing results using AI...');
    const prompt = generateAnalysisPrompt(metrics, profileName);
    const response = await callAI(aiConfig, prompt, SYSTEM_PROMPT);
    
    // Parse AI response
    const insights = parseAIResponse(response);
    
    // Generate reports
    const markdownReport = generateMarkdownReport(insights, metrics, profileName);
    const jsonReport = {
      profile: profileName,
      timestamp: new Date().toISOString(),
      metrics: {
        summary: metrics.summary,
        derived: metrics.derived
      },
      insights: insights
    };
    
    // Save reports
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const markdownPath = path.join(outputDir, 'ai-insights-report.md');
    const jsonPath = path.join(outputDir, 'ai-insights-report.json');
    
    fs.writeFileSync(markdownPath, markdownReport, 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
    
    console.log(`Analysis complete. Reports saved to:`);
    console.log(`  - ${markdownPath}`);
    console.log(`  - ${jsonPath}`);
    
    return {
      success: true,
      markdownPath,
      jsonPath,
      insights: insights
    };
  } catch (error) {
    console.error(`Error analyzing results: ${error.message}`);
    return {
      success: false,
      error: error.message,
      insights: null
    };
  }
}

// CLI usage
if (require.main === module) {
  const resultsPath = process.argv[2];
  const aiConfigJson = process.argv[3];
  const profileName = process.argv[4] || 'unknown';
  const outputDir = process.argv[5] || '.k6-config';
  
  if (!resultsPath || !aiConfigJson) {
    console.error('Usage: node ai-result-analyzer.js <k6-results-json> <ai-config-json> [profile-name] [output-dir]');
    console.error('Example: node ai-result-analyzer.js results.json \'{"provider":"openai","apiKey":"sk-..."}\' smoke');
    process.exit(1);
  }
  
  let aiConfig;
  try {
    aiConfig = JSON.parse(aiConfigJson);
  } catch (e) {
    console.error(`Error parsing AI config JSON: ${e.message}`);
    process.exit(1);
  }
  
  analyzeResults(resultsPath, aiConfig, profileName, outputDir)
    .then(result => {
      if (result.success) {
        console.log('\n=== AI Analysis Summary ===\n');
        console.log(result.insights.summary);
        process.exit(0);
      } else {
        console.error(`Failed to analyze results: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`Unexpected error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  analyzeResults,
  generateAnalysisPrompt,
  parseAIResponse,
  generateMarkdownReport
};

