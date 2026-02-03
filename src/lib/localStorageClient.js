const FILES_KEY = 'shannon:local-storage:files';
let fileCache = null;

const loadFiles = () => {
  if (fileCache) return fileCache;
  if (typeof window === 'undefined') {
    fileCache = {};
    return fileCache;
  }
  try {
    const raw = window.localStorage.getItem(FILES_KEY);
    fileCache = raw ? JSON.parse(raw) : {};
  } catch {
    fileCache = {};
  }
  return fileCache;
};

const saveFiles = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FILES_KEY, JSON.stringify(fileCache || {}));
  } catch {
    // Ignore quota issues for local storage fallback
  }
};

export const storage = {};

export const ref = (_storage, path) => {
  const name = path.split('/').pop();
  return {
    fullPath: path,
    name,
    path,
  };
};

export const uploadBytes = async (objectRef, file, metadata = {}) => {
  const files = loadFiles();
  let url = '';
  try {
    url = URL.createObjectURL(file);
  } catch {
    url = '';
  }
  files[objectRef.fullPath] = {
    name: file.name,
    size: file.size,
    type: file.type,
    url,
    metadata,
    storedAt: new Date().toISOString(),
  };
  saveFiles();
  return {
    ref: objectRef,
    metadata: {
      contentType: file.type,
      size: file.size,
    },
  };
};

export const getDownloadURL = async (objectRef) => {
  const files = loadFiles();
  const entry = files[objectRef.fullPath];
  if (entry?.url) {
    return entry.url;
  }
  return '';
};
