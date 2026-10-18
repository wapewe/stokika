/**
 * Test Script for Scheduled Scoring Update Edge Function
 * 
 * This script tests the scheduled-scoring-update function locally or against a deployed instance.
 * 
 * Usage:
 *   deno run --allow-net --allow-env test.ts
 */

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || 'your-service-role-key-here'
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/scheduled-scoring-update`

interface TestResult {
  test_name: string
  passed: boolean
  message: string
  duration_ms?: number
}

const results: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
  const startTime = Date.now()
  try {
    console.log(`\n🧪 Running: ${name}`)
    const passed = await testFn()
    const duration = Date.now() - startTime
    
    results.push({
      test_name: name,
      passed,
      message: passed ? '✓ PASSED' : '✗ FAILED',
      duration_ms: duration
    })
    
    console.log(`${passed ? '✓' : '✗'} ${name} (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - startTime
    results.push({
      test_name: name,
      passed: false,
      message: `✗ FAILED: ${error.message}`,
      duration_ms: duration
    })
    console.error(`✗ ${name} - Error: ${error.message}`)
  }
}

// ============================================================================
// Test Cases
// ============================================================================

async function testFunctionReachable(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  return response.status === 200 || response.status === 500 // Either success or expected error
}

async function testResponseStructure(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  // Check required fields
  const requiredFields = [
    'success',
    'timestamp',
    'vendors_processed',
    'vendors_succeeded',
    'vendors_failed',
    'suppliers_processed',
    'suppliers_succeeded',
    'suppliers_failed',
    'duration_ms',
    'errors'
  ]
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Missing field: ${field}`)
      return false
    }
  }
  
  return true
}

async function testVendorProcessing(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  console.log(`  Vendors processed: ${data.vendors_processed}`)
  console.log(`  Vendors succeeded: ${data.vendors_succeeded}`)
  console.log(`  Vendors failed: ${data.vendors_failed}`)
  
  // Success if processed count equals succeeded + failed
  return data.vendors_processed === (data.vendors_succeeded + data.vendors_failed)
}

async function testSupplierProcessing(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  console.log(`  Suppliers processed: ${data.suppliers_processed}`)
  console.log(`  Suppliers succeeded: ${data.suppliers_succeeded}`)
  console.log(`  Suppliers failed: ${data.suppliers_failed}`)
  
  // Success if processed count equals succeeded + failed
  return data.suppliers_processed === (data.suppliers_succeeded + data.suppliers_failed)
}

async function testErrorLogging(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  // If there are failures, errors array should not be empty
  if (data.vendors_failed > 0 || data.suppliers_failed > 0) {
    console.log(`  Errors logged: ${data.errors.length}`)
    return data.errors.length > 0
  }
  
  // If no failures, test passes
  return true
}

async function testCORSHeaders(): Promise<boolean> {
  // Test OPTIONS request
  const response = await fetch(FUNCTION_URL, {
    method: 'OPTIONS',
  })
  
  const hasAccessControlAllowOrigin = response.headers.has('access-control-allow-origin')
  const hasAccessControlAllowHeaders = response.headers.has('access-control-allow-headers')
  
  return hasAccessControlAllowOrigin && hasAccessControlAllowHeaders
}

async function testPerformance(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  console.log(`  Function duration: ${data.duration_ms}ms`)
  console.log(`  Total entities: ${data.vendors_processed + data.suppliers_processed}`)
  
  if (data.vendors_processed + data.suppliers_processed > 0) {
    const avgPerEntity = data.duration_ms / (data.vendors_processed + data.suppliers_processed)
    console.log(`  Average per entity: ${avgPerEntity.toFixed(2)}ms`)
  }
  
  // Consider performance acceptable if under 1 minute
  return data.duration_ms < 60000
}

// ============================================================================
// Run All Tests
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║  Scheduled Scoring Update Edge Function - Test Suite          ║')
  console.log('╚════════════════════════════════════════════════════════════════╝')
  console.log(`\nFunction URL: ${FUNCTION_URL}`)
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log(`Using Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`)

  // Run all tests
  await runTest('Function is reachable', testFunctionReachable)
  await runTest('Response has correct structure', testResponseStructure)
  await runTest('Vendor processing is consistent', testVendorProcessing)
  await runTest('Supplier processing is consistent', testSupplierProcessing)
  await runTest('Errors are logged correctly', testErrorLogging)
  await runTest('CORS headers are present', testCORSHeaders)
  await runTest('Performance is acceptable', testPerformance)

  // Print summary
  console.log('\n' + '═'.repeat(70))
  console.log('TEST SUMMARY')
  console.log('═'.repeat(70))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length
  
  results.forEach(result => {
    console.log(`${result.message.padEnd(50)} ${result.duration_ms}ms`)
  })
  
  console.log('═'.repeat(70))
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
  console.log('═'.repeat(70))
  
  if (failed === 0) {
    console.log('\n✓ All tests passed!')
    Deno.exit(0)
  } else {
    console.log(`\n✗ ${failed} test(s) failed!`)
    Deno.exit(1)
  }
}

// Run tests
main().catch(error => {
  console.error('Test suite error:', error)
  Deno.exit(1)
})
