import React, { useEffect, useState } from 'react';
import { workspaceApi } from '@/api';
import { AlertTriangle, BrainCircuit, PhoneCall, ShieldCheck } from 'lucide-react';
import { safetyReviewItems } from '@/lib/clinicalDecisionSupport';
import { Button } from '@/components/ui/button';

/** Clinician-facing aid; never automatically calls 911 or makes a diagnosis. */
export default function ClinicalDecisionSupport({ session, onJump, section = "risk" }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState(null);
  const [selected, setSelected] = useState('');
  const [diagnosticNote, setDiagnosticNote] = useState('');
  const [working, setWorking] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState('');
  useEffect(() => {
    let alive = true;
    if (!session.sessionId) return undefined;
    const load = async () => {
      try {
        const result = await workspaceApi.diagnostic({ sessionId: session.sessionId });
        if (alive) setReport(result);
      } catch { if (alive) setDiagnosticError('Unable to connect to the diagnostic service.'); }
    };
    void load();
    const timer = setInterval(load, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [session.sessionId]);
  const submitReview = async (decision) => {
    if (!session.sessionId) return;
    setWorking(true); setDiagnosticError('');
    try {
      const result = await workspaceApi.reviewDiagnostic({ sessionId: session.sessionId, decision, name: selected || report?.hypotheses?.[0]?.name, note: diagnosticNote });
      setReport(result);
    } catch (e) { setDiagnosticError(e?.message || 'Could not record clinician decision.'); }
    finally { setWorking(false); }
  };
  const items = safetyReviewItems(session.answers);
  return (
    <aside aria-label="Clinical decision support" className="rounded-xl border border-border bg-white px-4 py-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{section === "risk" ? "Risk Assessment" : "Diagnostic Assessment"}</h3>
        <span className="rounded bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">Clinician-led</span>
      </div>
      {section === 'risk' ? (
        <div role="tabpanel" className="space-y-3 text-xs">
          <p className="text-muted-foreground">Ask and confirm safety questions for every patient. Answers alone do not determine risk or require an emergency call.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {items.map(item => <button key={item.id} type="button" onClick={() => onJump(item.id)} className="rounded-lg border border-border p-2 text-left hover:bg-muted/50">
              <span className="font-semibold">{item.title}</span>
              <span className="mt-1 block text-muted-foreground">{item.status === 'confirmed' ? 'Clinician-confirmed response' : 'Needs clinician confirmation'}</span>
              {item.answer && <span className="mt-1 block break-words text-foreground">{item.answer}</span>}
            </button>)}
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Additional safeguarding assessment</p>
            <p className="mt-1">Ask about child or vulnerable-person safety and any imminent danger. Follow local reporting rules, organizational protocol, and your professional duties. Positive screens need assessment, not automatic dispatch.</p>
          </div>
          <label className="block font-medium" htmlFor="clinician-safety-notes">Clinician crisis-response notes (not saved or included in PDF yet)</label>
          <textarea id="clinician-safety-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1500} placeholder="Document assessment and planned follow-up in your approved clinical record." className="w-full rounded-md border border-input bg-background p-2 text-foreground" />
          <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} /> I have reviewed the displayed safety items. This does not certify patient safety.</label>
          <p className="flex items-center gap-2 text-muted-foreground"><PhoneCall className="h-4 w-4" />If there is imminent danger, the clinician contacts emergency services directly and provides verified details. MindScribe never calls 911 automatically.</p>
        </div>
      ) : (
        <div role="tabpanel" className="space-y-2 text-xs">
          <p className="text-muted-foreground">Live diagnostic evidence appears here as patient transcript information is recorded. No condition is assumed before patient testimony.</p>
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="font-semibold">Automatic diagnostic hypotheses · live transcript</p>
            <p className="text-muted-foreground">This service automatically refreshes as patient speech is recorded. Suggestions are unconfirmed, not DSM-5-TR criteria verification.</p>
            <p role="status">Analysis: {report?.status ?? 'Waiting for connection'}</p>
            {report?.message && <p>{report.message}</p>}
            <p className="text-muted-foreground" data-testid="reference-status">
              Clinical reference: {report?.reference?.status === 'retrieved'
                ? `Operator-supplied DSM-5-TR pages retrieved (${(report.reference.sources || []).map(x => x.page).join(', ')}). Reference retrieval does not establish diagnostic criteria.`
                : report?.reference?.status === 'permission_required'
                  ? 'Disabled until appropriate reference-content permissions are confirmed.'
                  : report?.reference?.status === 'no_match'
                    ? 'No matching reference passages found; clinician verification required.'
                    : report?.reference?.status === 'not_configured'
                       ? 'This backend has not reported an available reference index.'
                       : 'Reference status pending; awaiting live diagnostic analysis.'}
            </p>
            {(report?.hypotheses || []).map((item, i) => <div key={i} className="rounded border p-2 space-y-1">
              <p className="font-medium">Possible consideration: {item.name}</p>
              <p><strong>Patient evidence:</strong> {item.evidence.map(q => `“${q}”`).join(' · ')}</p>
              <p><strong>To clarify:</strong> {item.missing.join('; ') || 'Additional clinical evaluation required'}</p>
              {item.caveat && <p className="text-muted-foreground">{item.caveat}</p>}
            </div>)}
            {report?.review ? <p className="rounded bg-muted p-2 font-medium">Clinician decision recorded: {report.review.decision === 'defer' ? 'Diagnosis deferred' : report.review.name}</p> : <>
              <label className="block font-medium" htmlFor="hypothesis-choice">Clinician consideration (not an AI final diagnosis)</label>
              <select id="hypothesis-choice" value={selected} onChange={e => setSelected(e.target.value)} className="w-full rounded border bg-white p-2" disabled={!report?.hypotheses?.length}>
                {(report?.hypotheses || []).map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
              <label className="block font-medium" htmlFor="diagnostic-note">Clinical rationale / reason for deferral</label>
              <textarea id="diagnostic-note" value={diagnosticNote} onChange={e=>setDiagnosticNote(e.target.value)} className="w-full rounded border p-2" rows={2} maxLength={600}/>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={working || !report?.hypotheses?.length || report?.status !== 'ready'} onClick={() => submitReview('confirm')}>Confirm consideration</Button>
                <Button size="sm" variant="outline" disabled={working || diagnosticNote.trim().length < 5} onClick={() => submitReview('defer')}>Defer diagnosis</Button>
              </div>
            </>}
            {diagnosticError && <p role="alert" className="text-red-700">{diagnosticError}</p>}
            <p className="text-muted-foreground">The clinician must independently evaluate diagnostic criteria. A DSM-5-TR reference index is used only when separately configured and authorized; retrieval is not DSM criteria verification. No ICD code is generated.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
