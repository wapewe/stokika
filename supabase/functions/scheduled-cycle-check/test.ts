/**
 * Test Script for Scheduled Cycle Check Edge Function
 * 
 * This script tests the scheduled-cycle-check function locally or against a deployed instance.
 * 
 * Usage:
 *   deno run --allow-net --allow-env test.ts
 */

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'your-service-role-key-here'
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/scheduled-cycle-check`

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
    'cycles_checked',
    'cycles_marked_overdue',
    'cycles_failed',
    'vendors_scored',
    'vendors_score_failed',
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

async function testCycleProcessing(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  console.log(`  Cycles checked: ${data.cycles_checked}`)
  console.log(`  Cycles marked overdue: ${data.cycles_marked_overdue}`)
  console.log(`  Cycles failed: ${data.cycles_failed}`)
  
  // Success if checked count equals succeeded + failed
  return data.cycles_checked === (data.cycles_marked_overdue + data.cycles_failed)
}

async function testVendorScoreUpdates(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  console.log(`  Vendors scored: ${data.vendors_scored}`)
  console.log(`  Vendors score failed: ${data.vendors_score_failed}`)
  
  // If cycles were marked overdue, vendors should have been scored
  if (data.cycles_marked_overdue > 0) {
    return data.vendors_scored > 0
  }
  
  // If no overdue cycles, no vendors to score
  return data.vendors_scored === 0
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
  if (data.cycles_failed > 0 || data.vendors_score_failed > 0) {
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
  console.log(`  Cycles processed: ${data.cycles_checked}`)
  console.log(`  Vendors updated: ${data.vendors_scored}`)
  
  if (data.cycles_checked > 0) {
    const avgPerCycle = data.duration_ms / data.cycles_checked
    console.log(`  Average per cycle: ${avgPerCycle.toFixed(2)}ms`)
  }
  
  // Consider performance acceptable if under 30 seconds
  return data.duration_ms < 30000
}

async function testEmptyResultHandling(): Promise<boolean> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  
  const data = await response.json()
  
  // Should return success even if no cycles found
  if (data.cycles_checked === 0) {
    console.log(`  No overdue cycles found - this is normal`)
    return data.success === true
  }
  
  return true
}

// ============================================================================
// Run All Tests
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║  Scheduled Cycle Check Edge Function - Test Suite             ║')
  console.log('╚════════════════════════════════════════════════════════════════╝')
  console.log(`\nFunction URL: ${FUNCTION_URL}`)
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log(`Using Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`)

  // Run all tests
  await runTest('Function is reachable', testFunctionReachable)
  await runTest('Response has correct structure', testResponseStructure)
  await runTest('Cycle processing is consistent', testCycleProcessing)
  await runTest('Vendor scores are updated correctly', testVendorScoreUpdates)
  await runTest('Errors are logged correctly', testErrorLogging)
  await runTest('CORS headers are present', testCORSHeaders)
  await runTest('Performance is acceptable', testPerformance)
  await runTest('Empty result handling works', testEmptyResultHandling)

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
