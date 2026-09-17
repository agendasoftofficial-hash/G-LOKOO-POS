const DB_NAME = 'glokoo-pos-offline';
const DB_VERSION = 1;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
      if(!db.objectStoreNames.contains('queue')) db.createObjectStore('queue',{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

export async function putCache(key,value){
  try{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction('cache','readwrite');tx.objectStore('cache').put(value,key);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}catch{return false;}
}
export async function getCache(key,fallback=null){
  try{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction('cache','readonly');const r=tx.objectStore('cache').get(key);r.onsuccess=()=>res(r.result??fallback);r.onerror=()=>rej(r.error);});}catch{return fallback;}
}
export async function queueOperation(operation){
  try{const db=await openDB();const item={...operation,id:operation.id||crypto.randomUUID(),created_at:new Date().toISOString()};await new Promise((res,rej)=>{const tx=db.transaction('queue','readwrite');tx.objectStore('queue').put(item);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});return item;}catch{return null;}
}
export async function getQueue(){
  try{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction('queue','readonly');const r=tx.objectStore('queue').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}catch{return []}
}
export async function removeQueued(id){
  try{const db=await openDB();return await new Promise((res,rej)=>{const tx=db.transaction('queue','readwrite');tx.objectStore('queue').delete(id);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}catch{return false;}
}
export function registerOfflineServiceWorker(){
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
}
