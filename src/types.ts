export type User = 'A' | 'B';

export type WishStatus = 'wishlist' | 'pending' | 'approved' | 'rejected' | 'purchased';

export type Priority = 'high' | 'mid' | 'low';

export const CATEGORIES = [
  'ファッション',
  'ガジェット',
  'インテリア',
  '食・飲み',
  '体験・お出かけ',
  'コスメ・ケア',
  'その他',
] as const;
export type Category = typeof CATEGORIES[number];

export type WishItem = {
  id: string;
  owner: User;
  name: string;
  price?: number;
  url?: string;
  category: Category;
  priority: Priority;
  memo?: string;
  status: WishStatus;
  ringiId?: string;
  createdAt: string;
  updatedAt?: string;
};

// RINGIと共有するFirestoreの型
export type RingiSettings = {
  userA: { name: string; email: string };
  userB: { name: string; email: string };
  ntfyTopic: string;
};

export type RingiApplication = {
  id: string;
  applicant: User;
  item: string;
  amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comment?: string;
  createdAt: string;
  decidedAt?: string;
};
