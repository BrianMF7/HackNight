/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { allQuestions } from "../api/templates/adultIntake.js";
import { applyAskedDraft, askedQuestionId } from "./matchIntakeQuestion.js";

test("a spoken line matches the adult intake question only when the label or follow-up is in it", () => {
  assert.equal(
    askedQuestionId("Thanks for joining. To start, what brings you in today?", allQuestions),
    "AIQ-001",
  );
  assert.equal(
    askedQuestionId("WHAT BRINGS YOU IN TODAY?", allQuestions),
    "AIQ-001",
  );
  assert.equal(
    askedQuestionId("What is the main reason you are seeking support right now?", allQuestions),
    "AIQ-001",
  );
  assert.equal(askedQuestionId("When did these symptoms begin?", allQuestions), "AIQ-002");
  assert.equal(
    askedQuestionId("How have these concerns affected work, home, or relationships?", allQuestions),
    "AIQ-003",
  );
  assert.equal(askedQuestionId("How are you feeling today?", allQuestions), null);
  assert.equal(askedQuestionId("What brings", allQuestions), null);
  assert.equal(askedQuestionId("Alcohol use", allQuestions), null);
  const alcohol = allQuestions.find((q) => q.id === "SUB-001");
  assert.equal(askedQuestionId(alcohol?.followUp, allQuestions), "SUB-001");
});

test("the next patient line drafts that field and a confirmed answer stays", () => {
  const drafted = applyAskedDraft({}, "AIQ-001", "I can't sleep");
  assert.equal(drafted["AIQ-001"].status, "draft");
  assert.equal(drafted["AIQ-001"].answer, "I can't sleep");
  assert.equal(drafted["AIQ-001"].evidence, "I can't sleep");
  assert.equal(drafted["AIQ-001"].fieldId, "AIQ-001");

  const paraphrased = {
    "AIQ-001": { status: "draft", answer: "sleep trouble", evidence: "model", category: "presenting", clinicianEdited: true },
  };
  const spoken = applyAskedDraft(paraphrased, "AIQ-001", "I can't sleep");
  assert.equal(spoken["AIQ-001"].answer, "I can't sleep");
  assert.equal(spoken["AIQ-001"].evidence, "I can't sleep");
  assert.equal(spoken["AIQ-001"].category, "presenting");
  assert.equal(spoken["AIQ-001"].clinicianEdited, false);

  const confirmed = { "AIQ-001": { status: "confirmed", answer: "kept" } };
  assert.equal(applyAskedDraft(confirmed, "AIQ-001", "I can't sleep"), confirmed);
  const untouched = {};
  assert.equal(applyAskedDraft(untouched, null, "I can't sleep"), untouched);
});
