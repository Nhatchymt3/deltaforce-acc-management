export default function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="flex items-center gap-2.5 rounded-xl border border-brass/20 bg-gunmetal/90 px-5 py-3 text-xs text-brass/90 shadow-2xl backdrop-blur-md">
        <svg className="w-4 h-4 animate-spin text-brass" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Đang tải dữ liệu...
      </div>
    </div>
  );
}
