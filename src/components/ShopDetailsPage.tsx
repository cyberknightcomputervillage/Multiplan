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
  AlertCircle
} from 'lucide-react';
import { Shop, ShopTransaction, TransactionType } from '../types';
import { 
  fetchTransactionsForShop, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../dataService';
import { User } from 'firebase/auth';

interface ShopDetailsPageProps {
  shop: Shop;
  currentUser: User;
  isAdmin: boolean;
  onBack: () => void;
  onEditShop: (shop: Shop) => void;
}

export const ShopDetailsPage: React.FC<ShopDetailsPageProps> = ({
  shop,
  currentUser,
  isAdmin,
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
  const [txProduct, setTxProduct] = useState('');
  const [txQuantity, setTxQuantity] = useState<string>('1');
  const [txUnitPrice, setTxUnitPrice] = useState<string>('');
  const [txNotes, setTxNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  // Compute calculated total
  const calculatedTotal = (Number(txQuantity) || 0) * (Number(txUnitPrice) || 0);

  // Open modal for new transaction
  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxType('Purchase');
    setTxProduct('');
    setTxQuantity('1');
    setTxUnitPrice('');
    setTxNotes('');
    setIsModalOpen(true);
  };

  // Open modal to edit existing transaction
  const handleOpenEdit = (tx: ShopTransaction) => {
    setEditingTransaction(tx);
    setTxDate(tx.date);
    setTxType(tx.type);
    setTxProduct(tx.product_name);
    setTxQuantity(tx.quantity.toString());
    setTxUnitPrice(tx.unit_price.toString());
    setTxNotes(tx.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txProduct.trim()) {
      alert('Product or item name is required.');
      return;
    }
    const qty = Number(txQuantity);
    const price = Number(txUnitPrice);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid unit price.');
      return;
    }

    try {
      setIsSubmitting(true);
      const totalAmount = Math.round(qty * price * 100) / 100;

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          date: txDate,
          type: txType,
          product_name: txProduct.trim(),
          quantity: qty,
          unit_price: price,
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
          product_name: txProduct.trim(),
          quantity: qty,
          unit_price: price,
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

        {isAdmin && (
          <button
            onClick={() => onEditShop(shop)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors text-sm cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-emerald-400" />
            Edit Shop Info (Admin)
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
              {shop.floor.split(/[,&/]+/).map((f) => f.trim()).filter(Boolean).map((f) => (
                <span key={f} className="text-xs text-neutral-300 bg-neutral-800 border border-neutral-700/80 px-2 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1.5">
              {shop.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-300 mt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Shop {shop.shop_number} · {shop.floor}</span>
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
              Purchases and sales you recorded with {shop.name}
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
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
              Record your purchases or sales with this shop to track history and totals.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
            >
              + Record First Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950/60 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Product / Item</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Qty</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Unit Price</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total</th>
                  <th className="py-3.5 px-4 font-semibold">Notes</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-800/40 transition-colors">
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
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      {tx.product_name}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {tx.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-neutral-400">
                      ৳{tx.unit_price.toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-white">
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
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(tx.id)}
                            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
            </h3>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Type: Purchase / Sale */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('Purchase')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 transition-colors ${
                      txType === 'Purchase'
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Purchase (Bought)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('Sale')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 transition-colors ${
                      txType === 'Sale'
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Sale (Sold)
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Product / Item Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Product / Item Name *
                </label>
                <input
                  type="text"
                  value={txProduct}
                  onChange={(e) => setTxProduct(e.target.value)}
                  placeholder="e.g. Logitech K120 Keyboard, B650 Motherboard"
                  required
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quantity and Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Unit Price (৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={txUnitPrice}
                    onChange={(e) => setTxUnitPrice(e.target.value)}
                    placeholder="850"
                    required
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Calculated Total Box */}
              <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg flex items-center justify-between">
                <span className="text-xs text-neutral-400">Total Calculated Amount:</span>
                <span className="text-base font-bold text-white">
                  ৳{calculatedTotal.toLocaleString('en-US')}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. Regular stock, Invoice #2031, with warranty"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
