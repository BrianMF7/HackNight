import React, { useRef, useState } from "react";
import { Settings, Loader2, CheckCircle2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  getBackendUrl,
  setBackendUrl,
  getBackendToken,
  setBackendToken,
  applyLocalDemoConnection,
  localDemoUrl,
  localDemoToken,
} from "@/api/config";
import { api, workspaceApi } from "@/api";
import { startRealtimeStt } from "@/lib/realtimeStt";
import ApiErrorAlert from "./ApiErrorAlert";
import useApiMode from "./useApiMode";

export default function ConnectionSettings() {
  const { mode, switchMode } = useApiMode();
  const [url, setUrl] = useState(getBackendUrl());
  const [token, setToken] = useState(getBackendToken());
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const [sttBusy, setSttBusy] = useState(false);
  const [sttLine, setSttLine] = useState("");
  const sttStop = useRef(null);
  const live = mode === "live";

  const save = () => { setBackendUrl(url); setBackendToken(token); };

  const useLocalDefaults = () => {
    applyLocalDemoConnection();
    setUrl(localDemoUrl);
    setToken(localDemoToken);
    setError(null);
    setOk(false);
  };

  const test = async () => {
    save();
    setTesting(true); setError(null); setOk(false);
    try { await api.ping(); setOk(true); } catch (e) { setError(e); }
    setTesting(false);
  };

  const testStt = async () => {
    save();
    setError(null);
    setSttLine("");
    if (sttStop.current) {
      sttStop.current.stop();
      sttStop.current = null;
      setSttBusy(false);
      return;
    }
    setSttBusy(true);
    try {
      const { wsUrl } = await workspaceApi.getSttToken();
      const handle = await startRealtimeStt({
        wsUrl,
        onPartial: (text) => setSttLine(text),
        onCommitted: (text) => setSttLine(`✓ ${text}`),
        onError: (e) => setError(e),
        onClose: () => { sttStop.current = null; setSttBusy(false); },
      });
      sttStop.current = handle;
    } catch (e) {
      setError(e);
      setSttBusy(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2"><Settings className="h-4 w-4" />Connection</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connection settings</DialogTitle>
          <DialogDescription>Demo mode uses sample data in this browser. Live mode talks only to your backend.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Live backend mode</p>
              <p className="text-xs text-muted-foreground">{live ? "Using your Node.js backend" : "Using demo sample data"}</p>
            </div>
            <Switch checked={live} onCheckedChange={(v) => { save(); switchMode(v ? "live" : "mock"); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="be-url">Backend base URL</Label>
            <Input id="be-url" placeholder={localDemoUrl} value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="be-token">Access token (if required)</Label>
            <Input id="be-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
            <p className="text-xs text-muted-foreground">
              Must match <code className="text-[11px]">BACKEND_TOKEN</code> in the server <code className="text-[11px]">.env</code>
              {localDemoToken ? ` (local demo: ${localDemoToken})` : ""}.
            </p>
          </div>
          <ApiErrorAlert error={error} title="Connection test failed" />
          {ok && <p className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" />Backend responded.</p>}
          {sttLine && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{sttLine}</p>}
          <Button type="button" variant="secondary" onClick={useLocalDefaults} className="w-full" disabled={!localDemoToken}>
            Use local demo URL and token
          </Button>
          <Button onClick={test} disabled={testing} className="w-full">
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save and test connection
          </Button>
          <Button onClick={testStt} disabled={!live || testing} variant="outline" className="w-full gap-2">
            {sttBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {sttBusy ? "Stop speech-to-text test" : "Test realtime speech-to-text"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}