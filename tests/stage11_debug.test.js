// debug

const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
  key: (index) => Object.keys(localStorageStore)[index],
  get length() { return Object.keys(localStorageStore).length; }
};

async function runTests() {
  const { storage, setStoredData, getStoredData, KEYS, SCHEMA_VERSION_KEY } = await import("../src/services/storage.ts");

  setStoredData(KEYS.QUESTIONS, [{ id: "q1" }]);
  setStoredData(KEYS.EXAMS, [{ id: "e1" }]);
  global.localStorage.setItem(SCHEMA_VERSION_KEY, "1");

  const originalSetItem = global.localStorage.setItem;
  global.localStorage.setItem = (key, val) => {
    if (key === KEYS.EXAMS && val.includes('"_schemaVersion":2')) {
       throw new Error("Simulated migration atomic write error");
    }
    originalSetItem(key, val);
  };

  try {
    storage.runSchemaMigrations();
  } catch(e) {
    console.log("ERROR MESSAGE IS:", e.message);
  }
}
runTests();
