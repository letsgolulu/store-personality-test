import test from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, classifyScores, getProfile, matchingCaution, questions, scoreAssessment, storeProfiles } from "../lib/assessment.ts";
import { confirmedSiteContent, defaultSiteContent, validateSiteContent } from "../lib/site-content.ts";
import { existsSync } from "node:fs";

// Build valid responses with a specified mean in each dimension, including
// reverse-keyed questions. Half-strength prototypes test realistic, non-extreme
// scores rather than only trivially matching each prototype at its endpoint.
function answersForProfile(profile, strength = 0.5) {
  const values = Object.fromEntries(DIMENSIONS.map((dimension) => {
    const total = Math.round(6 * (3 + strength * profile.prototype[dimension]));
    const base = Math.floor(total / 6);
    return [dimension, Array.from({ length: 6 }, (_, index) => base + (index < total % 6 ? 1 : 0))];
  }));
  const positions = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, 0]));
  return questions.map((question) => {
    const value = values[question.dimension][positions[question.dimension]++];
    return question.reverse ? 6 - value : value;
  });
}

test("six dimensions each have six questions, and reverse items are scored correctly", () => {
  for (const dimension of DIMENSIONS) {
    assert.equal(questions.filter((question) => question.dimension === dimension).length, 6);
  }
  const allHigh = questions.map((question) => question.reverse ? 1 : 5);
  const allLow = questions.map((question) => question.reverse ? 5 : 1);
  assert.deepEqual(Object.values(scoreAssessment(allHigh).scores), Array(6).fill(100));
  assert.deepEqual(Object.values(scoreAssessment(allLow).scores), Array(6).fill(0));
});

test("each of the 12 store profiles is reachable with both moderate and strong preferences", () => {
  for (const profile of storeProfiles) {
    for (const strength of [0.5, 1]) {
      const result = scoreAssessment(answersForProfile(profile, strength));
      assert.equal(result.primaryId, profile.id, `${profile.id}, strength=${strength}`);
      assert.notEqual(result.primaryId, result.secondaryId);
      assert.deepEqual(result, classifyScores(result.scores), "saved reports replay the same classification");
    }
  }
});

test("different response patterns are not all classified as the cafe", () => {
  const low = scoreAssessment(Array(36).fill(1));
  const middle = scoreAssessment(Array(36).fill(3));
  const high = scoreAssessment(Array(36).fill(5));
  assert.equal(low.primaryId, "seaside-grocery");
  assert.equal(middle.primaryId, "community-bakery");
  assert.equal(high.primaryId, "concept-store");
  assert.equal(new Set([low.primaryId, middle.primaryId, high.primaryId]).size, 3);
});

test("midpoint answers only use the approved 12 shops and explicitly warn about weak differentiation", () => {
  const ids = new Set(storeProfiles.map(profile => profile.id));
  for (const value of [2, 3, 4]) {
    const result = scoreAssessment(Array(36).fill(value));
    assert.ok(ids.has(result.primaryId));
    assert.ok(ids.has(result.secondaryId));
    assert.notEqual(result.primaryId, result.secondaryId);
    assert.ok(matchingCaution(result.scores));
  }
  const midpoint = scoreAssessment(Array(36).fill(3));
  assert.equal(midpoint.primaryId, "community-bakery");
  assert.match(matchingCaution(midpoint.scores), /固定顺序/);
  const answers = Array(36).fill(3);
  answers[0] = 4;
  assert.ok(matchingCaution(scoreAssessment(answers).scores));
  assert.equal(matchingCaution(scoreAssessment(Array(36).fill(5)).scores), "");
});

test("exactly 12 approved profiles exist and every one has an illustration", () => {
  assert.equal(storeProfiles.length, 12);
  assert.equal(new Set(storeProfiles.map(profile => profile.id)).size, 12);
  assert.equal(defaultSiteContent.profiles.length, 12);
  for (const profile of storeProfiles) assert.ok(existsSync(new URL(`../public/illustrations/${profile.id}.jpg`, import.meta.url)));
  assert.throws(() => getProfile("retired-unapproved"), /Unknown store/);
});

test("retired profile content is filtered on read and cannot be republished from an old editor", () => {
  const old = { ...defaultSiteContent, profiles: [...defaultSiteContent.profiles, {...defaultSiteContent.profiles[0],id:"retired-unapproved"}] };
  assert.equal(confirmedSiteContent(old).profiles.length,12);
  assert.deepEqual(confirmedSiteContent(old).questionTexts,defaultSiteContent.questionTexts);
  assert.throws(() => validateSiteContent(old), /12种店型/);
  assert.equal(validateSiteContent(defaultSiteContent).profiles.length,12);
});

test("changing one response only affects its own dimension, including reverse scoring", () => {
  const baseline = scoreAssessment(Array(36).fill(3)).scores;
  for (const question of questions) {
    const answers = Array(36).fill(3);
    answers[question.id - 1] = 5;
    const result = scoreAssessment(answers).scores;
    for (const dimension of DIMENSIONS) {
      if (dimension !== question.dimension) assert.equal(result[dimension], baseline[dimension]);
      else assert.equal(Math.sign(result[dimension] - baseline[dimension]), question.reverse ? -1 : 1);
    }
  }
});

test("invalid or incomplete answers and non-finite saved scores are rejected", () => {
  for (const answers of [[], Array(35).fill(3), Array(36), Array(36).fill(0), Array(36).fill(6), Array(36).fill(2.5), Array(36).fill(null)]) {
    assert.throws(() => scoreAssessment(answers), /Invalid assessment answers/);
  }
  for (const value of [NaN, Infinity, -1, 101]) {
    assert.throws(() => classifyScores({ E: value, O: 50, S: 50, W: 50, A: 50, R: 50 }), /Invalid assessment scores/);
  }
});

test("deterministic simulated responses no longer collapse into the cafe", () => {
  let seed = 42;
  const counts = {};
  for (let index = 0; index < 10_000; index++) {
    const answers = questions.map(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return 1 + seed % 5;
    });
    const result = scoreAssessment(answers);
    assert.deepEqual(result, scoreAssessment(answers), "the same answers must always produce the same result");
    counts[result.primaryId] = (counts[result.primaryId] ?? 0) + 1;
  }
  for (const profile of storeProfiles) assert.ok(counts[profile.id] > 0, `${profile.id} should be reachable`);
  assert.equal(Object.keys(counts).length, 12, "no thirteenth outcome can be produced");
  // A regression guard, not a population distribution or a target quota.
  assert.ok(counts["corner-cafe"] < 2_000, "the cafe should not swallow most answer patterns");
  console.log("Simulated outcome counts (not human norms):", counts);
});
