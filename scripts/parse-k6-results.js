#!/usr/bin/env node

/**
 * k6 Result Parser
 * Parses k6 JSON output and extracts key metrics for AI analysis
 * 
 * Usage: node parse-k6-results.js <k6-results-json-file>
 */

const fs = require('fs');

/**
 * Parse k6 JSON results file
 */
function parseK6Results(resultsPath) {
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`k6 results file not found: ${resultsPath}`);
  }
  
  const content = fs.readFileSync(resultsPath, 'utf8').trim();
  
  if (!content || content.length === 0) {
    throw new Error(`k6 results file is empty: ${resultsPath}`);
  }
  
  let results;
  
  // k6 JSON output can be:
  // 1. Single JSON object (summary format)
  // 2. Newline-delimited JSON (streaming format) - one JSON object per line
  // 3. Array of JSON objects
  
  try {
    // Try parsing as single JSON object first
    results = JSON.parse(content);
  } catch (e) {
    // If that fails, try newline-delimited JSON (NDJSON)
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        // Try to parse the last line (usually the summary)
        results = JSON.parse(lines[lines.length - 1]);
        console.log(`Parsed NDJSON format, using last entry (${lines.length} total entries)`);
      } else {
        throw new Error('No valid JSON lines found');
      }
    } catch (e2) {
      throw new Error(`Invalid JSON in results file. Single object parse error: ${e.message}. NDJSON parse error: ${e2.message}. File content preview: ${content.substring(0, 500)}`);
    }
  }
  
  if (!results || (typeof results !== 'object' && !Array.isArray(results))) {
    throw new Error(`k6 results file does not contain valid JSON object or array. Got type: ${typeof results}`);
  }
  
  // k6 JSON output can be in different formats
  // Format 1: Summary format with metrics at root
  // Format 2: Full format with root_group
  // Format 3: Array of data points (streaming format)
  
  let metrics = {};
  let rootMetrics = {};
  
  if (Array.isArray(results)) {
    // Streaming format - take the last entry which is usually the summary
    if (results.length > 0) {
      const lastEntry = results[results.length - 1];
      metrics = lastEntry.metrics || lastEntry || {};
      rootMetrics = lastEntry.root_group?.checks || lastEntry.checks || {};
    }
  } else if (results.metrics) {
    // Standard summary format
    metrics = results.metrics;
    rootMetrics = results.root_group?.checks || results.checks || {};
  } else if (results.root_group) {
    // Full format
    metrics = results.metrics || {};
    rootMetrics = results.root_group.checks || {};
  } else {
    // Try to use results directly as metrics
    metrics = results;
    rootMetrics = {};
  }
  
  // Parse HTTP request metrics
  const httpReqMetrics = metrics.http_req_duration || {};
  const httpReqFailedMetrics = metrics.http_req_failed || {};
  const httpReqsMetrics = metrics.http_reqs || {};
  
  // Extract threshold results
  const thresholds = {};
  if (metrics.http_req_duration) {
    thresholds.http_req_duration = {
      ok: metrics.http_req_duration.thresholds || {},
      values: {
        avg: metrics.http_req_duration.values?.avg || 0,
        min: metrics.http_req_duration.values?.min || 0,
        max: metrics.http_req_duration.values?.max || 0,
        p90: metrics.http_req_duration.values?.['p(90)'] || 0,
        p95: metrics.http_req_duration.values?.['p(95)'] || 0,
        p99: metrics.http_req_duration.values?.['p(99)'] || 0
      }
    };
  }
  
  if (metrics.http_req_failed) {
    thresholds.http_req_failed = {
      ok: metrics.http_req_failed.thresholds || {},
      rate: metrics.http_req_failed.values?.rate || 0
    };
  }
  
  // Extract test configuration
  let testConfig = { options: null };
  
  if (results.state) {
    testConfig.options = {
      duration: results.state.testRunDurationMs 
        ? `${Math.round(results.state.testRunDurationMs / 1000)}s`
        : null,
      vus: results.state.vus || 0,
      maxVus: results.state.maxVus || 0
    };
  } else if (results.testRunDurationMs) {
    testConfig.options = {
      duration: `${Math.round(results.testRunDurationMs / 1000)}s`,
      vus: results.vus || 0,
      maxVus: results.maxVus || 0
    };
  }
  
  // Parse summary data
  const summary = {
    totalRequests: httpReqsMetrics.values?.count || 0,
    requestRate: httpReqsMetrics.values?.rate || 0,
    responseTimes: {
      avg: httpReqMetrics.values?.avg || 0,
      min: httpReqMetrics.values?.min || 0,
      max: httpReqMetrics.values?.max || 0,
      p90: httpReqMetrics.values?.['p(90)'] || 0,
      p95: httpReqMetrics.values?.['p(95)'] || 0,
      p99: httpReqMetrics.values?.['p(99)'] || 0,
      med: httpReqMetrics.values?.med || 0
    },
    errorRate: httpReqFailedMetrics.values?.rate || 0,
    errorCount: httpReqFailedMetrics.values?.passes || 0,
    successCount: httpReqFailedMetrics.values?.fails || 0,
    thresholds: thresholds
  };
  
  // Calculate derived metrics
  const derived = {
    successRate: summary.totalRequests > 0 
      ? ((summary.totalRequests - summary.errorCount) / summary.totalRequests * 100).toFixed(2)
      : 100,
    avgThroughput: summary.requestRate,
    hasThresholdViolations: Object.values(thresholds).some(t => {
      if (t.ok && typeof t.ok === 'object') {
        return Object.values(t.ok).some(v => v === false);
      }
      return false;
    })
  };
  
  // Extract checks/results
  const checks = [];
  if (rootMetrics) {
    Object.keys(rootMetrics).forEach(checkName => {
      const check = rootMetrics[checkName];
      checks.push({
        name: checkName,
        passes: check.passes || 0,
        fails: check.fails || 0,
        rate: check.rate || 0
      });
    });
  }
  
  return {
    summary,
    derived,
    checks,
    testConfig,
    rawMetrics: {
      http_req_duration: httpReqMetrics.values || {},
      http_req_failed: httpReqFailedMetrics.values || {},
      http_reqs: httpReqsMetrics.values || {}
    },
    metadata: {
      timestamp: results.state?.timestamp || results.timestamp || new Date().toISOString(),
      testType: (results.state?.testRunDurationMs || results.testRunDurationMs) ? 'duration-based' : 'vu-based',
      thresholds: Object.keys(thresholds),
      rawFormat: Array.isArray(results) ? 'streaming' : (results.metrics ? 'summary' : 'full')
    }
  };
}

/**
 * Format metrics for AI prompt
 */
function formatMetricsForAI(parsed) {
  const { summary, derived, checks, testConfig } = parsed;
  
  return `
Test Configuration:
- Duration: ${testConfig.options?.duration || 'N/A'}
- Virtual Users: ${testConfig.options?.vus || 'N/A'}
- Max Virtual Users: ${testConfig.options?.maxVus || 'N/A'}

Performance Metrics:
- Total Requests: ${summary.totalRequests}
- Requests/Second: ${summary.requestRate.toFixed(2)}
- Success Rate: ${derived.successRate}%
- Error Rate: ${summary.errorRate.toFixed(4)} (${(summary.errorRate * 100).toFixed(2)}%)

Response Times:
- Average: ${summary.responseTimes.avg.toFixed(2)}ms
- Minimum: ${summary.responseTimes.min.toFixed(2)}ms
- Maximum: ${summary.responseTimes.max.toFixed(2)}ms
- Median: ${summary.responseTimes.med.toFixed(2)}ms
- 90th Percentile (p90): ${summary.responseTimes.p90.toFixed(2)}ms
- 95th Percentile (p95): ${summary.responseTimes.p95.toFixed(2)}ms
- 99th Percentile (p99): ${summary.responseTimes.p99.toFixed(2)}ms

Threshold Results:
${Object.keys(summary.thresholds).map(key => {
  const t = summary.thresholds[key];
  if (t.ok && typeof t.ok === 'object') {
    const violations = Object.entries(t.ok)
      .filter(([_, passed]) => passed === false)
      .map(([name]) => name);
    return `- ${key}: ${violations.length > 0 ? `FAILED (${violations.join(', ')})` : 'PASSED'}`;
  }
  return `- ${key}: ${t.rate !== undefined ? `${(t.rate * 100).toFixed(2)}%` : 'N/A'}`;
}).join('\n')}

Checks: ${checks.length > 0 ? checks.map(c => `${c.name}: ${c.passes} passed, ${c.fails} failed`).join('; ') : 'None'}
`;
}

// CLI usage
if (require.main === module) {
  const resultsPath = process.argv[2];
  
  if (!resultsPath) {
    console.error('Usage: node parse-k6-results.js <k6-results-json-file>');
    process.exit(1);
  }
  
  try {
    const parsed = parseK6Results(resultsPath);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error(`Error parsing k6 results: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  parseK6Results,
  formatMetricsForAI
};

