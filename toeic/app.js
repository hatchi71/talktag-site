const STORAGE_KEY = 'part5-desk-v1';
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {questions:[],results:{},starred:[],filter:'all'};
let activePart = [5,6,7].includes(Number(localStorage.getItem('toeic-active-part'))) ? Number(localStorage.getItem('toeic-active-part')) : 5;
let part5State = state;
let part6State = JSON.parse(localStorage.getItem('part6-desk-v1') || 'null') || {questions:[],results:{},starred:[],filter:'all'};
let part7State = JSON.parse(localStorage.getItem('part7-desk-v1') || 'null') || {questions:[],results:{},starred:[],filter:'all'};
const partStates = {5:part5State,6:part6State,7:part7State};
state = partStates[activePart];
let currentIndex = 0;
const $ = s => document.querySelector(s);
function save(){localStorage.setItem(`part${activePart}-desk-v1`, JSON.stringify(state));}
function copyState(value){return JSON.parse(JSON.stringify(value))}
function replacePartState(part,nextState){
  const target=partStates[part];
  target.questions=Array.isArray(nextState?.questions)?copyState(nextState.questions):[];
  target.results=nextState?.results&&typeof nextState.results==='object'?copyState(nextState.results):{};
  target.starred=Array.isArray(nextState?.starred)?copyState(nextState.starred):[];
  target.filter=['all','correct','incorrect','starred'].includes(nextState?.filter)?nextState.filter:'all';
  localStorage.setItem(`part${part}-desk-v1`,JSON.stringify(target));
  if(activePart===part)state=target;
}
async function snapshotSafely(part,targetState,reason){
  try{await ToeicVault.snapshot(part,targetState,reason)}catch(error){console.warn('TOEIC 보관함 저장 실패:',error)}
}
async function archiveRemoval(questions,reason){
  if(!questions.length)return true;
  const ids=new Set(questions.map(q=>q.id));
  const removedState={questions:copyState(questions),results:Object.fromEntries(Object.entries(state.results).filter(([id])=>ids.has(id))),starred:state.starred.filter(id=>ids.has(id)),filter:'all'};
  try{
    await ToeicVault.snapshot(activePart,state,`${reason} 전 안전 저장`);
    await ToeicVault.trash(activePart,removedState,reason);
    return true;
  }catch(error){
    alert(`문제 보관함에 저장하지 못해 삭제를 중단했습니다.\n${error.message}`);
    return false;
  }
}
function filtered(){return state.questions.filter(q=>state.filter==='all'||(state.filter==='starred'&&state.starred.includes(q.id))||(state.filter==='correct'&&state.results[q.id]?.correct)||(state.filter==='incorrect'&&state.results[q.id]&&!state.results[q.id].correct));}
async function keepReviewQuestionsOnly(){
  const starredIds=new Set(state.starred);
  const reviewIds=new Set(state.questions.filter(q=>state.results[q.id]?.correct===false||starredIds.has(q.id)).map(q=>q.id));
  const removedCount=state.questions.length-reviewIds.size;
  const message=`Part ${activePart}에서 오답 또는 별표된 ${reviewIds.size}문제만 남기고 나머지 ${removedCount}문제를 삭제할까요?\n삭제한 문제는 문제 보관함에서 복원할 수 있습니다.`;
  if(!confirm(message))return;
  const removed=state.questions.filter(q=>!reviewIds.has(q.id));
  if(!await archiveRemoval(removed,'오답·별표만 남기기'))return;
  state.questions=state.questions.filter(q=>reviewIds.has(q.id));
  state.results=Object.fromEntries(Object.entries(state.results).filter(([id])=>reviewIds.has(id)));
  state.starred=state.starred.filter(id=>reviewIds.has(id));
  state.filter='all';
  currentIndex=0;
  save();
  render();
}
function updateCounts(){const qs=state.questions, r=state.results; $('#countAll').textContent=qs.length;$('#countCorrect').textContent=qs.filter(q=>r[q.id]?.correct).length;$('#countIncorrect').textContent=qs.filter(q=>r[q.id]&&!r[q.id].correct).length;$('#countStarred').textContent=state.starred.length;const solved=qs.filter(q=>r[q.id]).length;$('#progressText').textContent=`${solved} / ${qs.length}문제 학습`;$('#progressBar').style.width=qs.length?`${solved/qs.length*100}%`:'0'}
function render(){updateCounts();document.querySelectorAll('[data-part]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.part)===activePart);b.setAttribute('aria-pressed',String(Number(b.dataset.part)===activePart))});$('#partDescription').textContent=activePart===7?`Part 7 · 독해 ${state.questions.length}문항`:activePart===6?`Part 6 · 문맥 빈칸 채우기 ${state.questions.length}문항`:`Part 5 · 단문 빈칸 채우기 ${state.questions.length}문항`;$('#openAdd').classList.toggle('hidden',activePart!==5);document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.filter===state.filter));const qs=filtered();if(currentIndex>=qs.length)currentIndex=0;$('#emptyState').classList.toggle('hidden',!!qs.length);$('#questionArea').classList.toggle('hidden',!qs.length);updateBroadcastDock();if(!qs.length)return;const q=qs[currentIndex], result=state.results[q.id];const node=$('#questionTemplate').content.cloneNode(true);const card=node.querySelector('.card');node.querySelector('.number').textContent=`QUESTION ${String(currentIndex+1).padStart(2,'0')} · ${qs.length}`;node.querySelector('.question').textContent=q.question;
if(q.part===7){node.querySelector('.number').textContent=`PART 7 · ${q.questionNumber} · ${currentIndex+1} / ${qs.length}`;const panel=node.querySelector('.passagePanel');panel.classList.remove('hidden');node.querySelector('.passageTitle').textContent=`${q.passages.length===1?'단일':q.passages.length===2?'이중':'삼중'} 지문 · ${q.setTitle}`;const container=node.querySelector('.passage');q.passages.forEach((doc,i)=>{const article=document.createElement('section');article.className='readingDocument';const heading=document.createElement('h3');heading.textContent=`문서 ${i+1} · ${doc.title}`;const body=document.createElement('div');body.textContent=doc.text;article.append(heading,body);container.append(article)});}

if(q.passage){const panel=node.querySelector('.passagePanel');panel.classList.remove('hidden');node.querySelector('.passageTitle').textContent=`${q.passageType} · ${q.setTitle}`;const passage=node.querySelector('.passage');q.passage.split(/(\[\d+\])/g).forEach(piece=>{if(piece===`[${q.blank}]`){const mark=document.createElement('mark');mark.textContent=piece;passage.append(mark)}else passage.append(document.createTextNode(piece))});}
const star=node.querySelector('.star');star.textContent=state.starred.includes(q.id)?'★':'☆';star.classList.toggle('active',state.starred.includes(q.id));star.onclick=()=>{state.starred.includes(q.id)?state.starred=state.starred.filter(id=>id!==q.id):state.starred.push(q.id);save();render()};const choices=node.querySelector('.choices');q.choices.forEach((text,i)=>{const b=document.createElement('button');b.className='choice';const circleSvg=(result&&i===q.answer)?'<svg class="circleMark" viewBox="0 0 60 60" preserveAspectRatio="none"><path d="M38,16 C54,17 57,32 47,41 C37,50 18,50 9,40 C0,30 3,16 16,12 C25,9 33,10 38,15 L30,9"/></svg>':'';const wrongMark=(result&&!result.correct&&i===result.selected)?'<svg class="wrongMark" viewBox="0 0 60 60" preserveAspectRatio="none"><path d="M14,14 C23,24 35,36 47,48"/><path d="M47,13 C36,24 25,36 13,48"/></svg>':'';b.innerHTML=`<strong>${'ABCD'[i]}${circleSvg}${wrongMark}</strong><span>${escapeHtml(text)}</span>`;if(result){b.disabled=true;if(i===q.answer){b.classList.add('correct')}else{b.classList.add('faded');if(i===result.selected)b.classList.add('selectedWrong')}}else b.onclick=()=>answer(q,i);choices.appendChild(b)});if(result){const feedback=node.querySelector('.feedback');feedback.classList.remove('hidden');feedback.classList.toggle('wrong',!result.correct);const translationHtml=q.translation?`<p class="translation"><strong>${q.part===7?'질문·정답 해석':'문장 해석'}</strong> ${escapeHtml(q.translation)}</p>`:'';const vocabHtml=q.vocab?`<p class="vocab"><strong>${q.part===7?'보기 및 핵심 표현':'보기 단어 뜻 & 예문'}</strong> ${escapeHtml(q.vocab)}</p>`:'';feedback.innerHTML=`<h3>${result.correct?'정답이에요. 잘했어요!':'아쉬워요. 정답은 '+ 'ABCD'[q.answer]+'입니다.'}</h3>${translationHtml}${vocabHtml}<p>${escapeHtml(q.explanation)}</p>`;if(q.part===7){const evidence=document.createElement('div');evidence.className='answerEvidence';const heading=document.createElement('h4');heading.textContent='정답 근거 및 보기별 검수';evidence.append(heading);q.evidence.forEach(item=>{const line=document.createElement('p');line.textContent=`문서 ${item.document}: “${item.quote}” — ${item.reason}`;evidence.append(line)});q.optionReasons.forEach((reason,i)=>{const line=document.createElement('p');line.textContent=`${'ABCD'[i]} · ${i===q.answer?'정답':'오답'}: ${reason}`;evidence.append(line)});const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='전체 지문 해석';details.append(summary);q.passages.forEach((doc,i)=>{const para=document.createElement('p');para.textContent=`문서 ${i+1} · ${doc.translation}`;details.append(para)});evidence.append(details);feedback.append(evidence)}}node.querySelector('.status').textContent=result?(result.correct?'✓ 맞힌 문제':'↺ 다시 복습할 문제'):'아직 풀지 않음';node.querySelector('.prevButton').onclick=()=>{currentIndex=(currentIndex-1+qs.length)%qs.length;render()};node.querySelector('.nextButton').onclick=()=>{currentIndex=(currentIndex+1)%qs.length;render()};$('#questionArea').replaceChildren(node)}
$('#questionArea').onclick=async e=>{if(!e.target.matches('.deleteButton'))return;const q=filtered()[currentIndex];if(q&&confirm('이 문제를 삭제할까요? 삭제 후에도 문제 보관함에서 복원할 수 있습니다.')){if(!await archiveRemoval([q],'현재 문제 삭제'))return;state.questions=state.questions.filter(item=>item.id!==q.id);delete state.results[q.id];state.starred=state.starred.filter(id=>id!==q.id);save();render()}};
function answer(q,selected){state.results[q.id]={selected,correct:selected===q.answer,at:Date.now()};save();render()}
function insertQuestions(newQs){if(!newQs.length)return;const shuffle=confirm(`새 문제 ${newQs.length}개를 추가합니다.\n확인: 기존 문제와 무작위로 섞기\n취소: 기존 문제 뒤에 순서대로 추가`);state.questions=[...state.questions,...newQs];if(shuffle){for(let i=state.questions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[state.questions[i],state.questions[j]]=[state.questions[j],state.questions[i]]}}}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;currentIndex=0;save();render()});$('#retryMode').onchange=e=>{if(e.target.checked){state.results={};save();render()}};$('#resetCurrent').onclick=()=>{const q=filtered()[currentIndex];if(q){delete state.results[q.id];save();render()}};$('#resetAll').onclick=()=>{if(confirm('모든 문제의 정오답 기록을 초기화할까요? 문제 목록은 그대로 남습니다.')){state.results={};currentIndex=0;save();render()}};$('#keepReviewOnly').onclick=keepReviewQuestionsOnly;$('#deleteAll').onclick=async()=>{if(confirm('등록된 모든 문제와 학습 기록을 삭제할까요? 삭제 후에도 문제 보관함에서 복원할 수 있습니다.')){if(!await archiveRemoval([...state.questions],'전체 문제 삭제'))return;state.questions=[];state.results={};state.starred=[];state.filter='all';currentIndex=0;save();render()}};
function updateBroadcastDock(){const qs=filtered();$('#broadcastProgress').textContent=`Part ${activePart} · ${qs.length?currentIndex+1:0} / ${qs.length}`}
function setBroadcastMode(on){document.body.classList.toggle('broadcast',on);$('#toggleBroadcast').classList.toggle('active',on);$('#toggleBroadcast .deckButtonTitle').textContent=on?'방송 모드 종료':'세로 방송 모드';updateBroadcastDock();window.scrollTo({top:0,behavior:'smooth'})}
$('#toggleBroadcast').onclick=()=>setBroadcastMode(!document.body.classList.contains('broadcast'));
$('#broadcastExit').onclick=()=>setBroadcastMode(false);
$('#broadcastPrev').onclick=()=>document.querySelector('#questionArea .prevButton')?.click();
$('#broadcastNext').onclick=()=>document.querySelector('#questionArea .nextButton')?.click();
$('#openAdd').onclick=()=>$('#addDialog').showModal();$('#closeAdd').onclick=()=>$('#addDialog').close();
$('#addForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target), q={id:crypto.randomUUID(),part:5,question:f.get('question'),choices:['a','b','c','d'].map(x=>f.get(x)),answer:Number(f.get('answer')),translation:f.get('translation'),vocab:f.get('vocab'),explanation:f.get('explanation')};insertQuestions([q]);state.filter='all';currentIndex=0;save();await snapshotSafely(activePart,state,'수동 문제 추가');$('#addDialog').close();e.target.reset();render()};
const originalImportPrompt=$('#aiPrompt').textContent.trim();
const promptSection=(start,end)=>{const from=originalImportPrompt.indexOf(start),to=end?originalImportPrompt.indexOf(end,from):originalImportPrompt.length;return originalImportPrompt.slice(from,to).trim()};
const importMeta={
  5:{count:30,range:'101~130',distribution:'A 8개, B 8개, C 7개, D 7개',section:promptSection('[Part 5]','[Part 6]')},
  6:{count:16,range:'131~146',distribution:'A 4개, B 4개, C 4개, D 4개',section:promptSection('[Part 6]','[공통 출력 규칙]')},
  7:{count:54,range:'147~200',distribution:'A 14개, B 14개, C 13개, D 13개',section:promptSection('[Part 7 —')}
};
Object.entries(importMeta).forEach(([part,meta])=>{
  let section=meta.section.replaceAll('100문항 전체',`Part ${part} ${meta.count}문항 전체`);
  if(Number(part)===7)section=section.replace('Part 5·6도 오답을 실제 빈칸에 하나씩 넣어 문법·의미·연어를 모두 검토하세요.','');
  meta.prompt=`TOEIC Listening & Reading의 Part ${part} 형식에 맞는 실전 연습 문제를 정확히 ${meta.count}문항(${meta.range}) 생성해 주세요. 다른 파트 문제는 포함하지 마세요.

[시험 적합성과 난이도]
- 전체 체감 난이도는 중상으로 설정하세요. 대략 중 20%, 중상 60%, 상 20%로 구성하되 극단적으로 쉽거나 지엽적인 문항은 제외하세요.
- 난도는 희귀 단어, 전문 지식, 불필요하게 긴 문장, 말장난으로 높이지 마세요. 일상적 직장 업무와 생활 상황에서 자연스럽게 쓰이는 영어만 사용하세요.
- ETS의 실제 문항이나 공식·비공식 기출, 출판 교재, 웹사이트 문제를 복사하거나 이름·숫자·표현만 바꾼 근접 변형을 만들지 마세요. 시험의 형식과 능력 요소만 참고하여 모든 소재와 문장을 새로 설계하세요.
- 모든 문항에는 가장 적절한 정답이 하나만 있어야 합니다. 오답도 문법 형태와 의미 범주가 그럴듯해야 하지만, 문맥·연어·지시 대상·시간·수량·조건 중 하나의 분명한 이유로 배제되어야 합니다.
- 정답 선택지만 유난히 길거나 구체적이지 않게 하고, 보기 네 개의 문법적 형태·길이·문체를 가능한 한 평행하게 맞추세요.
- 같은 회사명, 인물명, 사건, 문장 골격, 정답 단어, 핵심 표현을 여러 문항에서 반복하지 마세요.
- 시험 응시자가 외부 지식 없이 제시된 문장과 문서만으로 풀 수 있어야 하며, 실제 TOEIC처럼 직장 및 일상생활의 의사소통 능력을 측정해야 합니다.
- 사무·인사·구매·배송·제조·품질관리·금융·청구·회의·행사·여행·숙박·시설관리·고객서비스 등 TOEIC에서 다루는 일반적인 상황을 고르게 사용하되, 한 업종에 치우치지 마세요.

${section}

[출력 및 최종 검수]
- Part ${part} 객체 ${meta.count}개만 들어 있는 하나의 JSON 배열로 출력하세요.
- 코드블록, 제목, 설명, 주석, 인사말 등 JSON 배열 밖의 텍스트는 출력하지 마세요.
- 모든 객체의 part는 숫자 ${part}, choices는 문자열 4개, answer는 0~3 정수여야 합니다.
- 정답 분포는 정확히 ${meta.distribution}이며 같은 정답이 3문항 이상 연속되지 않게 하세요.
- 먼저 answer와 해설을 가리고 각 문항을 독립적으로 다시 푼 뒤, 두 개 이상의 보기가 성립하거나 정답 근거가 약한 문항은 수정하세요.
- 모든 오답을 문장 또는 지문에 실제로 대입하여 배제 이유를 확인하고, answer, translation, vocab, explanation이 최종 선택지 순서와 일치하는지 다시 검사하세요.`;
});
let importPart=activePart;
let importPlan='full';
const part5Plans={
  full:{count:30,range:'101~130',distribution:'A 8개, B 8개, C 7개, D 7개'},
  first:{count:15,range:'101~115',distribution:'A 4개, B 4개, C 4개, D 3개'},
  second:{count:15,range:'116~130',distribution:'A 4개, B 4개, C 3개, D 4개'}
};
function promptForPlan(part,plan){
  const meta=importMeta[part];
  if(part!==5||plan==='full')return meta.prompt+`\n\n[출력 규칙 엄수]\n- 절대로 마크다운 코드블록 태그를 붙이지 마세요.\n- 첫 번째 글자는 반드시 [ 이어야 하고, 마지막 글자는 반드시 ] 이어야 합니다.`;
  const selected=part5Plans[plan];
  return meta.prompt
    .replace(`정확히 ${meta.count}문항(${meta.range})`, `정확히 ${selected.count}문항(${selected.range})`)
    .replace(`- 정확히 30문항, 순서는 101~130입니다.`, `- 이번에는 정확히 ${selected.count}문항만 생성하며, 순서는 ${selected.range}입니다.`)
    .replace(`Part 5 객체 ${meta.count}개만`, `Part 5 객체 ${selected.count}개만`)
    .replaceAll(meta.distribution,selected.distribution)
    +`\n\n[분할 생성 범위]\n- 이번 응답은 ${selected.range} 범위만 생성하세요. 다른 번호 범위의 문제는 포함하지 마세요.\n- 이 배열은 다른 절반과 웹앱에서 자동으로 이어 붙입니다.\n\n[출력 규칙 엄수]\n- 절대로 마크다운 코드블록 태그를 붙이지 마세요.\n- 첫 번째 글자는 반드시 [ 이어야 하고, 마지막 글자는 반드시 ] 이어야 합니다.`;
}
function selectImportPlan(plan){
  importPlan=importPart===5&&part5Plans[plan]?plan:'full';
  document.querySelectorAll('[data-prompt-mode]').forEach(button=>button.classList.toggle('active',button.dataset.promptMode===importPlan));
  const selected=importPart===5?part5Plans[importPlan]:importMeta[importPart];
  $('#importIntro').innerHTML=importPart===5&&importPlan!=='full'?`Part 5 <b>${selected.range} · ${selected.count}문항</b> 배열을 붙여넣으세요. 먼저 등록한 문제는 그대로 유지됩니다.`:`Part ${importPart} <b>${selected.count}문항</b>만 들어 있는 JSON 파일을 선택하거나 내용을 붙여넣으세요.`;
  $('#aiPrompt').textContent=promptForPlan(importPart,importPlan);
  $('#importHint').textContent=importPart===5&&importPlan!=='full'?`${selected.range} ${selected.count}문항을 검사한 뒤 기존 문제 뒤에 이어서 저장합니다.`:`Part ${importPart} ${selected.count}문항의 형식과 정답 분포를 검사한 뒤 Part ${importPart}에만 추가합니다.`;
}
function selectImportPart(part){
  importPart=part;
  const meta=importMeta[part];
  document.querySelectorAll('[data-import-part]').forEach(button=>{const selected=Number(button.dataset.importPart)===part;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected))});
  $('#importTitle').textContent=`Part ${part} 문제 업로드`;
  $('#importIntro').innerHTML=`Part ${part} <b>${meta.count}문항</b>만 들어 있는 JSON 파일을 선택하거나 내용을 붙여넣으세요.`;
  $('#promptModes').classList.toggle('hidden',part!==5);
  $('#geminiNotice').classList.remove('hidden');
  selectImportPlan('full');
  $('#importSubmit').textContent=`Part ${part} 등록하기`;
  $('#importError').classList.add('hidden');
  $('#clearImport').classList.add('hidden');
}
document.querySelectorAll('[data-import-part]').forEach(button=>button.onclick=()=>selectImportPart(Number(button.dataset.importPart)));
document.querySelectorAll('[data-prompt-mode]').forEach(button=>button.onclick=()=>selectImportPlan(button.dataset.promptMode));
$('#openImport').onclick=()=>{selectImportPart(activePart);$('#importDialog').showModal()};$('#closeImport').onclick=()=>$('#importDialog').close();
function hideImportError(){$('#importError').classList.add('hidden');$('#clearImport').classList.add('hidden')}
function showImportError(message){$('#importError').textContent=message;$('#importError').classList.remove('hidden');$('#clearImport').classList.remove('hidden')}
$('#clearImport').onclick=()=>{$('#importText').value='';$('#importFile').value='';hideImportError();$('#importText').focus()};
$('#importText').oninput=hideImportError;
$('#importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{$('#importText').value=await file.text();hideImportError()}catch{showImportError('파일을 읽지 못했어요. JSON 내용을 직접 붙여넣어 주세요.')}};
$('#copyPrompt').onclick=async()=>{try{await navigator.clipboard.writeText($('#aiPrompt').textContent);$('#copyPrompt').textContent='복사했어요'}catch{$('#copyPrompt').textContent='위 요청문을 직접 복사해 주세요'}setTimeout(()=>$('#copyPrompt').textContent='요청문 복사',1800)};
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function countOccurrences(text, pattern){return (text.match(pattern)||[]).length}
function normalizePart5Blank(question){
  return String(question)
    .replace(/(?:[-‐‑‒–—―−﹘﹣－_]\s*){3,}/g,'-------')
    .replace(/\[(?:blank|빈칸)\]/gi,'-------');
}
function countPart5Blanks(question){
  const normalized=normalizePart5Blank(question);
  return {question:normalized,count:(normalized.match(/-{7}/g)||[]).length};
}
function normalizeNumericMarkers(text){
  return String(text)
    .replace(/［\s*(\d+)\s*］/g,'[$1]')
    .replace(/\[\s*(\d+)\s*\]/g,'[$1]');
}
function normalizePart6Passage(passage){
  let text=normalizeNumericMarkers(passage);
  text=text.replace(/(\[(?:13[1-9]|14[0-6])\])\s*(?:[-‐‑‒–—―−﹘﹣－_]\s*){3,}/g,'$1 -------');
  text=text.replace(/(\[(?:13[1-9]|14[0-6])\])\s*\[(?:blank|빈칸)\]/gi,'$1 -------');
  return text;
}
function normalizePart7Structure(q){
  if(Array.isArray(q.passages)){
    q.passages=q.passages.map(doc=>({...doc,text:normalizeNumericMarkers(doc.text)}));
  }
  if(q.questionType==='sentence-insertion'&&Array.isArray(q.choices)){
    q.choices=q.choices.map(choice=>{
      const m=String(choice).match(/^\s*[［\[]\s*([1-4])\s*[］\]]\s*$/);
      return m?`[${m[1]}]`:String(choice);
    });
  }
  return q;
}
function validateAnswerRun(items, label){
  let run=1;
  for(let i=1;i<items.length;i++){
    run=items[i].answer===items[i-1].answer?run+1:1;
    if(run>=3)return `${label}에서 같은 정답이 3문항 이상 연속됩니다. ${i+1}번째 문항 부근을 확인해 주세요.`;
  }
  return '';
}
function validateDistribution(items, expected, label){
  const actual=[0,0,0,0];
  items.forEach(q=>actual[q.answer]++);
  return actual.some((n,i)=>n!==expected[i])?`${label} 정답 분포가 권장값과 다릅니다. 현재 A/B/C/D = ${actual.join('/')}, 권장 = ${expected.join('/')}입니다.`:'';
}
function validatePart5Set(p5){
  if(p5.length!==30)throw Error(`Part 5가 ${p5.length}문항입니다. 정확히 30문항이 필요합니다.`);
  return [validateDistribution(p5,[8,8,7,7],'Part 5'),validateAnswerRun(p5,'Part 5')].filter(Boolean);
}
function validatePart6Set(p6){
  if(p6.length!==16)throw Error(`Part 6가 ${p6.length}문항입니다. 정확히 16문항이 필요합니다.`);
  const warnings=[validateDistribution(p6,[4,4,4,4],'Part 6'),validateAnswerRun(p6,'Part 6')].filter(Boolean);

  const expectedBlanks=Array.from({length:16},(_,i)=>131+i);
  const actualBlanks=p6.map(q=>q.blank).sort((a,b)=>a-b);
  if(actualBlanks.length!==expectedBlanks.length||actualBlanks.some((n,i)=>n!==expectedBlanks[i])){
    throw Error(`Part 6 blank 번호는 131~146을 각각 정확히 한 번 사용해야 합니다. 현재: ${actualBlanks.join(', ')}`);
  }

  const groups=new Map();
  p6.forEach(q=>{
    const key=`${q.setTitle}\u0000${q.passageType}\u0000${q.passage}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(q);
  });
  if(groups.size!==4)throw Error(`Part 6 지문 세트가 ${groups.size}개로 인식됩니다. 같은 지문의 4문항은 setTitle, passageType, passage를 글자 하나까지 동일하게 반복해야 합니다.`);

  const orderedGroups=[...groups.values()].sort((a,b)=>Math.min(...a.map(q=>q.blank))-Math.min(...b.map(q=>q.blank)));
  orderedGroups.forEach((items,setIndex)=>{
    if(items.length!==4)throw Error(`Part 6 ${setIndex+1}번째 지문이 ${items.length}문항입니다. 지문당 정확히 4문항이어야 합니다.`);
    const expected=Array.from({length:4},(_,i)=>131+setIndex*4+i);
    const blanks=items.map(q=>q.blank).sort((a,b)=>a-b);
    if(blanks.some((n,i)=>n!==expected[i]))throw Error(`Part 6 ${setIndex+1}번째 지문의 blank 번호가 잘못되었습니다. 필요: ${expected.join(', ')}, 현재: ${blanks.join(', ')}`);
    const passage=items[0].passage;
    const markerMatches=passage.match(/\[\d+\]/g)||[];
    if(markerMatches.length!==4)throw Error(`Part 6 ${setIndex+1}번째 지문에는 [번호] 표식이 정확히 4개 있어야 합니다. 현재 ${markerMatches.length}개입니다.`);
    const dashMatches=passage.match(/-{7}/g)||[];
    if(dashMatches.length!==4)throw Error(`Part 6 ${setIndex+1}번째 지문에는 ------- 빈칸이 정확히 4개 있어야 합니다. 현재 ${dashMatches.length}개입니다.`);
    expected.forEach(blank=>{
      const marker=new RegExp(`\\[${blank}\\]`,'g');
      const paired=new RegExp(`\\[${blank}\\]\\s*-{7}`,'g');
      if(countOccurrences(passage,marker)!==1)throw Error(`Part 6 [${blank}] 표식은 해당 지문에 정확히 한 번 있어야 합니다.`);
      if(countOccurrences(passage,paired)!==1)throw Error(`Part 6 [${blank}] 뒤에 ------- 빈칸이 없습니다. 반드시 “[${blank}] -------” 형식으로 작성해 주세요.`);
    });
  });
  return warnings;
}
function validatePart7Question(q,label){
  const text=v=>typeof v==='string'&&v.trim().length>0;
  if(!Number.isInteger(q.questionNumber)||q.questionNumber<147||q.questionNumber>200||!text(q.setId)||!text(q.setTitle)||!text(q.questionType))throw Error(`${label}: Part 7 번호(147~200), setId, setTitle, questionType을 확인해 주세요.`);
  if(!['purpose','detail','inference','vocabulary','sentence-insertion','cross-reference'].includes(q.questionType))throw Error(`${label}: 지원하지 않는 questionType입니다.`);
  if(!Array.isArray(q.passages)||q.passages.length<1||q.passages.length>3||q.passages.some(d=>!d||!text(d.title)||!text(d.text)||!text(d.translation)))throw Error(`${label}: Part 7은 제목·본문·한국어 해석이 있는 문서 1~3개가 필요합니다.`);
  if(!Array.isArray(q.optionReasons)||q.optionReasons.length!==4||q.optionReasons.some(r=>!text(r)))throw Error(`${label}: A~D 네 보기 각각의 정답/오답 근거가 필요합니다.`);
  if(!Array.isArray(q.evidence)||!q.evidence.length)throw Error(`${label}: 정답을 뒷받침하는 지문 근거가 필요합니다.`);
  q.evidence.forEach(e=>{if(!e||!Number.isInteger(e.document)||e.document<1||e.document>q.passages.length||!text(e.quote)||!text(e.reason)||!q.passages[e.document-1].text.includes(e.quote))throw Error(`${label}: 근거 인용문이 지정한 문서에 실제로 존재해야 합니다.`)});
  if(q.questionType==='cross-reference'&&new Set(q.evidence.map(e=>e.document)).size<2)throw Error(`${label}: 연계 문제는 서로 다른 문서 두 개 이상의 근거가 필요합니다.`);
  if(q.questionType==='sentence-insertion'){
    const body=q.passages.map(d=>d.text).join('\n');
    if(['[1]','[2]','[3]','[4]'].some(m=>body.split(m).length!==2)||q.choices.some((v,i)=>v!==`[${i+1}]`))throw Error(`${label}: 문장 삽입 문제는 지문에 [1]~[4] 위치가 각각 한 번 있고 보기가 같은 순서여야 합니다.`);
  }
}
function validatePart7Set(p7){
  if(p7.length!==54)throw Error(`Part 7이 ${p7.length}문항입니다. 정확히 54문항이 필요합니다.`);
  p7.sort((a,b)=>a.questionNumber-b.questionNumber);
  if(p7.some((q,i)=>q.questionNumber!==147+i))throw Error('Part 7 번호는 147~200을 각각 한 번 사용해야 합니다.');
  const warnings=[validateDistribution(p7,[14,14,13,13],'Part 7'),validateAnswerRun(p7,'Part 7')].filter(Boolean);
  const groups=new Map();
  p7.forEach(q=>{if(!groups.has(q.setId))groups.set(q.setId,[]);groups.get(q.setId).push(q)});
  const counts=[0,0,0],totals=[0,0,0];
  groups.forEach(items=>{
    const first=items[0],n=first.passages.length;counts[n-1]++;totals[n-1]+=items.length;
    const key=JSON.stringify(first.passages);
    if(items.some((q,i)=>q.setTitle!==first.setTitle||JSON.stringify(q.passages)!==key||(i&&q.questionNumber!==items[i-1].questionNumber+1)))throw Error(`Part 7 ${first.setId}: 같은 세트의 지문·제목이 동일하고 번호가 연속되어야 합니다.`);
    if(n===1?(items.length<2||items.length>4):items.length!==5)throw Error(`Part 7 ${first.setId}: 단일 지문은 2~4문항, 복수 지문은 5문항입니다.`);
    if(items.some(q=>n===1?q.questionNumber>175:n===2?(q.questionNumber<176||q.questionNumber>185):q.questionNumber<186))throw Error('Part 7 단일 147~175, 이중 176~185, 삼중 186~200 순서를 확인해 주세요.');
    if(n>1&&!items.some(q=>q.questionType==='cross-reference'))throw Error(`Part 7 ${first.setId}: 복수 지문마다 cross-reference 연계 문제가 필요합니다.`);
  });
  if(counts.join('/')!=='10/2/3'||totals.join('/')!=='29/10/15')throw Error('Part 7은 단일 10세트 29문항, 이중 2세트 10문항, 삼중 3세트 15문항이어야 합니다.');
  return warnings;
}
function validateImportedPart(valid,targetPart){
  const wrong=valid.find(q=>q.part!==targetPart);
  if(wrong)throw Error(`Part ${targetPart} 업로드에는 Part ${targetPart} 문제만 넣어 주세요. Part ${wrong.part} 문제가 포함되어 있습니다.`);
  if(targetPart===5)return validatePart5Set(valid);
  if(targetPart===6)return validatePart6Set(valid);
  if(targetPart===7)return validatePart7Set(valid);
  return [];
}
function completeJsonObjects(source){
  const items=[];
  let arrayStarted=false,inString=false,escaped=false,depth=0,start=-1;
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(inString){
      if(escaped)escaped=false;
      else if(ch==='\\')escaped=true;
      else if(ch==='"')inString=false;
      continue;
    }
    if(ch==='"'){inString=true;continue}
    if(!arrayStarted){if(ch==='[')arrayStarted=true;continue}
    if(ch==='{'){if(depth===0)start=i;depth++}
    else if(ch==='}'&&depth>0){
      depth--;
      if(depth===0&&start>=0){
        try{items.push(JSON.parse(source.slice(start,i+1)))}catch{}
        start=-1;
      }
    }
  }
  return items;
}
function normalizeJsonTypography(source){
  let out='',inString=false,quoteKind='',escaped=false;
  const nextNonSpace=index=>{for(let j=index+1;j<source.length;j++){if(!/\s/.test(source[j]))return source[j]}return ''};
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(!inString){
      if(ch==='"'){inString=true;quoteKind='ascii';out+=ch;continue}
      if(ch==='“'||ch==='”'){inString=true;quoteKind='smart';out+='"';continue}
      if(ch==='：'){out+=':';continue}
      if(ch==='，'){out+=',';continue}
      if(ch==='\u200B'||ch==='\u200C'||ch==='\u200D'||ch==='\u2060')continue;
      out+=ch;continue;
    }
    if(escaped){out+=ch;escaped=false;continue}
    if(ch==='\\'){out+=ch;escaped=true;continue}
    const next=nextNonSpace(i),structural=!next||':,}]'.includes(next);
    if(quoteKind==='ascii'){
      if(ch==='"'){inString=false;quoteKind='';out+=ch;continue}
      if(ch==='”'&&structural){inString=false;quoteKind='';out+='"';continue}
      out+=ch;continue;
    }
    if(ch==='”'&&structural){inString=false;quoteKind='';out+='"';continue}
    if(ch==='"'){out+='\\\"';continue}
    out+=ch;
  }
  return out;
}
function parseImportedJson(raw){
  const cleaned=raw.replace(/^\uFEFF/,'').trim();
  const fenced=[...cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(match=>match[1]).find(block=>block.includes('['));
  const source=(fenced||cleaned).trim(),start=source.indexOf('['),end=source.lastIndexOf(']');
  if(start<0)throw Error('JSON 배열의 시작 기호 [ 를 찾지 못했습니다.');
  const candidate=end>start?source.slice(start,end+1):source.slice(start);
  const normalized=normalizeJsonTypography(candidate);
  if(end>start){
    try{return {items:JSON.parse(candidate),recovered:false,normalized:false}}
    catch(firstError){
      try{return {items:JSON.parse(normalized),recovered:false,normalized:true}}
      catch(parseError){
        const recovered=completeJsonObjects(normalized);
        if(recovered.length)return {items:recovered,recovered:true,normalized:true};
        throw Error(`JSON 문법을 읽지 못했습니다. 스마트 따옴표(“ ”)나 쉼표를 자동 보정했지만 아직 오류가 있습니다. ${parseError.message}`);
      }
    }
  }
  const recovered=completeJsonObjects(normalized);
  if(recovered.length)return {items:recovered,recovered:true,normalized:normalized!==candidate};
  throw Error('응답이 중간에서 끊겨 완성된 문제 객체를 찾지 못했습니다. 더 짧은 분할 요청을 사용해 주세요.');
}
$('#importForm').onsubmit=async e=>{
  e.preventDefault();
  const raw=$('#importText').value.trim();
  try{
    const parsed=parseImportedJson(raw),imported=parsed.items;
    if(!Array.isArray(imported)||!imported.length)throw Error('문제 배열이 아닙니다.');
    const valid=imported.map((q,i)=>{
      if(!q||typeof q!=='object')throw Error(`${i+1}번은 문제 객체여야 합니다.`);
      const answer=typeof q.answer==='string'&&/^[A-D]$/i.test(q.answer.trim())?'ABCD'.indexOf(q.answer.trim().toUpperCase()):typeof q.answer==='number'?q.answer:NaN;
      if(typeof q.question!=='string'||!q.question.trim()||!Array.isArray(q.choices)||q.choices.length!==4||q.choices.some(choice=>typeof choice!=='string'||!choice.trim())||!Number.isInteger(answer)||answer<0||answer>3||typeof q.explanation!=='string'||!q.explanation.trim()||typeof q.translation!=='string'||!q.translation.trim()||typeof q.vocab!=='string'||!q.vocab.trim())throw Error(`${i+1}번 문제의 question/choices/answer/translation/vocab/explanation 형식을 확인해 주세요.`);
      const part=Number(q.part);
      if(![5,6,7].includes(part))throw Error(`${i+1}번 part는 5, 6, 7이어야 합니다.`);
      if(new Set(q.choices.map(c=>c.trim().toLowerCase())).size!==4)throw Error(`${i+1}번 보기에 중복이 있습니다.`);
      if(part===7){
        q=normalizePart7Structure(q);
        validatePart7Question(q,`${i+1}번`);
      }
      if(part===5){
        const blankCheck=countPart5Blanks(q.question);
        q.question=blankCheck.question;
        if(blankCheck.count!==1)throw Error(`${i+1}번 Part 5 문장의 빈칸을 인식하지 못했습니다. 하이픈/긴 대시/밑줄/[blank] 표시는 자동 보정되며, 빈칸 표시는 문장에 정확히 1개만 있어야 합니다.`);
      }
      if(part===6){
        if(typeof q.passage!=='string'||!q.passage.trim()||typeof q.setTitle!=='string'||!q.setTitle.trim()||typeof q.passageType!=='string'||!q.passageType.trim()||!Number.isInteger(q.blank)||q.blank<131||q.blank>146)throw Error(`${i+1}번 Part 6의 setTitle/passageType/passage/blank 형식을 확인해 주세요.`);
        q.passage=normalizePart6Passage(q.passage);
        if(!q.passage.includes(`[${q.blank}]`))throw Error(`${i+1}번 Part 6: blank=${q.blank}인데 passage에 [${q.blank}] 표식이 없습니다. 전각 괄호나 괄호 안 공백은 자동 보정됩니다.`);
        const paired=new RegExp(`\\[${q.blank}\\]\\s*-{7}`);
        if(!paired.test(q.passage))throw Error(`${i+1}번 Part 6: [${q.blank}] 뒤의 빈칸을 인식하지 못했습니다. 하이픈/긴 대시/밑줄/[blank] 표시는 자동 보정됩니다.`);
      }
      return {id:crypto.randomUUID(),part,question:q.question,choices:q.choices.map(String),answer,translation:q.translation,vocab:q.vocab,explanation:q.explanation,...(part===6?{passage:q.passage,setTitle:q.setTitle,passageType:q.passageType,blank:q.blank}:{}),...(part===7?{questionNumber:q.questionNumber,setId:q.setId,setTitle:q.setTitle,questionType:q.questionType,passages:q.passages,evidence:q.evidence,optionReasons:q.optionReasons}:{})};
    });
    let warnings=[];
    const planned=importPart===5?part5Plans[importPlan]:importMeta[importPart];
    if(valid.length===planned.count){
      if(importPart===5&&importPlan!=='full')warnings=[validateDistribution(valid,planned.distribution.match(/\d+/g).map(Number),`Part 5 ${planned.range}`),validateAnswerRun(valid,`Part 5 ${planned.range}`)].filter(Boolean);
      else warnings=validateImportedPart(valid,importPart);
    }else{
      if(valid.length>importMeta[importPart].count)throw Error(`Part ${importPart}는 한 번에 최대 ${importMeta[importPart].count}문항까지 등록할 수 있습니다.`);
      warnings.push(`요청 분량은 ${planned.count}문항이지만 완성된 ${valid.length}문항만 확인되었습니다. 이 ${valid.length}문항만 저장합니다.`);
    }
    if(parsed.recovered)warnings.unshift('응답 끝부분이 잘려 있어 JSON으로 완성된 문제 객체까지만 복구했습니다.');
    if(warnings.length&&!confirm(`형식 검사는 통과했습니다. 다만 다음 품질 경고가 있습니다.\n\n• ${warnings.join('\n• ')}\n\n정답과 해설을 확인한 데이터라면 그대로 등록할 수 있습니다. 등록할까요?`))return;
    const targetState=partStates[importPart];
    targetState.questions.push(...valid);targetState.filter='all';
    localStorage.setItem(`part${importPart}-desk-v1`,JSON.stringify(targetState));
    await snapshotSafely(importPart,targetState,`Part ${importPart} 문제 업로드`);
    activePart=importPart;state=targetState;localStorage.setItem('toeic-active-part',activePart);currentIndex=0;
    $('#importDialog').close();$('#importText').value='';$('#importFile').value='';render();
  }catch(err){
    showImportError(`등록하지 못했어요: ${err.message}`);
  }
};

document.querySelectorAll('[data-part]').forEach(button=>button.onclick=()=>{save();activePart=Number(button.dataset.part);state=partStates[activePart];localStorage.setItem('toeic-active-part',activePart);currentIndex=0;$('#retryMode').checked=false;render()});
function vaultDate(timestamp){return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp))}
function vaultBytes(bytes){if(!bytes)return '사용량 계산 전';if(bytes<1024*1024)return `${Math.max(1,Math.round(bytes/1024))} KB 사용`;return `${(bytes/1024/1024).toFixed(1)} MB 사용`}
function downloadJson(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function cleanSharedQuestion(question,part){const shared=copyState({...question,part});delete shared.id;Object.keys(shared).filter(key=>key.startsWith('_')).forEach(key=>delete shared[key]);return shared}
function questionSignature(question,part){const shared=cleanSharedQuestion(question,part);if(part===5)shared.question=countPart5Blanks(shared.question).question;if(part===6&&typeof shared.passage==='string')shared.passage=normalizePart6Passage(shared.passage);return JSON.stringify(shared)}
function normalizeSharedQuestion(raw,part,index){
  if(!raw||typeof raw!=='object')throw new Error(`Part ${part}의 ${index+1}번 항목이 문제 객체가 아닙니다.`);
  let question=copyState(raw),answer=typeof question.answer==='string'&&/^[A-D]$/i.test(question.answer.trim())?'ABCD'.indexOf(question.answer.trim().toUpperCase()):question.answer;
  if(Number(question.part)!==part||typeof question.question!=='string'||!question.question.trim()||!Array.isArray(question.choices)||question.choices.length!==4||question.choices.some(choice=>typeof choice!=='string'||!choice.trim())||!Number.isInteger(answer)||answer<0||answer>3)throw new Error(`Part ${part}의 ${index+1}번 문제 형식을 확인해 주세요.`);
  if(typeof question.translation!=='string'||typeof question.vocab!=='string'||typeof question.explanation!=='string')throw new Error(`Part ${part}의 ${index+1}번 문제에 번역 또는 해설이 없습니다.`);
  question.answer=answer;question.choices=question.choices.map(String);
  if(part===5){const blankCheck=countPart5Blanks(question.question);question.question=blankCheck.question;if(blankCheck.count!==1)throw new Error(`Part 5의 ${index+1}번 문제에 빈칸이 정확히 하나 있어야 합니다.`)}
  if(part===6){if(typeof question.passage!=='string'||!question.passage.trim()||typeof question.setTitle!=='string'||typeof question.passageType!=='string'||!Number.isInteger(question.blank))throw new Error(`Part 6의 ${index+1}번 지문 정보를 확인해 주세요.`);question.passage=normalizePart6Passage(question.passage);if(!question.passage.includes(`[${question.blank}]`))throw new Error(`Part 6의 ${index+1}번 문제번호 표식이 지문에 없습니다.`)}
  if(part===7){question=normalizePart7Structure(question);validatePart7Question(question,`Part 7의 ${index+1}번`)}
  question.id=crypto.randomUUID();question.part=part;return question;
}
function makeVaultItem(record,type){
  const item=document.createElement('article');item.className='vaultItem';
  const copy=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('span'),button=document.createElement('button');
  title.textContent=`Part ${record.part} · ${record.reason}`;
  meta.textContent=`${record.state?.questions?.length||0}문제 · ${vaultDate(type==='snapshot'?record.createdAt:record.deletedAt)}`;
  button.type='button';button.textContent='복원';button.dataset.vaultId=record.id;button.dataset.vaultType=type;
  copy.append(title,meta);item.append(copy,button);return item;
}
async function refreshVault(){
  const [snapshots,trash,storage]=await Promise.all([ToeicVault.listSnapshots(),ToeicVault.listTrash(),ToeicVault.storageInfo()]);
  $('#vaultSummary').replaceChildren(...[5,6,7].map(part=>{const box=document.createElement('div');box.className='vaultCount';box.innerHTML=`<span>PART ${part}</span><strong>${partStates[part].questions.length}문제</strong>`;return box}));
  const shareChecks=[...document.querySelectorAll('[data-share-part]')];
  shareChecks.forEach(input=>{const part=Number(input.dataset.sharePart),count=partStates[part].questions.length;input.disabled=!count;$(`#shareCount${part}`).textContent=count;if(!count)input.checked=false});
  if(!shareChecks.some(input=>input.checked&&!input.disabled)){const preferred=shareChecks.find(input=>Number(input.dataset.sharePart)===activePart&&!input.disabled)||shareChecks.find(input=>!input.disabled);if(preferred)preferred.checked=true}
  $('#vaultStorageStatus').textContent=storage.persisted?`이 브라우저가 보관함을 자동 정리하지 않도록 보호 중입니다. · ${vaultBytes(storage.usage)}`:`브라우저 종료 후에도 유지됩니다. ‘로컬 보관 강화’를 누르면 자동 정리 위험을 더 줄일 수 있습니다. · ${vaultBytes(storage.usage)}`;
  $('#strengthenStorage').classList.toggle('hidden',storage.persisted);
  const snapshotList=$('#snapshotList'),trashList=$('#trashList');snapshotList.replaceChildren();trashList.replaceChildren();
  if(snapshots.length)snapshots.forEach(record=>snapshotList.append(makeVaultItem(record,'snapshot')));else snapshotList.innerHTML='<p class="vaultEmpty">아직 저장본이 없습니다.</p>';
  if(trash.length)trash.forEach(record=>trashList.append(makeVaultItem(record,'trash')));else trashList.innerHTML='<p class="vaultEmpty">삭제한 문제가 없습니다.</p>';
}
async function openVault(){
  try{await ToeicVault.init(partStates);await refreshVault();$('#vaultDialog').showModal()}catch(error){alert(`문제 보관함을 열지 못했습니다.\n${error.message}`)}
}
async function restoreSnapshot(id){
  const record=await ToeicVault.getSnapshot(id);if(!record)return;
  if(!confirm(`Part ${record.part}의 현재 목록을 ${record.state.questions.length}문제가 들어 있는 저장본으로 바꿀까요?\n현재 목록도 복원 전에 새 저장본으로 남습니다.`))return;
  await ToeicVault.snapshot(record.part,partStates[record.part],'저장본 복원 전 안전 저장');
  replacePartState(record.part,record.state);activePart=record.part;state=partStates[activePart];localStorage.setItem('toeic-active-part',activePart);currentIndex=0;render();await refreshVault();
}
async function restoreTrash(id){
  const record=await ToeicVault.getTrash(id);if(!record)return;
  const target=partStates[record.part],existing=new Set(target.questions.map(q=>q.id)),questions=record.state.questions.filter(q=>!existing.has(q.id));
  if(!questions.length){alert('이 문제들은 이미 현재 목록에 있습니다.');return}
  await ToeicVault.snapshot(record.part,target,'휴지통 복원 전 안전 저장');
  target.questions.push(...copyState(questions));Object.assign(target.results,copyState(record.state.results||{}));target.starred=[...new Set([...target.starred,...(record.state.starred||[])])];target.filter='all';
  localStorage.setItem(`part${record.part}-desk-v1`,JSON.stringify(target));await ToeicVault.removeTrash(id);await ToeicVault.snapshot(record.part,target,'삭제한 문제 복원');
  activePart=record.part;state=target;localStorage.setItem('toeic-active-part',activePart);currentIndex=0;render();await refreshVault();
}
$('#openVault').onclick=openVault;$('#closeVault').onclick=()=>$('#vaultDialog').close();
$('#vaultDialog').onclick=async event=>{const button=event.target.closest('[data-vault-id]');if(!button)return;try{button.disabled=true;if(button.dataset.vaultType==='snapshot')await restoreSnapshot(button.dataset.vaultId);else await restoreTrash(button.dataset.vaultId)}catch(error){alert(`복원하지 못했습니다.\n${error.message}`)}finally{button.disabled=false}};
$('#strengthenStorage').onclick=async()=>{const persisted=await ToeicVault.requestPersistence();await refreshVault();alert(persisted?'로컬 보관이 강화되었습니다.':'브라우저가 보관 강화를 허용하지 않았습니다. 전체 백업 파일을 함께 보관해 주세요.')};
$('#exportQuestionShare').onclick=()=>{
  const parts=[...document.querySelectorAll('[data-share-part]:checked')].map(input=>Number(input.dataset.sharePart)).filter(part=>partStates[part].questions.length);
  if(!parts.length){alert('공유할 Part를 하나 이상 선택해 주세요.');return}
  const sharedParts={};parts.forEach(part=>{sharedParts[part]=partStates[part].questions.map(question=>cleanSharedQuestion(question,part))});
  const pack={format:'talktag-toeic-question-share',version:1,title:`TalkTag TOEIC ${parts.map(part=>`Part ${part}`).join(' · ')} 문제공유`,exportedAt:new Date().toISOString(),parts:sharedParts};
  downloadJson(pack,`talktag-toeic-question-share-${parts.map(part=>`p${part}`).join('-')}-${new Date().toISOString().slice(0,10)}.json`);
};
$('#questionShareFile').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    const pack=JSON.parse(await file.text());
    if(!pack||pack.format!=='talktag-toeic-question-share'||pack.version!==1||!pack.parts||typeof pack.parts!=='object')throw new Error('TalkTag TOEIC 문제공유 파일이 아닙니다.');
    const prepared={},summary=[],skipped=[];
    for(const part of [5,6,7]){
      const raw=pack.parts[part]||[];if(!Array.isArray(raw))throw new Error(`Part ${part} 데이터가 배열이 아닙니다.`);
      const existing=new Set(partStates[part].questions.map(question=>questionSignature(question,part))),accepted=[];
      raw.forEach((question,index)=>{const normalized=normalizeSharedQuestion(question,part,index),signature=questionSignature(normalized,part);if(existing.has(signature)){skipped.push(`Part ${part} ${index+1}번`);return}existing.add(signature);accepted.push(normalized)});
      if(accepted.length){prepared[part]=accepted;summary.push(`Part ${part} ${accepted.length}문제`)}
    }
    if(!summary.length){alert('새로 추가할 문제가 없습니다. 이미 같은 문제가 등록되어 있습니다.');return}
    if(!confirm(`${summary.join(' · ')}를 현재 문제 목록에 추가할까요?\n기존 문제와 학습 기록은 그대로 유지됩니다.${skipped.length?`\n중복 ${skipped.length}문제는 제외됩니다.`:''}`))return;
    for(const part of Object.keys(prepared).map(Number)){partStates[part].questions.push(...prepared[part]);partStates[part].filter='all';localStorage.setItem(`part${part}-desk-v1`,JSON.stringify(partStates[part]));await snapshotSafely(part,partStates[part],'문제공유 불러오기')}
    activePart=Number(Object.keys(prepared)[0]);state=partStates[activePart];localStorage.setItem('toeic-active-part',activePart);currentIndex=0;render();await refreshVault();alert(`${summary.join(' · ')}를 추가했습니다.${skipped.length?` 중복 ${skipped.length}문제는 제외했습니다.`:''}`);
  }catch(error){alert(`문제공유 파일을 불러오지 못했습니다.\n${error.message}`)}finally{event.target.value=''}
};
$('#exportBackup').onclick=async()=>{
  try{const backup=await ToeicVault.exportBackup(partStates);downloadJson(backup,`talktag-toeic-backup-${new Date().toISOString().slice(0,10)}.json`)}catch(error){alert(`백업 파일을 만들지 못했습니다.\n${error.message}`)}
};
$('#backupFile').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    const backup=ToeicVault.validateBackup(JSON.parse(await file.text()));
    const counts=[5,6,7].map(part=>`Part ${part} ${backup.states[part].questions.length}문제`).join(' · ');
    if(!confirm(`백업 파일을 불러오면 현재 문제 목록을 교체합니다.\n${counts}\n현재 목록도 먼저 안전 저장합니다.`))return;
    for(const part of [5,6,7])await ToeicVault.snapshot(part,partStates[part],'백업 파일 복원 전 안전 저장');
    for(const part of [5,6,7])replacePartState(part,backup.states[part]);
    await ToeicVault.importArchiveRecords(backup);state=partStates[activePart];currentIndex=0;render();await refreshVault();alert('백업 파일을 불러왔습니다.');
  }catch(error){alert(`백업 파일을 불러오지 못했습니다.\n${error.message}`)}finally{event.target.value=''}
};
ToeicVault.init(partStates).catch(error=>console.warn('TOEIC 보관함 초기화 실패:',error));
let examSession=null;
let examClock=null;
function examNumber(q,index){return q._examNumber||q.questionNumber||q.blank||(101+index)}
function formatExamTime(milliseconds){const seconds=Math.max(0,Math.floor(milliseconds/1000)),minutes=Math.floor(seconds/60);return `${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function setExamView(view){
  document.body.classList.toggle('exam-active',view!=='practice');
  $('#examMain').classList.toggle('hidden',view!=='exam');
  $('#examResults').classList.toggle('hidden',view!=='results');
  if(view==='practice'){clearInterval(examClock);examClock=null;window.scrollTo({top:0,behavior:'smooth'});render()}
}
function appendMarkedPassage(container,text){
  String(text).split(/(\[\d+\])/g).forEach(piece=>{
    if(/^\[\d+\]$/.test(piece)){const mark=document.createElement('mark');mark.textContent=piece;container.append(mark)}
    else container.append(document.createTextNode(piece));
  });
}
function createExamPassage(q){
  const block=document.createElement('section');block.className=`examPassage part${q.part}${q.passages?` docs-${q.passages.length}`:''}`;
  if(q.part===7){
    q.passages.forEach((doc,index)=>{const article=document.createElement('article');article.className='examDocument';const title=document.createElement('h3');title.textContent=`Document ${index+1} · ${doc.title}`;const body=document.createElement('div');body.textContent=doc.text;article.append(title,body);block.append(article)});
  }else{
    const title=document.createElement('h3');title.textContent=`${q.passageType} · ${q.setTitle}`;block.append(title);appendMarkedPassage(block,q.passage);
  }
  return block;
}
function examAnswerKey(q){return `${q.part}:${q.id}`}
function appendExamQuestion(container,q,index){
  const item=document.createElement('section');item.className='examQuestion';item.id=`exam-q-${q.id}`;
  const header=document.createElement('div');header.className='examQuestionHeader';
  const number=document.createElement('span');number.className='examQuestionNumber';number.textContent=examNumber(q,index)+'.';
  const question=document.createElement('p');question.className='examQuestionText';question.textContent=q.question;header.append(number,question);
  const choices=document.createElement('div');choices.className='examChoices';
  q.choices.forEach((text,choiceIndex)=>{
    const row=document.createElement('div');row.className='examChoice';
    row.innerHTML=`<span class="examChoiceLetter">${'ABCD'[choiceIndex]}</span><span>${escapeHtml(text)}</span>`;
    choices.append(row)
  });
  item.append(header,choices);container.append(item);
}
function collectExamQuestions(parts){
  const questions=[];
  parts.forEach(part=>partStates[part].questions.forEach((q,index)=>questions.push({...q,part:q.part||part,_examNumber:q.questionNumber||q.blank||(101+index)})));
  return questions;
}
function buildPhysicalPages(parts){
  const pages=[];
  parts.forEach(part=>{
    const questions=collectExamQuestions([part]);
    if(!questions.length)return;
    if(part===5){
      const referencePageSizes=[8,12,10];let offset=0,pageIndex=0;
      while(offset<questions.length){const size=referencePageSizes[pageIndex]||10;pages.push({part,questions:questions.slice(offset,offset+size),isPartStart:pageIndex===0});offset+=size;pageIndex++}
      return;
    }
    const groups=new Map();
    questions.forEach(q=>{const key=part===7?(q.setId||q.setTitle):`${q.setTitle}\u0000${q.passage}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q)});
    let pageIndex=0;
    groups.forEach(group=>{pages.push({part,questions:group,isPartStart:pageIndex===0});pageIndex++});
  });
  return pages;
}
function partDirections(part){
  if(part===5)return '빈칸에 가장 알맞은 단어나 구를 고르세요. 답은 별도의 종이 답안지에 표시합니다.';
  if(part===6)return '각 지문의 문맥을 읽고 빈칸에 가장 알맞은 선택지를 고르세요.';
  return '각 지문을 읽고 이어지는 질문에 가장 알맞은 답을 고르세요.';
}
function renderPhysicalPage(page,pageIndex,totalPages){
  const sheet=document.createElement('article');sheet.className=`bookPage part${page.part} staticAnswers`;
  if(page.isPartStart){const directions=document.createElement('section');directions.className='bookDirections';directions.innerHTML=`<strong>PART ${page.part}</strong><p>${partDirections(page.part)}</p>`;sheet.append(directions)}
  if(page.part===5){const grid=document.createElement('div');grid.className='examQuestionGrid';page.questions.forEach((q,index)=>appendExamQuestion(grid,q,index));sheet.append(grid)}
  else{
    const first=page.questions[0],reference=document.createElement('p');reference.className='bookReference';reference.textContent=`Questions ${examNumber(page.questions[0])}-${examNumber(page.questions[page.questions.length-1])} refer to the following ${page.part===7?'text':'information'}.`;
    const grid=document.createElement('div');grid.className='examQuestionGrid';page.questions.forEach((q,index)=>appendExamQuestion(grid,q,index));sheet.append(reference,createExamPassage(first),grid);
  }
  const footer=document.createElement('footer');footer.className='bookFooter';footer.innerHTML=`<span>${198+pageIndex}</span>${pageIndex<totalPages-1?'<b>GO ON TO THE NEXT PAGE →</b>':''}`;sheet.append(footer);return sheet;
}
function renderExamPaper(){
  const spread=$('#examSpread'),start=examSession.spreadIndex*2,currentPages=examSession.pages.slice(start,start+2);spread.replaceChildren();
  currentPages.forEach((page,index)=>spread.append(renderPhysicalPage(page,start+index,examSession.pages.length)));
  if(currentPages.length===1){const blank=document.createElement('article');blank.className='bookPage blankPage';spread.append(blank)}
  const totalSpreads=Math.ceil(examSession.pages.length/2),current=examSession.spreadIndex+1;
  $('#examPageStatus').textContent=`${current} / ${totalSpreads} 펼침면`;
  $('#previousSpread').disabled=current===1;$('#nextSpread').disabled=current===totalSpreads;
  $('#finishExam').textContent='시험 종료 · 전체 답지 보기';
  window.scrollTo({top:0,behavior:'smooth'});
}
function startExam(){
  const parts=[5,6,7],questions=collectExamQuestions(parts),pages=buildPhysicalPages(parts);
  if(!questions.length){alert('시험을 시작할 문제가 없습니다.');return}
  examSession={mode:'mock',parts,questions,pages,spreadIndex:0,startedAt:Date.now(),elapsed:0,answers:{},checkedSpreads:new Set()};
  $('#examPartLabel').textContent='READING TEST';
  $('#examModeLabel').textContent='모의고사 모드';
  $('#examModeNotice').textContent='화면에서는 답을 선택하지 않습니다. 종이 답안지에 표시하고 시험 종료 후 전체 답지와 해설로 자가 채점하세요.';
  renderExamPaper();setExamView('exam');history.pushState({toeicExam:true,toeicArea:'rc'},'','?mode=rc#mock-exam');
  clearInterval(examClock);$('#examTimer').textContent='00:00';examClock=setInterval(()=>{$('#examTimer').textContent=formatExamTime(Date.now()-examSession.startedAt)},1000);
}
function resultExplanation(q){
  const section=document.createElement('section');section.className='resultExplanation';const title=document.createElement('h3');title.textContent='정답 및 해설';section.append(title);
  if(q.translation){const p=document.createElement('p');p.innerHTML=`<strong>${q.part===7?'질문·정답 해석':'해석'}</strong> ${escapeHtml(q.translation)}`;section.append(p)}
  if(q.vocab){const p=document.createElement('p');p.innerHTML=`<strong>핵심 표현</strong> ${escapeHtml(q.vocab)}`;section.append(p)}
  const explanation=document.createElement('p');explanation.textContent=q.explanation;section.append(explanation);
  if(q.part===7){
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='지문 근거·보기별 해설·전체 해석';details.append(summary);
    (q.evidence||[]).forEach(e=>{const p=document.createElement('p');p.textContent=`문서 ${e.document}: “${e.quote}” — ${e.reason}`;details.append(p)});
    (q.optionReasons||[]).forEach((reason,index)=>{const p=document.createElement('p');p.textContent=`${'ABCD'[index]} · ${index===q.answer?'정답':'오답'}: ${reason}`;details.append(p)});
    (q.passages||[]).forEach((doc,index)=>{const p=document.createElement('p');p.textContent=`문서 ${index+1} 해석 · ${doc.translation}`;details.append(p)});section.append(details);
  }
  return section;
}
function createAnswerDetail(q,allowSelfGrade,attempt=null){
  const number=examNumber(q),item=document.createElement('article');item.id=`result-q-${q.part}-${q.id}`;item.className='resultItem';
  const label=document.createElement('p');label.className='resultLabel';
  if(attempt){const selected=attempt.selected;label.textContent=`Part ${q.part} · ${number} · 내 답 ${selected===undefined?'미응답':'ABCD'[selected]} / 정답 ${'ABCD'[q.answer]}`;item.classList.add(selected===q.answer?'correct':'wrong')}
  else label.textContent=`Part ${q.part} · ${number} · 정답 ${'ABCD'[q.answer]}`;
  if(allowSelfGrade){const checkLabel=document.createElement('label');checkLabel.className='selfGradeCheck';const check=document.createElement('input');check.type='checkbox';check.className='selfGradeInput';checkLabel.append(check,document.createTextNode(' 종이 답안지에서 맞힘'));label.append(checkLabel)}
  const heading=document.createElement('h2');heading.textContent=q.question;const choices=document.createElement('div');choices.className='resultChoices';
  q.choices.forEach((text,index)=>{const row=document.createElement('div');row.className='resultChoice';if(index===q.answer)row.classList.add('answer');if(attempt&&index===attempt.selected&&index!==q.answer)row.classList.add('userWrong');row.innerHTML=`<strong>${'ABCD'[index]}</strong><span>${escapeHtml(text)}</span>`;choices.append(row)});
  item.append(label,heading,choices,resultExplanation(q));return item;
}
function updateSelfScore(){
  const correct=document.querySelectorAll('.selfGradeInput:checked').length,total=examSession.questions.length;
  $('#resultScore').textContent=correct;$('#resultTotal').textContent=` / ${total} 자가 채점`;$('#resultRate').textContent=`정답률 ${Math.round(correct/total*100)}%`;
}
function renderExamResults(){
  clearInterval(examClock);examClock=null;
  examSession.elapsed=Date.now()-examSession.startedAt;
  const total=examSession.questions.length;
  $('#resultPartLabel').textContent='Part 5 · 6 · 7 모의고사 자가 채점';
  document.querySelector('.scoreSummary>p').textContent='종이 답안지와 대조해 맞힌 문제를 직접 체크하세요.';
  $('#resultScore').textContent=0;$('#resultTotal').textContent=` / ${total} 자가 채점`;$('#resultRate').textContent='정답률 0%';$('#resultTime').textContent=`총 시험시간 ${formatExamTime(examSession.elapsed)}`;
  const nav=$('#resultNavigator'),list=$('#resultQuestions');nav.replaceChildren();list.replaceChildren();
  examSession.questions.forEach(q=>{const number=examNumber(q),link=document.createElement('a');link.href=`#result-q-${q.part}-${q.id}`;link.className='answerKeyChip';link.textContent=`${number} ${'ABCD'[q.answer]}`;nav.append(link);list.append(createAnswerDetail(q,true))});
  list.querySelectorAll('.selfGradeInput').forEach(input=>input.onchange=updateSelfScore);
  setExamView('results');window.scrollTo(0,0);history.pushState({toeicResults:true,toeicArea:'rc'},'','?mode=rc#mock-answers');
}
function leaveExam(){
  if(examSession&&!confirm('시험을 종료하고 학습 화면으로 돌아갈까요? 현재 시험시간은 저장되지 않습니다.'))return;
  examSession=null;history.pushState({toeicArea:'rc'},'',`${location.pathname}?mode=rc`);setExamView('practice');
}
$('#openMockExam').onclick=startExam;
$('#exitExam').onclick=leaveExam;
$('#previousSpread').onclick=()=>{if(examSession.spreadIndex>0){examSession.spreadIndex--;renderExamPaper()}};
$('#nextSpread').onclick=()=>{if(examSession.spreadIndex<Math.ceil(examSession.pages.length/2)-1){examSession.spreadIndex++;renderExamPaper()}};
$('#finishExam').onclick=()=>{const last=Math.ceil(examSession.pages.length/2)-1;if(examSession.spreadIndex<last&&!confirm('아직 보지 않은 페이지가 있습니다. 시험을 종료하고 전체 답지를 볼까요?'))return;renderExamResults()};
$('#retryExam').onclick=()=>{examSession.spreadIndex=0;examSession.startedAt=Date.now();examSession.elapsed=0;examSession.answers={};examSession.checkedSpreads=new Set();renderExamPaper();setExamView('exam');clearInterval(examClock);$('#examTimer').textContent='00:00';examClock=setInterval(()=>{$('#examTimer').textContent=formatExamTime(Date.now()-examSession.startedAt)},1000)};
function closeExamResults(){examSession=null;history.pushState({toeicArea:'rc'},'',`${location.pathname}?mode=rc`);setExamView('practice')}
$('#closeResults').onclick=closeExamResults;$('#finishResults').onclick=closeExamResults;
render();

function openToeicRc(){
  document.body.classList.add('toeic-app-open');
  history.pushState({toeicArea:'rc'},'',`${location.pathname}?mode=rc`);
  window.scrollTo({top:0,behavior:'smooth'});
}
function openToeicLanding(){
  if(document.body.classList.contains('broadcast'))setBroadcastMode(false);
  examSession=null;
  setExamView('practice');
  document.body.classList.remove('toeic-app-open');
  history.pushState({toeicArea:'landing'},'',location.pathname);
  window.scrollTo({top:0,behavior:'smooth'});
}
$('#openRcHub').onclick=openToeicRc;
$('#openLcHub').onclick=()=>alert('LC 학습 공간은 준비 중입니다.');
$('#backToeicLanding').onclick=openToeicLanding;
function syncToeicAreaFromState(state){
  const isRc=state?.toeicArea==='rc';
  if(!isRc&&document.body.classList.contains('exam-active')){examSession=null;setExamView('practice')}
  document.body.classList.toggle('toeic-app-open',isRc);
}
window.addEventListener('popstate',event=>syncToeicAreaFromState(event.state));
history.replaceState({toeicArea:'landing'},'',location.pathname);
syncToeicAreaFromState(history.state);
