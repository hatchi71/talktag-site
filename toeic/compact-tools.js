/* Move existing controls, preserving their handlers and learning state. */
(() => {
 const header=document.querySelector('body > .topbar');
 const panel=document.createElement('details');panel.id='rcTools';
 const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
 const summary=document.createElement('summary');summary.innerHTML=icon('<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18"/>')+'<span>학습 도구</span>';
 panel.append(summary);
 const content=document.createElement('div');content.className='rc-tools-content';
 const grid=document.createElement('div');grid.className='rc-tool-grid';
 const specs=[
 ['openMockExam','모의고사','<path d="M6 2h8l4 4v16H6zM14 2v5h4M9 11h6M9 15h6M9 18h3"/>'],
 ['toggleBroadcast','세로 모드','<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>'],
 ['openVault','보관함','<path d="M3 6h7l2 2h9v13H3zM3 6V3h6l3 3"/>'],
 ['openImport','업로드','<path d="M6 17a5 5 0 0 1-1-10 7 7 0 0 1 14 0 5 5 0 0 1-1 10M12 22V10m-4 4 4-4 4 4"/>'],
 ['openAdd','문제 추가','<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>']];
 for(const [id,label,path] of specs){
   const button=document.getElementById(id);button.classList.add('rc-tool-tile');
   const original=document.createElement('span');original.hidden=true;
   while(button.firstChild)original.append(button.firstChild);
   button.append(original);button.insertAdjacentHTML('beforeend',icon(path)+`<span class="rc-tool-label">${label}</span>`);grid.append(button);
 }
 const records=document.createElement('button');records.type='button';records.className='rc-tool-tile';records.setAttribute('aria-expanded','false');records.setAttribute('aria-controls','rcRecords');
 records.innerHTML=icon('<path d="M5 21V12M12 21V6M19 21V2"/>')+'<span class="rc-tool-label">기록 관리</span>';grid.append(records);
 const controls=document.querySelector('.toolbar .controls');controls.id='rcRecords';controls.hidden=true;
 records.onclick=()=>{controls.hidden=!controls.hidden;records.setAttribute('aria-expanded',String(!controls.hidden));};
 document.querySelector('.modeControls').remove();document.querySelector('.headerActions').remove();
 content.append(grid,controls);
 panel.append(content);header.append(panel);
})();
