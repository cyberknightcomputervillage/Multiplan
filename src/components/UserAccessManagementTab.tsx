import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Clock, 
  Mail, 
  AlertCircle,
  UserCheck,
  Edit,
  Shield,
  Key
} from 'lucide-react';
import { AppUser, UserAccessStatus } from '../types';
import { 
  fetchAllUserAccess, 
  setUserAccessStatus, 
  setUserEditPermission,
  deleteUserAccess, 
  directAddApprovedUser 
} from '../dataService';
import { AdminActionPasswordModal } from './AdminActionPasswordModal';

interface UserAccessManagementTabProps {
  currentUserEmail: string;
}

export const UserAccessManagementTab: React.FC<UserAccessManagementTabProps> = ({
  currentUserEmail,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserAccessStatus | 'editors'>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Direct add user modal / form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newGiveEdit, setNewGiveEdit] = useState(false);

  // Password confirmation modal for sensitive administrative actions
  const [pendingPasswordAction, setPendingPasswordAction] = useState<{
    actionTitle: string;
    actionDescription?: string;
    onExecute: () => Promise<void>;
  } | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const list = await fetchAllUserAccess();
      setUsers(list);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateStatus = (user: AppUser, newStatus: UserAccessStatus) => {
    const actionVerb = newStatus === 'approved' ? 'Permit / Approve' : newStatus === 'banned' ? 'Ban' : 'Set to Pending';
    setPendingPasswordAction({
      actionTitle: `${actionVerb} User: ${user.email}`,
      actionDescription: `Enter admin password to change access status of "${user.email}" to "${newStatus.toUpperCase()}".`,
      onExecute: async () => {
        await setUserAccessStatus(user.id, newStatus, currentUserEmail);
        setStatusMessage(`User ${user.email} is now ${newStatus.toUpperCase()}.`);
        await loadUsers();
        setTimeout(() => setStatusMessage(null), 4000);
      },
    });
  };

  const handleToggleEditPermission = (user: AppUser) => {
    const willGrant = !user.can_edit;
    const actionTitle = willGrant ? `Grant Edit Permission: ${user.email}` : `Revoke Edit Permission: ${user.email}`;
    const actionDescription = willGrant 
      ? `Enter admin password to grant "${user.email}" permission to add or edit shops (Password for user actions will be "user").`
      : `Enter admin password to revoke shop editing permissions from "${user.email}".`;

    setPendingPasswordAction({
      actionTitle,
      actionDescription,
      onExecute: async () => {
        await setUserEditPermission(user.id, willGrant, currentUserEmail);
        setStatusMessage(willGrant 
          ? `Edit permission GRANTED to ${user.email}. (User password: "user")`
          : `Edit permission REVOKED from ${user.email}.`
        );
        await loadUsers();
        setTimeout(() => setStatusMessage(null), 4000);
      },
    });
  };

  const handleDeleteUser = (user: AppUser) => {
    setPendingPasswordAction({
      actionTitle: `Delete User Permission: ${user.email}`,
      actionDescription: `Enter admin password to permanently remove "${user.email}" from the access records. They will need to request permission again to access the site.`,
      onExecute: async () => {
        await deleteUserAccess(user.id);
        setStatusMessage(`User ${user.email} removed from system.`);
        await loadUsers();
        setTimeout(() => setStatusMessage(null), 4000);
      },
    });
  };

  const handleDirectAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Please enter a valid Google email address.');
      return;
    }

    setPendingPasswordAction({
      actionTitle: `Pre-Approve Account: ${cleanEmail}`,
      actionDescription: `Enter admin password to permit "${cleanEmail}" to access the website immediately${newGiveEdit ? ' with shop edit permissions' : ''}.`,
      onExecute: async () => {
        const record = await directAddApprovedUser(cleanEmail, currentUserEmail, newDisplayName.trim());
        if (newGiveEdit) {
          await setUserEditPermission(record.id, true, currentUserEmail);
        }
        setShowAddModal(false);
        setNewEmail('');
        setNewDisplayName('');
        setNewGiveEdit(false);
        setStatusMessage(`User ${cleanEmail} approved successfully!`);
        await loadUsers();
        setTimeout(() => setStatusMessage(null), 4000);
      },
    });
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    let matchesStatus = true;
    if (statusFilter === 'editors') {
      matchesStatus = !!u.can_edit;
    } else if (statusFilter !== 'all') {
      matchesStatus = u.status === statusFilter;
    }
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || u.email.toLowerCase().includes(q) || (u.displayName && u.displayName.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;
  const bannedCount = users.filter((u) => u.status === 'banned').length;
  const editorsCount = users.filter((u) => !!u.can_edit).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
            Access Control &amp; Security
          </span>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            User Access &amp; Edit Permissions
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                {pendingCount} Pending Approval
              </span>
            )}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Authorize users to view the site, and grant selected users <strong>Shop Edit Permission</strong> so they can add or edit shops using the user password (<code>user</code>). Admins can give or take away edit rights at any time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Permit New Gmail
          </button>
          <button
            onClick={loadUsers}
            className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {statusMessage}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-neutral-800 text-white font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All Accounts ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                : 'text-neutral-400 hover:text-amber-300'
            }`}
          >
            Pending Requests ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-neutral-400 hover:text-emerald-300'
            }`}
          >
            Permitted ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('editors')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'editors'
                ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                : 'text-neutral-400 hover:text-blue-300'
            }`}
          >
            <Edit className="w-3 h-3 text-blue-400" />
            Can Edit Shops ({editorsCount})
          </button>
          <button
            onClick={() => setStatusFilter('banned')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'banned'
                ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                : 'text-neutral-400 hover:text-red-300'
            }`}
          >
            Banned ({bannedCount})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email or name..."
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            Loading user access directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <p className="text-white font-medium text-sm">No accounts found</p>
            <p className="text-xs text-neutral-500 mt-1">
              {statusFilter === 'pending'
                ? 'There are currently no users waiting for access approval.'
                : statusFilter === 'editors'
                ? 'No users currently have edit permission assigned.'
                : 'No users match your current filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider border-b border-neutral-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">User / Google Email</th>
                  <th className="py-3 px-4 font-semibold">View Access</th>
                  <th className="py-3 px-4 font-semibold">Shop Edit Permission</th>
                  <th className="py-3 px-4 font-semibold">Request Note</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {filteredUsers.map((user) => {
                  return (
                    <tr key={user.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt=""
                              className="w-7 h-7 rounded-full border border-neutral-700 object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 flex-shrink-0">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white text-xs">{user.email}</div>
                            {user.displayName && (
                              <div className="text-[11px] text-neutral-400">{user.displayName}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Permitted
                          </span>
                        )}
                        {user.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                        {user.status === 'banned' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                            <Ban className="w-3 h-3" /> Banned
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.status === 'approved' ? (
                          <div className="flex items-center gap-2">
                            {user.can_edit ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                <Edit className="w-3 h-3 text-blue-400" />
                                Can Add &amp; Edit (pass: user)
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[11px]">
                                View Only
                              </span>
                            )}

                            <button
                              onClick={() => handleToggleEditPermission(user)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer border ${
                                user.can_edit
                                  ? 'bg-neutral-800 text-amber-400 border-neutral-700 hover:bg-neutral-700'
                                  : 'bg-blue-950/60 text-blue-300 border-blue-800/60 hover:bg-blue-900/60'
                              }`}
                              title={user.can_edit ? 'Revoke shop edit permission' : 'Allow user to add & edit shops'}
                            >
                              {user.can_edit ? 'Revoke Edit' : 'Give Edit Permission'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-neutral-600 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate text-[11px]">
                        {user.request_note || '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500 text-[11px]">
                        {user.requested_at ? new Date(user.requested_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {user.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateStatus(user, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Give access"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Permit
                            </button>
                          )}

                          {user.status === 'approved' && (
                            <button
                              onClick={() => handleUpdateStatus(user, 'pending')}
                              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors cursor-pointer"
                              title="Revoke access (set back to pending)"
                            >
                              Revoke
                            </button>
                          )}

                          {user.status !== 'banned' && (
                            <button
                              onClick={() => handleUpdateStatus(user, 'banned')}
                              className="p-1 hover:bg-red-950 text-neutral-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                              title="Ban user"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                            title="Delete user record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Pre-Authorize &amp; Permit User
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter the exact Google email address. Once added, this user will have immediate access as soon as they sign in.
            </p>

            <form onSubmit={handleDirectAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Google Email Address *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Saikat Store Manager"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="giveEditCheck"
                  checked={newGiveEdit}
                  onChange={(e) => setNewGiveEdit(e.target.checked)}
                  className="mt-0.5 accent-blue-500 rounded cursor-pointer"
                />
                <label htmlFor="giveEditCheck" className="text-xs text-neutral-300 cursor-pointer select-none">
                  <strong className="text-white block font-semibold">Grant Shop Edit Permission</strong>
                  Allow this user to add new shops and edit existing shops (password will be: <code>user</code>).
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Permit Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Action Password Gate */}
      {pendingPasswordAction && (
        <AdminActionPasswordModal
          actionTitle={pendingPasswordAction.actionTitle}
          actionDescription={pendingPasswordAction.actionDescription}
          onSuccess={async () => {
            const exec = pendingPasswordAction.onExecute;
            setPendingPasswordAction(null);
            await exec();
          }}
          onClose={() => setPendingPasswordAction(null)}
        />
      )}
    </div>
  );
};

