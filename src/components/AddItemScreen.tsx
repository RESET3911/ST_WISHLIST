import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, WishItem, Category, Priority, CATEGORIES, ItemScores } from '../types';
import { calcCostPenalty, calcTotalScore, calcBuyCategory, SCORE_AXES, BUY_CATEGORY_LABELS, BUY_CATEGORY_COLORS } from '../utils/scoreUtils';

type Props = {
  currentUser: User;
  editItem?: WishItem;
  onSave: (item: WishItem) => void;
  onBack: () => void;
};

type Step = 'basic' | 'score';

const DEFAULT_SCORES = { want: 3, need: 3, urgency: 3, lifeImprovement: 3, partnerImpact: 3 };

export default function AddItemScreen({ currentUser, editItem, onSave, onBack }: Props) {
  const [step, setStep] = useState<Step>('basic');

  // Basic info
  const [name, setName] = useState(editItem?.name ?? '');
  const [price, setPrice] = useState(editItem?.price != null ? String(editItem.price) : '');
  const [url, setUrl] = useState(editItem?.url ?? '');
  const [category, setCategory] = useState<Category>(editItem?.category ?? 'その他');
  const [priority, setPriority] = useState<Priority>(editItem?.priority ?? 'mid');
  const [memo, setMemo] = useState(editItem?.memo ?? '');

  // Scores
  const existingScores = editItem?.scores;
  const [want, setWant] = useState(existingScores?.want ?? DEFAULT_SCORES.want);
  const [need, setNeed] = useState(existingScores?.need ?? DEFAULT_SCORES.need);
  const [urgency, setUrgency] = useState(existingScores?.urgency ?? DEFAULT_SCORES.urgency);
  const [lifeImprovement, setLifeImprovement] = useState(existingScores?.lifeImprovement ?? DEFAULT_SCORES.lifeImprovement);
  const [partnerImpact, setPartnerImpact] = useState(existingScores?.partnerImpact ?? DEFAULT_SCORES.partnerImpact);
  const [scoreEnabled] = useState(!!existingScores);

  const isEdit = !!editItem;
  const priceNum = price ? parseFloat(price) : undefined;
  const costPenalty = calcCostPenalty(priceNum);

  const buildScores = (): ItemScores => ({
    want, need, urgency, lifeImprovement, partnerImpact, costPenalty,
  });

  const buildItem = (withScore: boolean): WishItem => {
    const scores = withScore ? buildScores() : null;
    const totalScore = scores ? calcTotalScore(scores) : null;
    const buyCategory = totalScore != null ? calcBuyCategory(totalScore) : null;
    return {
      id: editItem?.id ?? uuidv4(),
      owner: editItem?.owner ?? currentUser,
      name: name.trim(),
      price: priceNum,
      url: url.trim() || undefined,
      category,
      priority,
      memo: memo.trim() || undefined,
      status: editItem?.status ?? 'wishlist',
      ringiId: editItem?.ringiId,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scores,
      totalScore,
      buyCategory,
    };
  };

  const handleSaveBasic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(buildItem(false));
  };

  const handleSaveWithScore = () => {
    onSave(buildItem(true));
  };

  const scoreValues = { want, need, urgency, lifeImprovement, partnerImpact };
  const previewScore = calcTotalScore({ ...scoreValues, costPenalty });
  const previewCategory = calcBuyCategory(previewScore);

  const setters: Record<string, (v: number) => void> = {
    want: setWant, need: setNeed, urgency: setUrgency,
    lifeImprovement: setLifeImprovement, partnerImpact: setPartnerImpact,
  };
  const values: Record<string, number> = { want, need, urgency, lifeImprovement, partnerImpact };

  if (step === 'score') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setStep('basic')}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-gray-900">優先度スコア入力</h2>
            <span className="ml-auto text-xs text-gray-400">Step 2/2</span>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-32">
          {/* Preview score */}
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">現在のスコア</p>
              <p className="text-3xl font-bold text-gray-900">{previewScore}<span className="text-sm text-gray-400 ml-1">/ 25</span></p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${BUY_CATEGORY_COLORS[previewCategory]}`}>
              {BUY_CATEGORY_LABELS[previewCategory]}
            </span>
          </div>

          {/* Score axes */}
          <div className="card space-y-5">
            {SCORE_AXES.map(axis => (
              <div key={axis.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{axis.label}</label>
                  <span className="text-sm font-bold text-primary-600">{values[axis.key]}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setters[axis.key](n)}
                      className={`flex-1 h-10 rounded-xl font-bold text-sm transition-colors ${
                        values[axis.key] === n
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cost penalty info */}
          <div className="card bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">金額負担ペナルティ</p>
                <p className="text-sm text-gray-600">
                  {priceNum ? `¥${priceNum.toLocaleString()}` : '価格未設定'}
                </p>
              </div>
              <span className={`text-sm font-bold ${costPenalty < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {costPenalty === 0 ? '±0' : costPenalty}
              </span>
            </div>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={handleSaveWithScore}
            className="btn-primary w-full"
          >
            {isEdit ? 'スコアを更新して保存' : 'スコアを付けて追加'}
          </button>
          <button
            type="button"
            onClick={handleSaveBasic.bind(null, { preventDefault: () => {} } as React.FormEvent)}
            className="btn-secondary w-full"
          >
            スコアなしで{isEdit ? '保存' : '追加'}
          </button>
        </div>
      </div>
    );
  }

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
          <span className="ml-auto text-xs text-gray-400">Step 1/2</span>
        </div>
      </div>

      <form onSubmit={handleSaveBasic} className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-32">
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

        {/* 既にスコアがある場合の表示 */}
        {scoreEnabled && editItem?.scores && (
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl">
            <span className="text-primary-600 text-sm">スコア設定済み:</span>
            <span className="font-bold text-primary-700">{editItem.totalScore ?? 0}点</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${BUY_CATEGORY_COLORS[editItem.buyCategory ?? 'unnecessary']}`}>
              {BUY_CATEGORY_LABELS[editItem.buyCategory ?? 'unnecessary']}
            </span>
          </div>
        )}

        {/* Buttons */}
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => { if (name.trim()) setStep('score'); }}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <span>優先度スコアを入力する</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <button
          type="submit"
          disabled={!name.trim()}
          className="btn-secondary w-full"
        >
          スコアなしで{isEdit ? '保存' : '追加'}
        </button>
      </form>
    </div>
  );
}
