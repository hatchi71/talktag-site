(function(){
  const DB_NAME='talktag-toeic-vault';
  const DB_VERSION=1;
  const MAX_SNAPSHOTS=30;
  let dbPromise;

  function clone(value){return JSON.parse(JSON.stringify(value))}
  function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
  function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('저장 작업이 중단되었습니다.'))})}
  function open(){
    if(!('indexedDB' in window))return Promise.reject(new Error('이 브라우저는 로컬 보관함을 지원하지 않습니다.'));
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains('snapshots')){const store=db.createObjectStore('snapshots',{keyPath:'id'});store.createIndex('createdAt','createdAt')}
        if(!db.objectStoreNames.contains('trash')){const store=db.createObjectStore('trash',{keyPath:'id'});store.createIndex('deletedAt','deletedAt')}
        if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return dbPromise;
  }
  async function getAll(storeName){const db=await open(),tx=db.transaction(storeName,'readonly');return requestResult(tx.objectStore(storeName).getAll())}
  async function get(storeName,id){const db=await open(),tx=db.transaction(storeName,'readonly');return requestResult(tx.objectStore(storeName).get(id))}
  async function put(storeName,value){const db=await open(),tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).put(clone(value));await transactionDone(tx);return value}
  async function remove(storeName,id){const db=await open(),tx=db.transaction(storeName,'readwrite');tx.objectStore(storeName).delete(id);await transactionDone(tx)}
  async function trimSnapshots(){
    const items=(await getAll('snapshots')).sort((a,b)=>b.createdAt-a.createdAt);
    await Promise.all(items.slice(MAX_SNAPSHOTS).map(item=>remove('snapshots',item.id)));
  }
  async function snapshot(part,state,reason){
    const record={id:crypto.randomUUID(),part:Number(part),reason,createdAt:Date.now(),state:clone(state)};
    await put('snapshots',record);await trimSnapshots();return record;
  }
  async function trash(part,removedState,reason){
    const record={id:crypto.randomUUID(),part:Number(part),reason,deletedAt:Date.now(),state:clone(removedState)};
    await put('trash',record);return record;
  }
  async function init(states){
    const marker=await get('meta','initial-capture');
    if(marker)return;
    for(const part of [5,6,7]){
      const state=states[part];
      if(state?.questions?.length)await snapshot(part,state,'기존 문제 최초 보관');
    }
    await put('meta',{key:'initial-capture',at:Date.now()});
  }
  async function listSnapshots(){return (await getAll('snapshots')).sort((a,b)=>b.createdAt-a.createdAt)}
  async function listTrash(){return (await getAll('trash')).sort((a,b)=>b.deletedAt-a.deletedAt)}
  async function exportBackup(states){
    return {format:'talktag-toeic-backup',version:1,exportedAt:new Date().toISOString(),states:clone(states),snapshots:await listSnapshots(),trash:await listTrash()};
  }
  function validateBackup(data){
    if(!data||data.format!=='talktag-toeic-backup'||data.version!==1||!data.states)throw new Error('TalkTag TOEIC 백업 파일이 아닙니다.');
    for(const part of [5,6,7]){const state=data.states[part];if(!state||!Array.isArray(state.questions)||typeof state.results!=='object'||!Array.isArray(state.starred))throw new Error(`Part ${part} 백업 데이터가 올바르지 않습니다.`)}
    return data;
  }
  async function importArchiveRecords(data){
    const db=await open();
    for(const [storeName,items] of [['snapshots',data.snapshots||[]],['trash',data.trash||[]]]){
      if(!items.length)continue;
      const tx=db.transaction(storeName,'readwrite'),store=tx.objectStore(storeName);
      items.forEach(item=>store.put(clone(item)));
      await transactionDone(tx);
    }
    await trimSnapshots();
  }
  async function requestPersistence(){return navigator.storage?.persist?navigator.storage.persist():false}
  async function storageInfo(){
    const persisted=navigator.storage?.persisted?await navigator.storage.persisted():false;
    const estimate=navigator.storage?.estimate?await navigator.storage.estimate():{};
    return {persisted,usage:estimate.usage||0,quota:estimate.quota||0};
  }
  window.ToeicVault={init,snapshot,trash,listSnapshots,listTrash,getSnapshot:id=>get('snapshots',id),getTrash:id=>get('trash',id),removeTrash:id=>remove('trash',id),exportBackup,validateBackup,importArchiveRecords,requestPersistence,storageInfo};
})();
