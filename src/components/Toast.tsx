import { useEffect } from 'react';

type Props = {
  message: string;
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, onClose, duration = 3000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg max-w-xs text-center">
        {message}
      </div>
    </div>
  );
}
