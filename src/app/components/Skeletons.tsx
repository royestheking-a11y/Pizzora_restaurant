import React from 'react';

/**
 * Base skeleton pulse utility. Applies the common animation and colors.
 */
const SkeletonBase = ({ className = '', style = {} }: { className?: string, style?: React.CSSProperties }) => (
  <div 
    className={`animate-pulse ${className}`} 
    style={{ backgroundColor: '#E5E7EB', ...style }} 
  />
);

/**
 * Matches the Menu item card used in Menu.tsx and Home.tsx.
 */
export const MenuCardSkeleton = () => {
  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-sm" 
      style={{ border: '1px solid rgba(249,0,43,0.06)' }}
    >
      {/* Image block */}
      <SkeletonBase className="w-full" style={{ height: 'clamp(110px, 30vw, 192px)' }} />
      
      {/* Content block */}
      <div className="p-2.5 sm:p-4">
        <div className="flex justify-between mb-2">
          <SkeletonBase className="h-4 sm:h-5 rounded w-2/3" />
          <SkeletonBase className="h-4 sm:h-5 rounded w-1/4" />
        </div>
        
        <SkeletonBase className="h-2.5 sm:h-3 rounded w-1/4 mb-3" />
        
        <div className="hidden sm:block">
          <SkeletonBase className="h-3 rounded w-full mb-1.5" />
          <SkeletonBase className="h-3 rounded w-5/6 mb-4" />
        </div>

        <div className="hidden sm:flex justify-between mb-4">
          <SkeletonBase className="h-3 rounded w-1/4" />
          <SkeletonBase className="h-3 rounded w-1/4" />
        </div>
        
        <div className="flex gap-2">
          <SkeletonBase className="h-8 sm:h-10 rounded-xl w-full" />
          <SkeletonBase className="h-8 sm:h-10 rounded-xl w-10 sm:w-12 shrink-0" />
        </div>
      </div>
    </div>
  );
};

/**
 * Matches the Chef card used in Home.tsx.
 */
export const ChefCardSkeleton = () => {
  return (
    <div className="text-center group">
      <div className="relative inline-block mb-5">
        <SkeletonBase className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden mx-auto shadow-xl border-4" style={{ borderColor: '#F3F4F6' }} />
        <SkeletonBase className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full shadow-lg" style={{ borderColor: 'white', borderWidth: '2px' }} />
      </div>
      <div className="flex flex-col items-center">
        <SkeletonBase className="h-6 w-48 rounded mb-2" />
        <SkeletonBase className="h-4 w-32 rounded mb-3" />
        <SkeletonBase className="h-4 w-40 rounded mb-4" />
        <SkeletonBase className="h-3 w-64 rounded mb-1" />
        <SkeletonBase className="h-3 w-56 rounded" />
      </div>
    </div>
  );
};

/**
 * Matches the 4 top metric cards in Admin.tsx.
 */
export const AdminStatSkeleton = () => {
  return (
    <div className="p-6 rounded-2xl bg-white" style={{ border: '1px solid #F3F4F6' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <SkeletonBase className="h-4 w-24 rounded mb-2" />
          <SkeletonBase className="h-8 w-32 rounded" />
        </div>
        <SkeletonBase className="h-12 w-12 rounded-xl" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-3 w-8 rounded-full" />
        <SkeletonBase className="h-3 w-20 rounded" />
      </div>
    </div>
  );
};

/**
 * Matches the Table rows used in Admin.tsx and TableManagement.tsx.
 * Supply `columns` to match the exact number of columns.
 */
export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => {
  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <SkeletonBase className="h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  );
};

/**
 * Matches the small cards used in POS.tsx.
 */
export const POSCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
      <SkeletonBase className="w-full aspect-video" />
      <div className="p-3">
        <SkeletonBase className="h-3 w-3/4 rounded mb-2" />
        <SkeletonBase className="h-4 w-1/3 rounded" />
      </div>
    </div>
  );
};

/**
 * Matches the Dashboard list items used in Admin.tsx
 */
export const AdminListSkeleton = () => {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between border-b last:border-0" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
      <div className="w-1/2">
        <SkeletonBase className="h-3.5 w-16 rounded mb-1.5" />
        <SkeletonBase className="h-3 w-32 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBase className="h-3.5 w-10 rounded" />
        <SkeletonBase className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
};

/**
 * Matches the Hero Carousel on the Home page.
 */
export const HeroSkeleton = () => {
  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col items-center justify-end pb-8 sm:pb-12 text-center p-4 sm:p-12 overflow-hidden">
      <SkeletonBase className="h-4 sm:h-5 w-32 sm:w-48 rounded mb-4" />
      <SkeletonBase className="h-10 sm:h-20 w-3/4 sm:w-2/3 rounded mb-2 sm:mb-8" />
      <SkeletonBase className="h-8 sm:h-12 w-32 sm:w-48 rounded-full" />
    </div>
  );
};
