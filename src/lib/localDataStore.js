const STORE_PREFIX = 'shannon:local-store:';

const nowIso = () => new Date().toISOString();

const makeId = (prefix = 'item') => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
};

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const buildKey = (collection, uid) => `${STORE_PREFIX}${collection}:${uid || 'anon'}`;

const loadCollection = (collection, uid) => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(buildKey(collection, uid));
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
};

const saveCollection = (collection, uid, items) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(buildKey(collection, uid), JSON.stringify(items));
  } catch (err) {
    console.warn('[localDataStore] Failed to persist collection', collection, err);
  }
};

const listAllCollections = (collection) => {
  if (typeof window === 'undefined') return [];
  const results = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(`${STORE_PREFIX}${collection}:`)) continue;
    const raw = window.localStorage.getItem(key);
    const parsed = safeJsonParse(raw, []);
    if (Array.isArray(parsed)) {
      results.push(...parsed);
    }
  }
  return results;
};

const normalizeOwner = (user) => {
  if (!user) return { ownerUid: null, ownerName: 'Anonymous' };
  return {
    ownerUid: user.uid || user.id || null,
    ownerName: user.displayName || user.email || 'User',
  };
};

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
  reader.readAsText(file);
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

const clampText = (value, limit = 200000) => {
  if (typeof value !== 'string') return '';
  if (value.length <= limit) return value;
  return value.slice(0, limit);
};

export const skillsStore = {
  list: async (uid) => loadCollection('skills', uid),
  listPublic: async (uid) => loadCollection('skills', uid).filter((skill) => skill.is_public),
  listExplore: async () =>
    listAllCollections('skills').filter((skill) => skill?.is_public),
  get: async (uid, id) => loadCollection('skills', uid).find((skill) => skill.id === id) || null,
  getPublicById: async (id) =>
    listAllCollections('skills').find((skill) => skill?.id === id && skill?.is_public) || null,
  create: async (user, payload) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('skills', ownerUid);
    const createdAt = nowIso();
    const next = {
      id: makeId('skill'),
      name: payload?.name || 'Untitled Skill',
      description: payload?.description || '',
      content: payload?.content || '',
      created_at: createdAt,
      updated_at: createdAt,
      usage_count: 0,
      is_public: false,
      creator_name: ownerName,
      ownerUid,
    };
    items.unshift(next);
    saveCollection('skills', ownerUid, items);
    return next;
  },
  update: async (user, id, updates) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('skills', ownerUid);
    const next = items.map((skill) => {
      if (skill.id !== id) return skill;
      return {
        ...skill,
        ...updates,
        updated_at: nowIso(),
        creator_name: skill.creator_name || ownerName,
      };
    });
    saveCollection('skills', ownerUid, next);
    return next.find((skill) => skill.id === id) || null;
  },
  remove: async (user, id) => {
    const { ownerUid } = normalizeOwner(user);
    const items = loadCollection('skills', ownerUid);
    const next = items.filter((skill) => skill.id !== id);
    saveCollection('skills', ownerUid, next);
    return true;
  },
  togglePublic: async (user, id) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('skills', ownerUid);
    const next = items.map((skill) => {
      if (skill.id !== id) return skill;
      return {
        ...skill,
        is_public: !skill.is_public,
        updated_at: nowIso(),
        creator_name: skill.creator_name || ownerName,
      };
    });
    saveCollection('skills', ownerUid, next);
    return next.find((skill) => skill.id === id) || null;
  },
  clone: async (user, id) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('skills', ownerUid);
    const source = items.find((skill) => skill.id === id);
    if (!source) return null;
    const cloned = {
      ...source,
      id: makeId('skill'),
      name: `${source.name || 'Untitled Skill'} (Copy)`,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_public: false,
      creator_name: ownerName,
      ownerUid,
    };
    items.unshift(cloned);
    saveCollection('skills', ownerUid, items);
    return cloned;
  },
};

export const customShanStore = {
  list: async (uid) => loadCollection('customShans', uid),
  listPublic: async (uid) =>
    loadCollection('customShans', uid).filter((assistant) => assistant.is_public),
  listExplore: async () =>
    listAllCollections('customShans').filter((assistant) => assistant?.is_public),
  get: async (uid, id) =>
    loadCollection('customShans', uid).find((assistant) => assistant.id === id) || null,
  getPublicById: async (id) =>
    listAllCollections('customShans').find(
      (assistant) => assistant?.id === id && assistant?.is_public,
    ) || null,
  create: async (user, payload) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('customShans', ownerUid);
    const createdAt = nowIso();
    let knowledgeText = '';
    let knowledgeName = '';
    if (payload?.knowledgeFile) {
      knowledgeText = clampText(await readFileAsText(payload.knowledgeFile));
      knowledgeName = payload.knowledgeFile.name || '';
    }
    let iconUrl = '';
    if (payload?.iconFile) {
      iconUrl = await readFileAsDataUrl(payload.iconFile);
    }
    const next = {
      id: makeId('assistant'),
      name: payload?.name || 'Untitled Assistant',
      description: payload?.description || '',
      system_prompt: payload?.systemPrompt || payload?.system_prompt || '',
      starter_prompt: payload?.starterPrompt || payload?.starter_prompt || '',
      icon_url: iconUrl || null,
      knowledge_text: knowledgeText,
      knowledge_name: knowledgeName,
      has_knowledge_file: Boolean(knowledgeText),
      created_at: createdAt,
      updated_at: createdAt,
      usage_count: 0,
      is_public: false,
      creator_name: ownerName,
      ownerUid,
    };
    items.unshift(next);
    saveCollection('customShans', ownerUid, items);
    return next;
  },
  update: async (user, id, payload) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('customShans', ownerUid);
    const next = [];
    let updated = null;
    for (const assistant of items) {
      if (assistant.id !== id) {
        next.push(assistant);
        continue;
      }
      let knowledgeText = assistant.knowledge_text || '';
      let knowledgeName = assistant.knowledge_name || '';
      if (payload?.removeKnowledgeFile) {
        knowledgeText = '';
        knowledgeName = '';
      }
      if (payload?.knowledgeFile) {
        knowledgeText = clampText(await readFileAsText(payload.knowledgeFile));
        knowledgeName = payload.knowledgeFile.name || '';
      }
      let iconUrl = assistant.icon_url || null;
      if (payload?.removeIcon) {
        iconUrl = null;
      }
      if (payload?.iconFile) {
        iconUrl = await readFileAsDataUrl(payload.iconFile);
      }
      updated = {
        ...assistant,
        ...payload,
        system_prompt:
          payload?.system_prompt ??
          payload?.systemPrompt ??
          assistant.system_prompt,
        starter_prompt:
          payload?.starter_prompt ??
          payload?.starterPrompt ??
          assistant.starter_prompt,
        icon_url: iconUrl,
        knowledge_text: knowledgeText,
        knowledge_name: knowledgeName,
        has_knowledge_file: Boolean(knowledgeText),
        updated_at: nowIso(),
        creator_name: assistant.creator_name || ownerName,
      };
      next.push(updated);
    }
    saveCollection('customShans', ownerUid, next);
    return updated;
  },
  remove: async (user, id) => {
    const { ownerUid } = normalizeOwner(user);
    const items = loadCollection('customShans', ownerUid);
    const next = items.filter((assistant) => assistant.id !== id);
    saveCollection('customShans', ownerUid, next);
    return true;
  },
  togglePublic: async (user, id) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('customShans', ownerUid);
    const next = items.map((assistant) => {
      if (assistant.id !== id) return assistant;
      return {
        ...assistant,
        is_public: !assistant.is_public,
        updated_at: nowIso(),
        creator_name: assistant.creator_name || ownerName,
      };
    });
    saveCollection('customShans', ownerUid, next);
    return next.find((assistant) => assistant.id === id) || null;
  },
};

export const projectStore = {
  list: async (uid) => loadCollection('projects', uid),
  get: async (uid, id) => loadCollection('projects', uid).find((proj) => proj.id === id) || null,
  create: async (user, payload) => {
    const { ownerUid, ownerName } = normalizeOwner(user);
    const items = loadCollection('projects', ownerUid);
    const createdAt = nowIso();
    const next = {
      id: makeId('project'),
      name: payload?.name || 'Untitled Project',
      description: payload?.description || '',
      icon: payload?.icon || '',
      instructions: payload?.instructions || '',
      files: [],
      created_at: createdAt,
      updated_at: createdAt,
      creator_name: ownerName,
      ownerUid,
    };
    items.unshift(next);
    saveCollection('projects', ownerUid, items);
    return next;
  },
  update: async (user, id, updates) => {
    const { ownerUid } = normalizeOwner(user);
    const items = loadCollection('projects', ownerUid);
    const next = items.map((project) => {
      if (project.id !== id) return project;
      return {
        ...project,
        ...updates,
        updated_at: nowIso(),
      };
    });
    saveCollection('projects', ownerUid, next);
    return next.find((project) => project.id === id) || null;
  },
  remove: async (user, id) => {
    const { ownerUid } = normalizeOwner(user);
    const items = loadCollection('projects', ownerUid);
    const next = items.filter((project) => project.id !== id);
    saveCollection('projects', ownerUid, next);
    return true;
  },
  uploadFile: async (user, projectId, file) => {
    const { ownerUid } = normalizeOwner(user);
    const items = loadCollection('projects', ownerUid);
    let uploaded = null;
    const next = [];
    for (const project of items) {
      if (project.id !== projectId) {
        next.push(project);
        continue;
      }
      let textContent = null;
      let dataUrl = null;
      const isText = file.type.startsWith('text/');
      if (isText) {
        textContent = clampText(await readFileAsText(file));
      } else if (file.type.startsWith('image/')) {
        dataUrl = await readFileAsDataUrl(file);
      }
      const record = {
        id: makeId('file'),
        fileName: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        uploaded_at: nowIso(),
        hasTextContent: Boolean(textContent),
        textContent,
        dataUrl,
      };
      uploaded = record;
      const updatedProject = {
        ...project,
        files: [...(project.files || []), record],
        updated_at: nowIso(),
      };
      next.push(updatedProject);
    }
    saveCollection('projects', ownerUid, next);
    return uploaded;
  },
  deleteFile: async (user, projectId, fileId) => {
    const { ownerUid } = normalizeOwner(user);
    const items = loadCollection('projects', ownerUid);
    const next = items.map((project) => {
      if (project.id !== projectId) return project;
      return {
        ...project,
        files: (project.files || []).filter((file) => file.id !== fileId),
        updated_at: nowIso(),
      };
    });
    saveCollection('projects', ownerUid, next);
    return true;
  },
  getDownloadUrl: async (user, projectId, fileId) => {
    const { ownerUid } = normalizeOwner(user);
    const project = loadCollection('projects', ownerUid).find((proj) => proj.id === projectId);
    const file = project?.files?.find((item) => item.id === fileId);
    if (!file) return null;
    if (file.dataUrl) {
      return { url: file.dataUrl };
    }
    if (file.textContent) {
      const blob = new Blob([file.textContent], { type: file.contentType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      return { url };
    }
    return null;
  },
  searchFiles: async (user, projectId, query) => {
    const { ownerUid } = normalizeOwner(user);
    const project = loadCollection('projects', ownerUid).find((proj) => proj.id === projectId);
    if (!project || !query) {
      return { results: [] };
    }
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return { results: [] };
    const results = [];
    for (const file of project.files || []) {
      const haystack = (file.textContent || '').toLowerCase();
      const nameMatch = (file.fileName || '').toLowerCase().includes(normalizedQuery);
      const contentMatch = haystack.includes(normalizedQuery);
      if (!nameMatch && !contentMatch) continue;
      let snippet = '';
      if (contentMatch && file.textContent) {
        const index = haystack.indexOf(normalizedQuery);
        const start = Math.max(0, index - 60);
        const end = Math.min(file.textContent.length, index + normalizedQuery.length + 60);
        snippet = file.textContent.slice(start, end);
      }
      results.push({
        fileId: file.id,
        fileName: file.fileName,
        snippet,
        matches: snippet ? [{ snippet, lineNumber: null }] : [],
      });
    }
    return { results };
  },
};

