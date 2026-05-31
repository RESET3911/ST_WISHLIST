import { useState } from 'react';
import { User, WishItem, WishStatus, Priority, RingiApplication, RingiSettings, CashflowData, ItemScores } from '../types';
import { SCORE_AXES, BUY_CATEGORY_LABELS, BUY_CATEGORY_COLORS } from '../utils/scoreUtils';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';

type Props = {
  item: WishItem;
  currentUser: User;
  settings: RingiSettings;
  ringiApp?: RingiApplication;
  cashflowData?: CashflowData | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRingiApply: (item: WishItem, applicant: User) => Promise<void>;
  onMarkPurchased: (id: string) => void;
  onRevertToWishlist: (id: string) => void;
};

const STATUS_LABELS: Record<WishStatus, string> = {
  wishlist: '欲しい',
  pending: '申請中',
  approved: '承認済み',
  rejected: '否決',
  purchased: '購入済み',
};

const STATUS_BG: Record<WishStatus, string> = {
  wishlist: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  purchased: 'bg-primary-100 text-primary-700',
};

const PRIORITY_LABELS: Record<Priority, string> = { high: '高', mid: '中', low: '低' };
const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-600',
  mid: 'bg-yellow-100 text-yellow-600',
  low: 'bg-gray-100 text-gray-500',
};

const RINGI_STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: '決裁待ち', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: '⏳' },
  approved: { label: '承認されました', color: 'bg-green-50 border-green-200 text-green-700', icon: '✅' },
  rejected: { label: '否決されました', color: 'bg-red-50 border-red-200 text-red-600', icon: '❌' },
  cancelled: { label: '取り消し済み', color: 'bg-gray-50 border-gray-200 text-gray-500', icon: '🚫' },
};

// SVGレーダーチャート（recharts不要）
function RadarChart({ scores }: { scores: ItemScores }) {
  const cx = 110, cy = 100, maxR = 65;
  const labelR = maxR + 22;
  const count = SCORE_AXES.length;
  const startAngle = -Math.PI / 2;

  const toXY = (i: number, r: number) => {
    const angle = startAngle + (i * 2 * Math.PI) / count;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const dataValues = SCORE_AXES.map(a => scores[a.key as keyof Omit<ItemScores, 'costPenalty'>]);
  const dataPoints = dataValues.map((v, i) => toXY(i, (v / 5) * maxR));
  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const gridPolygons = [1, 2, 3, 4, 5].map(level => {
    return SCORE_AXES.map((_, i) => {
      const p = toXY(i, (level / 5) * maxR);
      return `${p.x},${p.y}`;
    }).join(' ');
  });

  const axisLines = SCORE_AXES.map((_, i) => {
    const p = toXY(i, maxR);
    return { x2: p.x, y2: p.y };
  });

  const labelPositions = SCORE_AXES.map((axis, i) => {
    const p = toXY(i, labelR);
    return { ...p, label: axis.label };
  });

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[220px] mx-auto">
      {/* Grid polygons */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="0.7" />
      ))}
      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line key={i} x1={cx} y1={cy} x2={line.x2} y2={line.y2} stroke="#e5e7eb" strokeWidth="0.7" />
      ))}
      {/* Data polygon */}
      <polygon points={polyPoints} fill="#8b5cf6" fillOpacity="0.25" stroke="#8b5cf6" strokeWidth="2" />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#8b5cf6" />
      ))}
      {/* Labels */}
      {labelPositions.map((lp, i) => (
        <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#6b7280">
          {lp.label}
        </text>
      ))}
    </svg>
  );
}

type TimingResult = {
  label: string;
  detail: string;
  color: string;
  icon: string;
};

function calcPurchaseTiming(price: number, cf: CashflowData): TimingResult {
  const canBuyNow = cf.currentMonthSurplus >= price * 1.2;
  const hasUnpaidRisk = cf.unpaidIncome >= price * 0.5;
  const afterPurchaseSavings = cf.savingsBalance - price;
  const isSafeAfterPurchase = afterPurchaseSavings >= cf.safetyLine;
  const threeMoSurplus = cf.currentMonthSurplus * 3;

  if (!isSafeAfterPurchase) {
    return { label: '今は危険', detail: '購入後の貯蓄が安全ラインを下回ります', color: 'bg-red-50 border-red-200 text-red-700', icon: '🚨' };
  }
  if (canBuyNow && !hasUnpaidRisk) {
    return { label: '今月買える', detail: '余剰金十分。安全に購入できます', color: 'bg-green-50 border-green-200 text-green-700', icon: '✅' };
  }
  if (canBuyNow && hasUnpaidRisk) {
    return { label: '入金後推奨', detail: '未回収入金の回収後に購入を推奨', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: '⏳' };
  }
  if (!canBuyNow && cf.nextMonthFixedIncome >= price) {
    return { label: '来月なら安全', detail: '来月の確定収入で対応可能', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '📅' };
  }
  if (threeMoSurplus >= price) {
    return { label: '3ヶ月後推奨', detail: '3ヶ月の余剰金を積み上げれば購入可能', color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '📆' };
  }
  return { label: '今は危険', detail: '現状の収支では購入は厳しい状況です', color: 'bg-red-50 border-red-200 text-red-700', icon: '🚨' };
}

function fmt(n: number) { return `¥${Math.abs(n).toLocaleString()}`; }

export default function DetailScreen({
  item,
  currentUser,
  settings,
  ringiApp,
  cashflowData,
  onBack,
  onEdit,
  onDelete,
  onRingiApply,
  onMarkPurchased,
  onRevertToWishlist,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showPurchasedConfirm, setShowPurchasedConfirm] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const ownerName = item.owner === 'A' ? settings.userA.name : settings.userB.name;
  const isMyItem = item.owner === currentUser;

  const handleApply = async () => {
    setApplying(true);
    try {
      await onRingiApply(item, currentUser);
      setToast('RINGIに申請しました！');
    } catch {
      setToast('申請に失敗しました');
    } finally {
      setApplying(false);
      setShowApplyConfirm(false);
    }
  };

  const ringiInfo = ringiApp ? RINGI_STATUS_INFO[ringiApp.status] : null;

  // Timing judgment
  const timing = (cashflowData && item.price != null)
    ? calcPurchaseTiming(item.price, cashflowData)
    : null;

  const canBuyNow = timing?.label === '今月買える';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 truncate flex-1">{item.name}</h2>
          {isMyItem && item.status !== 'purchased' && (
            <button
              onClick={onEdit}
              className="text-sm text-primary-600 font-medium px-3 py-1 rounded-lg active:bg-primary-50"
            >
              編集
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        {/* Main card */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_BG[item.status]}`}>
              {STATUS_LABELS[item.status]}
            </span>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${PRIORITY_COLORS[item.priority]}`}>
              優先度: {PRIORITY_LABELS[item.priority]}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {ownerName}の希望
            </span>
            {canBuyNow && (
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
                ✅ 今月買える
              </span>
            )}
          </div>

          {item.price != null && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">金額</p>
              <p className="text-2xl font-bold text-gray-900">¥{item.price.toLocaleString()}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-0.5">カテゴリ</p>
            <p className="text-sm text-gray-700">{item.category}</p>
          </div>

          {item.url && (
            <div>
              <p className="text-xs text-gray-400 mb-1">リンク</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 text-sm font-medium flex items-center gap-1 active:text-primary-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                商品ページを開く
              </a>
            </div>
          )}

          {item.memo && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">メモ</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.memo}</p>
            </div>
          )}

          <p className="text-xs text-gray-400">
            追加日: {new Date(item.createdAt).toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* Score card */}
        {item.scores && item.totalScore != null && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">優先度スコア</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{item.totalScore}</span>
                <span className="text-sm text-gray-400">/ 25</span>
                {item.buyCategory && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BUY_CATEGORY_COLORS[item.buyCategory]}`}>
                    {BUY_CATEGORY_LABELS[item.buyCategory]}
                  </span>
                )}
              </div>
            </div>

            {/* Radar chart */}
            <RadarChart scores={item.scores} />

            {/* Score breakdown */}
            <div className="space-y-2">
              {SCORE_AXES.map(axis => {
                const val = item.scores![axis.key as keyof Omit<ItemScores, 'costPenalty'>];
                return (
                  <div key={axis.key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 flex-shrink-0">{axis.label}</span>
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <div
                          key={n}
                          className={`flex-1 h-2 rounded-full ${n <= val ? 'bg-primary-400' : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-4 text-right">{val}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">金額負担</span>
                <span className={`text-xs font-bold flex-1 ${item.scores.costPenalty < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {item.scores.costPenalty === 0 ? '±0' : item.scores.costPenalty}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Purchase timing card */}
        {timing && cashflowData && item.price != null && (
          <div className={`border rounded-2xl p-4 space-y-3 ${timing.color}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{timing.icon}</span>
              <h3 className="font-bold">📊 購入タイミング判定</h3>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">この商品</span>
                <span className="font-semibold">{fmt(item.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">今月の余剰金</span>
                <span className="font-semibold flex items-center gap-1">
                  {fmt(cashflowData.currentMonthSurplus)}
                  <span>{cashflowData.currentMonthSurplus >= item.price * 1.2 ? '✅' : '⚠️'}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">未回収入金</span>
                <span className="font-semibold flex items-center gap-1">
                  {fmt(cashflowData.unpaidIncome)}
                  <span>{cashflowData.unpaidIncome >= item.price * 0.5 ? '⚠️' : '✅'}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">購入後の貯蓄残高</span>
                <span className="font-semibold flex items-center gap-1">
                  {fmt(cashflowData.savingsBalance - item.price)}
                  <span>{cashflowData.savingsBalance - item.price >= cashflowData.safetyLine ? '✅' : '⚠️'}</span>
                </span>
              </div>
            </div>

            <div className="border-t border-current border-opacity-20 pt-2">
              <p className="font-bold text-base">判定: {timing.label}</p>
              <p className="text-sm mt-0.5">{timing.detail}</p>
            </div>
          </div>
        )}

        {/* RINGI status card */}
        {ringiInfo && ringiApp && (
          <div className={`border rounded-2xl p-4 ${ringiInfo.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{ringiInfo.icon}</span>
              <p className="font-semibold">RINGI: {ringiInfo.label}</p>
            </div>
            <div className="text-sm space-y-1">
              <p>申請金額: ¥{ringiApp.amount.toLocaleString()}</p>
              {ringiApp.comment && <p>コメント: {ringiApp.comment}</p>}
              {ringiApp.decidedAt && (
                <p>決裁日: {new Date(ringiApp.decidedAt).toLocaleDateString('ja-JP')}</p>
              )}
            </div>
          </div>
        )}

        {/* Purchase completed banner */}
        {item.status === 'purchased' && (
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-primary-700">購入済み！</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {item.status === 'wishlist' && isMyItem && (
            <button
              onClick={() => setShowApplyConfirm(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <span>📝</span>
              <span>RINGIに申請する</span>
            </button>
          )}

          {item.status === 'approved' && (
            <button
              onClick={() => setShowPurchasedConfirm(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <span>🛒</span>
              <span>購入済みにする</span>
            </button>
          )}

          {item.status === 'rejected' && isMyItem && (
            <button
              onClick={() => onRevertToWishlist(item.id)}
              className="btn-secondary w-full"
            >
              ウィッシュリストに戻す
            </button>
          )}

          {isMyItem && item.status !== 'pending' && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full font-semibold py-3 px-6 rounded-xl transition-colors min-h-[44px] text-red-500 border-2 border-red-200 bg-white active:bg-red-50"
            >
              削除する
            </button>
          )}
        </div>
      </div>

      {showApplyConfirm && (
        <ConfirmModal
          title="RINGIに申請する"
          message={`「${item.name}」${item.price != null ? `（¥${item.price.toLocaleString()}）` : ''}をRINGIに申請します。`}
          confirmLabel={applying ? '申請中...' : '申請する'}
          onConfirm={handleApply}
          onCancel={() => setShowApplyConfirm(false)}
        />
      )}

      {showPurchasedConfirm && (
        <ConfirmModal
          title="購入済みにする"
          message={`「${item.name}」を購入済みにしますか？`}
          confirmLabel="購入済みにする"
          onConfirm={() => { onMarkPurchased(item.id); setShowPurchasedConfirm(false); }}
          onCancel={() => setShowPurchasedConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="削除の確認"
          message={`「${item.name}」を削除しますか？この操作は元に戻せません。`}
          confirmLabel="削除する"
          confirmDanger
          onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
