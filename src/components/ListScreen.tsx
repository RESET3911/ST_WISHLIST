import { useState } from 'react';
import { User, WishItem, WishStatus, RingiSettings, Priority } from '../types';

type TabType = 'all' | 'mine' | 'partner';

type Props = {
  currentUser: User;
  wishItems: WishItem[];
  settings: RingiSettings;
  onSelectItem: (id: string) => void;
  onAddItem: () => void;
  onSwitchUser: () => void;
};

const STATUS_LABELS: Record<WishStatus, string> = {
  wishlist: '欲しい',
  pending: '申請中',
  approved: '承認済み',
  rejected: '否決',
  purchased: '購入済み',
};

const STATUS_COLORS: Record<WishStatus, string> = {
  wishlist: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  purchased: 'bg-primary-100 text-primary-700',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-400',
  mid: 'bg-yellow-400',
  low: 'bg-gray-300',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  mid: '中',
  low: '低',
};

const FILTER_OPTIONS: { value: WishStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'wishlist', label: '欲しい' },
  { value: 'pending', label: '申請中' },
  { value: 'approved', label: '承認済み' },
  { value: 'purchased', label: '購入済み' },
];

export default function ListScreen({
  currentUser,
  wishItems,
  settings,
  onSelectItem,
  onAddItem,
  onSwitchUser,
}: Props) {
  const [tab, setTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<WishStatus | 'all'>('all');

  const myName = currentUser === 'A' ? settings.userA.name : settings.userB.name;
  const partnerUser: User = currentUser === 'A' ? 'B' : 'A';
  const partnerName = partnerUser === 'A' ? settings.userA.name : settings.userB.name;

  const filtered = wishItems
    .filter(item => {
      if (tab === 'mine') return item.owner === currentUser;
      if (tab === 'partner') return item.owner === partnerUser;
      return true;
    })
    .filter(item => statusFilter === 'all' || item.status === statusFilter)
    .sort((a, b) => {
      // 優先度順 → 日付順
      const priorityOrder: Record<Priority, number> = { high: 0, mid: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pendingCount = wishItems.filter(i => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛍️</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">ST WISHLIST</h1>
              <p className="text-xs text-gray-500">{myName}として使用中</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="bg-yellow-400 text-white text-xs font-bold rounded-full px-2 py-0.5">
                申請中 {pendingCount}
              </span>
            )}
            <button
              onClick={onSwitchUser}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200 transition-colors"
              aria-label="ユーザー切り替え"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 flex border-t border-gray-100">
          {[
            { key: 'all' as TabType, label: 'すべて' },
            { key: 'mine' as TabType, label: myName },
            { key: 'partner' as TabType, label: partnerName },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status filter chips */}
      <div className="max-w-lg mx-auto w-full px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === opt.value
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="max-w-lg mx-auto w-full px-4 flex-1 pb-24">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-gray-400 font-medium">アイテムがありません</p>
            <p className="text-gray-400 text-sm mt-1">+ ボタンで追加しましょう</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
              >
                {/* Priority bar */}
                <div className={`w-1.5 h-14 rounded-full flex-shrink-0 ${PRIORITY_COLORS[item.priority]}`} />

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.price != null && (
                      <span className="text-sm font-medium text-gray-700">
                        ¥{item.price.toLocaleString()}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    {tab === 'all' && (
                      <span className="text-xs text-primary-500 font-medium">
                        {item.owner === 'A' ? settings.userA.name : settings.userB.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-400">優先度:</span>
                    <span className="text-xs font-medium text-gray-600">
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onAddItem}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg
                   flex items-center justify-center text-3xl active:bg-primary-700 transition-colors z-10"
        aria-label="アイテムを追加"
      >
        +
      </button>
    </div>
  );
}
