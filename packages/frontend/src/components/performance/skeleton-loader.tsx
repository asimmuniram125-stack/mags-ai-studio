'use client';

interface SkeletonProps {
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

export function SkeletonLoader({
  width = 'w-full',
  height = 'h-4',
  count = 1,
  className = '',
}: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${width} ${height} bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse`}
        />
      ))}
    </div>
  );
}