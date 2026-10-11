/**
 * Test Suite for InputSanitizer Phone Number Validation
 * 
 * This file tests the phone number sanitization and validation logic.
 * Run these tests in the browser console after loading input-sanitizer.js
 */

function testPhoneNumberValidation() {
    console.log('=== Testing Phone Number Validation ===\n');
    
    const testCases = [
        // Valid cases - should convert to 254XXXXXXXXX
        { input: '0712345678', expected: '254712345678', shouldPass: true, description: 'Safaricom format (07)' },
        { input: '0112345678', expected: '254112345678', shouldPass: true, description: 'Airtel format (01)' },
        { input: '254712345678', expected: '254712345678', shouldPass: true, description: 'Already in 254 format (Safaricom)' },
        { input: '254112345678', expected: '254112345678', shouldPass: true, description: 'Already in 254 format (Airtel)' },
        { input: '+254712345678', expected: '254712345678', shouldPass: true, description: 'International format with +' },
        { input: '+254112345678', expected: '254112345678', shouldPass: true, description: 'International format with + (Airtel)' },
        
        // Invalid cases - should return empty string
        { input: '0812345678', expected: '', shouldPass: false, description: 'Invalid carrier (08)' },
        { input: '0612345678', expected: '', shouldPass: false, description: 'Invalid carrier (06)' },
        { input: '071234567', expected: '', shouldPass: false, description: 'Too short (9 digits)' },
        { input: '07123456789', expected: '', shouldPass: false, description: 'Too long (11 digits)' },
        { input: '254812345678', expected: '', shouldPass: false, description: 'Invalid carrier in 254 format (08)' },
        { input: '25471234567', expected: '', shouldPass: false, description: 'Too short in 254 format (11 digits)' },
        { input: '2547123456789', expected: '', shouldPass: false, description: 'Too long in 254 format (13 digits)' },
        { input: 'abcdefghij', expected: '', shouldPass: false, description: 'Non-numeric input' },
        { input: '', expected: '', shouldPass: false, description: 'Empty string' },
        { input: '1234567890', expected: '', shouldPass: false, description: 'Invalid format (no 0 or 254 prefix)' },
    ];
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach((testCase, index) => {
        const result = InputSanitizer.sanitizePhone(testCase.input);
        const isValid = result && InputSanitizer.isValidPhone(result);
        const testPassed = result === testCase.expected && (isValid === testCase.shouldPass || !testCase.shouldPass);
        
        if (testPassed) {
            console.log(`✅ Test ${index + 1} PASSED: ${testCase.description}`);
            console.log(`   Input: "${testCase.input}" → Output: "${result}"`);
            passed++;
        } else {
            console.log(`❌ Test ${index + 1} FAILED: ${testCase.description}`);
            console.log(`   Input: "${testCase.input}"`);
            console.log(`   Expected: "${testCase.expected}", Got: "${result}"`);
            console.log(`   Should Pass Validation: ${testCase.shouldPass}, Did Pass: ${isValid}`);
            failed++;
        }
        console.log('');
    });
    
    console.log(`=== Test Summary ===`);
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
    
    return { passed, failed, total: testCases.length };
}

// Auto-run tests if InputSanitizer is available
if (typeof InputSanitizer !== 'undefined') {
    console.log('InputSanitizer detected. Running tests...\n');
    testPhoneNumberValidation();
} else {
    console.log('InputSanitizer not loaded. Please load input-sanitizer.js first.');
}

// Export for manual testing
window.testPhoneNumberValidation = testPhoneNumberValidation;
