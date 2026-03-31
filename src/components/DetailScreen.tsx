import { useState } from 'react';
import { User, WishItem, WishStatus, Priority, RingiApplication, RingiSettings } from '../types';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';

type Props = {
  item: WishItem;
  currentUser: User;
  settings: RingiSettings;
  ringiApp?: RingiApplication;
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

export default function DetailScreen({
  item,
  currentUser,
  settings,
  ringiApp,
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
          {/* Status & owner row */}
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
          </div>

          {/* Price */}
          {item.price != null && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">金額</p>
              <p className="text-2xl font-bold text-gray-900">¥{item.price.toLocaleString()}</p>
            </div>
          )}

          {/* Category */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">カテゴリ</p>
            <p className="text-sm text-gray-700">{item.category}</p>
          </div>

          {/* URL */}
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

          {/* Memo */}
          {item.memo && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">メモ</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.memo}</p>
            </div>
          )}

          {/* Date */}
          <p className="text-xs text-gray-400">
            追加日: {new Date(item.createdAt).toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* RINGI status card */}
        {ringiInfo && ringiApp && (
          <div className={`border rounded-2xl p-4 ${ringiInfo.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{ringiInfo.icon}</span>
              <p className="font-semibold">RINGI: {ringiInfo.label}</p>
            </div>
            <div className="text-sm space-y-1">
              <p>申請金額: ¥{ringiApp.amount.toLocaleString()}</p>
              {ringiApp.comment && (
                <p>コメント: {ringiApp.comment}</p>
              )}
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
          {/* 稟議申請する */}
          {item.status === 'wishlist' && isMyItem && (
            <button
              onClick={() => setShowApplyConfirm(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <span>📝</span>
              <span>RINGIに申請する</span>
            </button>
          )}

          {/* 申請中 → 購入済み or ウィッシュリストに戻す */}
          {item.status === 'approved' && (
            <button
              onClick={() => setShowPurchasedConfirm(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <span>🛒</span>
              <span>購入済みにする</span>
            </button>
          )}

          {/* 否決 → ウィッシュリストに戻す */}
          {item.status === 'rejected' && isMyItem && (
            <button
              onClick={() => onRevertToWishlist(item.id)}
              className="btn-secondary w-full"
            >
              ウィッシュリストに戻す
            </button>
          )}

          {/* 削除 */}
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

      {/* Modals */}
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
          onConfirm={() => {
            onMarkPurchased(item.id);
            setShowPurchasedConfirm(false);
          }}
          onCancel={() => setShowPurchasedConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="削除の確認"
          message={`「${item.name}」を削除しますか？この操作は元に戻せません。`}
          confirmLabel="削除する"
          confirmDanger
          onConfirm={() => {
            onDelete();
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
