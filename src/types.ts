export type User = 'A' | 'B';

export type WishStatus = 'wishlist' | 'pending' | 'approved' | 'rejected' | 'purchased';

export type Priority = 'high' | 'mid' | 'low';

export type BuyCategory = 'buy_now' | 'hold' | 'wait_sale' | 'unnecessary';

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

export type ItemScores = {
  want: number;            // 欲しい度 1-5
  need: number;            // 必要度 1-5
  urgency: number;         // 緊急度 1-5
  lifeImprovement: number; // 生活改善度 1-5
  partnerImpact: number;   // 相手への影響 1-5
  costPenalty: number;     // 金額負担（自動計算、負の値）
};

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
  scores?: ItemScores | null;
  totalScore?: number | null;
  buyCategory?: BuyCategory | null;
};

export type Comparison = {
  id: string;
  createdBy: User;
  itemIds: string[];
  notes: Record<string, string>;
  createdAt: string;
  expiresAt: string;
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

// CASHFLOW連携用（cashflow_* コレクションから読み取る最小型）
export type CashflowIncome = {
  id: string;
  incomeType: 'fixed' | 'variable';
  amount: number;
  invoiceDate: string; // YYYY-MM-DD
  isPaid: boolean;
};

export type CashflowExpense = {
  id: string;
  amount: number;
  isActive: boolean;
};

export type CashflowData = {
  currentMonthSurplus: number;   // 今月の余剰金
  unpaidIncome: number;          // 未回収入金合計
  safetyLine: number;            // 安全ライン
  savingsBalance: number;        // 貯蓄残高
  nextMonthFixedIncome: number;  // 来月の確定収入
};
