import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Check, 
  X,
  Calendar,
  AlertCircle,
  Package,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Shop, ShopTransaction, TransactionType, TransactionItem } from '../types';
import { 
  fetchTransactionsForShop, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../dataService';
import { User } from 'firebase/auth';

interface FormProductItem {
  id: string;
  product_name: string;
  quantity: string;
  unit_price: string;
}

interface ShopDetailsPageProps {
  shop: Shop;
  currentUser: User;
  isAdmin: boolean;
  canEditShop?: boolean;
  onBack: () => void;
  onEditShop: (shop: Shop) => void;
}

export const ShopDetailsPage: React.FC<ShopDetailsPageProps> = ({
  shop,
  currentUser,
  isAdmin,
  canEditShop = false,
  onBack,
  onEditShop,
}) => {
  const [transactions, setTransactions] = useState<ShopTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state for Add/Edit Transaction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ShopTransaction | null>(null);
  
  // Transaction Form fields
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<TransactionType>('Purchase');
  const [txItems, setTxItems] = useState<FormProductItem[]>([
    { id: '1', product_name: '', quantity: '1', unit_price: '' }
  ]);
  const [txNotes, setTxNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Load transactions for this shop
  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      // Regular users only see their own transactions for this shop; Admin can see their own or all
      const data = await fetchTransactionsForShop(
        shop.id,
        isAdmin ? undefined : currentUser.uid
      );
      setTransactions(data);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transaction history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [shop.id, currentUser.uid, isAdmin]);

  // Compute calculated total across all product items in modal
  const calculatedGrandTotal = txItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + (qty * price);
  }, 0);

  // Open modal for new transaction
  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxType('Purchase');
    setTxItems([
      { id: Date.now().toString(), product_name: '', quantity: '1', unit_price: '' }
    ]);
    setTxNotes('');
    setIsModalOpen(true);
  };

  // Open modal to edit existing transaction
  const handleOpenEdit = (tx: ShopTransaction) => {
    setEditingTransaction(tx);
    setTxDate(tx.date);
    setTxType(tx.type);
    if (tx.items && tx.items.length > 0) {
      setTxItems(
        tx.items.map((it, idx) => ({
          id: (it.id || idx).toString(),
          product_name: it.product_name,
          quantity: it.quantity.toString(),
          unit_price: it.unit_price.toString(),
        }))
      );
    } else {
      setTxItems([
        {
          id: '1',
          product_name: tx.product_name,
          quantity: tx.quantity.toString(),
          unit_price: tx.unit_price.toString(),
        }
      ]);
    }
    setTxNotes(tx.notes || '');
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setTxItems((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        product_name: '',
        quantity: '1',
        unit_price: '',
      }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (txItems.length <= 1) return;
    setTxItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof FormProductItem, value: string) => {
    setTxItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one item has a product name
    const validItems: TransactionItem[] = [];
    for (let i = 0; i < txItems.length; i++) {
      const item = txItems[i];
      const pName = item.product_name.trim();
      if (!pName) {
        alert(`Product name is required for item #${i + 1}.`);
        return;
      }
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        alert(`Please enter a valid quantity greater than 0 for "${pName}".`);
        return;
      }
      const price = Number(item.unit_price);
      if (isNaN(price) || price < 0) {
        alert(`Please enter a valid unit price for "${pName}".`);
        return;
      }
      validItems.push({
        product_name: pName,
        quantity: qty,
        unit_price: price,
        total_price: Math.round(qty * price * 100) / 100,
      });
    }

    if (validItems.length === 0) {
      alert('Please add at least one product.');
      return;
    }

    try {
      setIsSubmitting(true);
      const totalAmount = Math.round(
        validItems.reduce((acc, curr) => acc + curr.total_price, 0) * 100
      ) / 100;
      const totalQty = validItems.reduce((acc, curr) => acc + curr.quantity, 0);
      const summaryName = validItems.map((i) => i.product_name).join(', ');
      const avgPrice = totalQty > 0 ? Math.round((totalAmount / totalQty) * 100) / 100 : 0;

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          date: txDate,
          type: txType,
          items: validItems,
          product_name: summaryName,
          quantity: totalQty,
          unit_price: avgPrice,
          total_amount: totalAmount,
          notes: txNotes.trim(),
        });
      } else {
        await createTransaction({
          shop_id: shop.id,
          user_id: currentUser.uid,
          user_email: currentUser.email || '',
          date: txDate,
          type: txType,
          items: validItems,
          product_name: summaryName,
          quantity: totalQty,
          unit_price: avgPrice,
          total_amount: totalAmount,
          notes: txNotes.trim(),
        });
      }

      setIsModalOpen(false);
      await loadTransactions();
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      alert('Failed to save transaction: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (txId: string) => {
    try {
      await deleteTransaction(txId);
      setDeleteConfirmId(null);
      await loadTransactions();
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      alert('Failed to delete transaction.');
    }
  };

  // Calculate Summary metrics
  const totalPurchases = transactions
    .filter((t) => t.type === 'Purchase')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const totalSales = transactions
    .filter((t) => t.type === 'Sale')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const numTransactions = transactions.length;

  return (
    <div className="space-y-6">
      {/* Top back bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </button>

        {(isAdmin || canEditShop) && (
          <button
            onClick={() => onEditShop(shop)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors text-sm cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            {isAdmin ? 'Edit Shop Info (Admin)' : 'Edit Shop Info'}
          </button>
        )}
      </div>

      {/* Shop Profile Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {shop.logo ? (
            <img
              src={shop.logo}
              alt={shop.name}
              onError={(e) => {
                // If link fails or is invalid, fallback cleanly
                (e.target as HTMLElement).style.display = 'none';
              }}
              className="w-20 h-20 rounded-xl object-cover border border-neutral-700 bg-neutral-800 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 text-neutral-400">
              <Building2 className="w-10 h-10" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Multiplan Center
              </span>
              {shop.floor_locations && shop.floor_locations.length > 0 ? (
                shop.floor_locations.map((loc, i) => (
                  <span key={i} className="text-xs text-neutral-200 bg-neutral-800 border border-neutral-700/80 px-2.5 py-0.5 rounded flex items-center gap-1">
                    <span className="font-semibold text-emerald-400">{loc.floor}:</span>
                    <span>Shop {loc.shop_number}</span>
                  </span>
                ))
              ) : (
                shop.floor.split(/[,&/]+/).map((f) => f.trim()).filter(Boolean).map((f) => (
                  <span key={f} className="text-xs text-neutral-300 bg-neutral-800 border border-neutral-700/80 px-2 py-0.5 rounded">
                    {f}
                  </span>
                ))
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1.5">
              {shop.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-300 mt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {shop.floor_locations && shop.floor_locations.length > 0 ? (
                  <span>
                    {shop.floor_locations.map((loc) => `${loc.floor} (Shop ${loc.shop_number})`).join(' · ')}
                  </span>
                ) : (
                  <span>Shop {shop.shop_number} · {shop.floor}</span>
                )}
              </div>

              {shop.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <a href={`tel:${shop.phone}`} className="hover:text-emerald-400 transition-colors">
                    {shop.phone}
                  </a>
                </div>
              )}
            </div>

            {shop.notes && (
              <p className="text-sm text-neutral-400 mt-3 pt-3 border-t border-neutral-800/80">
                <span className="text-neutral-500 font-medium mr-1.5">Notes:</span>
                {shop.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Shop Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Total Purchases</div>
            <div className="text-xl font-bold text-white mt-0.5">
              ৳{totalPurchases.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Total Sales</div>
            <div className="text-xl font-bold text-white mt-0.5">
              ৳{totalSales.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Number of Transactions</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {numTransactions}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Transaction History</h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentUser.email}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Purchases and sales you recorded with {shop.name} (supports multiple product items per record)
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Transaction (Multi-Product)
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border-b border-red-800/40 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            Loading transaction history...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <p className="text-neutral-300 font-medium">No transactions recorded yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Record your purchases or sales with multiple products to keep itemized lists and totals.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              + Record First Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Products / Item List</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Items / Qty</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Notes</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {transactions.map((tx) => {
                  const hasMultipleItems = tx.items && tx.items.length > 0;
                  const isExpanded = expandedTxId === tx.id;

                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 text-xs">
                          {tx.date}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              tx.type === 'Purchase'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {hasMultipleItems ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white text-sm">
                                    {tx.items!.length} {tx.items!.length === 1 ? 'product' : 'products'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 transition-colors cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" /> Hide List
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" /> View List ({tx.items!.length})
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="text-xs text-neutral-400 line-clamp-1">
                                  {tx.items!.map((it) => it.product_name).join(', ')}
                                </div>
                              </div>
                            ) : (
                              <span className="font-medium text-white">
                                {tx.product_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums">
                          <span className="font-medium text-neutral-200">
                            {tx.quantity} pcs
                          </span>
                          {hasMultipleItems && (
                            <div className="text-[11px] text-neutral-500">
                              ({tx.items!.length} line items)
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
                          ৳{tx.total_amount.toLocaleString('en-US')}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-neutral-400 max-w-xs truncate">
                          {tx.notes || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {deleteConfirmId === tx.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(tx)}
                                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(tx.id)}
                                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable itemized sub-table */}
                      {hasMultipleItems && isExpanded && (
                        <tr className="bg-neutral-950/60 border-t border-b border-neutral-800">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 max-w-4xl">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                  Itemized Products Breakdown
                                </span>
                                <span>{tx.items!.length} Products</span>
                              </div>
                              <div className="divide-y divide-neutral-800/80 text-xs">
                                {tx.items!.map((it, idx) => (
                                  <div key={idx} className="py-2 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[10px] font-bold">
                                        {idx + 1}
                                      </span>
                                      <span className="text-white font-medium truncate">
                                        {it.product_name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-5 whitespace-nowrap text-neutral-300">
                                      <span>
                                        Qty: <strong className="text-white">{it.quantity}</strong>
                                      </span>
                                      <span>
                                        Rate: <strong className="text-neutral-200">৳{it.unit_price.toLocaleString('en-US')}</strong>
                                      </span>
                                      <span className="text-emerald-400 font-bold min-w-[70px] text-right">
                                        ৳{it.total_price.toLocaleString('en-US')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 mt-2 border-t border-neutral-800 flex justify-between items-center text-xs font-semibold">
                                <span className="text-neutral-400">Total Calculation:</span>
                                <span className="text-sm font-bold text-white">
                                  ৳{tx.total_amount.toLocaleString('en-US')}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal with Multiple Products Support */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingTransaction ? 'Edit Transaction' : 'Record New Transaction'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {shop.name} · Multi-product purchase or sale list
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Type and Date in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Transaction Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('Purchase')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        txType === 'Purchase'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Purchase (Buy)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('Sale')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        txType === 'Sale'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Sale (Sell)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Products List Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Products / Items in this transaction *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Product
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {txItems.map((item, index) => {
                    const rowQty = Number(item.quantity) || 0;
                    const rowPrice = Number(item.unit_price) || 0;
                    const rowTotal = rowQty * rowPrice;

                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl relative group"
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80 text-xs">
                          <span className="font-semibold text-neutral-400">
                            Product #{index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-medium">
                              Subtotal: ৳{rowTotal.toLocaleString('en-US')}
                            </span>
                            {txItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(item.id)}
                                className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          {/* Product Name */}
                          <div className="sm:col-span-6">
                            <label className="block text-[11px] text-neutral-400 mb-1">
                              Item Description / Name *
                            </label>
                            <input
                              type="text"
                              value={item.product_name}
                              onChange={(e) => handleItemChange(item.id, 'product_name', e.target.value)}
                              placeholder="e.g. Logitech Mouse, RTX 4060 GPU..."
                              required
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700/80 rounded-lg text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] text-neutral-400 mb-1">
                              Qty *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              required
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] text-neutral-400 mb-1">
                              Unit Price (৳) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(item.id, 'unit_price', e.target.value)}
                              placeholder="850"
                              required
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Product to this List
                  </button>
                </div>
              </div>

              {/* Calculated Grand Total Box */}
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-300 font-medium block">Grand Total:</span>
                  <span className="text-[11px] text-neutral-400">
                    {txItems.length} {txItems.length === 1 ? 'item' : 'items'} in total list
                  </span>
                </div>
                <span className="text-xl font-bold text-emerald-400">
                  ৳{calculatedGrandTotal.toLocaleString('en-US')}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Transaction Notes / Memo (Optional)
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. Invoice #2039, Warranty included, Paid cash"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  {isSubmitting ? 'Saving Transaction...' : `Save ${txType} (${txItems.length} Products)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
