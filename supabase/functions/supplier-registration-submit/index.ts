// Supplier Registration Submit Edge Function
// Handles atomic multi-table insert for new supplier registration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SupplierRegistrationPayload {
  // Step 1: Business Profile
  companyName: string
  supplierType: string
  businessRegistrationStatus: string
  registrationNumber?: string
  yearsInBusiness: string
  mainBusinessLocation: string
  contactPerson: string
  phone: string
  email?: string
  alternativeContactName?: string
  alternativeContactPhone?: string
  
  // Step 2: Products & Pricing
  categories: string[]
  products: Array<{
    productName: string
    category: string
    sku?: string
    unitOfMeasure: string
    unitPrice: number
    moq: number
    stockStatus: string
    availableQuantity?: number
    productDescription?: string
    brand?: string
  }>
  
  // Step 3: Coverage & Delivery
  stockLocationCounty: string
  stockLocationTown: string
  warehouseAddress: string
  countiesServed: string[]
  townsServedByCounty?: Record<string, string>
  deliveryCapability: string
  deliveryMethod?: string[]
  deliveryLeadTime?: string
  deliveryChargeMethod?: string
  minimumOrderForDelivery?: number
  
  // Step 4: Supply & Commercial Terms
  minimumOrderValue: number
  maximumOrderValue: number
  fulfillmentLeadTime: string
  paymentMethods: string[]
  preferredPaymentMethod: string
  acceptsDeferredPayment: boolean
  deferredPaymentPeriods?: number[]
  deferredPaymentConditions?: string
  preferredContactMethod: string
  
  // Step 5: Verification
  certifications?: Array<{
    certificationType: string
    certificationNumber?: string
    issuingAuthority?: string
    issueDate?: string
    expiryDate?: string
    documentUrl?: string
  }>
  termsAccepted: boolean
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const payload: SupplierRegistrationPayload = await req.json()

    // Validate required fields
    const validationErrors = validatePayload(payload)
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors: validationErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate phone/email
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .or(`phone.eq.${payload.phone},email.eq.${payload.email}`)
      .single()

    if (existingSupplier) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'A supplier with this phone number or email already exists' 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Begin transaction (using Postgres transaction via RPC or sequential inserts with error rollback)
    // Insert supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .insert({
        company_name: payload.companyName,
        contact_person: payload.contactPerson,
        phone: payload.phone,
        email: payload.email || null,
        supplier_type: payload.supplierType,
        business_registration_status: payload.businessRegistrationStatus,
        registration_number: payload.registrationNumber || null,
        years_in_business: payload.yearsInBusiness,
        main_business_location: payload.mainBusinessLocation,
        alternative_contact_name: payload.alternativeContactName || null,
        alternative_contact_phone: payload.alternativeContactPhone || null,
        categories: payload.categories,
        stock_location_county: payload.stockLocationCounty,
        stock_location_town: payload.stockLocationTown,
        warehouse_address: payload.warehouseAddress,
        delivery_capability: payload.deliveryCapability,
        delivery_method: payload.deliveryMethod?.join(', ') || null,
        delivery_lead_time: payload.deliveryLeadTime || null,
        delivery_charge_method: payload.deliveryChargeMethod || null,
        minimum_order_for_delivery: payload.minimumOrderForDelivery || null,
        minimum_order_value: payload.minimumOrderValue,
        maximum_order_value: payload.maximumOrderValue,
        fulfillment_lead_time: payload.fulfillmentLeadTime,
        payment_terms: payload.paymentMethods.join(', '),
        preferred_payment_method: payload.preferredPaymentMethod,
        accepts_deferred_payment: payload.acceptsDeferredPayment,
        deferred_payment_terms: payload.acceptsDeferredPayment 
          ? JSON.stringify({ 
              periods: payload.deferredPaymentPeriods || [], 
              conditions: payload.deferredPaymentConditions || '' 
            })
          : null,
        preferred_contact_method: payload.preferredContactMethod,
        status: 'pending',
        verification_status: 'pending',
      })
      .select('id')
      .single()

    if (supplierError) {
      console.error('Supplier insert error:', supplierError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to create supplier record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supplierId = supplier.id

    // Insert products
    if (payload.products.length > 0) {
      const productsToInsert = payload.products.map(p => ({
        supplier_id: supplierId,
        product_name: p.productName,
        category: p.category,
        sku: p.sku || null,
        unit_of_measure: p.unitOfMeasure,
        unit_price: p.unitPrice,
        moq: p.moq,
        stock_status: p.stockStatus,
        available_quantity: p.availableQuantity || null,
        product_description: p.productDescription || null,
        brand: p.brand || null,
      }))

      const { error: productsError } = await supabase
        .from('supplier_products')
        .insert(productsToInsert)

      if (productsError) {
        console.error('Products insert error:', productsError)
        // Rollback: delete supplier
        await supabase.from('suppliers').delete().eq('id', supplierId)
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to create product records' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Insert locations
    const locationsToInsert = [
      // Primary stock location
      {
        supplier_id: supplierId,
        location_type: 'stock_location',
        county: payload.stockLocationCounty,
        town: payload.stockLocationTown,
        is_primary: true,
      },
      // Service areas
      ...payload.countiesServed.map(county => ({
        supplier_id: supplierId,
        location_type: 'service_area',
        county: county,
        town: payload.townsServedByCounty?.[county] || null,
        is_primary: false,
      })),
    ]

    const { error: locationsError } = await supabase
      .from('supplier_locations')
      .insert(locationsToInsert)

    if (locationsError) {
      console.error('Locations insert error:', locationsError)
      // Rollback: delete supplier and products
      await supabase.from('supplier_products').delete().eq('supplier_id', supplierId)
      await supabase.from('suppliers').delete().eq('id', supplierId)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to create location records' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert certifications (if any)
    if (payload.certifications && payload.certifications.length > 0) {
      const certificationsToInsert = payload.certifications.map(c => ({
        supplier_id: supplierId,
        certification_type: c.certificationType,
        certification_number: c.certificationNumber || null,
        issuing_authority: c.issuingAuthority || null,
        issue_date: c.issueDate || null,
        expiry_date: c.expiryDate || null,
        document_url: c.documentUrl || null,
        verification_status: 'pending',
      }))

      const { error: certificationsError } = await supabase
        .from('supplier_certifications')
        .insert(certificationsToInsert)

      if (certificationsError) {
        console.error('Certifications insert error:', certificationsError)
        // Non-critical, continue
      }
    }

    // Success
    return new Response(
      JSON.stringify({ 
        success: true, 
        supplierId: supplierId,
        message: 'Registration submitted successfully. We will contact you shortly.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in supplier registration:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function validatePayload(payload: SupplierRegistrationPayload): Array<{field: string, message: string}> {
  const errors: Array<{field: string, message: string}> = []

  // Step 1 validation
  if (!payload.companyName?.trim()) {
    errors.push({ field: 'companyName', message: 'Company name is required' })
  }
  if (!payload.supplierType) {
    errors.push({ field: 'supplierType', message: 'Supplier type is required' })
  }
  if (!payload.businessRegistrationStatus) {
    errors.push({ field: 'businessRegistrationStatus', message: 'Business registration status is required' })
  }
  if (!payload.yearsInBusiness) {
    errors.push({ field: 'yearsInBusiness', message: 'Years in business is required' })
  }
  if (!payload.mainBusinessLocation?.trim()) {
    errors.push({ field: 'mainBusinessLocation', message: 'Main business location is required' })
  }
  if (!payload.contactPerson?.trim()) {
    errors.push({ field: 'contactPerson', message: 'Contact person is required' })
  }
  if (!payload.phone?.trim()) {
    errors.push({ field: 'phone', message: 'Phone number is required' })
  }

  // Step 2 validation
  if (!payload.categories || payload.categories.length === 0) {
    errors.push({ field: 'categories', message: 'At least one category is required' })
  }
  if (!payload.products || payload.products.length === 0) {
    errors.push({ field: 'products', message: 'At least one product is required' })
  }

  // Step 3 validation
  if (!payload.stockLocationCounty) {
    errors.push({ field: 'stockLocationCounty', message: 'Stock location county is required' })
  }
  if (!payload.stockLocationTown?.trim()) {
    errors.push({ field: 'stockLocationTown', message: 'Stock location town is required' })
  }
  if (!payload.warehouseAddress?.trim()) {
    errors.push({ field: 'warehouseAddress', message: 'Warehouse address is required' })
  }
  if (!payload.countiesServed || payload.countiesServed.length === 0) {
    errors.push({ field: 'countiesServed', message: 'At least one county served is required' })
  }
  if (!payload.deliveryCapability) {
    errors.push({ field: 'deliveryCapability', message: 'Delivery capability is required' })
  }

  // Step 4 validation
  if (!payload.minimumOrderValue || payload.minimumOrderValue <= 0) {
    errors.push({ field: 'minimumOrderValue', message: 'Minimum order value is required' })
  }
  if (!payload.maximumOrderValue || payload.maximumOrderValue <= 0) {
    errors.push({ field: 'maximumOrderValue', message: 'Maximum order value is required' })
  }
  if (!payload.fulfillmentLeadTime) {
    errors.push({ field: 'fulfillmentLeadTime', message: 'Fulfillment lead time is required' })
  }
  if (!payload.paymentMethods || payload.paymentMethods.length === 0) {
    errors.push({ field: 'paymentMethods', message: 'At least one payment method is required' })
  }
  if (!payload.preferredPaymentMethod) {
    errors.push({ field: 'preferredPaymentMethod', message: 'Preferred payment method is required' })
  }

  // Step 5 validation
  if (!payload.termsAccepted) {
    errors.push({ field: 'termsAccepted', message: 'You must accept the terms and conditions' })
  }

  return errors
}
