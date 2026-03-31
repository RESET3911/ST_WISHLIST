import { User, RingiSettings } from '../types';

type Props = {
  settings: RingiSettings;
  onSelect: (user: User) => void;
};

export default function UserSelectScreen({ settings, onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      <div className="max-w-lg mx-auto w-full px-4 py-12 flex-1 flex flex-col">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🛍️</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            ST WISHLIST
          </h1>
          <p className="text-gray-500 mt-2 text-sm">2人の欲しいものリスト</p>
        </div>

        <p className="text-center text-gray-600 font-medium mb-6">どちらで使いますか？</p>

        <div className="flex gap-4">
          {(['A', 'B'] as User[]).map(user => {
            const name = user === 'A' ? settings.userA.name : settings.userB.name;
            return (
              <button
                key={user}
                onClick={() => onSelect(user)}
                className="flex-1 bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3
                           active:bg-primary-50 transition-colors border-2 border-transparent
                           active:border-primary-200 min-h-[140px]"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-accent-400
                                flex items-center justify-center text-white text-2xl font-bold shadow-md">
                  {name.charAt(0)}
                </div>
                <p className="font-bold text-gray-900 text-lg">{name}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
