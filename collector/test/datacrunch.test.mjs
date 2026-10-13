import { test } from 'node:test';
import assert from 'node:assert/strict';
import datacrunch from '../sources/datacrunch.mjs';

function row(model, nGpus, spot, list) {
  return {
    model,
    gpu: { number_of_gpus: nGpus, description: `${nGpus}x ${model}` },
    spot_price: spot,
    price_per_hour: list,
  };
}

test('datacrunch: median of single-GPU spot prices on frozen models', async () => {
  const body = [
    row('H100', 1, '2.0', '4.0'),
    row('H100', 1, '3.0', '4.0'),
    row('A100 80GB', 1, '1.0', '2.0'),
    row('L40S', 1, null, '1.5'), // spot missing → on-demand
    row('H100', 8, '0.1', '0.2'), // multi-GPU ignored
    row('B200', 1, '9.0', '10.0'), // outside frozen set
  ];
  const out = await datacrunch.collect(async () => body);
  assert.equal(out.unit, 'usd/gpu/hour');
  assert.equal(out.value, 1.75); // sorted 1.0, 1.5, 2.0, 3.0 → median (1.5+2)/2
  assert.deepEqual(out.meta.models_used, ['A100 80GB', 'H100', 'L40S']);
  assert.equal(out.meta.offers_used, 4);
});

test('datacrunch: goes dark when the basket is too thin', async () => {
  await assert.rejects(
    () => datacrunch.collect(async () => [row('H100', 1, '2.0', '4.0')]),
    /only 1 usable/
  );
});
