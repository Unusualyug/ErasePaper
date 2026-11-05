import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneUrl, whatsappUrl } from '../src/lib/constants.js';

test('mobile contact actions use the registered WhatsApp conversation and telephone fallback', () => {
  assert.equal(phoneUrl(), 'tel:+919825751614');
  assert.equal(
    whatsappUrl(undefined, 'Hello ErasePaper, I need help.'),
    'https://wa.me/919825751614?text=Hello%20ErasePaper%2C%20I%20need%20help.',
  );
  assert.equal(
    whatsappUrl('+91 98257 51614', 'A student request #42'),
    'https://wa.me/919825751614?text=A%20student%20request%20%2342',
  );
});
