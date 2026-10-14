import React, { useState } from 'react';
import { Search, MapPin, Phone, Building2, ExternalLink, X, Plus, Tag } from 'lucide-react';
import { Shop } from '../types';
import { fuzzySearchShops } from '../fuzzySearch';

interface SearchPageProps {
  shops: Shop[];
  isAdmin: boolean;
  canEditShop?: boolean;
  onSelectShop: (shop: Shop) => void;
  onNavigateToStoreInfo: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  shops,
  isAdmin,
  canEditShop = false,
  onSelectShop,
  onNavigateToStoreInfo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string | null>(null);

  // Quick product tags to filter or search easily
  const QUICK_TAG_FILTERS = [
    'CPU',
    'Motherboard',
    'GPU',
    'RAM',
    'SSD',
    'Laptop',
    'Monitor',
    'Casing',
    'Power Supply',
    'Printer',
  ];

  // 1. Strict Filter: Match ONLY against remarks/notes and tags (NOT shop names)
  const filteredByProductTag = selectedProductFilter
    ? shops.filter((shop) => {
        const prod = selectedProductFilter.toLowerCase().trim();

        // 1. Match against remarks/notes
        if (shop.notes) {
          const notesLower = shop.notes.toLowerCase();
          // Regex word or substring boundary check for product name inside remarks
          if (notesLower.includes(prod)) return true;
        }

        // 2. Also match against product tags/items explicitly tagged
        if (Array.isArray(shop.tags) && shop.tags.length > 0) {
          const hasInTags = shop.tags.some((t) => {
            const tLower = t.toLowerCase();
            return tLower === prod || tLower.includes(prod) || prod.includes(tLower);
          });
          if (hasInTags) return true;
        }

        return false;
      })
    : shops;

  // 2. Then apply fuzzy search (with support for merged words like "startech")
  const filteredShops = searchQuery.trim()
    ? fuzzySearchShops(filteredByProductTag, searchQuery)
    : filteredByProductTag;

  return (
    <div className="space-y-6">
      {/* Header & Big Search Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 sm:p-8 backdrop-blur shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="max-w-2xl">
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Multiplan Center • Dhaka
            </span>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white mt-0.5 sm:mt-1">
              Search Multiplan Center Shops
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 sm:mt-1.5 leading-relaxed">
              Instant typo-tolerant search across shop names, products (CPU, Motherboard, etc.), shop numbers, floors, or remarks.
            </p>
          </div>

          {(isAdmin || canEditShop) && (
            <button
              onClick={onNavigateToStoreInfo}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer flex-shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add New Shop
            </button>
          )}
        </div>

        {/* Large Search Input */}
        <div className="relative mt-4 sm:mt-6">
          <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-5 h-5 text-neutral-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shop, CPU, GPU, floor, remarks..."
            autoFocus
            className="w-full pl-11 sm:pl-12 pr-12 py-3 sm:py-3.5 bg-neutral-950/90 border border-neutral-700/80 rounded-xl text-white text-base placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner touch-manipulation"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 sm:pr-3.5 w-12 flex items-center justify-center text-neutral-400 hover:text-white active:text-emerald-400 transition-colors cursor-pointer touch-manipulation"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Product Tag Buttons - Smooth Touch-friendly Swipe Bar */}
        <div className="mt-3.5 pt-3 border-t border-neutral-800/60 relative">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 -mx-1 px-1 touch-pan-x">
            <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5 flex-shrink-0 mr-1 select-none">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Products:</span>
            </span>
            {QUICK_TAG_FILTERS.map((tag) => {
              const isActive = selectedProductFilter?.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      setSelectedProductFilter(null);
                    } else {
                      setSelectedProductFilter(tag);
                    }
                  }}
                  className={`text-xs px-3 py-1.5 min-h-[34px] sm:min-h-[32px] rounded-lg transition-all cursor-pointer border whitespace-nowrap flex-shrink-0 touch-manipulation flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-500 text-neutral-950 font-bold border-emerald-400 shadow-md ring-1 ring-emerald-400'
                      : 'bg-neutral-950/90 text-neutral-300 border-neutral-800 hover:border-emerald-500/50 active:bg-neutral-800 active:text-white'
                  }`}
                >
                  {isActive && <span>✓</span>}
                  <span>{tag}</span>
                </button>
              );
            })}
            {selectedProductFilter && (
              <button
                type="button"
                onClick={() => setSelectedProductFilter(null)}
                className="text-xs px-3 py-1.5 min-h-[34px] sm:min-h-[32px] rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 hover:text-white border border-neutral-700 transition-colors flex-shrink-0 cursor-pointer flex items-center gap-1.5 touch-manipulation font-medium shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Helper / Query state */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-neutral-400 mt-2.5 pt-2 border-t border-neutral-800/60">
          <div>
            <span>
              Found <span className="text-emerald-400 font-semibold">{filteredShops.length}</span> matching {filteredShops.length === 1 ? 'shop' : 'shops'}
              {selectedProductFilter && (
                <span> with product <strong className="text-emerald-300 font-semibold">&ldquo;{selectedProductFilter}&rdquo;</strong></span>
              )}
              {searchQuery && (
                <span> for <strong className="text-white font-semibold">&ldquo;{searchQuery}&rdquo;</strong></span>
              )}
              {!selectedProductFilter && !searchQuery && (
                <span> in Multiplan Center</span>
              )}
            </span>
          </div>
          {(searchQuery || selectedProductFilter) && (
            <span className="text-neutral-500 italic">
              {selectedProductFilter 
                ? `Filtered strictly by remarks & product tags ("${selectedProductFilter}")` 
                : 'Searches shop names (even without spaces like "startech"), product tags & remarks'}
            </span>
          )}
        </div>
      </div>

      {/* Results Section */}
      {filteredShops.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white">
            {shops.length === 0 ? 'No shops in directory yet' : 'No matching shops found'}
          </h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-md mx-auto">
            {shops.length === 0
              ? (isAdmin 
                  ? 'The directory is completely empty. Start by adding your first Multiplan Center shop.' 
                  : 'The directory is currently empty. Shops will appear here once added by the administrator.')
              : `No shops match ${selectedProductFilter ? `product "${selectedProductFilter}"` : ''}${selectedProductFilter && searchQuery ? ' and ' : ''}${searchQuery ? `query "${searchQuery}"` : ''}.`}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {(selectedProductFilter || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedProductFilter(null);
                  setSearchQuery('');
                }}
                className="px-4 py-2 min-h-[38px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 rounded-xl text-xs font-medium transition-colors cursor-pointer touch-manipulation shadow-xs"
              >
                Reset All Filters
              </button>
            )}
            {(isAdmin || canEditShop) && (
              <button
                onClick={onNavigateToStoreInfo}
                className="px-4 py-2 min-h-[38px] bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation shadow-xs"
              >
                Add New Shop
              </button>
            )}
            <a
              href="https://multiplanbd.net/shops/"
              target="_blank"
              rel="noopener"
              title="Visit Multiplan Directory for complete shop listings"
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] bg-neutral-850 hover:bg-neutral-800 active:bg-neutral-750 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold border border-neutral-700/80 transition-colors cursor-pointer touch-manipulation shadow-xs"
            >
              <span>Multiplan Directory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredShops.map((shop: Shop) => (
            <div
              key={shop.id}
              onClick={() => onSelectShop(shop)}
              className="group bg-neutral-900/90 hover:bg-neutral-900 active:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 active:border-emerald-500/50 rounded-xl p-4 sm:p-5 cursor-pointer transition-all duration-150 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-emerald-500/30 touch-manipulation active:scale-[0.99]"
            >
              <div>
                <div className="flex items-start gap-3 sm:gap-3.5">
                  {/* Shop Logo if available */}
                  {shop.logo ? (
                    <img
                      src={shop.logo}
                      alt={shop.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-700/60 flex-shrink-0 bg-neutral-800 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors shadow-sm">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {shop.name}
                    </h3>
                    <div className="text-xs text-neutral-300 mt-1 font-medium space-y-1">
                      {shop.floor_locations && shop.floor_locations.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {shop.floor_locations.map((loc, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-neutral-300">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="truncate">
                                <strong className="text-white font-semibold">{loc.floor}:</strong> Shop {loc.shop_number}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">
                            Shop {shop.shop_number} · {shop.floor}
                          </span>
                        </div>
                      )}
                    </div>

                    {shop.phone && (
                      <div className="mt-2">
                        <a
                          href={`tel:${shop.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950/80 hover:bg-emerald-950/60 active:bg-emerald-900/80 text-emerald-400 border border-neutral-800 hover:border-emerald-500/40 text-xs font-semibold transition-colors touch-manipulation group/phone"
                          title="Call shop directly"
                        >
                          <Phone className="w-3 h-3 text-emerald-400 group-hover/phone:animate-bounce" />
                          <span>{shop.phone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Tags / Items preview on card */}
                {shop.tags && shop.tags.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/70 flex flex-wrap gap-1.5">
                    {shop.tags.slice(0, 6).map((t, idx) => {
                      const isHighlighted = (searchQuery && t.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                        (selectedProductFilter && t.toLowerCase().includes(selectedProductFilter.toLowerCase().trim()));
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductFilter((prev) => (prev?.toLowerCase() === t.toLowerCase() ? null : t));
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
                            isHighlighted
                              ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                              : 'bg-neutral-800/90 text-emerald-300 border border-emerald-500/20 hover:bg-neutral-700 active:bg-neutral-600'
                          }`}
                          title={`Filter by product "${t}"`}
                        >
                          <Tag className="w-2.5 h-2.5 opacity-70" />
                          <span>{t}</span>
                        </button>
                      );
                    })}
                    {shop.tags.length > 6 && (
                      <span className="text-[11px] px-1 text-neutral-400 self-center">
                        +{shop.tags.length - 6} more
                      </span>
                    )}
                  </div>
                )}

                {shop.notes && (
                  <p className="text-xs text-neutral-400 mt-2.5 line-clamp-2 bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800/60 leading-relaxed">
                    {shop.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-[11px] text-neutral-500 font-medium">Multiplan Center</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  View Details & History
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
