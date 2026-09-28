import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Building2, 
  Upload, 
  X, 
  AlertTriangle,
  ExternalLink,
  Phone,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { Shop, MULTIPLAN_FLOORS } from '../types';
import { createShop, updateShop, deleteShopWithTransactions } from '../dataService';
import { processImageUpload } from '../imageUtils';

interface StoreInfoPageProps {
  shops: Shop[];
  onRefreshShops: () => Promise<void>;
  onViewShop: (shop: Shop) => void;
  initialEditingShop?: Shop | null;
  onClearInitialEditingShop?: () => void;
}

export const StoreInfoPage: React.FC<StoreInfoPageProps> = ({
  shops,
  onRefreshShops,
  onViewShop,
  initialEditingShop = null,
  onClearInitialEditingShop,
}) => {
  // Form visibility / mode
  const [showForm, setShowForm] = useState(!!initialEditingShop);
  const [editingShop, setEditingShop] = useState<Shop | null>(initialEditingShop);

  // Form inputs
  const [name, setName] = useState(initialEditingShop ? initialEditingShop.name : '');
  // Selected floors can be multiple, e.g. ["2nd Floor", "5th Floor", "9th Floor"]
  const [selectedFloors, setSelectedFloors] = useState<string[]>(() => {
    if (!initialEditingShop) return [MULTIPLAN_FLOORS[0]];
    const parts = initialEditingShop.floor
      ? initialEditingShop.floor.split(/[,&/]+/).map((s) => s.trim()).filter(Boolean)
      : [];
    return parts.length > 0 ? parts : [MULTIPLAN_FLOORS[0]];
  });
  const [customFloorInput, setCustomFloorInput] = useState('');
  const [shopNumber, setShopNumber] = useState(initialEditingShop ? initialEditingShop.shop_number : '');
  const [phone, setPhone] = useState(initialEditingShop ? initialEditingShop.phone || '' : '');
  const [logo, setLogo] = useState(initialEditingShop ? initialEditingShop.logo || '' : '');
  const [notes, setNotes] = useState(initialEditingShop ? initialEditingShop.notes || '' : '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Deletion Confirmation Dialog State
  const [deleteTargetShop, setDeleteTargetShop] = useState<Shop | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter or Quick search in store info table
  const [tableFilter, setTableFilter] = useState('');

  const resetForm = () => {
    setName('');
    setSelectedFloors([MULTIPLAN_FLOORS[0]]);
    setCustomFloorInput('');
    setShopNumber('');
    setPhone('');
    setLogo('');
    setNotes('');
    setEditingShop(null);
    setShowForm(false);
    if (onClearInitialEditingShop) onClearInitialEditingShop();
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (shop: Shop) => {
    setEditingShop(shop);
    setName(shop.name);
    const parts = (shop.floor || '')
      .split(/[,&/]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setSelectedFloors(parts.length > 0 ? parts : [MULTIPLAN_FLOORS[0]]);
    setCustomFloorInput('');
    setShopNumber(shop.shop_number);
    setPhone(shop.phone || '');
    setLogo(shop.logo || '');
    setNotes(shop.notes || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFloor = (floorItem: string) => {
    setSelectedFloors((prev) => {
      if (prev.includes(floorItem)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((f) => f !== floorItem);
      } else {
        return [...prev, floorItem];
      }
    });
  };

  const handleAddCustomFloor = () => {
    const trimmed = customFloorInput.trim();
    if (!trimmed) return;
    if (!selectedFloors.includes(trimmed)) {
      setSelectedFloors((prev) => [...prev, trimmed]);
    }
    setCustomFloorInput('');
  };

  const handleRemoveFloor = (floorItem: string) => {
    if (selectedFloors.length <= 1) return;
    setSelectedFloors((prev) => prev.filter((f) => f !== floorItem));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processImageUpload(file);
      setLogo(dataUrl);
    } catch (err: any) {
      alert(err.message || 'Failed to process logo image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Shop Name is required.');
      return;
    }
    if (!shopNumber.trim()) {
      alert('Shop Number is required.');
      return;
    }
    const finalFloor = selectedFloors.filter(Boolean).join(', ');
    if (!finalFloor) {
      alert('At least one floor / level is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingShop) {
        await updateShop(editingShop.id, {
          name: name.trim(),
          shop_number: shopNumber.trim(),
          floor: finalFloor,
          phone: phone.trim(),
          logo: logo,
          notes: notes.trim(),
        });
        setStatusMessage(`Shop "${name.trim()}" updated successfully.`);
      } else {
        // Check for duplicate shop name or number
        const duplicate = shops.find(
          (s) =>
            s.name.toLowerCase() === name.trim().toLowerCase() &&
            s.shop_number.toLowerCase() === shopNumber.trim().toLowerCase()
        );
        if (duplicate) {
          if (!confirm(`A shop named "${duplicate.name}" at Shop ${duplicate.shop_number} already exists. Do you want to proceed anyway?`)) {
            setIsSubmitting(false);
            return;
          }
        }

        await createShop({
          name: name.trim(),
          shop_number: shopNumber.trim(),
          floor: finalFloor,
          phone: phone.trim(),
          logo: logo,
          notes: notes.trim(),
        });
        setStatusMessage(`Shop "${name.trim()}" added to Multiplan Center database.`);
      }

      await onRefreshShops();
      resetForm();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving shop:', err);
      alert('Failed to save shop: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetShop) return;
    try {
      setIsDeleting(true);
      await deleteShopWithTransactions(deleteTargetShop.id);
      setDeleteTargetShop(null);
      await onRefreshShops();
      setStatusMessage(`Shop "${deleteTargetShop.name}" and its transactions have been deleted.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete shop:', err);
      alert('Failed to delete shop: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered shops list for table
  const displayedShops = shops.filter((s) => {
    if (!tableFilter.trim()) return true;
    const q = tableFilter.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.shop_number.toLowerCase().includes(q) ||
      s.floor.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
            Database Management
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Store Information
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Add, update, or remove shops located inside Multiplan Center.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Shop
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {statusMessage}
        </div>
      )}

      {/* Add / Edit Shop Form */}
      {showForm && (
        <div className="bg-neutral-900 border border-neutral-700/80 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingShop ? `Edit Shop: ${editingShop.name}` : 'Add New Multiplan Shop'}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Fill in the shop location details. Required fields are marked with *.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shop Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Shop Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Computer World, Tech Land"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Shop Number */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Shop Number *
                </label>
                <input
                  type="text"
                  value={shopNumber}
                  onChange={(e) => setShopNumber(e.target.value)}
                  placeholder="e.g. 512, 513-514, 205, 5A"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Level / Floors (Multiple selection supported) */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Level / Floor(s) * <span className="text-neutral-500 font-normal lowercase">(Select one or multiple floors)</span>
                  </label>
                  <span className="text-xs text-emerald-400 font-medium">
                    {selectedFloors.length} {selectedFloors.length === 1 ? 'Floor selected' : 'Floors selected'}
                  </span>
                </div>

                {/* Selected Floor Badges */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-950 border border-neutral-800 rounded-lg min-h-[44px]">
                  {selectedFloors.map((fl) => (
                    <span
                      key={fl}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                    >
                      <span>{fl}</span>
                      {selectedFloors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFloor(fl)}
                          className="hover:text-white transition-colors cursor-pointer"
                          title="Remove floor"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {/* Quick Toggle Pills for all 16 Floors */}
                <div className="mt-2.5">
                  <div className="text-[11px] text-neutral-400 mb-1.5 font-medium">
                    Click to toggle floors:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-neutral-950/50 rounded-lg border border-neutral-800/80">
                    {MULTIPLAN_FLOORS.map((f) => {
                      const isSelected = selectedFloors.includes(f);
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => toggleFloor(f)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                          }`}
                        >
                          {isSelected ? `✓ ${f}` : `+ ${f}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add Custom / Other Floor */}
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={customFloorInput}
                    onChange={(e) => setCustomFloorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomFloor();
                      }
                    }}
                    placeholder="Add other floor (e.g. Basement 1, Mezzanine)..."
                    className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFloor}
                    disabled={!customFloorInput.trim()}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Add Floor
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01711223344 or 01912345678"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Shop Logo (Optional)
              </label>
              <div className="flex items-center gap-4">
                {logo ? (
                  <div className="relative">
                    <img
                      src={logo}
                      alt="Logo preview"
                      className="w-14 h-14 rounded-lg object-cover border border-neutral-700 bg-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 shadow"
                      title="Remove logo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-dashed border-neutral-700 flex items-center justify-center text-neutral-500 bg-neutral-950">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}

                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-sm font-medium border border-neutral-700 transition-colors">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{logo ? 'Change Logo' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-neutral-500">
                  Compressed and stored cleanly. Recommended square image.
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Notes / Remarks (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Authorized dealer for HP & Dell, contact person: Mr. Rahim"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Save Shop'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Shops Table Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">All Multiplan Shops</h3>
            <p className="text-xs text-neutral-400">
              Total {shops.length} {shops.length === 1 ? 'store' : 'stores'} registered
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Filter list..."
              className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950/60 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Shop</th>
                <th className="py-3.5 px-4 font-semibold">Shop Number</th>
                <th className="py-3.5 px-4 font-semibold">Level / Floor</th>
                <th className="py-3.5 px-4 font-semibold">Phone</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {displayedShops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs">
                    No shops match the filter.
                  </td>
                </tr>
              ) : (
                displayedShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {shop.logo ? (
                          <img
                            src={shop.logo}
                            alt=""
                            className="w-8 h-8 rounded object-cover border border-neutral-700 bg-neutral-800 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 text-neutral-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white">{shop.name}</div>
                          {shop.notes && (
                            <div className="text-xs text-neutral-400 line-clamp-1 max-w-xs">
                              {shop.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-neutral-200">
                      {shop.shop_number}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {shop.floor.split(/[,&/]+/).map((f) => f.trim()).filter(Boolean).map((f) => (
                          <span
                            key={f}
                            className="inline-block px-1.5 py-0.5 rounded text-[11px] bg-neutral-800 text-neutral-300 border border-neutral-700/60"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 text-xs">
                      {shop.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onViewShop(shop)}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-medium transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleOpenEdit(shop)}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTargetShop(shop)}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-red-950/60 text-red-400 text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-white">
                  Delete &quot;{deleteTargetShop.name}&quot;?
                </h4>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  Are you sure you want to delete this shop?
                </p>
                <div className="mt-2.5 p-2.5 bg-red-950/40 border border-red-800/40 rounded text-xs text-red-300">
                  ⚠️ <strong>Warning:</strong> All purchase and sales transaction history linked to this shop will also be permanently deleted.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDeleteTargetShop(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Shop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
