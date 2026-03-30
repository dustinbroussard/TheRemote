import test from 'node:test';
import assert from 'node:assert/strict';

import { getAdminIdentitySummary, isAdminUser } from '../src/config/admin';
import { validateGeneratedQuestion } from '../services/questionValidation';
import type { TriviaQuestion } from '../types';

test('isAdminUser requires a verified allowed email', () => {
  assert.equal(
    isAdminUser({
      email: 'dustinbroussard@gmail.com',
      email_confirmed_at: '2026-03-26T00:00:00.000Z',
    }),
    true,
  );

  assert.equal(
    isAdminUser({
      email: 'dustinbroussard@gmail.com',
      email_confirmed_at: null,
    }),
    false,
  );
});

test('getAdminIdentitySummary exposes current allowlist summary', () => {
  assert.match(getAdminIdentitySummary(), /email:/);
  assert.match(getAdminIdentitySummary(), /uid:/);
});

test('validateGeneratedQuestion rejects structurally invalid questions', () => {
  const invalidQuestion = {
    id: 'q-1',
    questionId: 'q-1',
    category: 'History',
    difficulty: 'medium',
    question: 'Who?',
    choices: ['A', 'A', 'C', 'D'],
    correctIndex: 0,
    answerIndex: 0,
    explanation: 'Too short.',
  } as TriviaQuestion;

  const result = validateGeneratedQuestion(invalidQuestion);
  assert.equal(result.isValid, false);
  assert.ok(result.reason);
});
