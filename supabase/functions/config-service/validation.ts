// Configuration Validation Helpers
// Task 2.3: Add configuration validation helpers

export interface TimeoutConstraints {
  min: number;
  max: number;
  unit: string;
}

export interface RetryConstraints {
  min: number;
  max: number;
}

export interface IntervalConstraints {
  min: number;
  max: number;
  unit: string;
}

// Constraint definitions
export const TIMEOUT_CONSTRAINTS: TimeoutConstraints = {
  min: 30,
  max: 300,
  unit: 'seconds',
};

export const RETRY_CONSTRAINTS: RetryConstraints = {
  min: 1,
  max: 5,
};

export const INTERVAL_CONSTRAINTS: IntervalConstraints = {
  min: 10,
  max: 60,
  unit: 'seconds',
};

export const VALID_FLOW_TYPES = ['kit_payment', 'vendor_order', 'manual_payment'] as const;
export type FlowType = typeof VALID_FLOW_TYPES[number];

// Validation result type
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates timeout_duration parameter
 * @param duration - Timeout duration in seconds
 * @returns Validation result with error message if invalid
 */
export function validateTimeoutDuration(duration: number): ValidationResult {
  if (typeof duration !== 'number' || isNaN(duration)) {
    return {
      valid: false,
      error: 'timeout_duration must be a number',
    };
  }

  if (duration < TIMEOUT_CONSTRAINTS.min) {
    return {
      valid: false,
      error: `timeout_duration must be at least ${TIMEOUT_CONSTRAINTS.min} seconds`,
    };
  }

  if (duration > TIMEOUT_CONSTRAINTS.max) {
    return {
      valid: false,
      error: `timeout_duration must be at most ${TIMEOUT_CONSTRAINTS.max} seconds`,
    };
  }

  return { valid: true };
}

/**
 * Validates max_retries parameter
 * @param retries - Maximum number of retries
 * @returns Validation result with error message if invalid
 */
export function validateMaxRetries(retries: number): ValidationResult {
  if (typeof retries !== 'number' || isNaN(retries) || !Number.isInteger(retries)) {
    return {
      valid: false,
      error: 'max_retries must be an integer',
    };
  }

  if (retries < RETRY_CONSTRAINTS.min) {
    return {
      valid: false,
      error: `max_retries must be at least ${RETRY_CONSTRAINTS.min}`,
    };
  }

  if (retries > RETRY_CONSTRAINTS.max) {
    return {
      valid: false,
      error: `max_retries must be at most ${RETRY_CONSTRAINTS.max}`,
    };
  }

  return { valid: true };
}

/**
 * Validates retry_interval parameter
 * @param interval - Retry interval in seconds
 * @returns Validation result with error message if invalid
 */
export function validateRetryInterval(interval: number): ValidationResult {
  if (typeof interval !== 'number' || isNaN(interval)) {
    return {
      valid: false,
      error: 'retry_interval must be a number',
    };
  }

  if (interval < INTERVAL_CONSTRAINTS.min) {
    return {
      valid: false,
      error: `retry_interval must be at least ${INTERVAL_CONSTRAINTS.min} seconds`,
    };
  }

  if (interval > INTERVAL_CONSTRAINTS.max) {
    return {
      valid: false,
      error: `retry_interval must be at most ${INTERVAL_CONSTRAINTS.max} seconds`,
    };
  }

  return { valid: true };
}

/**
 * Validates flow_type parameter
 * @param flowType - Payment flow type
 * @returns Validation result with error message if invalid
 */
export function validateFlowType(flowType: string): ValidationResult {
  if (!flowType || typeof flowType !== 'string') {
    return {
      valid: false,
      error: 'flow_type must be a string',
    };
  }

  if (!VALID_FLOW_TYPES.includes(flowType as FlowType)) {
    return {
      valid: false,
      error: `flow_type must be one of: ${VALID_FLOW_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates all configuration parameters
 * @param config - Configuration object to validate
 * @returns Validation result with error message if invalid
 */
export function validateConfig(config: {
  timeout_duration?: number;
  max_retries?: number;
  retry_interval?: number;
  flow_type?: string;
}): ValidationResult {
  if (config.flow_type !== undefined) {
    const flowTypeResult = validateFlowType(config.flow_type);
    if (!flowTypeResult.valid) return flowTypeResult;
  }

  if (config.timeout_duration !== undefined) {
    const durationResult = validateTimeoutDuration(config.timeout_duration);
    if (!durationResult.valid) return durationResult;
  }

  if (config.max_retries !== undefined) {
    const retriesResult = validateMaxRetries(config.max_retries);
    if (!retriesResult.valid) return retriesResult;
  }

  if (config.retry_interval !== undefined) {
    const intervalResult = validateRetryInterval(config.retry_interval);
    if (!intervalResult.valid) return intervalResult;
  }

  return { valid: true };
}
