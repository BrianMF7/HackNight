import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeDiagnostic, handleDiagnostic, scheduleDiagnostic } from '../diagnostic.js';
import { handleSession, findSession } from '../session.js';

test('no diagnosis is inferred before transcript evidence', async () => {
  const session = {live:true,transcript:[]};
  assert.equal((await analyzeDiagnostic(session)).status,'pending');
  assert.deepEqual(session.diagnostic.hypotheses,[]);
});

test('Gemini diagnostic suggestions require exact Patient evidence and are not clinician decisions', async () => {
  const before=process.env.GEMINI_API_KEY, phi=process.env.ALLOW_PHI;
  process.env.GEMINI_API_KEY='synthetic-testing-key'; process.env.ALLOW_PHI='1';
  try {
    const session = {live:true,transcript:[
      {t:1,speaker:'Patient',text:'I have lost interest in reading.'},
      {t:2,speaker:'Patient',text:'I feel sad most days.'},
      {t:3,speaker:'Clinician',text:'How long has that lasted?'},
      {t:4,speaker:'Patient',text:'About a week.'},
    ]};
    const mockFetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({hypotheses:[
      {name:'Depressive condition',evidence:['I have lost interest in reading.','invented quote'],missing:['Assess duration'],caveat:'Insufficient information'},
      {name:'Unsupported',evidence:['invented'],missing:[]},
    ]})}]}}]})});
    const out=await analyzeDiagnostic(session,mockFetch);
    assert.equal(out.status,'ready');
    assert.equal(out.review,null);
    assert.equal(out.hypotheses.length,1);
    assert.deepEqual(out.hypotheses[0].evidence,['I have lost interest in reading.']);
  } finally {
    if(before === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY=before;
    if(phi === undefined) delete process.env.ALLOW_PHI; else process.env.ALLOW_PHI=phi;
  }
});

test('defer requires a reason and locks clinician decision', async () => {
  const session=await handleSession('POST','/api/sessions',{templateId:'adult-intake-v1',therapistEmail:'therapist@example.com'},Date.now(),()=>{});
  const id=session.body.id;
  const route=`/api/sessions/${id}/diagnostic/review`;
  assert.equal(handleDiagnostic('POST',route,{decision:'defer',note:'no'}).status,400);
  const resolved=handleDiagnostic('POST',route,{decision:'defer',note:'Insufficient assessment information.'});
  assert.equal(resolved.status,200);
  assert.equal(resolved.body.review.decision,'defer');
  assert.equal(handleDiagnostic('POST',route,{decision:'confirm',name:'anything'}).status,409);
  assert.equal(findSession(id).diagnostic.review.name,null);
});
