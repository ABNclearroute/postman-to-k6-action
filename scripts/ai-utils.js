#!/usr/bin/env node

/**
 * AI Utility Functions
 * Provides abstraction layer for multiple AI providers (OpenAI, Claude, Local)
 * Handles API calls, error handling, retries, and rate limiting
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Mask API key in logs (only show first 4 and last 4 characters)
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length <= 8) return '***';
  return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
}

/**
 * Sleep/delay function for retries
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(url, options, body, retries = 2, timeout = 30000) {
  const protocol = url.startsWith('https') ? https : http;
  
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        clearTimeout(timeoutHandle);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else if (res.statusCode === 429 && retries > 0) {
          // Rate limit - retry with exponential backoff
          const retryAfter = parseInt(res.headers['retry-after'] || '5', 10);
          const delay = retryAfter * 1000 * (3 - retries);
          console.log(`Rate limited. Retrying after ${delay}ms...`);
          sleep(delay).then(() => {
            makeRequest(url, options, body, retries - 1, timeout)
              .then(resolve)
              .catch(reject);
          });
        } else if (res.statusCode >= 500 && retries > 0) {
          // Server error - retry with exponential backoff
          const delay = 1000 * Math.pow(2, 2 - retries);
          console.log(`Server error ${res.statusCode}. Retrying after ${delay}ms...`);
          sleep(delay).then(() => {
            makeRequest(url, options, body, retries - 1, timeout)
              .then(resolve)
              .catch(reject);
          });
        } else {
          reject(new Error(`API request failed: ${res.statusCode} ${res.statusMessage}\n${data}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeoutHandle);
      if (retries > 0) {
        const delay = 1000 * Math.pow(2, 2 - retries);
        console.log(`Request error: ${error.message}. Retrying after ${delay}ms...`);
        sleep(delay).then(() => {
          makeRequest(url, options, body, retries - 1, timeout)
            .then(resolve)
            .catch(reject);
        });
      } else {
        reject(error);
      }
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * OpenAI API client
 */
class OpenAIProvider {
  constructor(apiKey, baseUrl = 'https://api.openai.com/v1', model = 'gpt-3.5-turbo', timeout = 30000, maxRetries = 2) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  async call(prompt, systemPrompt = null) {
    const url = `${this.baseUrl}/chat/completions`;
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body = {
      model: this.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await makeRequest(url, options, body, this.maxRetries, this.timeout);
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

/**
 * Anthropic Claude API client
 */
class ClaudeProvider {
  constructor(apiKey, baseUrl = 'https://api.anthropic.com', model = 'claude-3-sonnet-20240229', timeout = 30000, maxRetries = 2) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  async call(prompt, systemPrompt = null) {
    const url = `${this.baseUrl}/v1/messages`;
    
    const body = {
      model: this.model,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ]
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      }
    };

    try {
      const response = await makeRequest(url, options, body, this.maxRetries, this.timeout);
      return response.content[0]?.text || '';
    } catch (error) {
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
}

/**
 * Local/OpenAI-compatible API client (for Ollama, LocalAI, etc.)
 */
class LocalProvider {
  constructor(apiKey, baseUrl, model = 'llama2', timeout = 60000, maxRetries = 2) {
    // For local providers, API key is often optional
    this.apiKey = apiKey || '';
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.timeout = timeout; // Longer timeout for local models
    this.maxRetries = maxRetries;
  }

  async call(prompt, systemPrompt = null) {
    const url = `${this.baseUrl}/chat/completions`;
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body = {
      model: this.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const options = {
      method: 'POST',
      headers: headers
    };

    try {
      const response = await makeRequest(url, options, body, this.maxRetries, this.timeout);
      return response.choices[0]?.message?.content || response.content || '';
    } catch (error) {
      throw new Error(`Local AI API error: ${error.message}`);
    }
  }
}

/**
 * AI Provider Factory
 * Creates appropriate AI provider based on configuration
 */
function createAIProvider(config) {
  const {
    provider = 'openai',
    apiKey,
    baseUrl,
    model,
    timeout = 30000,
    maxRetries = 2
  } = config;

  if (!apiKey && provider !== 'local') {
    throw new Error(`API key is required for provider: ${provider}`);
  }

  console.log(`Initializing AI provider: ${provider} (model: ${model || 'default'})`);

  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(apiKey, baseUrl || 'https://api.openai.com/v1', model || 'gpt-3.5-turbo', timeout, maxRetries);
    
    case 'claude':
      return new ClaudeProvider(apiKey, baseUrl || 'https://api.anthropic.com', model || 'claude-3-sonnet-20240229', timeout, maxRetries);
    
    case 'local':
      if (!baseUrl) {
        throw new Error('baseUrl is required for local provider');
      }
      return new LocalProvider(apiKey, baseUrl, model || 'llama2', timeout || 60000, maxRetries);
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}. Supported: openai, claude, local`);
  }
}

/**
 * Call AI with error handling and logging
 */
async function callAI(config, prompt, systemPrompt = null) {
  try {
    const aiProvider = createAIProvider(config);
    console.log(`Calling AI API (provider: ${config.provider}, masked key: ${maskApiKey(config.apiKey)})...`);
    const response = await aiProvider.call(prompt, systemPrompt);
    console.log('AI API call successful');
    return response;
  } catch (error) {
    console.error(`AI API call failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createAIProvider,
  callAI,
  maskApiKey,
  OpenAIProvider,
  ClaudeProvider,
  LocalProvider
};

