/**
 * Demo script to showcase FIX parser functionality
 * Run with: npx tsx lib/fix/demo.ts
 *
 * Note: This file intentionally uses console.log statements for demonstration purposes.
 * Console logging is appropriate here as this is a standalone demo script, not application code.
 */

import { parseRelaxed } from './parser';
import { parseStrict } from './strict';
import { generateRepairSuggestions, autoRepair } from './repair';
import { SAMPLE_MESSAGES } from './samples';

const SOH = '\x01';

console.log('='.repeat(80));
console.log('FIX PARSER DEMO');
console.log('='.repeat(80));
console.log();

// Demo 1: Relaxed Parser with Different Delimiters
console.log('1. RELAXED PARSER - Different Delimiters');
console.log('-'.repeat(80));

const pipeDelimited = '8=FIX.4.4|35=D|11=ORDER123|55=AAPL|54=1|38=1000|44=150.50|';
console.log('Input (pipe-delimited):', pipeDelimited);
const result1 = parseRelaxed(pipeDelimited);
console.log('Parsed fields:', result1.fields.length);
console.log('Summary:', JSON.stringify(result1.summary, null, 2));
console.log('Warnings:', result1.warnings);
console.log();

// Demo 2: Strict Parser - Valid Message
console.log('2. STRICT PARSER - Valid Message');
console.log('-'.repeat(80));

const validMessage = SAMPLE_MESSAGES[0].message;
console.log('Sample:', SAMPLE_MESSAGES[0].name);
const result2 = parseStrict(validMessage);
console.log('Success:', result2.success);
if (result2.success) {
  console.log('Message Type:', result2.message.summary.msgType);
  console.log('ClOrdID:', result2.message.summary.clOrdId);
  console.log('Symbol:', result2.message.summary.symbol);
}
console.log();

// Demo 3: Strict Parser - Invalid Message with Repair
console.log('3. STRICT PARSER - Invalid Message + Repair');
console.log('-'.repeat(80));

const malformed = ' 8=FIX.4.4|9=100|35=D|11=ORDER123|55=AAPL| ';
console.log('Input (malformed):', malformed);

const result3 = parseStrict(malformed);
console.log('Success:', result3.success);

if (!result3.success) {
  console.log('Issues found:', result3.issues.length);
  console.log('Issues:');
  result3.issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. [${issue.type}] ${issue.message}`);
  });

  console.log('\nRepair Suggestions:');
  const suggestions = generateRepairSuggestions(malformed, result3.issues);
  suggestions.forEach((suggestion, i) => {
    console.log(`  ${i + 1}. [${suggestion.type}] ${suggestion.description}`);
    if (suggestion.preview) {
      console.log(`     Preview: ${suggestion.preview.substring(0, 60)}...`);
    }
  });

  console.log('\nApplying Auto Repair...');
  const repaired = autoRepair(malformed);
  if (repaired) {
    console.log('Repaired successfully!');
    const result4 = parseRelaxed(repaired);
    console.log('Parsed after repair:');
    console.log('  Fields:', result4.fields.length);
    console.log('  MsgType:', result4.summary.msgType);
    console.log('  ClOrdID:', result4.summary.clOrdId);
  }
}
console.log();

// Demo 4: Order Lifecycle Tracking
console.log('4. ORDER LIFECYCLE TRACKING');
console.log('-'.repeat(80));

const orderMessages = [
  SAMPLE_MESSAGES[0], // New Order Single
  SAMPLE_MESSAGES[1], // Execution Report - New
  SAMPLE_MESSAGES[2], // Execution Report - Partial Fill
  SAMPLE_MESSAGES[3], // Execution Report - Filled
];

console.log('Tracking order lifecycle for ORDER001:');
orderMessages.forEach((sample, i) => {
  const parsed = parseRelaxed(sample.message);
  console.log(`\n  ${i + 1}. ${sample.name}`);
  console.log(`     MsgType: ${parsed.summary.msgType}`);
  console.log(`     Status: ${parsed.summary.ordStatus || 'N/A'}`);
  console.log(`     OrderKey: ${parsed.orderKey}`);
  console.log(`     Fields: ${parsed.fields.length}`);
});
console.log();

// Demo 5: Field Dictionary
console.log('5. FIELD DICTIONARY');
console.log('-'.repeat(80));

const message = SAMPLE_MESSAGES[0].message;
const parsed = parseRelaxed(message);

console.log('First 10 fields with human-readable names:');
parsed.fields.slice(0, 10).forEach((field) => {
  console.log(`  Tag ${field.tag.padEnd(3)} (${field.name.padEnd(20)}): ${field.value}`);
});
console.log();

// Demo 6: All Sample Messages
console.log('6. ALL SAMPLE MESSAGES');
console.log('-'.repeat(80));

console.log(`Total samples: ${SAMPLE_MESSAGES.length}`);
SAMPLE_MESSAGES.forEach((sample, i) => {
  const parsed = parseRelaxed(sample.message);
  console.log(`\n  ${i + 1}. ${sample.name}`);
  console.log(`     Description: ${sample.description}`);
  console.log(`     MsgType: ${parsed.summary.msgType}`);
  console.log(`     ClOrdID: ${parsed.summary.clOrdId || 'N/A'}`);
  console.log(`     Symbol: ${parsed.summary.symbol || 'N/A'}`);
});
console.log();

console.log('='.repeat(80));
console.log('DEMO COMPLETE');
console.log('='.repeat(80));
