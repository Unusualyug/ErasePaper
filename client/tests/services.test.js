import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SERVICES } from '../src/lib/services.js';
import { SERVICE_COLORS, SERVICE_ICONS } from '../src/lib/constants.js';
import { SERVICES as SERVER_SERVICES } from '../../server/src/config/services.js';

const GUARANTEED_SERVICE_NAMES = {
  'turnitin-drillbit-ithenticate-reports': 'Turnitin, DrillBit & iThenticate Reports',
  'plagiarism-checking-reduction': 'Plagiarism Checking & Reduction',
  'ai-content-detection-writing-improvement': 'AI Content Detection & Writing Improvement',
};

test('client fallback and server catalogs preserve all eight matching services', () => {
  assert.equal(DEFAULT_SERVICES.length, 8);
  assert.deepEqual(
    DEFAULT_SERVICES.map(({ slug, name }) => [slug, name]),
    SERVER_SERVICES.map(({ slug, name }) => [slug, name]),
  );
  assert.ok(DEFAULT_SERVICES.some((service) => service.slug === 'social-media-marketing'));
});

test('the three document-review services expose the 24-hour guarantee and valid card assets', () => {
  const guaranteed = DEFAULT_SERVICES.filter((service) => service.completionGuarantee);
  assert.deepEqual(
    guaranteed.map((service) => service.slug),
    Object.keys(GUARANTEED_SERVICE_NAMES),
  );

  for (const slug of Object.keys(GUARANTEED_SERVICE_NAMES)) {
    const service = DEFAULT_SERVICES.find((item) => item.slug === slug);
    const serverService = SERVER_SERVICES.find((item) => item.slug === slug);
    assert.equal(service.name, GUARANTEED_SERVICE_NAMES[slug]);
    assert.deepEqual(service.completionGuarantee, serverService.completionGuarantee);
    assert.equal(service.completionGuarantee.label, '1-day completion guarantee');
    assert.match(service.completionGuarantee.details, /within 24 hours/i);
    assert.match(service.completionGuarantee.details, /complete document/i);
    assert.match(service.completionGuarantee.details, /required details/i);
    assert.ok(SERVICE_ICONS[service.icon], `missing icon mapping for ${service.icon}`);
    assert.ok(SERVICE_COLORS[service.color], `missing color mapping for ${service.color}`);
    assert.ok(service.features.length >= 3);
  }
});

test('new service intake fields match their descriptions and required selections', () => {
  const report = SERVER_SERVICES.find((service) => service.slug === 'turnitin-drillbit-ithenticate-reports');
  const plagiarism = SERVER_SERVICES.find((service) => service.slug === 'plagiarism-checking-reduction');
  const aiWriting = SERVER_SERVICES.find(
    (service) => service.slug === 'ai-content-detection-writing-improvement',
  );

  assert.deepEqual(
    report.fields.filter((field) => field.required).map((field) => field.key),
    ['preferredPlatform', 'documentType', 'academicLevel', 'reportType'],
  );
  assert.deepEqual(
    plagiarism.fields.filter((field) => field.required).map((field) => field.key),
    ['documentType', 'academicLevel', 'citationStyle', 'reviewFocus'],
  );
  assert.deepEqual(
    aiWriting.fields.filter((field) => field.required).map((field) => field.key),
    ['documentType', 'academicLevel', 'writingGoal'],
  );
  assert.match(
    plagiarism.description,
    /proper paraphrasing, citation correction and originality improvement/i,
  );
  assert.match(aiWriting.description, /AI-content analysis/i);
  assert.match(aiWriting.description, /do not promise a score/i);
});
