export type SavedConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  provider?: string;
};

export type SavedConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  dialect: 'iraqi' | 'lebanese' | 'american';
  messages: SavedConversationMessage[];
};

const KEY = 'yaali_saved_conversations_v1';
const CURRENT_KEY = 'yaali_current_conversation_v1';
const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES = 500;

function read(): SavedConversation[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(items: SavedConversation[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_CONVERSATIONS))); } catch {}
}

function cleanMessages(messages: SavedConversationMessage[]) {
  return messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && String(m.text || '').trim())
    .slice(-MAX_MESSAGES)
    .map(m => ({id: String(m.id || crypto.randomUUID()), role: m.role, text: String(m.text), ...(m.provider ? {provider: String(m.provider)} : {})}));
}

export function listConversations(): SavedConversation[] {
  return read().sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function getConversation(id: string): SavedConversation | null {
  return read().find(x => x.id === id) || null;
}

export function getCurrentConversationId(): string {
  try { return localStorage.getItem(CURRENT_KEY) || ''; } catch { return ''; }
}

export function setCurrentConversationId(id: string) {
  try { id ? localStorage.setItem(CURRENT_KEY, id) : localStorage.removeItem(CURRENT_KEY); } catch {}
}

export function upsertConversation(input: SavedConversation): SavedConversation {
  const now = new Date().toISOString();
  const messages = cleanMessages(input.messages);
  const firstUser = messages.find(m => m.role === 'user');
  const title = input.title?.trim() || firstUser?.text?.slice(0, 48) || 'مکالمه جدید';
  const item: SavedConversation = {
    id: input.id || crypto.randomUUID(),
    title,
    createdAt: input.createdAt || now,
    updatedAt: now,
    dialect: input.dialect,
    messages
  };
  const all = read().filter(x => x.id !== item.id);
  all.unshift(item);
  write(all);
  setCurrentConversationId(item.id);
  return item;
}

export function createConversation(dialect: SavedConversation['dialect']): SavedConversation {
  const now = new Date().toISOString();
  const item: SavedConversation = {id: crypto.randomUUID(), title: 'مکالمه جدید', createdAt: now, updatedAt: now, dialect, messages: []};
  const all = read();
  all.unshift(item);
  write(all);
  setCurrentConversationId(item.id);
  return item;
}

export function deleteConversation(id: string) {
  write(read().filter(x => x.id !== id));
  if (getCurrentConversationId() === id) setCurrentConversationId('');
}

export function exportConversations(): string {
  return JSON.stringify({version: 1, exportedAt: new Date().toISOString(), conversations: listConversations()}, null, 2);
}

export function importConversations(payload: unknown): number {
  const rows = Array.isArray(payload) ? payload : (payload && typeof payload === 'object' && Array.isArray((payload as any).conversations) ? (payload as any).conversations : []);
  let count = 0;
  const all = read();
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const dialect = raw.dialect === 'lebanese' || raw.dialect === 'american' ? raw.dialect : 'iraqi';
    const messages = cleanMessages(Array.isArray(raw.messages) ? raw.messages : []);
    if (!messages.length) continue;
    const item: SavedConversation = {
      id: String(raw.id || crypto.randomUUID()),
      title: String(raw.title || messages.find(m => m.role === 'user')?.text?.slice(0,48) || 'مکالمه واردشده'),
      createdAt: String(raw.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString(), dialect, messages
    };
    const index = all.findIndex(x => x.id === item.id);
    if (index >= 0) all[index] = item; else all.unshift(item);
    count++;
  }
  write(all);
  return count;
}
