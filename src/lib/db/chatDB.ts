import Dexie, { type Table } from 'dexie';

export interface LocalMessage {
  id: string;                // messageId from server
  conversationId: string;
  createdAt: string;         // ISO string for sorting
  senderId: string;
  raw: string;               // JSON-stringified full message payload
}

class ChatDatabase extends Dexie {
  messages!: Table<LocalMessage, string>;

  constructor() {
    super('FruviaChatDB');
    this.version(1).stores({
      // Primary key: id; Composite index: [conversationId+createdAt] for fast range queries
      messages: 'id, [conversationId+createdAt], conversationId',
    });
  }
}

export const chatDB = new ChatDatabase();

/**
 * Get the newest N messages for a conversation from IndexedDB.
 * Returns raw API payloads (parsed from JSON).
 */
export async function getLocalMessages(conversationId: string, count: number = 20): Promise<any[]> {
  try {
    const rows = await chatDB.messages
      .where('[conversationId+createdAt]')
      .between([conversationId, Dexie.minKey], [conversationId, Dexie.maxKey])
      .reverse()
      .limit(count)
      .toArray();

    // Return in ASC order (oldest first) to match UI expectation
    rows.reverse();
    return rows.map(r => JSON.parse(r.raw));
  } catch {
    return [];
  }
}

/**
 * Get messages older than a given createdAt for scroll-up pagination.
 */
export async function getLocalMessagesBefore(
  conversationId: string,
  beforeCreatedAt: string,
  count: number = 30
): Promise<any[]> {
  try {
    const rows = await chatDB.messages
      .where('[conversationId+createdAt]')
      .between([conversationId, Dexie.minKey], [conversationId, beforeCreatedAt], true, false)
      .reverse()
      .limit(count)
      .toArray();

    rows.reverse();
    return rows.map(r => JSON.parse(r.raw));
  } catch {
    return [];
  }
}

/**
 * Upsert messages into IndexedDB. Uses bulkPut for efficient deduplication.
 */
export async function upsertLocalMessages(messages: any[]): Promise<void> {
  if (!messages.length) return;
  try {
    const rows: LocalMessage[] = messages.map(m => ({
      id: String(m.messageId || m.id),
      conversationId: m.conversationId,
      createdAt: m.createdAt || new Date().toISOString(),
      senderId: m.senderId || '',
      raw: JSON.stringify(m),
    }));
    await chatDB.messages.bulkPut(rows);
  } catch {
    // Silently fail — IndexedDB is a performance cache, not critical
  }
}
