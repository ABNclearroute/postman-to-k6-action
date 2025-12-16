#!/usr/bin/env node

/**
 * Metadata Parser
 * Parses API metadata file containing domain, business impact, and endpoint-specific information
 * 
 * Usage: node parse-metadata.js <metadata-file>
 * 
 * Metadata file format (YAML or JSON):
 * domain: "e-commerce" | "healthcare" | "finance" | "payment" | "analytics" | "api-gateway" | etc.
 * businessContext:
 *   industry: "retail" | "healthcare" | "fintech" | etc.
 *   criticality: "critical" | "high" | "medium" | "low"
 *   peakHours: "09:00-17:00" | "24/7" | etc.
 *   expectedTraffic: "low" | "medium" | "high" | "very-high"
 * endpoints:
 *   - name: "Get User Profile"
 *     path: "/users/{id}"
 *     method: "GET"
 *     businessImpact: "high" | "medium" | "low"
 *     criticality: "critical" | "high" | "medium" | "low"
 *     sla: "p95<500ms"
 *     expectedRps: 100
 *     description: "User-facing endpoint, impacts customer experience"
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse metadata file (supports YAML and JSON)
 */
function parseMetadata(metadataPath) {
  if (!metadataPath || !fs.existsSync(metadataPath)) {
    return null;
  }

  const content = fs.readFileSync(metadataPath, 'utf8');
  const ext = path.extname(metadataPath).toLowerCase();

  try {
    if (ext === '.yaml' || ext === '.yml') {
        // Try to parse as YAML (basic parsing, can be enhanced with yaml library)
      // For now, we'll support JSON format and recommend YAML be converted
      // Note: YAML is a superset of JSON, so simple YAML might work, but complex YAML won't
      // Try parsing as JSON first (many YAML files are valid JSON)
      try {
        return JSON.parse(content);
      } catch (jsonError) {
        throw new Error('YAML parsing requires yaml library. Please use JSON format or install js-yaml.');
      }
    } else if (ext === '.json' || !ext) {
      return JSON.parse(content);
    } else {
      throw new Error(`Unsupported metadata file format: ${ext}`);
    }
  } catch (error) {
    if (error.message.includes('YAML')) {
      throw error;
    }
    throw new Error(`Error parsing metadata file: ${error.message}`);
  }
}

/**
 * Extract domain from URL
 */
function extractDomainFromUrl(url) {
  if (!url) {
    return null;
  }

  try {
    // Normalize to a string for URL parsing
    let urlString = '';
    if (typeof url === 'string') {
      urlString = url;
    } else if (typeof url === 'object') {
      if (url.raw) {
        urlString = url.raw;
      } else if (url.host && Array.isArray(url.host)) {
        urlString = `https://${url.host.join('.')}`;
        if (url.path && Array.isArray(url.path) && url.path.length > 0) {
          urlString += `/${url.path.join('/')}`;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }

    const urlObj = new URL(urlString);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Extract domain patterns
    const domainPatterns = {
      'payment': ['payment', 'pay', 'stripe', 'paypal', 'checkout', 'billing'],
      'e-commerce': ['shop', 'store', 'cart', 'product', 'order', 'checkout'],
      'healthcare': ['health', 'medical', 'patient', 'clinic', 'hospital'],
      'finance': ['bank', 'account', 'transaction', 'wallet', 'finance'],
      'analytics': ['analytics', 'metrics', 'stats', 'dashboard', 'report'],
      'api-gateway': ['gateway', 'api', 'proxy'],
      'authentication': ['auth', 'login', 'token', 'oauth', 'sso'],
      'content': ['content', 'media', 'upload', 'file'],
      'notification': ['notification', 'alert', 'message', 'email', 'sms']
    };

    for (const [domain, keywords] of Object.entries(domainPatterns)) {
      if (keywords.some(keyword => hostname.includes(keyword))) {
        return domain;
      }
    }

    // Return generic domain if no pattern matches
    return 'api';
  } catch (e) {
    return null;
  }
}

/**
 * Match endpoint to metadata
 */
function matchEndpointToMetadata(request, metadata) {
  if (!metadata || !metadata.endpoints || !Array.isArray(metadata.endpoints)) {
    return null;
  }

  const method = (request.method || '').toUpperCase();
  const name = request.name || '';
  
  // Try to match by name first
  let match = metadata.endpoints.find(ep => 
    ep.name && ep.name.toLowerCase() === name.toLowerCase()
  );

  // If no name match, try to match by method and path pattern
  if (!match && request.url) {
    let urlPath = '';
    if (typeof request.url === 'object') {
      urlPath = request.url.path ? (Array.isArray(request.url.path) ? request.url.path.join('/') : request.url.path) : '';
    } else if (typeof request.url === 'string') {
      try {
        const urlObj = new URL(request.url);
        urlPath = urlObj.pathname;
      } catch (e) {
        urlPath = request.url;
      }
    }

    match = metadata.endpoints.find(ep => {
      if (ep.method && ep.method.toUpperCase() !== method) {
        return false;
      }
      if (ep.path) {
        // Simple path matching (can be enhanced with regex)
        const epPath = ep.path.replace(/\{[^}]+\}/g, '[^/]+');
        const regex = new RegExp(`^${epPath}$`);
        return regex.test(urlPath);
      }
      return false;
    });
  }

  return match || null;
}

/**
 * Format metadata for AI prompt
 */
function formatMetadataForAI(metadata, collectionAnalysis) {
  if (!metadata) {
    // Try to infer domain from URLs
    const domains = new Set();
    if (collectionAnalysis && collectionAnalysis.requests) {
      collectionAnalysis.requests.forEach(req => {
        if (req.url) {
          const domain = extractDomainFromUrl(req.url);
          if (domain) {
            domains.add(domain);
          }
        }
      });
    }
    
    if (domains.size > 0) {
      return `
Domain Context (inferred from URLs):
- Detected Domains: ${Array.from(domains).join(', ')}
- Note: For more accurate load profiles, provide a metadata file with business context
`;
    }
    return '';
  }

  let formatted = `
Domain & Business Context:
- Domain: ${metadata.domain || 'Not specified'}
`;

  if (metadata.businessContext) {
    const bc = metadata.businessContext;
    formatted += `- Industry: ${bc.industry || 'Not specified'}\n`;
    formatted += `- Overall Criticality: ${bc.criticality || 'Not specified'}\n`;
    formatted += `- Peak Hours: ${bc.peakHours || 'Not specified'}\n`;
    formatted += `- Expected Traffic: ${bc.expectedTraffic || 'Not specified'}\n`;
  }

  if (metadata.endpoints && Array.isArray(metadata.endpoints) && metadata.endpoints.length > 0) {
    formatted += `\nEndpoint-Specific Business Impact:\n`;
    metadata.endpoints.forEach(ep => {
      formatted += `- ${ep.name || 'Unknown'} (${ep.method || 'ANY'} ${ep.path || ''}):\n`;
      formatted += `  * Business Impact: ${ep.businessImpact || 'Not specified'}\n`;
      formatted += `  * Criticality: ${ep.criticality || 'Not specified'}\n`;
      if (ep.sla) formatted += `  * SLA: ${ep.sla}\n`;
      if (ep.expectedRps) formatted += `  * Expected RPS: ${ep.expectedRps}\n`;
      if (ep.description) formatted += `  * Description: ${ep.description}\n`;
    });
  }

  return formatted;
}

// CLI usage
if (require.main === module) {
  const metadataPath = process.argv[2];
  
  if (!metadataPath) {
    console.error('Usage: node parse-metadata.js <metadata-file>');
    process.exit(1);
  }

  try {
    const metadata = parseMetadata(metadataPath);
    console.log(JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error(`Error parsing metadata: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  parseMetadata,
  extractDomainFromUrl,
  matchEndpointToMetadata,
  formatMetadataForAI
};

