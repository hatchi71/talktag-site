/* Move existing controls, preserving their handlers and learning state. */
(() => {
 const header=document.querySelector('body > .topbar');
 const panel=document.createElement('details');panel.id='rcTools';
 const summary=document.createElement('summary');summary.textContent='학습 도구';
 panel.append(summary);
 const content=document.createElement('div');content.className='rc-tools-content';
 for(const selector of ['.modeControls','.headerActions','.toolbar .controls']){
   const node=document.querySelector(selector);if(node)content.append(node);
 }
 panel.append(content);header.append(panel);
})();
