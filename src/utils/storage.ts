import { db } from '../firebase';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { WishItem, RingiApplication, RingiSettings } from '../types';

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export async function saveWishItem(item: WishItem): Promise<void> {
  await setDoc(doc(db, 'wishlist', item.id), stripUndefined(item));
}

export async function updateWishItem(
  id: string,
  data: Partial<WishItem>
): Promise<void> {
  await updateDoc(doc(db, 'wishlist', id), stripUndefined(data));
}

export async function deleteWishItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'wishlist', id));
}

export function subscribeWishItems(
  callback: (items: WishItem[]) => void,
  onError?: () => void
): () => void {
  return onSnapshot(
    collection(db, 'wishlist'),
    snap => {
      const items = snap.docs.map(d => d.data() as WishItem);
      callback(items);
    },
    () => onError?.()
  );
}

// RINGIの設定（ユーザー名など）を読み込む
export function subscribeRingiSettings(
  callback: (settings: RingiSettings) => void
): () => void {
  return onSnapshot(doc(db, 'ringi', 'settings'), snap => {
    if (snap.exists()) {
      callback(snap.data() as RingiSettings);
    }
  });
}

// RINGIの申請一覧を監視（ステータス同期用）
export function subscribeRingiApplications(
  callback: (apps: RingiApplication[]) => void,
  onError?: () => void
): () => void {
  return onSnapshot(
    collection(db, 'applications'),
    snap => {
      const apps = snap.docs.map(d => d.data() as RingiApplication);
      callback(apps);
    },
    () => onError?.()
  );
}

// RINGIに申請を追加
export async function saveRingiApplication(
  app: RingiApplication
): Promise<void> {
  await setDoc(doc(db, 'applications', app.id), stripUndefined(app));
}
