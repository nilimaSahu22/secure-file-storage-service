export function FileGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-100 p-4">
          <div className="mb-3 h-4 w-2/3 rounded bg-gray-200" />
          <div className="mb-4 h-3 w-1/3 rounded bg-gray-100" />
          <div className="h-6 w-full rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
