import { parseStrict } from './lib/fix/strict';
import { memoryStore } from './lib/store/memory';

const SOH = '\x01';

async function test() {
  // Clear store
  memoryStore.clear();

  // Add New Order Single
  const newOrderMsg = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}11=ORDER123${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}40=2${SOH}44=150.50${SOH}`;
  const result1 = parseStrict(newOrderMsg);

  if (result1.success) {
    const stored1 = await memoryStore.add({
      id: '',
      rawMessage: newOrderMsg,
      fields: result1.message.fields,
      summary: result1.message.summary,
      warnings: result1.message.warnings,
    });
    console.log('Added message 1:', stored1.id);
    console.log('Summary 1:', JSON.stringify(stored1.summary, null, 2));
  }

  // Add Execution Report - Filled
  const execReportMsg = `8=FIX.4.4${SOH}9=100${SOH}35=8${SOH}11=ORDER123${SOH}37=12345${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}39=2${SOH}`;
  const result2 = parseStrict(execReportMsg);

  if (result2.success) {
    const stored2 = await memoryStore.add({
      id: '',
      rawMessage: execReportMsg,
      fields: result2.message.fields,
      summary: result2.message.summary,
      warnings: result2.message.warnings,
    });
    console.log('\nAdded message 2:', stored2.id);
    console.log('Summary 2:', JSON.stringify(stored2.summary, null, 2));
    console.log('ordStatus from summary:', stored2.summary.ordStatus);
    console.log('Field 39:', stored2.fields.find(f => f.tag === '39')?.value);
  }

  // Get orders
  const orders = await memoryStore.listOrders();
  console.log('\n=== Orders ===');
  console.log('Count:', orders.length);
  if (orders.length > 0) {
    console.log('Order:', JSON.stringify(orders[0], null, 2));
  }
}

test();
