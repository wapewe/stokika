/**
 * M-Pesa OAuth Token Management
 * 
 * This module handles secure authentication with the M-Pesa Daraja API,
 * including token caching, automatic refresh, and credential validation.
 * 
 * Requirements:
 * - 1.1: Retrieve M-Pesa credentials from secure environment variables
 * - 1.3: Cache OAuth tokens with expiration timestamps
 * - 1.4: Refresh tokens when within 60 seconds of expiration
 */

/**
 * Interface representing an M-Pesa OAuth token with caching metadata
 * 
 * @property access_token - The OAuth bearer token for API authentication
 * @property expires_in - Token lifetime in seconds (typically 3600)
 * @property cached_at - Timestamp when the token was cached (milliseconds since epoch)
 */
export interface OAuthToken {
  access_token: string;
  expires_in: number;
  cached_at: number;
}

/**
 * In-memory cache for the current M-Pesa OAuth token
 * 
 * This variable stores the active OAuth token to avoid unnecessary authentication
 * requests to the M-Pesa API. The token is refreshed automatically when it's
 * within 60 seconds of expiration.
 * 
 * Note: In a serverless environment like Supabase Edge Functions, this cache
 * may be reset between function invocations. The getValidToken() function
 * handles cache misses gracefully by requesting a new token.
 */
let tokenCache: OAuthToken | null = null;

/**
 * Minimum time in milliseconds before token expiry to trigger refresh (60 seconds)
 * 
 * Tokens are refreshed proactively when they're within this window of expiration
 * to prevent using an expired token mid-request.
 */
const TOKEN_REFRESH_THRESHOLD_MS = 60 * 1000;

/**
 * Get a valid M-Pesa OAuth token, using cache or requesting a new one
 * 
 * This function implements intelligent token management:
 * 1. Checks if a cached token exists
 * 2. Calculates time remaining until token expiry
 * 3. Returns cached token if more than 60 seconds remain
 * 4. Requests new token if cache is empty or token is expiring soon
 * 5. Caches the new token with current timestamp
 * 
 * Requirements:
 * - 1.3: Cache OAuth tokens with expiration timestamps
 * - 1.4: Refresh tokens when within 60 seconds of expiration
 * - 20.5: Cache OAuth tokens to minimize M-Pesa authentication API calls
 * 
 * @returns Promise<string> The valid OAuth access token
 * @throws Error if token request fails
 * 
 * @example
 * ```typescript
 * const token = await getValidToken();
 * // Use token in M-Pesa API request
 * const response = await fetch(apiUrl, {
 *   headers: { 'Authorization': `Bearer ${token}` }
 * });
 * ```
 */
export async function getValidToken(): Promise<string> {
  // Check if we have a cached token
  if (tokenCache) {
    const now = Date.now();
    const expiresAt = tokenCache.cached_at + (tokenCache.expires_in * 1000);
    const timeUntilExpiry = expiresAt - now;
    
    // Return cached token if more than 60 seconds until expiry
    if (timeUntilExpiry > TOKEN_REFRESH_THRESHOLD_MS) {
      console.log(`[M-Pesa Auth] Using cached token (expires in ${Math.floor(timeUntilExpiry / 1000)}s)`);
      return tokenCache.access_token;
    }
    
    console.log(`[M-Pesa Auth] Token expiring soon (${Math.floor(timeUntilExpiry / 1000)}s remaining), refreshing...`);
  } else {
    console.log('[M-Pesa Auth] No cached token found, requesting new token...');
  }
  
  // Request new token if cache empty or within 60s of expiry
  const newToken = await requestNewToken();
  
  // Cache new token with timestamp
  tokenCache = {
    access_token: newToken.access_token,
    expires_in: newToken.expires_in,
    cached_at: Date.now()
  };
  
  console.log(`[M-Pesa Auth] New token cached (expires in ${newToken.expires_in}s)`);
  
  return tokenCache.access_token;
}

/**
 * Request a new OAuth token from M-Pesa API with retry logic
 * 
 * This function authenticates with the M-Pesa Daraja API using consumer
 * credentials and obtains an OAuth token. It implements exponential backoff
 * retry logic to handle transient network failures.
 * 
 * Requirements:
 * - 1.2: Request OAuth token from M-Pesa API using consumer credentials
 * - 1.5: Retry failed authentication with exponential backoff (3 attempts)
 * - 24.1: Retry HTTP 500/503 errors with exponential backoff
 * 
 * @returns Promise<{ access_token: string; expires_in: number }> The OAuth token data
 * @throws Error if authentication fails after all retry attempts
 * 
 * @example
 * ```typescript
 * const token = await requestNewToken();
 * console.log(`Token: ${token.access_token}, expires in ${token.expires_in}s`);
 * ```
 */
async function requestNewToken(): Promise<{ access_token: string; expires_in: number }> {
  // Validate credentials are present
  validateCredentials();
  
  // Read credentials from environment
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')!;
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')!;
  const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';
  
  // Determine API URL based on environment
  const apiUrl = environment === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
  
  // Encode credentials as Base64
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  
  // Retry configuration: 3 attempts with exponential backoff (1s, 2s, 4s)
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // milliseconds
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[M-Pesa Auth] Requesting OAuth token (attempt ${attempt}/${maxRetries})...`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `M-Pesa OAuth failed: ${response.status} ${response.statusText} - ${errorText}`
        );
        
        // Check if error is retryable (5xx errors or network issues)
        if (response.status >= 500 || response.status === 429) {
          lastError = error;
          console.error(`[M-Pesa Auth] Retryable error on attempt ${attempt}:`, error.message);
          
          // Don't wait after the last attempt
          if (attempt < maxRetries) {
            const delay = retryDelays[attempt - 1];
            console.log(`[M-Pesa Auth] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // Non-retryable error (4xx, authentication issues)
          console.error('[M-Pesa Auth] Non-retryable error:', error.message);
          throw error;
        }
      } else {
        // Success - parse and return token
        const data = await response.json();
        
        if (!data.access_token || !data.expires_in) {
          throw new Error('Invalid token response: missing access_token or expires_in');
        }
        
        console.log(`[M-Pesa Auth] Successfully obtained OAuth token (expires in ${data.expires_in}s)`);
        
        return {
          access_token: data.access_token,
          expires_in: data.expires_in
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[M-Pesa Auth] Error on attempt ${attempt}:`, lastError.message);
      
      // If it's a network error and we have retries left, continue
      if (attempt < maxRetries) {
        const delay = retryDelays[attempt - 1];
        console.log(`[M-Pesa Auth] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // All retries exhausted
  console.error('[M-Pesa Auth] All retry attempts exhausted');
  throw new Error(
    `Failed to obtain M-Pesa OAuth token after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Validate that all required M-Pesa credentials are present in environment
 * 
 * This function checks for the presence of required environment variables
 * and validates the MPESA_ENVIRONMENT value. It should be called on startup
 * or before attempting to authenticate with M-Pesa.
 * 
 * Requirements:
 * - 1.1: Retrieve M-Pesa credentials from secure environment variables
 * - 9.2: Validate that all required M-Pesa environment variables are present
 * 
 * @throws Error with descriptive message if validation fails
 * 
 * @example
 * ```typescript
 * try {
 *   validateCredentials();
 *   console.log('M-Pesa credentials validated successfully');
 * } catch (error) {
 *   console.error('Credential validation failed:', error.message);
 * }
 * ```
 */
export function validateCredentials(): void {
  const requiredVars = [
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY'
  ];
  
  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    const value = Deno.env.get(varName);
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required M-Pesa environment variables: ${missingVars.join(', ')}. ` +
      `Please configure these in your Supabase project settings.`
    );
  }
  
  // Validate MPESA_ENVIRONMENT value
  const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error(
      `Invalid MPESA_ENVIRONMENT value: "${environment}". ` +
      `Must be either "sandbox" or "production".`
    );
  }
  
  console.log(`[M-Pesa Auth] Credentials validated successfully (environment: ${environment})`);
}
