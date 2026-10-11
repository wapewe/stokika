/**
 * Unit Tests for Security Utilities
 * 
 * This test file verifies the security functions work correctly.
 * 
 * To run these tests:
 * deno test --allow-env --allow-net supabase/functions/shared/security.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  validateEmail,
  validatePhone,
  validateUUID,
  validateString,
  validateNumber,
  sanitizeHTML,
  redactSensitiveData
} from './security.ts';

// Email Validation Tests
Deno.test('validateEmail - valid email', () => {
  const result = validateEmail('user@example.com');
  assertEquals(result.valid, true);
  assertEquals(result.errors, undefined);
});

Deno.test('validateEmail - invalid format', () => {
  const result = validateEmail('not-an-email');
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'Invalid email format');
});

Deno.test('validateEmail - missing email', () => {
  const result = validateEmail(null);
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'Email is required');
});

Deno.test('validateEmail - email too long', () => {
  const longEmail = 'a'.repeat(250) + '@example.com';
  const result = validateEmail(longEmail);
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'Email is too long');
});

// Phone Validation Tests
Deno.test('validatePhone - valid 254 format', () => {
  const result = validatePhone('254712345678');
  assertEquals(result.valid, true);
  assertEquals(result.normalized, '254712345678');
});

Deno.test('validatePhone - valid 07 format', () => {
  const result = validatePhone('0712345678');
  assertEquals(result.valid, true);
  assertEquals(result.normalized, '254712345678');
});

Deno.test('validatePhone - valid 01 format', () => {
  const result = validatePhone('0123456789');
  assertEquals(result.valid, true);
  assertEquals(result.normalized, '254123456789');
});

Deno.test('validatePhone - invalid format', () => {
  const result = validatePhone('12345');
  assertEquals(result.valid, false);
  assertExists(result.errors);
});

Deno.test('validatePhone - missing phone', () => {
  const result = validatePhone(null);
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'Phone number is required');
});

// UUID Validation Tests
Deno.test('validateUUID - valid UUID', () => {
  const result = validateUUID('123e4567-e89b-12d3-a456-426614174000', 'Test ID');
  assertEquals(result.valid, true);
});

Deno.test('validateUUID - invalid UUID', () => {
  const result = validateUUID('not-a-uuid', 'Test ID');
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'Test ID must be a valid UUID');
});

Deno.test('validateUUID - missing UUID', () => {
  const result = validateUUID(null, 'Test ID');
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'Test ID is required');
});

// String Validation Tests
Deno.test('validateString - valid string', () => {
  const result = validateString('Valid Business Name', 'businessName', {
    required: true,
    minLength: 2,
    maxLength: 100
  });
  assertEquals(result.valid, true);
});

Deno.test('validateString - too short', () => {
  const result = validateString('A', 'businessName', {
    required: true,
    minLength: 2
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'businessName must be at least 2 characters');
});

Deno.test('validateString - too long', () => {
  const result = validateString('A'.repeat(201), 'businessName', {
    required: true,
    maxLength: 200
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'businessName must not exceed 200 characters');
});

Deno.test('validateString - SQL injection detection', () => {
  const result = validateString('DROP TABLE users; --', 'businessName', {
    required: true
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'businessName contains invalid characters');
});

Deno.test('validateString - XSS detection', () => {
  const result = validateString('<script>alert("xss")</script>', 'businessName', {
    required: true
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'businessName contains potentially malicious content');
});

Deno.test('validateString - pattern matching', () => {
  const result = validateString('ValidName123', 'businessName', {
    required: true,
    pattern: /^[a-zA-Z0-9]+$/
  });
  assertEquals(result.valid, true);
});

Deno.test('validateString - pattern not matching', () => {
  const result = validateString('Invalid Name!', 'businessName', {
    required: true,
    pattern: /^[a-zA-Z0-9]+$/
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'businessName has invalid format');
});

Deno.test('validateString - not required and missing', () => {
  const result = validateString(null, 'businessName', {
    required: false
  });
  assertEquals(result.valid, true);
});

// Number Validation Tests
Deno.test('validateNumber - valid number', () => {
  const result = validateNumber(100, 'amount', {
    required: true,
    min: 10,
    max: 1000
  });
  assertEquals(result.valid, true);
});

Deno.test('validateNumber - below minimum', () => {
  const result = validateNumber(5, 'amount', {
    required: true,
    min: 10
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'amount must be at least 10');
});

Deno.test('validateNumber - above maximum', () => {
  const result = validateNumber(1001, 'amount', {
    required: true,
    max: 1000
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'amount must not exceed 1000');
});

Deno.test('validateNumber - integer validation passes', () => {
  const result = validateNumber(10, 'quantity', {
    required: true,
    integer: true
  });
  assertEquals(result.valid, true);
});

Deno.test('validateNumber - integer validation fails', () => {
  const result = validateNumber(10.5, 'quantity', {
    required: true,
    integer: true
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'quantity must be an integer');
});

Deno.test('validateNumber - NaN detection', () => {
  const result = validateNumber(NaN, 'amount', {
    required: true
  });
  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(result.errors![0], 'amount must be a valid number');
});

Deno.test('validateNumber - not required and missing', () => {
  const result = validateNumber(null, 'amount', {
    required: false
  });
  assertEquals(result.valid, true);
});

// HTML Sanitization Tests
Deno.test('sanitizeHTML - removes script tags', () => {
  const input = '<script>alert("xss")</script>Hello';
  const result = sanitizeHTML(input);
  assertEquals(result.includes('<script>'), false);
  assertEquals(result.includes('Hello'), true);
});

Deno.test('sanitizeHTML - escapes HTML entities', () => {
  const input = '<div>Hello & "World"</div>';
  const result = sanitizeHTML(input);
  assertEquals(result, '&lt;div&gt;Hello &amp; &quot;World&quot;&lt;/div&gt;');
});

Deno.test('sanitizeHTML - removes javascript: protocol', () => {
  const input = '<a href="javascript:alert(1)">Click</a>';
  const result = sanitizeHTML(input);
  assertEquals(result.includes('javascript:'), false);
});

Deno.test('sanitizeHTML - removes event handlers', () => {
  const input = '<div onclick="alert(1)">Click</div>';
  const result = sanitizeHTML(input);
  assertEquals(result.toLowerCase().includes('onclick='), false);
});

// Sensitive Data Redaction Tests
Deno.test('redactSensitiveData - redacts password', () => {
  const data = {
    username: 'john',
    password: 'secret123',
    email: 'john@example.com'
  };
  const result = redactSensitiveData(data);
  assertEquals(result.username, 'john');
  assertEquals(result.password, '[REDACTED]');
  assertEquals(result.email, 'john@example.com');
});

Deno.test('redactSensitiveData - redacts tokens', () => {
  const data = {
    userId: '123',
    accessToken: 'abc-xyz-token',
    refreshToken: 'refresh-token-xyz'
  };
  const result = redactSensitiveData(data);
  assertEquals(result.userId, '123');
  assertEquals(result.accessToken, '[REDACTED]');
  assertEquals(result.refreshToken, '[REDACTED]');
});

Deno.test('redactSensitiveData - redacts API keys', () => {
  const data = {
    app_name: 'MyApp',
    api_key: 'sk_live_123456',
    consumer_secret: 'secret_value'
  };
  const result = redactSensitiveData(data);
  assertEquals(result.app_name, 'MyApp');
  assertEquals(result.api_key, '[REDACTED]');
  assertEquals(result.consumer_secret, '[REDACTED]');
});

Deno.test('redactSensitiveData - handles nested objects', () => {
  const data = {
    user: {
      name: 'John',
      credentials: {
        password: 'secret',
        apiKey: 'key123'
      }
    }
  };
  const result = redactSensitiveData(data);
  assertEquals(result.user.name, 'John');
  assertEquals(result.user.credentials.password, '[REDACTED]');
  assertEquals(result.user.credentials.apiKey, '[REDACTED]');
});

Deno.test('redactSensitiveData - preserves non-sensitive data', () => {
  const data = {
    orderId: '12345',
    amount: 5000,
    items: ['item1', 'item2'],
    metadata: { source: 'web' }
  };
  const result = redactSensitiveData(data);
  assertEquals(result.orderId, '12345');
  assertEquals(result.amount, 5000);
  assertEquals(result.items, ['item1', 'item2']);
  assertEquals(result.metadata, { source: 'web' });
});

console.log('All security utility tests completed!');
