import React, { useState } from "react";
import { Settings, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getBackendUrl, setBackendUrl, getBackendToken, setBackendToken } from "@/api/config";
import { api } from "@/api";
import ApiErrorAlert from "./ApiErrorAlert";
import useApiMode from "./useApiMode";

export default function ConnectionSettings() {
  const { mode, switchMode } = useApiMode();
  const [url, setUrl] = useState(getBackendUrl());
  const [token, setToken] = useState(getBackendToken());
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const live = mode === "live";

  const save = () => { setBackendUrl(url); setBackendToken(token); };

  const test = async () => {
    save();
    setTesting(true); setError(null); setOk(false);
    try { await api.ping(); setOk(true); } catch (e) { setError(e); }
    setTesting(false);
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
            <Input id="be-url" placeholder="https://api.example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="be-token">Access token (if required)</Label>
            <Input id="be-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <ApiErrorAlert error={error} title="Connection test failed" />
          {ok && <p className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" />Backend responded.</p>}
          <Button onClick={test} disabled={testing} className="w-full">
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save and test connection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}