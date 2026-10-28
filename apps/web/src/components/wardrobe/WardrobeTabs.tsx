'use client';

import React from 'react';

export type WardrobeTabType = 'fittings' | 'orders';

interface WardrobeTabsProps {
  activeTab: WardrobeTabType;
  onTabChange: (tab: WardrobeTabType) => void;
  fittingsCount?: number;
  ordersCount?: number;
}

/**
 * Wardrobe Navigation Tabs Component
 * Spec Anchor: screens/09-digital-wardrobe.md, FEAT-009
 */
export function WardrobeTabs({
  activeTab,
  onTabChange,
  fittingsCount = 0,
  ordersCount = 0,
}: WardrobeTabsProps) {
  return (
    <div className="w-full border-b border-stone-200">
      <nav
        className="-mb-px flex space-x-8 sm:space-x-12"
        aria-label="Wardrobe views"
        role="tablist"
      >
        {/* Tab 1: Saved Fittings */}
        <button
          role="tab"
          id="tab-fittings"
          aria-controls="panel-fittings"
          aria-selected={activeTab === 'fittings'}
          data-testid="tab-saved-fittings"
          onClick={() => onTabChange('fittings')}
          className={`group inline-flex items-center py-4 px-1 border-b-2 font-serif text-base sm:text-lg transition-all duration-200 focus:outline-none ${
            activeTab === 'fittings'
              ? 'border-stone-900 text-stone-900 font-medium'
              : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
          }`}
        >
          <span className="tracking-tight">Saved Fittings</span>
          <span
            className={`ml-2.5 py-0.5 px-2 rounded-full text-xs font-mono font-normal transition-colors ${
              activeTab === 'fittings'
                ? 'bg-stone-900 text-stone-100'
                : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
            }`}
          >
            {fittingsCount}
          </span>
        </button>

        {/* Tab 2: Purchased Orders */}
        <button
          role="tab"
          id="tab-orders"
          aria-controls="panel-orders"
          aria-selected={activeTab === 'orders'}
          data-testid="tab-purchased-orders"
          onClick={() => onTabChange('orders')}
          className={`group inline-flex items-center py-4 px-1 border-b-2 font-serif text-base sm:text-lg transition-all duration-200 focus:outline-none ${
            activeTab === 'orders'
              ? 'border-stone-900 text-stone-900 font-medium'
              : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
          }`}
        >
          <span className="tracking-tight">Purchased Orders</span>
          <span
            className={`ml-2.5 py-0.5 px-2 rounded-full text-xs font-mono font-normal transition-colors ${
              activeTab === 'orders'
                ? 'bg-stone-900 text-stone-100'
                : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
            }`}
          >
            {ordersCount}
          </span>
        </button>
      </nav>
    </div>
  );
}
