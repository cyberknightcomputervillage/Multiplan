import React, { useState } from 'react';
import { Search, MapPin, Phone, Building2, ExternalLink, X } from 'lucide-react';
import { Shop } from '../types';
import { fuzzySearchShops } from '../fuzzySearch';

interface SearchPageProps {
  shops: Shop[];
  isAdmin: boolean;
  onSelectShop: (shop: Shop) => void;
  onNavigateToStoreInfo: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  shops,
  isAdmin,
  onSelectShop,
  onNavigateToStoreInfo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShops = fuzzySearchShops(shops, searchQuery);

  return (
    <div className="space-y-6">
      {/* Header & Big Search Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 sm:p-8 backdrop-blur shadow-sm">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
            Multiplan Center • Dhaka
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Search Multiplan Center Shops
          </h2>
          <p className="text-sm text-neutral-400 mt-1.5">
            Instant typo-tolerant search across shop names, shop numbers, floors, or phone numbers.
          </p>
        </div>

        {/* Large Search Input */}
        <div className="relative mt-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop name, number, phone... (e.g. 'mr', 'M.R', 'computer', '512')"
            autoFocus
            className="w-full pl-12 pr-10 py-3.5 bg-neutral-950/80 border border-neutral-700/80 rounded-lg text-white text-base placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Helper / Query state */}
        <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60">
          <div>
            {searchQuery ? (
              <span>
                Found <span className="text-emerald-400 font-semibold">{filteredShops.length}</span> matching {filteredShops.length === 1 ? 'shop' : 'shops'}
              </span>
            ) : (
              <span>Showing all <span className="text-neutral-200 font-medium">{shops.length}</span> shops in Multiplan Center</span>
            )}
          </div>
          {searchQuery && (
            <span className="text-neutral-500 italic">
              Case &amp; dot/punctuation insensitive, typo-tolerant (e.g. &quot;mr&quot; finds &quot;M.R&quot;, &quot;computr&quot; finds &quot;Computer&quot;)
            </span>
          )}
        </div>
      </div>

      {/* Results Section */}
      {filteredShops.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white">
            {shops.length === 0 ? 'No shops in directory yet' : 'No shops found'}
          </h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-md mx-auto">
            {shops.length === 0
              ? (isAdmin 
                  ? 'The directory is completely empty. Start by adding your first Multiplan Center shop.' 
                  : 'The directory is currently empty. Shops will appear here once added by the administrator.')
              : `No shops matched "${searchQuery}".`}
          </p>
          {isAdmin && (
            <button
              onClick={onNavigateToStoreInfo}
              className="mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Add New Shop
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map((shop: Shop) => (
            <div
              key={shop.id}
              onClick={() => onSelectShop(shop)}
              className="group bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 cursor-pointer transition-all duration-150 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-emerald-500/30"
            >
              <div>
                <div className="flex items-start gap-3.5">
                  {/* Shop Logo if available */}
                  {shop.logo ? (
                    <img
                      src={shop.logo}
                      alt={shop.name}
                      className="w-12 h-12 rounded-lg object-cover border border-neutral-700/60 flex-shrink-0 bg-neutral-800"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
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
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                        <span className="truncate">{shop.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {shop.notes && (
                  <p className="text-xs text-neutral-400 mt-3.5 line-clamp-2 bg-neutral-950/40 p-2 rounded border border-neutral-800/50">
                    {shop.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Multiplan Center</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  View Details & History
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
