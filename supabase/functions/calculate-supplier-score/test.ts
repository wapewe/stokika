/**
 * Test file for calculate-supplier-score Edge Function
 * 
 * This file contains unit tests and integration tests for the supplier scoring algorithm
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

/**
 * Test: Score calculation weights
 * Validates that component weights sum to 1.0 (100%)
 */
Deno.test('Component weights sum to 100%', () => {
  const weights = {
    fulfillment: 0.25,
    delivery: 0.25,
    availability: 0.20,
    quality: 0.15,
    price: 0.15
  };
  
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  assertEquals(sum, 1.0, 'Weights must sum to 100%');
});

/**
 * Test: Score bounds
 * Validates that calculated scores are within 0-100 range
 */
Deno.test('Score is within valid bounds', () => {
  const testCases = [
    { components: { fulfillment: 100, delivery: 100, availability: 100, quality: 100, price: 100 }, expected: 100 },
    { components: { fulfillment: 0, delivery: 0, availability: 0, quality: 0, price: 0 }, expected: 0 },
    { components: { fulfillment: 50, delivery: 50, availability: 50, quality: 50, price: 50 }, expected: 50 },
    { components: { fulfillment: 80, delivery: 90, availability: 70, quality: 85, price: 75 }, expected: 80.25 }
  ];
  
  for (const testCase of testCases) {
    const score = 
      testCase.components.fulfillment * 0.25 +
      testCase.components.delivery * 0.25 +
      testCase.components.availability * 0.20 +
      testCase.components.quality * 0.15 +
      testCase.components.price * 0.15;
    
    assertEquals(score, testCase.expected, `Expected score ${testCase.expected} for components ${JSON.stringify(testCase.components)}`);
    assertEquals(score >= 0 && score <= 100, true, 'Score must be between 0 and 100');
  }
});

/**
 * Test: Fulfillment rate calculation
 * Validates correct calculation of order fulfillment rate
 */
Deno.test('Fulfillment rate calculation', () => {
  const testCases = [
    { total: 10, fulfilled: 10, cancelled: 0, expected: 100 },
    { total: 10, fulfilled: 8, cancelled: 0, expected: 80 },
    { total: 10, fulfilled: 5, cancelled: 2, expected: 62.5 }, // 5 out of 8 relevant orders
    { total: 10, fulfilled: 0, cancelled: 10, expected: 0 }, // All cancelled, no relevant orders
  ];
  
  for (const testCase of testCases) {
    const relevantOrders = testCase.total - testCase.cancelled;
    const fulfillmentRate = relevantOrders > 0 ? (testCase.fulfilled / relevantOrders) * 100 : 0;
    
    assertEquals(fulfillmentRate, testCase.expected, `Expected ${testCase.expected}% for ${testCase.fulfilled} fulfilled out of ${relevantOrders} relevant orders`);
  }
});

/**
 * Test: Delivery timeliness calculation
 * Validates correct calculation of on-time delivery rate
 */
Deno.test('Delivery timeliness calculation', () => {
  const testCases = [
    { 
      deliveries: [
        { estimated: '2025-01-10', actual: '2025-01-09' }, // Early
        { estimated: '2025-01-10', actual: '2025-01-10' }, // On time
        { estimated: '2025-01-10', actual: '2025-01-11' }, // Late
      ],
      expected: 66.67 // 2 out of 3 on time
    },
    { 
      deliveries: [
        { estimated: '2025-01-10', actual: '2025-01-10' },
        { estimated: '2025-01-11', actual: '2025-01-11' },
      ],
      expected: 100 // All on time
    },
  ];
  
  for (const testCase of testCases) {
    let onTimeCount = 0;
    
    for (const delivery of testCase.deliveries) {
      const actualDate = new Date(delivery.actual);
      const estimatedDate = new Date(delivery.estimated);
      
      if (actualDate <= estimatedDate) {
        onTimeCount++;
      }
    }
    
    const deliveryScore = (onTimeCount / testCase.deliveries.length) * 100;
    const rounded = Math.round(deliveryScore * 100) / 100;
    
    assertEquals(rounded, testCase.expected, `Expected ${testCase.expected}% for ${onTimeCount} on-time out of ${testCase.deliveries.length} deliveries`);
  }
});

/**
 * Test: Availability rate calculation
 * Validates correct calculation of product availability rate
 */
Deno.test('Availability rate calculation', () => {
  const testCases = [
    { total: 10, available: 10, expected: 100 },
    { total: 10, available: 7, expected: 70 },
    { total: 10, available: 0, expected: 0 },
  ];
  
  for (const testCase of testCases) {
    const availabilityRate = (testCase.available / testCase.total) * 100;
    
    assertEquals(availabilityRate, testCase.expected, `Expected ${testCase.expected}% for ${testCase.available} available out of ${testCase.total} products`);
  }
});

/**
 * Test: Quality score calculation
 * Validates correct calculation based on issue rate
 */
Deno.test('Quality score calculation', () => {
  const testCases = [
    { total: 10, issues: 0, expected: 100 },
    { total: 10, issues: 1, expected: 90 },
    { total: 10, issues: 5, expected: 50 },
    { total: 10, issues: 10, expected: 0 },
  ];
  
  for (const testCase of testCases) {
    const issueRate = testCase.issues / testCase.total;
    const qualityScore = Math.max(0, 100 - (issueRate * 100));
    
    assertEquals(qualityScore, testCase.expected, `Expected ${testCase.expected} for ${testCase.issues} issues out of ${testCase.total} orders`);
  }
});

/**
 * Test: Price competitiveness calculation
 * Validates correct scoring based on price difference from market
 */
Deno.test('Price competitiveness calculation', () => {
  const marketPrice = 1000;
  
  const testCases = [
    { supplierPrice: 900, expectedRange: [90, 100] }, // 10% below market
    { supplierPrice: 950, expectedRange: [75, 90] },  // 5% below market
    { supplierPrice: 1000, expectedRange: [75, 75] }, // At market
    { supplierPrice: 1050, expectedRange: [50, 75] }, // 5% above market
    { supplierPrice: 1100, expectedRange: [25, 50] }, // 10% above market
    { supplierPrice: 1250, expectedRange: [10, 25] }, // 25% above market
  ];
  
  for (const testCase of testCases) {
    const priceDiff = (testCase.supplierPrice - marketPrice) / marketPrice;
    
    let priceScore: number;
    if (priceDiff <= -0.10) {
      priceScore = 100;
    } else if (priceDiff < 0) {
      priceScore = 75 + (Math.abs(priceDiff) * 250);
    } else if (priceDiff === 0) {
      priceScore = 75;
    } else if (priceDiff <= 0.10) {
      priceScore = 75 - (priceDiff * 250);
    } else if (priceDiff <= 0.20) {
      priceScore = 25;
    } else {
      priceScore = 10;
    }
    
    assertEquals(
      priceScore >= testCase.expectedRange[0] && priceScore <= testCase.expectedRange[1],
      true,
      `Price ${testCase.supplierPrice} vs market ${marketPrice}: expected score ${testCase.expectedRange[0]}-${testCase.expectedRange[1]}, got ${priceScore}`
    );
  }
});

/**
 * Test: Default scores for new suppliers
 * Validates that suppliers with no data get reasonable default scores
 */
Deno.test('Default scores for new suppliers', () => {
  const defaultScores = {
    fulfillment: 50,  // Neutral
    delivery: 50,     // Neutral
    availability: 50, // Neutral
    quality: 75,      // Good (benefit of doubt)
    price: 50        // Neutral
  };
  
  const totalScore = 
    defaultScores.fulfillment * 0.25 +
    defaultScores.delivery * 0.25 +
    defaultScores.availability * 0.20 +
    defaultScores.quality * 0.15 +
    defaultScores.price * 0.15;
  
  assertEquals(totalScore, 53.75, 'Default score for new supplier should be 53.75');
});

console.log('All tests defined. Run with: deno test calculate-supplier-score/test.ts');
