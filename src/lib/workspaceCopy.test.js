/// <reference types="node" />
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("the start dialog and workspace do not call the session a demo", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const start = await read("../components/dashboard/StartSessionCard.jsx");
  const video = await read("../components/workspace/VideoPane.jsx");
  const chat = await read("../components/workspace/ChatPanel.jsx");
  const review = await read("../components/workspace/ReviewModal.jsx");
  const workspace = await read("../pages/Workspace.jsx");
  const fixture = await read("../api/fixtures/syntheticSession.js");
  const form = await read("../api/templates/adultIntake.js");
  const serverForm = await read("../../server/template.js");

  assert.equal(start.includes("demo-session"), false);
  assert.equal(start.includes("Demo link"), false);
  assert.equal(start.includes("Open Clinical Workspace"), true);
  assert.equal(video.includes("(synthetic)"), false);
  assert.equal(video.includes("Demo video"), false);
  assert.equal(video.includes("Live demo"), false);
  assert.equal(video.includes("ElevenLabs"), false);
  assert.equal(chat.includes("(demo)"), false);
  assert.equal(review.includes("demo mode"), false);
  assert.equal(review.includes("(demo)"), false);
  assert.equal(workspace.includes("(synthetic)"), false);
  assert.equal(fixture.includes("(synthetic)"), false);
  assert.equal(form.includes("demo structure"), false);
  assert.equal(serverForm.includes("demo structure"), false);
});
