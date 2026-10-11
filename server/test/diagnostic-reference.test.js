import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retrieveDiagnosticReference } from '../diagnosticReference.js';

test('index unavailable without explicit permission; no evidence yields no retrieval', () => {
  const lines = [{speaker:'Patient',text:'I have been feeling exhausted and unable to sleep.'}];
  assert.equal(retrieveDiagnosticReference(lines,{permission:'0'}).status,'permission_required');
  assert.equal(retrieveDiagnosticReference(lines,{permission:'1',indexPath:'/file/not/found'}).status,'not_configured');
});
test('operator-controlled reference retrieval returns page references but no PDF text in UI output', () => {
  const dir=mkdtempSync(join(tmpdir(),'mindscribe-reference-'));
  try {
    const path=join(dir,'index.json');
    writeFileSync(path,JSON.stringify({edition:'DSM-5-TR (2022)',pages:[
      {page:123,text:'Feeling exhausted, disturbed sleep, anxious worry, and ongoing fatigue are documented here for differential clinical review.'},
      {page:124,text:'Unrelated material about hair styling.'}
    ]}));
    const answer=retrieveDiagnosticReference([{speaker:'Patient',text:'I feel exhausted and have disturbed sleep and anxious worry.'}],{permission:'1',indexPath:path});
    assert.equal(answer.status,'retrieved');
    assert.deepEqual(answer.sources,[{edition:'DSM-5-TR (2022)',page:123}]);
    assert.equal(answer.passages.length,1);
    assert.equal(answer.passages[0].page,123);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
