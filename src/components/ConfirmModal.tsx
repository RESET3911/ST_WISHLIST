type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export default function ConfirmModal({
  title,
  message,
  confirmLabel = '確認',
  confirmDanger = false,
  onConfirm,
  onCancel,
  children,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{message}</p>
        {children && <div className="mb-4">{children}</div>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-semibold py-3 px-6 rounded-xl transition-colors min-h-[44px] text-white ${
              confirmDanger
                ? 'bg-red-500 active:bg-red-700'
                : 'bg-primary-500 active:bg-primary-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
