// Display-only clinical decision support. Not a validated risk classifier or diagnostic engine.
// Never dispatches emergency services, labels someone high risk, or changes the handoff gate.
export const SAFETY_ITEMS = [
  { id: 'PHQ-009', title: 'Recent thoughts of death or self-harm', prompt: 'Ask about current thoughts, intent, plan, access to means, and protective factors where appropriate.' },
  { id: 'SAF-001', title: 'Current self-harm thoughts', prompt: 'Clarify immediacy, intent, plan, means, and safety needs directly with the patient.' },
  { id: 'SAF-002', title: 'Thoughts of harming others', prompt: 'Clarify any specific threat, target, intent, means, and imminent danger.' },
];

// A confirmed answer cannot be safely interpreted using simple yes/no matching: free-text
// negation and historical statements are too ambiguous. Show all confirmed evidence neutrally.
export function safetyReviewItems(answers = {}) {
  return SAFETY_ITEMS.map(item => ({
    ...item,
    status: answers[item.id]?.status === 'confirmed' ? 'confirmed' : 'pending',
    answer: answers[item.id]?.status === 'confirmed' ? String(answers[item.id]?.answer || '').slice(0, 400) : '',
  }));
}

export function diagnosticEvidence(answers = {}) {
  const take = (id) => answers[id]?.status === 'confirmed'
    ? String(answers[id]?.answer || '').trim().slice(0, 400) : '';
  const fields = [
    { id: 'PHQ-001', name: 'Interest or pleasure', text: take('PHQ-001') },
    { id: 'PHQ-002', name: 'Mood', text: take('PHQ-002') },
    { id: 'AIQ-002', name: 'Symptom duration', text: take('AIQ-002') },
    { id: 'AIQ-003', name: 'Functional impact', text: take('AIQ-003') },
    { id: 'HIS-002', name: 'Medication history', text: take('HIS-002') },
  ];
  return {
    title: 'Depressive symptoms — diagnostic review',
    status: 'Evidence review only · diagnosis not established',
    confirmed: fields.filter(f => f.text),
    missing: fields.filter(f => !f.text),
    cautions: 'A diagnosis requires assessment of full criteria, duration, severity, impairment, alternative causes, bipolar-spectrum history, and clinical judgment. This view does not evaluate DSM-5-TR criteria or assign an ICD code.',
  };
}
