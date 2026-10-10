import React, { useState } from "react";
import { X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Optional text chat. Demo only: messages stay in this browser tab and go nowhere.
/**
 * @param {{ onClose: () => void }} props
 */
export default function ChatPanel({ onClose }) {
  const [msgs, setMsgs] = useState(/** @type {Array<{ from: string, text: string }>} */ ([
    { from: "Patient", text: "Hi, can you hear me okay? (synthetic)" },
  ]));
  const [text, setText] = useState("");
  /** @param {React.FormEvent<HTMLFormElement>} e */
  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMsgs((m) => [...m, { from: "You", text: text.trim() }]);
    setText("");
  };
  return (
    <div className="absolute inset-y-3 left-3 flex w-64 flex-col rounded-xl border border-white/15 bg-black/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs font-medium">
        Chat (demo)
        <button onClick={onClose} aria-label="Close chat"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-xs">
        {msgs.map((m, i) => (
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