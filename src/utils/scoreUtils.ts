import type { BuyCategory, ItemScores } from '../types';

export function calcCostPenalty(price?: number): number {
  if (!price || price <= 0) return 0;
  if (price <= 5000) return -1;
  if (price <= 20000) return -2;
  if (price <= 50000) return -3;
  if (price <= 100000) return -4;
  return -5;
}

export function calcTotalScore(scores: ItemScores): number {
  const { want, need, urgency, lifeImprovement, partnerImpact, costPenalty } = scores;
  return Math.max(0, want + need + urgency + lifeImprovement + partnerImpact + costPenalty);
}

export function calcBuyCategory(totalScore: number): BuyCategory {
  if (totalScore >= 18) return 'buy_now';
  if (totalScore >= 12) return 'hold';
  if (totalScore >= 8) return 'wait_sale';
  return 'unnecessary';
}

export const BUY_CATEGORY_LABELS: Record<BuyCategory, string> = {
  buy_now: '🔥 今買うべき',
  hold: '⏳ 保留',
  wait_sale: '🏷️ セール待ち',
  unnecessary: '💭 いらないかも',
};

export const BUY_CATEGORY_COLORS: Record<BuyCategory, string> = {
  buy_now: 'bg-red-100 text-red-700',
  hold: 'bg-amber-100 text-amber-700',
  wait_sale: 'bg-blue-100 text-blue-700',
  unnecessary: 'bg-gray-100 text-gray-500',
};

export const SCORE_AXES: { key: keyof Omit<ItemScores, 'costPenalty'>; label: string }[] = [
  { key: 'want', label: '欲しい度' },
  { key: 'need', label: '必要度' },
  { key: 'urgency', label: '緊急度' },
  { key: 'lifeImprovement', label: '生活改善度' },
  { key: 'partnerImpact', label: '相手への影響' },
];
