import React, { useState } from "react";
import { X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Optional text chat. In a live call it travels over Daily, so the patient's Daily page shows it too.
/**
 * @param {{
 *   messages: Array<{ from: string, text: string }>,
 *   onSend: (text: string) => void,
 *   onClose: () => void,
 * }} props
 */
export default function ChatPanel({ messages, onSend, onClose }) {
  const [text, setText] = useState("");
  /** @param {React.FormEvent<HTMLFormElement>} e */
  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <div className="absolute inset-y-3 left-3 flex w-64 flex-col rounded-xl border border-white/15 bg-black/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs font-medium">
        Chat
        <button onClick={onClose} aria-label="Close chat"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-xs">
        {messages.map((m, i) => (
          <div key={i}><span className="text-white/50">{m.from}</span><p>{m.text}</p></div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-1 border-t border-white/10 p-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" className="h-8 border-white/20 bg-white/10 text-xs text-white placeholder:text-white/40" />
        <Button size="icon" type="submit" className="h-8 w-8" aria-label="Send"><Send /></Button>
      </form>
    </div>
  );
}
