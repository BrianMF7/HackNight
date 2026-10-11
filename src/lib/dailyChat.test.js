/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { chatEntry, chatMessage } from "../components/workspace/dailyChat.js";

test("workspace chat uses Daily Prebuilt's chat shape and reads back as the sender's line", () => {
  const sent = chatMessage("Can you hear me?", "Dr. Rowan Ellis (synthetic)");
  assert.deepEqual(sent, { event: "chat-msg", message: "Can you hear me?", name: "Dr. Rowan Ellis (synthetic)", room: "main-room" });
  assert.deepEqual(chatEntry(sent), { from: "Dr. Rowan Ellis (synthetic)", text: "Can you hear me?" });
});

test("only chat-msg app messages with text become chat lines; a nameless sender shows as Patient", () => {
  assert.deepEqual(chatEntry({ event: "chat-msg", message: "Yes, loud and clear", name: "" }), { from: "Patient", text: "Yes, loud and clear" });
  assert.equal(chatEntry({ event: "reaction", message: "wave" }), null);
  assert.equal(chatEntry({ event: "chat-msg" }), null);
  assert.equal(chatEntry(undefined), null);
});
