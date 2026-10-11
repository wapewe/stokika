import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'
import {
  sanitizeAndValidateIdNumber,
  sanitizeIdNumberForDatabase,
  hashIdNumber,
  logIdNumberSecurityEvent,
  containsSqlInjectionPatterns
} from '../shared/id-number-security.ts'
import {
  checkValidationRateLimit,
  createRateLimitResponse,
  logRateLimitViolation,
  extractClientIP
} from '../shared/enhanced-rate-limiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationRequest {
  fullName: string
  businessName: string
  businessCategory: string
  email: string
  phone: string
  idNumber: string
  county: string
  businessStatus: string
  businessSize: string
  businessModel: string
  yearsInOperation: string
  monthlyRevenue: string
  stockCategories: string
  stockValue: string
  repaymentPeriod: string
}

interface ValidationError {
  field: string
  message: string
}

// NOTE: Rate limiting now handled by enhanced-rate-limiter module
// See checkValidationRateLimit() usage below

// Validate input fields
function validateFields(data: ValidationRequest): ValidationError[] {
  const errors: ValidationError[] = []

  // Full name (2-100 characters)
  if (!data.fullName || data.fullName.trim().length < 2 || data.fullName.length > 100) {
    errors.push({ field: 'fullName', message: 'Full name must be between 2 and 100 characters' })
  }

  // Business name (2-100 characters)
  if (!data.businessName || data.businessName.trim().length < 2 || data.businessName.length > 100) {
    errors.push({ field: 'businessName', message: 'Business name must be between 2 and 100 characters' })
  }

  // Email (RFC 5322 compliant)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' })
  }

  // Phone (Kenyan format: +254XXXXXXXXX, 254XXXXXXXXX, or 07XXXXXXXX)
  const cleanPhone = data.phone ? data.phone.replace(/[\s\-\(\)\+]/g, '') : ''
  const phoneRegex = /^(254[0-9]{9}|0[0-9]{9})$/
  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid Kenyan phone number (+254XXXXXXXXX, 254XXXXXXXXX, or 07XXXXXXXX)' })
  } else {
    // Normalize to 254 format for consistent storage
    data.phone = cleanPhone
  }

  // ID Number (exactly 8 digits) - using security utilities
  if (!data.idNumber) {
    errors.push({ field: 'idNumber', message: 'ID Number is required' })
  } else {
    // Check for SQL injection patterns first
    if (containsSqlInjectionPatterns(data.idNumber)) {
      errors.push({ field: 'idNumber', message: 'ID Number contains invalid characters' })
    } else {
      // Sanitize and validate using security module
      const idValidation = sanitizeAndValidateIdNumber(data.idNumber)
      if (!idValidation.valid) {
        errors.push({ field: 'idNumber', message: idValidation.error || 'Invalid ID Number' })
      } else {
        // Store the sanitized value back for later use
        data.idNumber = idValidation.sanitized!
      }
    }
  }

  // Required fields
  if (!data.county) errors.push({ field: 'county', message: 'County is required' })
  if (!data.businessCategory) errors.push({ field: 'businessCategory', message: 'Business category is required' })
  if (!data.businessStatus) errors.push({ field: 'businessStatus', message: 'Business status is required' })
  if (!data.businessSize) errors.push({ field: 'businessSize', message: 'Business size is required' })
  if (!data.businessModel) errors.push({ field: 'businessModel', message: 'Business model is required' })

  return errors
}

// NOTE: hashIdNumber is now imported from id-number-security module

// Log security event for duplicate ID attempt - using security utilities
async function logDuplicateIdAttempt(
  supabase: any, 
  idNumber: string, 
  existingEntityId: string | null,
  entityType: 'profile' | 'vendor',
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await logIdNumberSecurityEvent(
    supabase,
    'DUPLICATE_ID_ATTEMPT',
    idNumber,
    {
      entity_type: entityType,
      existing_entity_id: existingEntityId,
      severity: 'medium'
    },
    ipAddress,
    userAgent
  )
}

// Check for duplicates
async function checkDuplicates(
  supabase: any, 
  data: ValidationRequest, 
  ipAddress: string, 
  userAgent: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // Check duplicate business name
  const { data: existingBusiness } = await supabase
    .from('vendors')
    .select('id')
    .ilike('business_name', data.businessName)
    .limit(1)

  if (existingBusiness && existingBusiness.length > 0) {
    errors.push({ field: 'businessName', message: 'A business with this name is already registered' })
  }

  // Check duplicate phone
  const cleanPhone = data.phone.replace(/[\s\-\(\)]/g, '')
  const { data: existingPhone } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', cleanPhone)
    .limit(1)

  if (existingPhone && existingPhone.length > 0) {
    errors.push({ field: 'phone', message: 'This phone number is already registered' })
  }

  // Check duplicate email
  const { data: existingEmail } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', data.email)
    .limit(1)

  if (existingEmail && existingEmail.length > 0) {
    errors.push({ field: 'email', message: 'This email address is already registered' })
  }

  // Check duplicate ID number in profiles - using sanitized ID number
  const safeIdNumber = sanitizeIdNumberForDatabase(data.idNumber)
  
  const { data: existingIdInProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('id_number', safeIdNumber)
    .limit(1)

  if (existingIdInProfiles && existingIdInProfiles.length > 0) {
    // Log security event for duplicate ID attempt
    await logDuplicateIdAttempt(
      supabase,
      safeIdNumber,
      existingIdInProfiles[0].id,
      'profile',
      ipAddress,
      userAgent
    )
    
    errors.push({ 
      field: 'idNumber', 
      message: 'ID Number already registered' 
    })
  }
  
  // Check duplicate ID number in vendors - using sanitized ID number
  const { data: existingIdInVendors } = await supabase
    .from('vendors')
    .select('id')
    .eq('id_number', safeIdNumber)
    .limit(1)

  if (existingIdInVendors && existingIdInVendors.length > 0) {
    // Log security event for duplicate ID attempt (only if not already logged from profiles check)
    if (!existingIdInProfiles || existingIdInProfiles.length === 0) {
      await logDuplicateIdAttempt(
        supabase,
        safeIdNumber,
        existingIdInVendors[0].id,
        'vendor',
        ipAddress,
        userAgent
      )
    }
    
    errors.push({ 
      field: 'idNumber', 
      message: 'ID Number already registered' 
    })
  }

  return errors
}

// Generate validation token (JWT with 5 min expiration)
function generateValidationToken(data: ValidationRequest): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    data: data,
    exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
    iat: Math.floor(Date.now() / 1000)
  }

  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '')
  
  const signature = btoa(
    String.fromCharCode(...new Uint8Array(
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}.${secret}`)
    ))
  ).replace(/=/g, '')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract IP address for rate limiting
    const ip = extractClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    console.log(`[Validate Registration] Request from IP: ${ip}`)

    // Check rate limit using enhanced rate limiter (Task 15.3: 5 requests per 15 minutes per IP)
    const rateLimit = await checkValidationRateLimit(req)
    
    if (!rateLimit.allowed) {
      console.log(`[Validate Registration] Rate limit exceeded for IP: ${ip}`)
      
      // Initialize Supabase for logging
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Log rate limit violation
      await logRateLimitViolation(
        supabase,
        ip,
        'vendor-validation',
        rateLimit.currentCount,
        rateLimit.limit,
        ip,
        userAgent
      )
      
      return createRateLimitResponse(rateLimit)
    }

    // Parse request body
    const data: ValidationRequest = await req.json()

    // Validate fields
    const fieldErrors = validateFields(data)
    if (fieldErrors.length > 0) {
      console.log(`[Validate Registration] Field validation failed:`, fieldErrors)
      return new Response(
        JSON.stringify({ valid: false, errors: fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for duplicates
    const duplicateErrors = await checkDuplicates(supabase, data, ip, userAgent)
    if (duplicateErrors.length > 0) {
      console.log(`[Validate Registration] Duplicate check failed:`, duplicateErrors)
      return new Response(
        JSON.stringify({ valid: false, errors: duplicateErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate validation token
    const token = generateValidationToken(data)

    console.log(`[Validate Registration] Validation successful for ${data.email}`)

    return new Response(
      JSON.stringify({ valid: true, token: token }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Validate Registration] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
