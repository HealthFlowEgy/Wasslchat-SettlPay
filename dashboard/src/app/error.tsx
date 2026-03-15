'use client';
import React from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6" dir="rtl">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ</h2>
        <p className="text-gray-500 mb-4 text-sm">{error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}</p>
        <button onClick={reset} className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium">
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
