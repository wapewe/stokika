/**
 * Database Utilities
 * Provides safe database operations with constraint violation handling
 * 
 * Requirements: Task 14.2 - Backend database constraint violation handling
 * - Handle PostgreSQL error code 23505 (unique violation)
 * - Handle PostgreSQL error code 23514 (check constraint)
 * - Return user-friendly error messages
 * - Log unexpected database errors
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Database operation result type
 */
export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

/**
 * User-friendly database error type
 */
export interface DbError {
  code: string;
  message: string;
  hint?: string;
  details?: string;
}

/**
 * PostgreSQL error codes we handle
 */
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  EXCLUSION_VIOLATION: '23P01',
} as const;

/**
 * Parse PostgreSQL error into user-friendly message
 */
function parsePostgresError(error: any): DbError {
  const code = error.code || 'UNKNOWN';
  const constraint = error.constraint_name || error.constraint || '';
  const detail = error.details || error.detail || '';
  const hint = error.hint || '';
  
  console.error('[DB Error]', {
    code,
    constraint,
    detail,
    hint,
    message: error.message,
  });
  
  // Handle unique constraint violations
  if (code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
    if (constraint.includes('id_number') || detail.includes('id_number')) {
      return {
        code: 'DUPLICATE_ID_NUMBER',
        message: 'This ID number is already registered. Please contact support if you need assistance.',
        hint: 'If you already registered, try signing in instead.',
      };
    }
    
    if (constraint.includes('email') || detail.includes('email')) {
      return {
        code: 'DUPLICATE_EMAIL',
        message: 'This email address is already registered.',
        hint: 'Try signing in or use a different email address.',
      };
    }
    
    if (constraint.includes('phone') || detail.includes('phone_number')) {
      return {
        code: 'DUPLICATE_PHONE',
        message: 'This phone number is already registered.',
        hint: 'Try signing in or use a different phone number.',
      };
    }
    
    return {
      code: 'DUPLICATE_VALUE',
      message: 'This value already exists in the database.',
      details: detail,
    };
  }
  
  // Handle check constraint violations
  if (code === PG_ERROR_CODES.CHECK_VIOLATION) {
    if (constraint.includes('id_number') || detail.includes('id_number')) {
      return {
        code: 'INVALID_ID_NUMBER_FORMAT',
        message: 'ID number must be exactly 8 digits.',
        hint: 'Please enter a valid 8-digit Kenyan national ID number.',
      };
    }
    
    if (constraint.includes('phone') || detail.includes('phone')) {
      return {
        code: 'INVALID_PHONE_FORMAT',
        message: 'Invalid phone number format.',
        hint: 'Please enter a valid Kenyan phone number (e.g., 254712345678).',
      };
    }
    
    if (constraint.includes('email') || detail.includes('email')) {
      return {
        code: 'INVALID_EMAIL_FORMAT',
        message: 'Invalid email address format.',
        hint: 'Please enter a valid email address.',
      };
    }
    
    return {
      code: 'CONSTRAINT_VIOLATION',
      message: 'The data provided does not meet database requirements.',
      details: detail,
      hint: hint,
    };
  }
  
  // Handle foreign key violations
  if (code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return {
      code: 'INVALID_REFERENCE',
      message: 'Referenced record does not exist.',
      details: detail,
    };
  }
  
  // Handle not null violations
  if (code === PG_ERROR_CODES.NOT_NULL_VIOLATION) {
    return {
      code: 'MISSING_REQUIRED_FIELD',
      message: 'A required field is missing.',
      details: detail,
    };
  }
  
  // Handle exclusion violations
  if (code === PG_ERROR_CODES.EXCLUSION_VIOLATION) {
    return {
      code: 'CONFLICTING_DATA',
      message: 'The data conflicts with existing records.',
      details: detail,
    };
  }
  
  // Unknown error
  return {
    code: 'DATABASE_ERROR',
    message: 'A database error occurred. Please try again.',
    details: process.env.ENVIRONMENT === 'development' ? error.message : undefined,
  };
}

/**
 * Safely insert a record into a table with constraint violation handling
 * @param supabase - Supabase client
 * @param table - Table name
 * @param data - Data to insert
 * @param select - Columns to return (default: '*')
 * @returns DbResult with data or error
 */
export async function safeInsert<T = any>(
  supabase: SupabaseClient,
  table: string,
  data: any,
  select: string = '*'
): Promise<DbResult<T>> {
  try {
    console.log(`[DB] Inserting into ${table}...`);
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select(select)
      .single();
    
    if (error) {
      console.error(`[DB] Insert error on ${table}:`, error);
      return {
        data: null,
        error: parsePostgresError(error),
      };
    }
    
    console.log(`[DB] Insert successful on ${table}`);
    return {
      data: result as T,
      error: null,
    };
  } catch (error: any) {
    console.error(`[DB] Unexpected insert error on ${table}:`, error);
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: process.env.ENVIRONMENT === 'development' ? error.message : undefined,
      },
    };
  }
}

/**
 * Safely update a record in a table with constraint violation handling
 * @param supabase - Supabase client
 * @param table - Table name
 * @param id - Record ID to update
 * @param data - Data to update
 * @param select - Columns to return (default: '*')
 * @returns DbResult with data or error
 */
export async function safeUpdate<T = any>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  data: any,
  select: string = '*'
): Promise<DbResult<T>> {
  try {
    console.log(`[DB] Updating ${table} record ${id}...`);
    
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select(select)
      .single();
    
    if (error) {
      console.error(`[DB] Update error on ${table}:`, error);
      return {
        data: null,
        error: parsePostgresError(error),
      };
    }
    
    console.log(`[DB] Update successful on ${table}`);
    return {
      data: result as T,
      error: null,
    };
  } catch (error: any) {
    console.error(`[DB] Unexpected update error on ${table}:`, error);
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: process.env.ENVIRONMENT === 'development' ? error.message : undefined,
      },
    };
  }
}

/**
 * Safely upsert a record in a table with constraint violation handling
 * @param supabase - Supabase client
 * @param table - Table name
 * @param data - Data to upsert
 * @param onConflict - Columns to check for conflicts (optional)
 * @param select - Columns to return (default: '*')
 * @returns DbResult with data or error
 */
export async function safeUpsert<T = any>(
  supabase: SupabaseClient,
  table: string,
  data: any,
  onConflict?: string,
  select: string = '*'
): Promise<DbResult<T>> {
  try {
    console.log(`[DB] Upserting into ${table}...`);
    
    let query = supabase.from(table).upsert(data);
    
    if (onConflict) {
      query = query.onConflict(onConflict);
    }
    
    const { data: result, error } = await query.select(select).single();
    
    if (error) {
      console.error(`[DB] Upsert error on ${table}:`, error);
      return {
        data: null,
        error: parsePostgresError(error),
      };
    }
    
    console.log(`[DB] Upsert successful on ${table}`);
    return {
      data: result as T,
      error: null,
    };
  } catch (error: any) {
    console.error(`[DB] Unexpected upsert error on ${table}:`, error);
    return {
      data: null,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: process.env.ENVIRONMENT === 'development' ? error.message : undefined,
      },
    };
  }
}

/**
 * Check if an error is a retryable database error
 * @param error - Database error
 * @returns true if error is retryable
 */
export function isRetryableDbError(error: DbError): boolean {
  // Don't retry constraint violations or validation errors
  const nonRetryableCodes = [
    'DUPLICATE_ID_NUMBER',
    'DUPLICATE_EMAIL',
    'DUPLICATE_PHONE',
    'DUPLICATE_VALUE',
    'INVALID_ID_NUMBER_FORMAT',
    'INVALID_PHONE_FORMAT',
    'INVALID_EMAIL_FORMAT',
    'CONSTRAINT_VIOLATION',
    'INVALID_REFERENCE',
    'MISSING_REQUIRED_FIELD',
  ];
  
  return !nonRetryableCodes.includes(error.code);
}

/**
 * Format database error for HTTP response
 * @param error - Database error
 * @returns Error response object
 */
export function formatDbErrorResponse(error: DbError): {
  error: string;
  code: string;
  hint?: string;
  details?: string;
} {
  return {
    error: error.message,
    code: error.code,
    hint: error.hint,
    details: error.details,
  };
}
