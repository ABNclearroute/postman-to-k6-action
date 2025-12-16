# AI Prompts Documentation

This document details the prompts used for the AI capabilities in the Postman-to-k6 action.

## 1. Intelligent Load Profile Generation

### System Prompt
```
You are an expert performance testing consultant specializing in load testing APIs. 
You analyze API characteristics and recommend optimal load testing configurations including virtual user counts, 
ramp-up patterns, test durations, and performance thresholds. 
You always provide practical, production-ready recommendations based on API complexity and usage patterns.
```

### User Prompt Template
```
You are a performance testing expert. Analyze this Postman collection and suggest optimal load testing configuration.

[Collection Analysis Summary - dynamically inserted]

Based on this analysis, please suggest appropriate load testing profiles. Consider:
1. The number of endpoints suggests initial load capacity
2. API complexity affects how aggressively we can ramp up virtual users
3. Authentication requirements may add overhead
4. CRUD vs read-heavy patterns affect test duration
5. Domain context (e.g., payment APIs need stricter thresholds, analytics can be more lenient)
6. Business impact and criticality (critical endpoints need more conservative load profiles)
7. Expected traffic patterns and peak hours (if provided)

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

Generate ONLY the YAML configuration, without any additional explanation or markdown formatting outside code blocks.
```

### Collection Analysis Format (Inserted into prompt)
```
Collection Analysis Summary:
- Collection Name: [name]
- Total Endpoints: [count]
- HTTP Methods: [methods]
- Method Distribution: [JSON object]
- Authentication Required: Yes/No (Types: [types])
- Patterns Detected:
  * CRUD Operations: Yes/No
  * RESTful API: Yes/No
  * GraphQL: Yes/No
- Complexity Level: [simple/medium/high] (Score: [0-100]/100)
- Has Variables: Yes/No ([count] variables)
- Requests with Body: [count]
- Requests with Tests: [count]

[Domain & Business Context - if metadata provided]
Domain & Business Context:
- Domain: [domain]
- Industry: [industry]
- Overall Criticality: [criticality]
- Peak Hours: [peakHours]
- Expected Traffic: [expectedTraffic]

Endpoint-Specific Business Impact:
- [endpoint name] ([method] [path]):
  * Business Impact: [businessImpact]
  * Criticality: [criticality]
  * SLA: [sla]
  * Expected RPS: [expectedRps]
  * Description: [description]
  ...
```

---

## 2. Intelligent Result Analysis

### System Prompt
```
You are an expert performance testing analyst with deep knowledge of load testing, 
API performance, and system scalability. You analyze test results to identify performance issues, 
bottlenecks, and optimization opportunities. Your analysis is always practical, actionable, and 
based on evidence from the metrics provided.
```

### User Prompt Template
```
You are a performance testing analyst. Analyze these k6 load test results and provide comprehensive insights.

[Performance Metrics - dynamically inserted]

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

Format your response as a structured analysis with clear sections and bullet points. Be specific and actionable.
```

### Performance Metrics Format (Inserted into prompt)
```
Test Configuration:
- Duration: [duration]
- Virtual Users: [vus]
- Max Virtual Users: [maxVus]

Performance Metrics:
- Total Requests: [count]
- Requests/Second: [rate]
- Success Rate: [percentage]%
- Error Rate: [rate] ([percentage]%)

Response Times:
- Average: [ms]ms
- Minimum: [ms]ms
- Maximum: [ms]ms
- Median: [ms]ms
- 90th Percentile (p90): [ms]ms
- 95th Percentile (p95): [ms]ms
- 99th Percentile (p99): [ms]ms

Threshold Results:
- [threshold_name]: PASSED/FAILED ([details])
- ...

Checks: [check details or "None"]
```

---

## Implementation Details

### Files Involved

1. **`scripts/ai-profile-generator.js`**
   - Contains `generateProfilePrompt()` function
   - Uses `formatAnalysisForAI()` from `analyze-collection.js`
   - System prompt: `SYSTEM_PROMPT` constant

2. **`scripts/ai-result-analyzer.js`**
   - Contains `generateAnalysisPrompt()` function
   - Uses `formatMetricsForAI()` from `parse-k6-results.js`
   - System prompt: `SYSTEM_PROMPT` constant

3. **`scripts/analyze-collection.js`**
   - Contains `formatAnalysisForAI()` function
   - Formats collection analysis data for AI consumption

4. **`scripts/parse-k6-results.js`**
   - Contains `formatMetricsForAI()` function
   - Formats k6 test results for AI consumption

### AI Provider Abstraction

Both prompts are sent through the `ai-utils.js` module, which provides a unified interface for:
- OpenAI (GPT models)
- Anthropic (Claude models)
- Local AI (OpenAI-compatible APIs like Perplexity, local models, etc.)

The prompts are sent as:
- **System message**: The system prompt
- **User message**: The generated prompt with inserted data

### Response Processing

1. **Profile Generation**: Extracts YAML from AI response, handling markdown code blocks
2. **Result Analysis**: Parses structured sections from AI response and generates markdown/JSON reports

---

## Customization

To modify the prompts:

1. **Profile Generation**: Edit `scripts/ai-profile-generator.js` → `generateProfilePrompt()` and `SYSTEM_PROMPT`
2. **Result Analysis**: Edit `scripts/ai-result-analyzer.js` → `generateAnalysisPrompt()` and `SYSTEM_PROMPT`
3. **Data Formatting**: 
   - Collection analysis: Edit `scripts/analyze-collection.js` → `formatAnalysisForAI()`
   - Metrics formatting: Edit `scripts/parse-k6-results.js` → `formatMetricsForAI()`

