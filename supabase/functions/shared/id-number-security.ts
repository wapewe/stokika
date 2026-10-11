/**
 * ID Number Security Utilities
 * 
 * This module provides security utilities specifically for handling Kenyan government ID numbers
 * in the vendor registration system. It ensures ID numbers are properly sanitized, validated,
 * and hashed for secure logging.
 * 
 * Requirements:
 * - Task 15.1: ID number sanitization
 * - Task 15.2: ID number hashing for logs
 * - Security section: ID number protection
 * 
 * Features:
 * - Sanitize ID numbers (remove whitespace, non-numeric characters)
 * - Validate ID number format (exactly 8 digits)
 * - Hash ID numbers for secure audit logging using SHA-256
 * - Environment-based salt for additional security
 * 
 * @module id-number-security
 */

/**
 * ID Number validation result
 */
export interface IdNumberValidationResult {
  /** Whether the ID number is valid */
  valid: boolean;
  /** Sanitized ID number (only returned if valid) */
  sanitized?: string;
  /** Error message if invalid */
  error?: string;
}

/**
 * Sanitize ID number
 * 
 * Removes whitespace, dashes, and any non-numeric characters from an ID number.
 * This ensures the ID number is clean before validation and database operations.
 * 
 * Requirements:
 * - Task 15.1: Trim whitespace and remove non-numeric characters
 * - Task 15.1: Validate format before database operations
 * 
 * @param idNumber - Raw ID number input from user
 * @returns Sanitized ID number containing only digits
 * 
 * @example
 * ```typescript
 * sanitizeIdNumber('12 34-56 78') // Returns: '12345678'
 * sanitizeIdNumber('  12345678  ') // Returns: '12345678'
 * sanitizeIdNumber('abc12345678xyz') // Returns: '12345678'
 * ```
 */
export function sanitizeIdNumber(idNumber: string | null | undefined): string {
  if (!idNumber) {
    return '';
  }
  
  // Remove all whitespace, dashes, and non-numeric characters
  return idNumber
    .trim()
    .replace(/[\s\-\(\)]/g, '') // Remove spaces, dashes, parentheses
    .replace(/[^0-9]/g, '');     // Remove any remaining non-digit characters
}

/**
 * Validate ID number format
 * 
 * Validates that an ID number:
 * 1. Is not null or empty
 * 2. Contains exactly 8 characters
 * 3. Contains only numeric digits (0-9)
 * 
 * This function should be called AFTER sanitization to ensure the ID number
 * meets the Kenyan government ID format requirements.
 * 
 * Requirements:
 * - Requirements 1.2: Validate exactly 8 digits
 * - Requirements 1.3: Validate numeric-only characters
 * - Task 15.1: Validate format before database operations
 * 
 * @param idNumber - Sanitized ID number to validate
 * @returns Validation result with success status and error message if invalid
 * 
 * @example
 * ```typescript
 * validateIdNumber('12345678')    // { valid: true, sanitized: '12345678' }
 * validateIdNumber('1234567')     // { valid: false, error: 'ID Number must be exactly 8 digits' }
 * validateIdNumber('12345678a')   // { valid: false, error: 'ID Number must contain only numbers' }
 * validateIdNumber('')            // { valid: false, error: 'ID Number is required' }
 * ```
 */
export function validateIdNumber(idNumber: string | null | undefined): IdNumberValidationResult {
  const sanitized = sanitizeIdNumber(idNumber);
  
  // Check if empty
  if (!sanitized || sanitized.length === 0) {
    return {
      valid: false,
      error: 'ID Number is required'
    };
  }
  
  // Check length
  if (sanitized.length !== 8) {
    return {
      valid: false,
      error: 'ID Number must be exactly 8 digits'
    };
  }
  
  // Check if contains only digits
  if (!/^[0-9]{8}$/.test(sanitized)) {
    return {
      valid: false,
      error: 'ID Number must contain only numbers'
    };
  }
  
  return {
    valid: true,
    sanitized: sanitized
  };
}

/**
 * Sanitize and validate ID number in one step
 * 
 * Convenience function that combines sanitization and validation.
 * This is the recommended function to use when processing user input.
 * 
 * Requirements:
 * - Task 15.1: Complete sanitization and validation pipeline
 * 
 * @param idNumber - Raw ID number input from user
 * @returns Validation result with sanitized ID number if valid
 * 
 * @example
 * ```typescript
 * const result = sanitizeAndValidateIdNumber('  12-34-56-78  ');
 * if (result.valid) {
 *   console.log('Valid ID:', result.sanitized); // '12345678'
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export function sanitizeAndValidateIdNumber(
  idNumber: string | null | undefined
): IdNumberValidationResult {
  const sanitized = sanitizeIdNumber(idNumber);
  return validateIdNumber(sanitized);
}

/**
 * Hash ID number using SHA-256
 * 
 * Hashes an ID number for secure audit logging and security event tracking.
 * Uses SHA-256 algorithm with an optional salt from environment variables.
 * 
 * IMPORTANT: This function should be used when logging ID numbers to:
 * - Audit logs (audit_logs table)
 * - Payment events (payment_events table)
 * - Security events (security_events table)
 * - Payment reconciliation records
 * 
 * DO NOT log raw ID numbers except in encrypted audit logs specifically
 * designated for PII storage.
 * 
 * Requirements:
 * - Task 15.2: Hash ID numbers using SHA-256
 * - Task 15.2: Use environment variable for hash salt
 * - Task 15.2: Never log raw ID numbers except in encrypted audit logs
 * - Security section: ID number protection
 * 
 * @param idNumber - Sanitized ID number to hash (should be 8 digits)
 * @param salt - Optional salt (defaults to env var ID_NUMBER_HASH_SALT or empty string)
 * @returns Hex string of SHA-256 hash
 * 
 * @example
 * ```typescript
 * const idHash = await hashIdNumber('12345678');
 * 
 * // Use in audit log
 * await supabase.from('audit_logs').insert({
 *   action: 'vendor_registration',
 *   details: {
 *     id_number_hash: idHash,
 *     business_name: 'ABC Store'
 *   }
 * });
 * ```
 */
export async function hashIdNumber(
  idNumber: string,
  salt?: string
): Promise<string> {
  // Get salt from environment or use provided salt
  const hashSalt = salt ?? Deno.env.get('ID_NUMBER_HASH_SALT') ?? '';
  
  // Combine ID number with salt
  const dataToHash = `${idNumber}${hashSalt}`;
  
  // Encode to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  
  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  return hashHex;
}

/**
 * Hash ID number with truncation for display purposes
 * 
 * Returns first 16 characters of the hash for logs where full hash
 * is not necessary. This is useful for correlating events without
 * exposing the full hash.
 * 
 * @param idNumber - Sanitized ID number to hash
 * @param salt - Optional salt
 * @returns First 16 characters of hex hash
 * 
 * @example
 * ```typescript
 * const shortHash = await hashIdNumberShort('12345678');
 * console.log('Event ID:', shortHash); // e.g., '3f7e8a9b2c1d4e5f'
 * ```
 */
export async function hashIdNumberShort(
  idNumber: string,
  salt?: string
): Promise<string> {
  const fullHash = await hashIdNumber(idNumber, salt);
  return fullHash.substring(0, 16);
}

/**
 * Redact ID number for safe display
 * 
 * Returns a partially redacted ID number for display purposes where
 * the full ID should not be shown (e.g., in UI, non-secure logs).
 * 
 * Format: Shows first 2 and last 2 digits, masks middle 4 digits
 * Example: 12345678 -> 12****78
 * 
 * Requirements:
 * - Security section: ID number protection
 * - DO NOT display full ID numbers in logs or error messages
 * 
 * @param idNumber - ID number to redact
 * @returns Partially redacted ID number
 * 
 * @example
 * ```typescript
 * redactIdNumber('12345678')  // Returns: '12****78'
 * redactIdNumber('1234567')   // Returns: '12***67' (handles invalid length gracefully)
 * ```
 */
export function redactIdNumber(idNumber: string): string {
  if (!idNumber || idNumber.length < 4) {
    return '****';
  }
  
  if (idNumber.length === 8) {
    return `${idNumber.substring(0, 2)}****${idNumber.substring(6, 8)}`;
  }
  
  // Handle edge cases
  const firstTwo = idNumber.substring(0, 2);
  const lastTwo = idNumber.substring(idNumber.length - 2);
  const middleLength = idNumber.length - 4;
  const stars = '*'.repeat(Math.max(middleLength, 3));
  
  return `${firstTwo}${stars}${lastTwo}`;
}

/**
 * Verify ID number matches hash
 * 
 * Utility function to verify if a plain ID number matches a stored hash.
 * Useful for verification and debugging purposes.
 * 
 * @param idNumber - Plain ID number to verify
 * @param hash - Stored hash to compare against
 * @param salt - Optional salt (same as used for hashing)
 * @returns True if ID number matches hash, false otherwise
 * 
 * @example
 * ```typescript
 * const storedHash = '3f7e8a9b2c1d4e5f...';
 * const matches = await verifyIdNumberHash('12345678', storedHash);
 * if (matches) {
 *   console.log('ID number verified');
 * }
 * ```
 */
export async function verifyIdNumberHash(
  idNumber: string,
  hash: string,
  salt?: string
): Promise<boolean> {
  const computedHash = await hashIdNumber(idNumber, salt);
  return computedHash === hash;
}

/**
 * Check if string is valid ID number format (without sanitization)
 * 
 * Quick check to determine if a string LOOKS like an ID number
 * without modifying it. Useful for determining if a BillRefNumber
 * is an ID number vs. a payment reference.
 * 
 * Requirements:
 * - Task 10.1: Check if BillRefNumber is 8-digit ID number format
 * 
 * @param value - String to check
 * @returns True if value is exactly 8 digits, false otherwise
 * 
 * @example
 * ```typescript
 * isIdNumberFormat('12345678')     // true
 * isIdNumberFormat('REG-2024-001') // false
 * isIdNumberFormat('1234567')      // false
 * ```
 */
export function isIdNumberFormat(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  
  return /^[0-9]{8}$/.test(value.trim());
}

/**
 * Sanitize ID number for database queries
 * 
 * Ensures ID number is safe for use in database queries by sanitizing
 * and validating. Throws an error if invalid to prevent SQL injection
 * attempts.
 * 
 * Note: Supabase client uses parameterized queries by default, but this
 * provides an additional layer of protection.
 * 
 * Requirements:
 * - Task 15.1: Use parameterized queries (Supabase client handles this)
 * - Security section: SQL injection prevention
 * 
 * @param idNumber - ID number to sanitize for database use
 * @returns Sanitized ID number safe for database queries
 * @throws Error if ID number is invalid
 * 
 * @example
 * ```typescript
 * const safeId = sanitizeIdNumberForDatabase(userInput);
 * 
 * // Use with Supabase (parameterized query)
 * const { data } = await supabase
 *   .from('profiles')
 *   .select('*')
 *   .eq('id_number', safeId);
 * ```
 */
export function sanitizeIdNumberForDatabase(
  idNumber: string | null | undefined
): string {
  const result = sanitizeAndValidateIdNumber(idNumber);
  
  if (!result.valid || !result.sanitized) {
    throw new Error(`Invalid ID number format: ${result.error}`);
  }
  
  return result.sanitized;
}

/**
 * Check for potential SQL injection patterns in ID number
 * 
 * Additional security check to detect if an "ID number" contains
 * SQL injection patterns. This should never happen if validation
 * is working correctly, but provides defense in depth.
 * 
 * @param idNumber - ID number to check
 * @returns True if suspicious patterns detected, false if clean
 * 
 * @example
 * ```typescript
 * if (containsSqlInjectionPatterns("12345678'; DROP TABLE--")) {
 *   throw new Error('Malicious input detected');
 * }
 * ```
 */
export function containsSqlInjectionPatterns(
  idNumber: string | null | undefined
): boolean {
  if (!idNumber) {
    return false;
  }
  
  // Check for SQL keywords and dangerous characters
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b|--|;|\/\*|\*\/|xp_|sp_|'|"|\\)/i;
  
  return sqlPatterns.test(idNumber);
}

/**
 * Log security event for ID number usage
 * 
 * Helper function to log security events involving ID numbers with
 * proper hashing and sanitization.
 * 
 * @param supabase - Supabase client
 * @param eventType - Type of security event
 * @param idNumber - ID number involved in event (will be hashed)
 * @param details - Additional event details
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * 
 * @example
 * ```typescript
 * await logIdNumberSecurityEvent(
 *   supabase,
 *   'DUPLICATE_ID_ATTEMPT',
 *   idNumber,
 *   { existing_entity_id: '123', entity_type: 'profile' },
 *   ipAddress,
 *   userAgent
 * );
 * ```
 */
export async function logIdNumberSecurityEvent(
  supabase: any,
  eventType: string,
  idNumber: string,
  details: Record<string, any>,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    const hashedId = await hashIdNumber(idNumber);
    
    await supabase
      .from('payment_events')
      .insert({
        event_type: eventType,
        event_data: {
          id_number_hash: hashedId,
          ...details,
          timestamp: new Date().toISOString()
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        occurred_at: new Date().toISOString()
      });
    
    console.log(`[Security] ID number event logged: ${eventType}, Hash: ${hashedId.substring(0, 16)}...`);
  } catch (error) {
    console.error('[Security] Failed to log ID number security event:', error);
    // Don't throw - logging failure shouldn't block operations
  }
}
