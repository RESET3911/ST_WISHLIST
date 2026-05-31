import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  User, WishItem, RingiSettings, RingiApplication,
  CashflowData, CashflowIncome, CashflowExpense,
} from './types';
import {
  saveWishItem,
  updateWishItem,
  deleteWishItem,
  subscribeWishItems,
  subscribeRingiSettings,
  subscribeRingiApplications,
  saveRingiApplication,
  subscribeCashflowIncomes,
  subscribeCashflowExpenses,
  subscribeCashflowSavings,
  subscribeCashflowSafetyLine,
} from './utils/storage';
import { notifyItemAdded, notifyRingiApply } from './utils/notify';
import UserSelectScreen from './components/UserSelectScreen';
import ListScreen from './components/ListScreen';
import AddItemScreen from './components/AddItemScreen';
import DetailScreen from './components/DetailScreen';
import CompareScreen from './components/CompareScreen';
import Toast from './components/Toast';

type Screen = 'userSelect' | 'list' | 'add' | 'detail' | 'compare';

const DEFAULT_SETTINGS: RingiSettings = {
  userA: { name: 'Aさん', email: '' },
  userB: { name: 'Bさん', email: '' },
  ntfyTopic: '',
};

function computeCashflowData(
  incomes: CashflowIncome[],
  expenses: CashflowExpense[],
  savingsBalance: number,
  safetyLine: number,
): CashflowData {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const thisMonthIncomes = incomes.filter(inc => {
    const parts = inc.invoiceDate.split('-');
    return parseInt(parts[0]) === currentYear && parseInt(parts[1]) === currentMonth;
  });

  const paidThisMonth = thisMonthIncomes
    .filter(i => i.isPaid)
    .reduce((s, i) => s + i.amount, 0);

  const monthlyExpenses = expenses
    .filter(e => e.isActive)
    .reduce((s, e) => s + e.amount, 0);

  const currentMonthSurplus = paidThisMonth - monthlyExpenses;

  const unpaidIncome = incomes
    .filter(i => !i.isPaid)
    .reduce((s, i) => s + i.amount, 0);

  const nextMonthFixedIncome = thisMonthIncomes
    .filter(i => i.incomeType === 'fixed')
    .reduce((s, i) => s + i.amount, 0);

  return { currentMonthSurplus, unpaidIncome, safetyLine, savingsBalance, nextMonthFixedIncome };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('userSelect');
  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [ringiSettings, setRingiSettings] = useState<RingiSettings>(DEFAULT_SETTINGS);
  const [ringiApplications, setRingiApplications] = useState<RingiApplication[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [compareItemIds, setCompareItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // CASHFLOW state
  const [cashflowIncomes, setCashflowIncomes] = useState<CashflowIncome[]>([]);
  const [cashflowExpenses, setCashflowExpenses] = useState<CashflowExpense[]>([]);
  const [cashflowSavings, setCashflowSavings] = useState(0);
  const [cashflowSafetyLine, setCashflowSafetyLine] = useState(500000);

  const cashflowData = useMemo<CashflowData>(
    () => computeCashflowData(cashflowIncomes, cashflowExpenses, cashflowSavings, cashflowSafetyLine),
    [cashflowIncomes, cashflowExpenses, cashflowSavings, cashflowSafetyLine]
  );

  useEffect(() => {
    const unsubWish = subscribeWishItems(
      items => { setWishItems(items); setLoading(false); },
      () => { setLoading(false); setErrorToast('DB接続エラーが発生しました'); }
    );
    const unsubSettings = subscribeRingiSettings(s => setRingiSettings(s));
    const unsubApps = subscribeRingiApplications(
      apps => setRingiApplications(apps),
      () => {}
    );
    const unsubCfIncomes = subscribeCashflowIncomes(setCashflowIncomes);
    const unsubCfExpenses = subscribeCashflowExpenses(setCashflowExpenses);
    const unsubCfSavings = subscribeCashflowSavings(setCashflowSavings);
    const unsubCfSafety = subscribeCashflowSafetyLine(setCashflowSafetyLine);

    return () => {
      unsubWish(); unsubSettings(); unsubApps();
      unsubCfIncomes(); unsubCfExpenses(); unsubCfSavings(); unsubCfSafety();
    };
  }, []);

  // RINGIのステータス変化をウィッシュリストに同期
  useEffect(() => {
    if (ringiApplications.length === 0 || wishItems.length === 0) return;
    wishItems.forEach(item => {
      if (!item.ringiId || item.status !== 'pending') return;
      const ringiApp = ringiApplications.find(a => a.id === item.ringiId);
      if (!ringiApp) return;
      if (ringiApp.status === 'approved') {
        updateWishItem(item.id, { status: 'approved', updatedAt: new Date().toISOString() }).catch(() => {});
      } else if (ringiApp.status === 'rejected') {
        updateWishItem(item.id, { status: 'rejected', updatedAt: new Date().toISOString() }).catch(() => {});
      } else if (ringiApp.status === 'cancelled') {
        updateWishItem(item.id, { status: 'wishlist', ringiId: undefined, updatedAt: new Date().toISOString() }).catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringiApplications]);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setScreen('list');
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setEditItemId(null);
    setScreen('detail');
  };

  const handleAddItem = () => {
    setEditItemId(null);
    setScreen('add');
  };

  const handleEditItem = () => {
    setEditItemId(selectedItemId);
    setScreen('add');
  };

  const handleSaveItem = useCallback(async (item: WishItem, isNew: boolean) => {
    try {
      await saveWishItem(item);
      if (isNew && currentUser) {
        notifyItemAdded(item.name, item.price, currentUser, ringiSettings).catch(() => {});
      }
      setSelectedItemId(item.id);
      setScreen('detail');
    } catch {
      setErrorToast('保存に失敗しました');
    }
  }, [currentUser, ringiSettings]);

  const handleDeleteItem = useCallback(async () => {
    if (!selectedItemId) return;
    try {
      await deleteWishItem(selectedItemId);
      setSelectedItemId(null);
      setScreen('list');
    } catch {
      setErrorToast('削除に失敗しました');
    }
  }, [selectedItemId]);

  const handleRingiApply = useCallback(async (item: WishItem, applicant: User) => {
    const ringiApp: RingiApplication = {
      id: uuidv4(),
      applicant,
      item: item.name,
      amount: item.price ?? 0,
      reason: item.memo,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await saveRingiApplication(ringiApp);
    await updateWishItem(item.id, {
      status: 'pending',
      ringiId: ringiApp.id,
      updatedAt: new Date().toISOString(),
    });
    notifyRingiApply(item.name, item.price, applicant, ringiSettings).catch(() => {});
  }, [ringiSettings]);

  const handleMarkPurchased = useCallback(async (id: string) => {
    try {
      await updateWishItem(id, { status: 'purchased', updatedAt: new Date().toISOString() });
    } catch {
      setErrorToast('更新に失敗しました');
    }
  }, []);

  const handleRevertToWishlist = useCallback(async (id: string) => {
    try {
      await updateWishItem(id, { status: 'wishlist', ringiId: undefined, updatedAt: new Date().toISOString() });
    } catch {
      setErrorToast('更新に失敗しました');
    }
  }, []);

  const handleCompare = useCallback((ids: string[]) => {
    setCompareItemIds(ids);
    setScreen('compare');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🛍️</div>
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  const selectedItem = selectedItemId ? wishItems.find(i => i.id === selectedItemId) : undefined;
  const editItem = editItemId ? wishItems.find(i => i.id === editItemId) : undefined;
  const ringiAppForSelected = selectedItem?.ringiId
    ? ringiApplications.find(a => a.id === selectedItem.ringiId)
    : undefined;

  return (
    <>
      {screen === 'userSelect' && (
        <UserSelectScreen settings={ringiSettings} onSelect={handleSelectUser} />
      )}

      {screen === 'list' && currentUser && (
        <ListScreen
          currentUser={currentUser}
          wishItems={wishItems}
          settings={ringiSettings}
          onSelectItem={handleSelectItem}
          onAddItem={handleAddItem}
          onSwitchUser={() => { setCurrentUser(null); setScreen('userSelect'); }}
          onCompare={handleCompare}
        />
      )}

      {screen === 'add' && currentUser && (
        <AddItemScreen
          currentUser={currentUser}
          editItem={editItem}
          onSave={(item) => handleSaveItem(item, !editItemId)}
          onBack={() => setScreen(editItemId ? 'detail' : 'list')}
        />
      )}

      {screen === 'detail' && selectedItem && currentUser && (
        <DetailScreen
          item={selectedItem}
          currentUser={currentUser}
          settings={ringiSettings}
          ringiApp={ringiAppForSelected}
          cashflowData={cashflowData}
          onBack={() => setScreen('list')}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onRingiApply={handleRingiApply}
          onMarkPurchased={handleMarkPurchased}
          onRevertToWishlist={handleRevertToWishlist}
        />
      )}

      {screen === 'compare' && currentUser && (
        <CompareScreen
          compareItemIds={compareItemIds}
          wishItems={wishItems}
          currentUser={currentUser}
          settings={ringiSettings}
          cashflowData={cashflowData}
          onBack={() => setScreen('list')}
          onRingiApply={handleRingiApply}
        />
      )}

      {errorToast && <Toast message={errorToast} onClose={() => setErrorToast(null)} />}
    </>
  );
}
