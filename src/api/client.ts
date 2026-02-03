import { auth, storage } from '@/config/backend';
import { getDownloadURL, ref, uploadBytes } from '@/lib/localStorageClient';

async function ensureAuthenticatedUser() {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Authentication required');
  }
  return current;
}

async function uploadFileToStorage(file: File) {
  const current = await ensureAuthenticatedUser();
  try {
    await current.getIdToken(true);
  } catch (err) {
    console.warn('Failed to refresh auth token before upload', err);
  }
  const cleanName = file.name.replace(/\s+/g, '-');
  const path = `uploads/${Date.now()}-${cleanName}`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, {
    contentType: file.type || 'application/octet-stream',
  });
  const downloadURL = await getDownloadURL(objectRef);
  return {
    id: objectRef.name,
    name: file.name,
    content_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    is_text: file.type.startsWith('text/'),
    download_url: downloadURL,
    storage_key: objectRef.fullPath,
    file: {
      id: objectRef.name,
      download_url: downloadURL,
      storage_path: objectRef.fullPath,
      content_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      name: file.name,
    },
    truncated: false,
    text_content: null,
  };
}

export const apiClient = {
  async uploadFile(_token: string, file: File) {
    return uploadFileToStorage(file);
  },
};

export const uploadFile = (token: string, file: File) => apiClient.uploadFile(token, file);
