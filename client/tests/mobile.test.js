import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneNumber, phoneUrl, SUPPORT_EMAIL, whatsappUrl } from '../src/lib/constants.js';

test('support contact details format the business email and India mobile for call and WhatsApp', () => {
  assert.equal(SUPPORT_EMAIL, 'support@erasepaper.online');
  assert.equal(formatPhoneNumber(), '+91 98257 51614');
  assert.equal(formatPhoneNumber('9825751614'), '+91 98257 51614');
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
