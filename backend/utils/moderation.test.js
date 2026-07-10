import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPublicContent } from './moderation.js';

test('does not flag common educational words like reading or class', async () => {
  const reading = await inspectPublicContent('reading');
  assert.equal(reading.blocked, false);
  assert.deepEqual(reading.matches, []);

  const classWord = await inspectPublicContent('class');
  assert.equal(classWord.blocked, false);
  assert.deepEqual(classWord.matches, []);
});

test('does not flag friendly educational terms', async () => {
  for (const text of ['teacher', 'student', 'school', 'friend', 'help', 'support', 'team', 'group', 'IELTS speaking practice']) {
    const result = await inspectPublicContent(text);
    assert.equal(result.blocked, false, `${text} should not be blocked`);
    assert.deepEqual(result.matches, []);
  }
});

test('still blocks clear profanity phrases', async () => {
  const result = await inspectPublicContent('địt mẹ');
  assert.equal(result.blocked, true);
  assert.ok(result.matches.includes('địt mẹ'));
});
