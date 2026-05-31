import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RingiSettings, User } from '../types';

// ── ntfy push ────────────────────────────────────────────────────
async function ntfyPush(topic: string, title: string, body: string): Promise<void> {
  if (!topic.trim()) return;
  await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic.trim(), title, message: body, priority: 3, tags: ['shopping_cart'] }),
  });
}

// ── Firestore notification write ──────────────────────────────────
type FsUser = 'saku' | 'takahashi' | 'both';

function ringiToFsId(ringiUser: User, settings: RingiSettings): FsUser {
  const name = (ringiUser === 'A' ? settings.userA.name : settings.userB.name).toLowerCase();
  if (/たかはし|けんしん|kenshin|takahashi/.test(name)) return 'takahashi';
  return 'saku';
}

async function writeNotification(params: {
  toUser: FsUser;
  type: string;
  title: string;
  body: string;
  linkedId?: string | null;
}): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    toUser: params.toUser,
    fromApp: 'wishlist',
    type: params.type,
    title: params.title,
    body: params.body,
    isRead: false,
    linkedUrl: 'https://RESET3911.github.io/ST_WISHLIST/',
    linkedId: params.linkedId ?? null,
    createdAt: Date.now(),
  });
}

// ── Public API ────────────────────────────────────────────────────
export async function notifyItemAdded(
  itemName: string,
  price: number | undefined,
  adder: User,
  settings: RingiSettings,
  itemId?: string,
): Promise<void> {
  const adderName = adder === 'A' ? settings.userA.name : settings.userB.name;
  const otherUser: User = adder === 'A' ? 'B' : 'A';
  const toUser = ringiToFsId(otherUser, settings);
  const priceStr = price != null ? `\n金額: ¥${price.toLocaleString()}` : '';
  const title = `🛍️ ウィッシュリストに追加：${itemName}`;
  const body  = `${adderName}が追加しました${priceStr}`;

  await Promise.allSettled([
    writeNotification({ toUser, type: 'wishlist_added', title, body, linkedId: itemId ?? null }),
    ntfyPush(settings.ntfyTopic, title, body),
  ]);
}

export async function notifyRingiApply(
  itemName: string,
  price: number | undefined,
  applicant: User,
  settings: RingiSettings,
  itemId?: string,
): Promise<void> {
  const applicantName = applicant === 'A' ? settings.userA.name : settings.userB.name;
  const otherUser: User = applicant === 'A' ? 'B' : 'A';
  const toUser = ringiToFsId(otherUser, settings);
  const priceStr = price != null ? `\n金額: ¥${price.toLocaleString()}` : '';
  const title = `🛍️ ウィッシュリストから申請：${itemName}`;
  const body  = `${applicantName}がRINGIに申請しました${priceStr}`;

  await Promise.allSettled([
    writeNotification({ toUser, type: 'wishlist_ringi_apply', title, body, linkedId: itemId ?? null }),
    ntfyPush(settings.ntfyTopic, title, body),
  ]);
}
