// Daily Prebuilt's chat rides on app messages in this shape, so the patient's hosted Daily page shows these lines too.

/**
 * @param {string} text
 * @param {string} name
 */
export const chatMessage = (text, name) => ({ event: "chat-msg", message: text, name, room: "main-room" });

/**
 * @param {unknown} data
 * @returns {{ from: string, text: string } | null}
 */
export function chatEntry(data) {
  const msg = /** @type {{ event?: unknown, message?: unknown, name?: unknown } | null | undefined} */ (data);
  if (msg?.event !== "chat-msg" || typeof msg.message !== "string") return null;
  return { from: typeof msg.name === "string" && msg.name ? msg.name : "Patient", text: msg.message };
}
