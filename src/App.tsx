import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, WishItem, RingiSettings, RingiApplication } from './types';
import {
  saveWishItem,
  updateWishItem,
  deleteWishItem,
  subscribeWishItems,
  subscribeRingiSettings,
  subscribeRingiApplications,
  saveRingiApplication,
} from './utils/storage';
import { notifyRingiApply } from './utils/notify';
import UserSelectScreen from './components/UserSelectScreen';
import ListScreen from './components/ListScreen';
import AddItemScreen from './components/AddItemScreen';
import DetailScreen from './components/DetailScreen';
import Toast from './components/Toast';

type Screen = 'userSelect' | 'list' | 'add' | 'detail';

const DEFAULT_SETTINGS: RingiSettings = {
  userA: { name: 'Aさん', email: '' },
  userB: { name: 'Bさん', email: '' },
  ntfyTopic: '',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('userSelect');
  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [ringiSettings, setRingiSettings] = useState<RingiSettings>(DEFAULT_SETTINGS);
  const [ringiApplications, setRingiApplications] = useState<RingiApplication[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Firestore subscriptions
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
    return () => { unsubWish(); unsubSettings(); unsubApps(); };
  }, []);

  // RINGIのステータス変化をウィッシュリストに同期
  useEffect(() => {
    if (ringiApplications.length === 0 || wishItems.length === 0) return;

    wishItems.forEach(item => {
      if (!item.ringiId || item.status !== 'pending') return;
      const ringiApp = ringiApplications.find(a => a.id === item.ringiId);
      if (!ringiApp) return;

      if (ringiApp.status === 'approved') {
        updateWishItem(item.id, { status: 'approved', updatedAt: new Date().toISOString() })
          .catch(() => {});
      } else if (ringiApp.status === 'rejected') {
        updateWishItem(item.id, { status: 'rejected', updatedAt: new Date().toISOString() })
          .catch(() => {});
      } else if (ringiApp.status === 'cancelled') {
        updateWishItem(item.id, { status: 'wishlist', ringiId: undefined, updatedAt: new Date().toISOString() })
          .catch(() => {});
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

  const handleSaveItem = useCallback(async (item: WishItem) => {
    try {
      await saveWishItem(item);
      setSelectedItemId(item.id);
      setScreen('detail');
    } catch {
      setErrorToast('保存に失敗しました');
    }
  }, []);

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
        <UserSelectScreen
          settings={ringiSettings}
          onSelect={handleSelectUser}
        />
      )}

      {screen === 'list' && currentUser && (
        <ListScreen
          currentUser={currentUser}
          wishItems={wishItems}
          settings={ringiSettings}
          onSelectItem={handleSelectItem}
          onAddItem={handleAddItem}
          onSwitchUser={() => { setCurrentUser(null); setScreen('userSelect'); }}
        />
      )}

      {screen === 'add' && currentUser && (
        <AddItemScreen
          currentUser={currentUser}
          editItem={editItem}
          onSave={handleSaveItem}
          onBack={() => setScreen(editItemId ? 'detail' : 'list')}
        />
      )}

      {screen === 'detail' && selectedItem && currentUser && (
        <DetailScreen
          item={selectedItem}
          currentUser={currentUser}
          settings={ringiSettings}
          ringiApp={ringiAppForSelected}
          onBack={() => setScreen('list')}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onRingiApply={handleRingiApply}
          onMarkPurchased={handleMarkPurchased}
          onRevertToWishlist={handleRevertToWishlist}
        />
      )}

      {errorToast && <Toast message={errorToast} onClose={() => setErrorToast(null)} />}
    </>
  );
}
