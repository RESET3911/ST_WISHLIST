import { db } from '../firebase';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import {
  WishItem,
  RingiApplication,
  RingiSettings,
  Comparison,
  CashflowIncome,
  CashflowExpense,
} from '../types';

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// ── WishItems ─────────────────────────────────────────────────────

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

// ── RINGI ─────────────────────────────────────────────────────────

export function subscribeRingiSettings(
  callback: (settings: RingiSettings) => void
): () => void {
  return onSnapshot(doc(db, 'ringi', 'settings'), snap => {
    if (snap.exists()) {
      callback(snap.data() as RingiSettings);
    }
  });
}

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

export async function saveRingiApplication(
  app: RingiApplication
): Promise<void> {
  await setDoc(doc(db, 'applications', app.id), stripUndefined(app));
}

// ── Comparisons ───────────────────────────────────────────────────

export async function saveComparison(comparison: Comparison): Promise<void> {
  await setDoc(doc(db, 'comparisons', comparison.id), comparison);
}

export async function getComparison(id: string): Promise<Comparison | null> {
  const snap = await getDoc(doc(db, 'comparisons', id));
  return snap.exists() ? (snap.data() as Comparison) : null;
}

// ── CASHFLOW連携（同一Firebaseプロジェクト）──────────────────────

export function subscribeCashflowIncomes(
  callback: (items: CashflowIncome[]) => void
): () => void {
  const q = query(collection(db, 'cashflow_incomes'), orderBy('invoiceDate', 'desc'));
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as CashflowIncome)));
    },
    () => callback([])
  );
}

export function subscribeCashflowExpenses(
  callback: (items: CashflowExpense[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'cashflow_expenses'),
    (snap: QuerySnapshot<DocumentData>) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as CashflowExpense)));
    },
    () => callback([])
  );
}

export function subscribeCashflowSavings(
  callback: (amount: number) => void
): () => void {
  return onSnapshot(
    doc(db, 'cashflow_settings', 'savings'),
    snap => callback(snap.exists() ? ((snap.data().amount as number) ?? 0) : 0),
    () => callback(0)
  );
}

export function subscribeCashflowSafetyLine(
  callback: (amount: number) => void
): () => void {
  return onSnapshot(
    doc(db, 'cashflow_settings', 'safety'),
    snap => callback(snap.exists() ? ((snap.data().safetyLine as number) ?? 500000) : 500000),
    () => callback(500000)
  );
}

export async function saveCashflowSafetyLine(amount: number): Promise<void> {
  await setDoc(doc(db, 'cashflow_settings', 'safety'), { safetyLine: amount });
}
