/**
 * smsReplyTracker.ts
 *
 * STANDALONE FILE — no imports from your existing code. Adding this file
 * changes nothing until you wire it in (see integration steps in the
 * README that comes with this).
 *
 * PURPOSE: When you send an alert SMS like:
 *   "ORCA ALERT: high wave warning. Reply SAFE if you are okay, or HELP if you need rescue."
 * this module stores and looks up who replied what, so your dashboard can
 * show a live "who is safe / who needs help" list — the two-way SMS
 * acknowledgment feature.
 *
 * STORAGE NOTE: this starts with a simple in-memory Map so you can test it
 * in 5 minutes with zero database setup. It will reset if your server
 * restarts. Once it works, swap `saveReply`/`getReply` to write to your
 * existing Neon Postgres table instead — everything else stays the same.
 */

export type ReplyStatus = 'SAFE' | 'HELP' | 'UNKNOWN';

export interface SmsReply {
  phone: string;
  status: ReplyStatus;
  rawMessage: string;
  receivedAt: string; // ISO timestamp
}

// In-memory store: phone number -> latest reply
const replyStore = new Map<string, SmsReply>();

/**
 * Call this whenever an inbound SMS arrives at your gateway
 * (the Android app / Twilio webhook posts the raw text here).
 */
export function recordReply(phone: string, rawMessage: string): SmsReply {
  const normalized = rawMessage.trim().toUpperCase();

  let status: ReplyStatus = 'UNKNOWN';
  if (normalized.includes('SAFE')) status = 'SAFE';
  else if (normalized.includes('HELP')) status = 'HELP';

  const reply: SmsReply = {
    phone,
    status,
    rawMessage,
    receivedAt: new Date().toISOString(),
  };

  replyStore.set(phone, reply);
  return reply;
}

/** Get the latest reply for one phone number */
export function getReply(phone: string): SmsReply | undefined {
  return replyStore.get(phone);
}

/** Get every reply currently stored — useful for a dashboard list */
export function getAllReplies(): SmsReply[] {
  return Array.from(replyStore.values());
}

/** Get only the people who need help — for a rescue-priority view */
export function getHelpRequests(): SmsReply[] {
  return getAllReplies().filter((r) => r.status === 'HELP');
}
