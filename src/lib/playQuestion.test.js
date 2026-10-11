/// <reference types="node" />
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const files = [
  "../components/workspace/QuestionRow.jsx",
  "../components/workspace/OutstandingQueue.jsx",
  "../components/workspace/NotificationStack.jsx",
  "../components/workspace/ClinicalDocument.jsx",
  "../pages/Workspace.jsx",
  "../api/liveWorkspace.js",
  "../api/mockWorkspace.js",
  "../api/index.js",
];

test("intake questions have no play-question control or endpoint", async () => {
  for (const file of files) {
    const src = await readFile(new URL(file, import.meta.url), "utf8");
    assert.equal(src.toLowerCase().includes("play question"), false, file);
    assert.equal(src.includes("playQuestion"), false, file);
    assert.equal(src.includes("onPlay"), false, file);
  }
});
