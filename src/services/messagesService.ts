import { request } from './apiClient';

export interface ChatThread {
  id: string;
  parent: string;
  teacher: string;
  student: string;
  organization: string;
  branch: string;
  unread_count: number;
  last_read_at: string | null;
  latest_message?: ChatMessage | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread: string;
  sender: string;
  sender_id: string;
  text: string;
  attachment: string | null;
  read_by_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ThreadMessage {
  id: string;
  senderId: string;
  senderRole: 'teacher' | 'parent';
  text: string;
  createdAt: string;
  attachmentId: string | null;
  readByIds: string[];
}

export interface MediaFile {
  id: string;
  file_name: string;
  content_type: string;
  size: number | null;
  download_url: string | null;
  status?: string | null;
}

export interface Thread {
  id: string;
  parentId: string;
  teacherId: string;
  studentId: string;
  parentName: string;
  parentInitials: string;
  parentPhone: string;
  parentEmail: string;
  studentName: string;
  studentGrade: string;
  avatarColor: 'blue' | 'teal' | 'purple' | 'amber' | 'green';
  unread: boolean;
  unreadCount: number;
  lastTime: string;
  preview: string;
  updatedAt: string;
  messages: ThreadMessage[];
}

export const THREADS_DATA: Thread[] = [];

export interface CreateChatThreadRequest {
  parent: string;
  teacher: string;
  student: string;
}

export interface SendChatMessageRequest {
  text?: string;
  attachment?: string;
}

export interface MarkReadResponse {
  count: number;
}

export interface UploadInitResponse {
  id: string;
  key: string;
  upload_id: string | null;
  expires_in: number;
  status?: string | null;
  etag?: string | null;
  size?: number | null;
}

export interface MultipartPartUrlResponse {
  presigned_url: string;
  expires_in: number;
}

export interface MediaUrlResponse {
  download_url?: string | null;
  url?: string | null;
}

export interface CompleteMultipartUploadResponse {
  id: string;
  status: string;
  etag?: string | null;
  size?: number | null;
}

type ApiDataEnvelope<T> = {
  data?: T;
};

type PaginatedThreadsResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: ChatThread[];
};

export function formatThreadTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function buildChatWebsocketUrl(threadId: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL as string;
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/ws/chat/threads/${threadId}/`;
  url.search = `token=${encodeURIComponent(token)}`;
  return url.toString();
}

function unwrapApiData<T>(response: T | ApiDataEnvelope<T>): T {
  const wrapped = response as ApiDataEnvelope<T>;
  return wrapped.data ?? (response as T);
}

export async function listChatThreads(): Promise<ChatThread[]> {
  const response = await request<ChatThread[] | PaginatedThreadsResponse>(
    'GET',
    '/api/chat-threads/',
  );
  return Array.isArray(response) ? response : response.results ?? [];
}

export async function createChatThread(
  body: CreateChatThreadRequest
): Promise<ChatThread> {
  return request<ChatThread>('POST', '/api/chat-threads/', body);
}

export async function listThreadMessages(threadId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>('GET', `/api/chat-threads/${threadId}/messages/`);
}

export async function sendChatMessage(
  threadId: string,
  body: SendChatMessageRequest
): Promise<ChatMessage> {
  return request<ChatMessage>('POST', `/api/chat-threads/${threadId}/messages/`, body);
}

export async function markThreadRead(
  threadId: string,
  messageId?: string
): Promise<MarkReadResponse> {
  return request<MarkReadResponse>(
    'POST',
    `/api/chat-threads/${threadId}/mark-read/`,
    messageId ? { message_id: messageId } : {}
  );
}

export async function initMultipartUpload(file: File): Promise<UploadInitResponse> {
  const response = await request<UploadInitResponse | ApiDataEnvelope<UploadInitResponse>>(
    'POST',
    '/api/media/upload',
    {
    file_name: file.name,
    content_type: file.type || 'application/octet-stream',
  });
  return unwrapApiData(response);
}

export async function getMultipartPartUrl(
  mediaId: string,
  uploadId: string,
  partNumber: number
): Promise<MultipartPartUrlResponse> {
  const response = await request<
    MultipartPartUrlResponse | ApiDataEnvelope<MultipartPartUrlResponse>
  >(
    'POST',
    `/api/media/${mediaId}/multipart/part-url`,
    {
      upload_id: uploadId,
      part_number: partNumber,
    }
  );
  return unwrapApiData(response);
}

export async function completeMultipartUpload(
  mediaId: string,
  uploadId: string,
  parts: Array<{ part_number: number; etag: string }>
): Promise<CompleteMultipartUploadResponse> {
  const response = await request<
    CompleteMultipartUploadResponse | ApiDataEnvelope<CompleteMultipartUploadResponse>
  >(
    'POST',
    `/api/media/${mediaId}/multipart/complete`,
    {
      upload_id: uploadId,
      parts,
    }
  );
  return unwrapApiData(response);
}

export async function abortMultipartUpload(
  mediaId: string,
  uploadId: string
): Promise<void> {
  await request(
    'POST',
    `/api/media/${mediaId}/multipart/abort`,
    {
      upload_id: uploadId,
    }
  );
}

export async function getMediaDownloadUrl(mediaId: string): Promise<string | null> {
  const response = await request<MediaUrlResponse | ApiDataEnvelope<MediaUrlResponse>>(
    'GET',
    `/api/media/${mediaId}/url`
  );
  const data = unwrapApiData(response);
  return data.download_url ?? data.url ?? null;
}

export async function uploadChatAttachment(file: File): Promise<string> {
  const init = await initMultipartUpload(file);
  if (!init.id) {
    throw new Error('Upload initialization returned incomplete media metadata.');
  }
  if (init.status === 'uploaded' && !init.upload_id) {
    return init.id;
  }
  if (!init.upload_id) {
    throw new Error('Upload initialization did not return an upload session.');
  }
  const chunkSize = 5 * 1024 * 1024;
  const parts: Array<{ part_number: number; etag: string }> = [];

  try {
    const totalParts = Math.max(1, Math.ceil(file.size / chunkSize));

    for (let index = 0; index < totalParts; index += 1) {
      const partNumber = index + 1;
      const part = await getMultipartPartUrl(init.id, init.upload_id, partNumber);
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const body = file.slice(start, end);

      const response = await fetch(part.presigned_url, {
        method: 'PUT',
        body,
      });

      if (!response.ok) {
        throw new Error('Failed to upload attachment.');
      }

      const etag = response.headers.get('etag') ?? '';
      if (!etag) {
        throw new Error('Upload completed but attachment verification failed.');
      }

      parts.push({ part_number: partNumber, etag });
    }

    await completeMultipartUpload(init.id, init.upload_id, parts);
    return init.id;
  } catch (error) {
    try {
      await abortMultipartUpload(init.id, init.upload_id);
    } catch {
      // Best-effort cleanup; preserve the original upload failure.
    }
    throw error;
  }
}

export async function getMediaFile(mediaId: string): Promise<MediaFile> {
  const response = await request<any>('GET', `/api/media/${mediaId}`);
  const data = unwrapApiData(response);
  let downloadUrl = data.download_url ?? null;

  if (!downloadUrl && data.status === 'uploaded') {
    try {
      downloadUrl = await getMediaDownloadUrl(mediaId);
    } catch {
      downloadUrl = null;
    }
  }

  return {
    id: data.id,
    file_name: data.file_name,
    content_type: data.content_type,
    size: data.size ?? null,
    download_url: downloadUrl,
    status: data.status ?? null,
  };
}

// Legacy compatibility wrappers kept so older tests still compile.
export async function getThreads(): Promise<Thread[]> {
  return [];
}

export async function sendMessage(
  threadId: string,
  body: { text: string; sender?: string; time?: string }
): Promise<Thread> {
  const message = await sendChatMessage(threadId, body);
  return {
    id: threadId,
    parentId: "",
    teacherId: "",
    studentId: "",
    parentName: "Parent",
    parentInitials: "PA",
    parentPhone: "",
    parentEmail: "",
    studentName: "Student",
    studentGrade: "",
    avatarColor: "blue",
    unread: false,
    unreadCount: 0,
    lastTime: formatThreadTimestamp(message.created_at),
    preview: message.text,
    updatedAt: message.created_at,
    messages: [toLegacyThreadMessage(message)],
  };
}

function toLegacyThreadMessage(message: ChatMessage): ThreadMessage {
  return {
    id: message.id,
    senderId: message.sender_id,
    senderRole: "teacher",
    text: message.text,
    createdAt: message.created_at,
    attachmentId: message.attachment,
    readByIds: message.read_by_ids,
  };
}

export async function markAllRead(): Promise<void> {
  return;
}

export function _resetMockStore(): void {
  return;
}

export async function updateParentInfo(
  _threadId: string,
  changes: Partial<Thread>
): Promise<Thread> {
  return {
    id: changes.id ?? "",
    parentId: changes.parentId ?? "",
    teacherId: changes.teacherId ?? "",
    studentId: changes.studentId ?? "",
    parentName: changes.parentName ?? "Parent",
    parentInitials: changes.parentInitials ?? "PA",
    parentPhone: changes.parentPhone ?? "",
    parentEmail: changes.parentEmail ?? "",
    studentName: changes.studentName ?? "Student",
    studentGrade: changes.studentGrade ?? "",
    avatarColor: changes.avatarColor ?? "blue",
    unread: changes.unread ?? false,
    unreadCount: changes.unreadCount ?? 0,
    lastTime: changes.lastTime ?? "",
    preview: changes.preview ?? "",
    updatedAt: changes.updatedAt ?? "",
    messages: changes.messages ?? [],
  };
}
