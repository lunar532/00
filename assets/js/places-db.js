// 지도에 올린 장소와 3D 파일을 이 브라우저의 IndexedDB에 저장해요.
// (서버로 올라가지 않아요. 다른 기기에서는 보이지 않아요.)
(function () {
  const DB = 'underlume', STORE = 'places', VER = 1;
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const out = fn(store);
      t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }
  window.ULPlaces = {
    all: () => tx('readonly', s => s.getAll()),
    get: id => tx('readonly', s => s.get(id)),
    put: place => tx('readwrite', s => s.put(place)),
    remove: id => tx('readwrite', s => s.delete(id)),
    newId: () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    SAMPLE: { id: 'sample', name: '예시 집 (샘플)', kind: '집', lat: 37.5444, lng: 127.0374, note: '서울숲 근처에 놓아 둔 예시 모델이에요.', files: [] },
  };
})();
