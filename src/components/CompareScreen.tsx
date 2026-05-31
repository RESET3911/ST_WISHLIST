import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, WishItem, RingiSettings, CashflowData, ItemScores } from '../types';
import { SCORE_AXES, BUY_CATEGORY_LABELS, BUY_CATEGORY_COLORS } from '../utils/scoreUtils';
import { saveComparison } from '../utils/storage';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';

type Props = {
  compareItemIds: string[];
  wishItems: WishItem[];
  currentUser: User;
  settings: RingiSettings;
  cashflowData?: CashflowData | null;
  onBack: () => void;
  onRingiApply: (item: WishItem, applicant: User) => Promise<void>;
};

type TimingLabel = '今月買える' | '入金後推奨' | '来月なら安全' | '3ヶ月後推奨' | '今は危険' | '---';

function calcTimingLabel(price: number | undefined, cf: CashflowData | null | undefined): TimingLabel {
  if (!cf || price == null) return '---';
  const canBuyNow = cf.currentMonthSurplus >= price * 1.2;
  const hasUnpaidRisk = cf.unpaidIncome >= price * 0.5;
  const afterPurchaseSavings = cf.savingsBalance - price;
  const isSafeAfterPurchase = afterPurchaseSavings >= cf.safetyLine;
  const threeMoSurplus = cf.currentMonthSurplus * 3;

  if (!isSafeAfterPurchase) return '今は危険';
  if (canBuyNow && !hasUnpaidRisk) return '今月買える';
  if (canBuyNow && hasUnpaidRisk) return '入金後推奨';
  if (!canBuyNow && cf.nextMonthFixedIncome >= price) return '来月なら安全';
  if (threeMoSurplus >= price) return '3ヶ月後推奨';
  return '今は危険';
}

const TIMING_COLORS: Record<TimingLabel, string> = {
  '今月買える': 'text-green-700 bg-green-50',
  '入金後推奨': 'text-yellow-700 bg-yellow-50',
  '来月なら安全': 'text-blue-700 bg-blue-50',
  '3ヶ月後推奨': 'text-purple-700 bg-purple-50',
  '今は危険': 'text-red-700 bg-red-50',
  '---': 'text-gray-400 bg-gray-50',
};

export default function CompareScreen({
  compareItemIds,
  wishItems,
  currentUser,
  settings,
  cashflowData,
  onBack,
  onRingiApply,
}: Props) {
  const items = compareItemIds
    .map(id => wishItems.find(w => w.id === id))
    .filter((w): w is WishItem => !!w);

  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, '']))
  );
  const [applyTarget, setApplyTarget] = useState<WishItem | null>(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleApply = async () => {
    if (!applyTarget) return;
    setApplying(true);
    try {
      await onRingiApply(applyTarget, currentUser);
      setToast('RINGIに申請しました！');
    } catch {
      setToast('申請に失敗しました');
    } finally {
      setApplying(false);
      setApplyTarget(null);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const now = new Date();
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const id = uuidv4();
      await saveComparison({
        id,
        createdBy: currentUser,
        itemIds: compareItemIds,
        notes,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      });
      const url = `${window.location.origin}/ST_WISHLIST/?compare=${id}`;
      await navigator.clipboard.writeText(url);
      setToast('シェアURLをコピーしました！');
    } catch {
      setToast('シェアに失敗しました');
    } finally {
      setSharing(false);
    }
  };

  const getBestItem = () => {
    const scored = items.filter(i => i.totalScore != null);
    if (!scored.length) return null;
    return scored.reduce((a, b) => (a.totalScore! >= b.totalScore! ? a : b));
  };
  const bestItem = getBestItem();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex-1">候補比較</h2>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="text-sm text-primary-600 font-medium px-3 py-1.5 rounded-lg bg-primary-50 active:bg-primary-100 disabled:opacity-50"
          >
            {sharing ? '保存中...' : '📤 シェア'}
          </button>
        </div>
      </div>

      {/* Recommendation banner */}
      {bestItem && (
        <div className="max-w-5xl mx-auto px-4 pt-3">
          <div className="bg-primary-50 border border-primary-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-primary-600 text-sm font-medium">💡 スコア最高:</span>
            <span className="font-bold text-primary-700 text-sm">{bestItem.name}</span>
            <span className="text-primary-500 text-sm">({bestItem.totalScore}点)</span>
          </div>
        </div>
      )}

      {/* Compare columns (horizontal scroll) */}
      <div className="overflow-x-auto pb-8">
        <div
          className="flex gap-3 px-4 pt-3 pb-4"
          style={{ minWidth: `${items.length * 260 + 32}px` }}
        >
          {items.map(item => {
            const ownerName = item.owner === 'A' ? settings.userA.name : settings.userB.name;
            const timingLabel = calcTimingLabel(item.price, cashflowData);
            const isBest = item.id === bestItem?.id;

            return (
              <div
                key={item.id}
                className={`w-60 flex-shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden ${isBest ? 'ring-2 ring-primary-400' : ''}`}
              >
                {/* Column header */}
                <div className={`px-4 py-3 ${isBest ? 'bg-primary-50' : 'bg-gray-50'}`}>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ownerName}の希望</p>
                  {isBest && <p className="text-xs text-primary-600 font-semibold mt-1">👑 スコア最高</p>}
                </div>

                <div className="divide-y divide-gray-100">
                  {/* Price */}
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">金額</p>
                    <p className="font-bold text-gray-900">
                      {item.price != null ? `¥${item.price.toLocaleString()}` : '未設定'}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">優先度スコア</p>
                    {item.totalScore != null ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{item.totalScore}<span className="text-xs text-gray-400 font-normal ml-0.5">/ 25</span></span>
                        {item.buyCategory && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${BUY_CATEGORY_COLORS[item.buyCategory]}`}>
                            {BUY_CATEGORY_LABELS[item.buyCategory]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">未設定</span>
                    )}
                  </div>

                  {/* Purchase timing */}
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">購入タイミング</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIMING_COLORS[timingLabel]}`}>
                      {timingLabel}
                    </span>
                  </div>

                  {/* Score axes */}
                  {item.scores && (
                    <div className="px-4 py-2.5 space-y-2">
                      <p className="text-xs text-gray-400">スコア内訳</p>
                      {SCORE_AXES.map(axis => {
                        const val = item.scores![axis.key as keyof Omit<ItemScores, 'costPenalty'>];
                        return (
                          <div key={axis.key} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16 flex-shrink-0">{axis.label}</span>
                            <div className="flex gap-0.5 flex-1">
                              {[1, 2, 3, 4, 5].map(n => (
                                <div
                                  key={n}
                                  className={`flex-1 h-1.5 rounded-full ${n <= val ? 'bg-primary-400' : 'bg-gray-200'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-gray-600 w-3 text-right">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Memo */}
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-gray-400 mb-1">元のメモ</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">
                      {item.memo || '—'}
                    </p>
                  </div>

                  {/* Compare note */}
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-gray-400 mb-1">比較メモ</p>
                    <textarea
                      value={notes[item.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="メモを入力..."
                      rows={2}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary-300"
                    />
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 space-y-2">
                    {item.status === 'wishlist' && (
                      <button
                        onClick={() => setApplyTarget(item)}
                        className="w-full text-xs font-semibold py-2 px-3 bg-primary-500 text-white rounded-xl active:bg-primary-700"
                      >
                        📝 RINGI申請
                      </button>
                    )}
                    {item.status === 'pending' && (
                      <div className="text-center text-xs text-yellow-600 font-medium py-1">⏳ 申請中</div>
                    )}
                    {item.status === 'approved' && (
                      <div className="text-center text-xs text-green-600 font-medium py-1">✅ 承認済み</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RINGI confirm modal */}
      {applyTarget && (
        <ConfirmModal
          title="RINGIに申請する"
          message={`「${applyTarget.name}」${applyTarget.price != null ? `（¥${applyTarget.price.toLocaleString()}）` : ''}をRINGIに申請します。`}
          confirmLabel={applying ? '申請中...' : '申請する'}
          onConfirm={handleApply}
          onCancel={() => setApplyTarget(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
