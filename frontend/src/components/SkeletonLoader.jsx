import React from 'react';

export default function SkeletonLoader({ variant = "card", count = 1 }) {
  const renderItem = (idx) => {
    switch (variant) {
      case "line":
        return (
          <div key={idx} className="h-4 bg-[#e8e2d2] rounded animate-pulse w-full my-2"></div>
        );
      case "list":
        return (
          <div key={idx} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-slate-200 animate-pulse my-2">
            <div className="rounded-full bg-[#e8e2d2] h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-[#e8e2d2] rounded w-1/4"></div>
              <div className="h-3 bg-[#e8e2d2] rounded w-3/4"></div>
            </div>
          </div>
        );
      case "grid":
      case "card":
      default:
        return (
          <div key={idx} className="p-5 bg-white rounded-xl shadow-premium border border-slate-100 animate-pulse my-3 flex flex-col space-y-4">
            <div className="h-6 bg-[#e8e2d2] rounded w-2/3"></div>
            <div className="h-4 bg-[#e8e2d2] rounded w-1/2"></div>
            <div className="h-20 bg-[#e8e2d2] rounded w-full"></div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-8 bg-[#e8e2d2] rounded w-1/3"></div>
              <div className="h-8 bg-[#e8e2d2] rounded w-1/4"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {Array.from({ length: count }).map((_, idx) => renderItem(idx))}
    </div>
  );
}
