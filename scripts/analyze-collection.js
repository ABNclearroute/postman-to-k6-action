#!/usr/bin/env node

/**
 * Postman Collection Analyzer
 * Analyzes Postman collection structure and extracts characteristics for AI analysis
 * 
 * Usage: node analyze-collection.js <collection-file>
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively extract all requests from Postman collection
 */
function extractRequests(items, basePath = '') {
  const requests = [];
  
  for (const item of items) {
    const currentPath = basePath ? `${basePath}/${item.name}` : item.name;
    
    if (item.request) {
      // This is a request
      requests.push({
        name: item.name,
        path: currentPath,
        method: item.request.method || 'GET',
        url: item.request.url,
        headers: item.request.header || [],
        auth: item.request.auth,
        description: item.request.description || '',
        hasBody: !!(item.request.body && Object.keys(item.request.body).length > 0),
        hasTests: !!(item.event && item.event.some(e => e.listen === 'test'))
      });
    }
    
    if (item.item && Array.isArray(item.item)) {
      // This is a folder - recurse
      requests.push(...extractRequests(item.item, currentPath));
    }
  }
  
  return requests;
}

/**
 * Analyze HTTP methods distribution
 */
function analyzeMethods(requests) {
  const methodCounts = {};
  requests.forEach(req => {
    const method = req.method.toUpperCase();
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  return methodCounts;
}

/**
 * Detect authentication patterns
 */
function detectAuthPatterns(requests) {
  const authTypes = new Set();
  const hasAuth = requests.some(req => req.auth && Object.keys(req.auth).length > 0);
  
  requests.forEach(req => {
    if (req.auth) {
      Object.keys(req.auth).forEach(key => {
        if (req.auth[key] && req.auth[key].length > 0) {
          authTypes.add(key);
        }
      });
    }
    
    // Check headers for common auth patterns
    req.headers.forEach(header => {
      const key = header.key.toLowerCase();
      if (key === 'authorization' || key === 'api-key' || key === 'x-api-key') {
        authTypes.add('header');
      }
    });
  });
  
  return {
    hasAuth,
    authTypes: Array.from(authTypes),
    requiresAuth: hasAuth || authTypes.size > 0
  };
}

/**
 * Detect API patterns (CRUD, RESTful, etc.)
 */
function detectPatterns(requests) {
  const patterns = {
    hasCRUD: false,
    hasRESTful: false,
    hasGraphQL: false,
    hasWebhooks: false,
    complexity: 'simple'
  };
  
  const methods = requests.map(r => r.method.toUpperCase());
  const uniqueMethods = new Set(methods);
  
  // CRUD detection
  const crudMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const hasCrud = crudMethods.some(m => uniqueMethods.has(m));
  if (hasCrud && uniqueMethods.size >= 2) {
    patterns.hasCRUD = true;
  }
  
  // RESTful detection
  if (hasCrud && uniqueMethods.size >= 3) {
    patterns.hasRESTful = true;
  }
  
  // GraphQL detection (look for POST requests with GraphQL-like body or headers)
  const hasGraphQL = requests.some(req => {
    if (req.method.toUpperCase() === 'POST') {
      return req.headers.some(h => 
        h.key.toLowerCase().includes('graphql') || 
        h.value && h.value.toLowerCase().includes('graphql')
      );
    }
    return false;
  });
  patterns.hasGraphQL = hasGraphQL;
  
  // Complexity assessment
  const totalEndpoints = requests.length;
  const hasBodyRequests = requests.filter(r => r.hasBody).length;
  const hasTests = requests.filter(r => r.hasTests).length;
  
  if (totalEndpoints > 20 || hasBodyRequests > totalEndpoints * 0.5) {
    patterns.complexity = 'high';
  } else if (totalEndpoints > 10 || hasBodyRequests > totalEndpoints * 0.3) {
    patterns.complexity = 'medium';
  }
  
  return patterns;
}

/**
 * Analyze collection structure
 */
function analyzeCollection(collectionPath) {
  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection file not found: ${collectionPath}`);
  }
  
  const collectionContent = fs.readFileSync(collectionPath, 'utf8');
  let collection;
  
  try {
    collection = JSON.parse(collectionContent);
  } catch (e) {
    throw new Error(`Invalid JSON in collection file: ${e.message}`);
  }
  
  if (!collection.item || !Array.isArray(collection.item)) {
    throw new Error('Invalid Postman collection format: missing "item" array');
  }
  
  // Extract all requests
  const requests = extractRequests(collection.item);
  
  // Analyze structure
  const analysis = {
    collectionName: collection.info?.name || 'Unknown',
    collectionDescription: collection.info?.description || '',
    totalEndpoints: requests.length,
    requests: requests.map(r => ({
      name: r.name,
      method: r.method,
      url: r.url,
      hasBody: r.hasBody,
      hasTests: r.hasTests
    })),
    methodDistribution: analyzeMethods(requests),
    auth: detectAuthPatterns(requests),
    patterns: detectPatterns(requests),
    hasVariables: !!(collection.variable && collection.variable.length > 0),
    variableCount: collection.variable ? collection.variable.length : 0
  };
  
  // Calculate complexity score (0-100)
  let complexityScore = 0;
  complexityScore += Math.min(analysis.totalEndpoints * 2, 40); // Up to 40 points for endpoint count
  complexityScore += analysis.patterns.complexity === 'high' ? 30 : analysis.patterns.complexity === 'medium' ? 15 : 0;
  complexityScore += analysis.auth.requiresAuth ? 15 : 0;
  complexityScore += analysis.hasVariables ? 10 : 0;
  complexityScore += requests.filter(r => r.hasBody).length > requests.length * 0.5 ? 5 : 0;
  
  analysis.complexityScore = Math.min(complexityScore, 100);
  
  return analysis;
}

/**
 * Format analysis for AI prompt
 */
function formatAnalysisForAI(analysis, metadataText = '') {
  let formatted = `
Collection Analysis Summary:
- Collection Name: ${analysis.collectionName}
- Total Endpoints: ${analysis.totalEndpoints}
- HTTP Methods: ${Object.keys(analysis.methodDistribution).join(', ')}
- Method Distribution: ${JSON.stringify(analysis.methodDistribution, null, 2)}
- Authentication Required: ${analysis.auth.requiresAuth ? 'Yes' : 'No'}${analysis.auth.authTypes.length > 0 ? ` (Types: ${analysis.auth.authTypes.join(', ')})` : ''}
- Patterns Detected:
  * CRUD Operations: ${analysis.patterns.hasCRUD ? 'Yes' : 'No'}
  * RESTful API: ${analysis.patterns.hasRESTful ? 'Yes' : 'No'}
  * GraphQL: ${analysis.patterns.hasGraphQL ? 'Yes' : 'No'}
- Complexity Level: ${analysis.patterns.complexity} (Score: ${analysis.complexityScore}/100)
- Has Variables: ${analysis.hasVariables ? 'Yes' : 'No'}${analysis.hasVariables ? ` (${analysis.variableCount} variables)` : ''}
- Requests with Body: ${analysis.requests.filter(r => r.hasBody).length}
- Requests with Tests: ${analysis.requests.filter(r => r.hasTests).length}
`;

  if (metadataText) {
    formatted += metadataText;
  }

  return formatted;
}

// CLI usage
if (require.main === module) {
  const collectionPath = process.argv[2];
  
  if (!collectionPath) {
    console.error('Usage: node analyze-collection.js <collection-file>');
    process.exit(1);
  }
  
  try {
    const analysis = analyzeCollection(collectionPath);
    console.log(JSON.stringify(analysis, null, 2));
  } catch (error) {
    console.error(`Error analyzing collection: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  analyzeCollection,
  formatAnalysisForAI,
  extractRequests
};

