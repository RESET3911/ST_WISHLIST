import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, WishItem, Category, Priority, CATEGORIES } from '../types';

type Props = {
  currentUser: User;
  editItem?: WishItem;
  onSave: (item: WishItem) => void;
  onBack: () => void;
};

export default function AddItemScreen({ currentUser, editItem, onSave, onBack }: Props) {
  const [name, setName] = useState(editItem?.name ?? '');
  const [price, setPrice] = useState(editItem?.price != null ? String(editItem.price) : '');
  const [url, setUrl] = useState(editItem?.url ?? '');
  const [category, setCategory] = useState<Category>(editItem?.category ?? 'その他');
  const [priority, setPriority] = useState<Priority>(editItem?.priority ?? 'mid');
  const [memo, setMemo] = useState(editItem?.memo ?? '');

  const isEdit = !!editItem;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: WishItem = {
      id: editItem?.id ?? uuidv4(),
      owner: editItem?.owner ?? currentUser,
      name: name.trim(),
      price: price ? parseFloat(price) : undefined,
      url: url.trim() || undefined,
      category,
      priority,
      memo: memo.trim() || undefined,
      status: editItem?.status ?? 'wishlist',
      ringiId: editItem?.ringiId,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(item);
  };

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
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'アイテムを編集' : '欲しいものを追加'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 品名 */}
        <div>
          <label className="label">品名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例: AirPods Pro"
            className="input-field"
            required
          />
        </div>

        {/* 金額 */}
        <div>
          <label className="label">金額（任意）</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              className="input-field pl-8"
            />
          </div>
        </div>

        {/* URL */}
        <div>
          <label className="label">URL（任意）</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="input-field"
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label className="label">カテゴリ</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  category === cat
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 優先度 */}
        <div>
          <label className="label">優先度</label>
          <div className="flex gap-3">
            {([
              { value: 'high' as Priority, label: '高', color: 'border-red-400 bg-red-50 text-red-600', active: 'bg-red-400 text-white border-red-400' },
              { value: 'mid' as Priority, label: '中', color: 'border-yellow-400 bg-yellow-50 text-yellow-600', active: 'bg-yellow-400 text-white border-yellow-400' },
              { value: 'low' as Priority, label: '低', color: 'border-gray-300 bg-gray-50 text-gray-500', active: 'bg-gray-400 text-white border-gray-400' },
            ]).map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 rounded-xl border-2 font-medium text-sm transition-colors ${
                  priority === p.value ? p.active : p.color
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* メモ */}
        <div>
          <label className="label">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="用途や詳細など..."
            rows={3}
            className="input-field resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="btn-primary w-full"
        >
          {isEdit ? '保存する' : '追加する'}
        </button>
      </form>
    </div>
  );
}
