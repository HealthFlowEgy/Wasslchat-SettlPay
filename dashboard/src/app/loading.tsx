export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
