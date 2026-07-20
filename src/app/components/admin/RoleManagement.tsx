import React, { useState } from 'react';
import { Shield, Key, Plus, Trash2, X, RefreshCw, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfirmModal } from '../ConfirmModal';
import { TableRowSkeleton } from '../Skeletons';

const WORDS = ['pizza', 'cheese', 'slice', 'dough', 'tomato', 'basil', 'crust', 'chef', 'oven', 'tasty', 'manager'];
const generatePassword = () => {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(100 + Math.random() * 900); // 3-digit number
  return `${word}${num}`;
};

export function RoleManagement() {
  const { state, dispatch } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [visiblePasswordId, setVisiblePasswordId] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'manager';
  if (adminRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Shield size={48} className="text-red-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-500">Only the master administrator can manage roles and credentials.</p>
      </div>
    );
  }

  const handleAddManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const password = generatePassword();
    const newUser = {
      id: Date.now().toString(),
      username: newUsername.trim(),
      password,
      role: 'manager',
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_USER', payload: newUser });
    setGeneratedPassword(password);
    setShowAddForm(false);
  };

  const handleResetPassword = (userId: string, username: string) => {
    const newPass = generatePassword();
    dispatch({ type: 'UPDATE_USER', payload: { id: userId, username, password: newPass, role: 'manager' } });
    setGeneratedPassword(newPass);
    setVisiblePasswordId(userId);
  };

  const managers = state.users?.filter(u => u.role === 'manager') || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Manager Credentials</h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage access for restaurant managers.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setNewUsername('');
            setGeneratedPassword('');
            setVisiblePasswordId(null);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#F9002B] hover:bg-[#C8001F] text-white rounded-xl font-semibold transition-all shadow-sm"
        >
          <Plus size={16} /> Add Manager
        </button>
      </div>

      {generatedPassword && !showAddForm && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col items-center text-center animate-scale-in">
          <Key size={32} className="text-green-500 mb-3" />
          <h3 className="text-lg font-bold text-green-900 mb-1">New Credential Generated!</h3>
          <p className="text-sm text-green-700 mb-4">Please securely share this password with the manager. It will not be shown again.</p>
          <div className="bg-white px-6 py-3 rounded-lg border shadow-inner flex items-center gap-4">
            <span className="font-mono text-xl tracking-wider font-bold">{generatedPassword}</span>
          </div>
          <button onClick={() => { setGeneratedPassword(''); setVisiblePasswordId(null); }} className="mt-4 text-sm font-semibold text-green-700 hover:text-green-900 underline">
            Dismiss
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Create New Manager</h3>
            <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <form onSubmit={handleAddManager} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="e.g. manager_john"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F9002B]/20"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold transition-all">
              Generate Account
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.isInitialLoading ? (
                <>
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                  <TableRowSkeleton columns={4} />
                </>
              ) : managers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <UserCheck size={32} className="mx-auto mb-3 text-gray-300" />
                    No managers created yet.
                  </td>
                </tr>
              ) : (
                managers.map(manager => (
                  <tr key={manager.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{manager.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {manager.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {manager.createdAt 
                        ? new Date(manager.createdAt).toLocaleDateString() 
                        : (manager.id && !isNaN(Number(manager.id))) 
                          ? new Date(Number(manager.id)).toLocaleDateString()
                          : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleResetPassword(manager.id, manager.username)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                          title="Generate new password"
                        >
                          <RefreshCw size={14} /> Reset Pass
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({
                            isOpen: true,
                            title: 'Delete Manager?',
                            message: `Are you sure you want to delete access for ${manager.username}? They will be logged out immediately.`,
                            onConfirm: () => {
                              dispatch({ type: 'DELETE_USER', payload: manager.id });
                              setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                              if (visiblePasswordId === manager.id) {
                                setGeneratedPassword('');
                                setVisiblePasswordId(null);
                              }
                            }
                          })}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Revoke Access"
                        >
                          <Trash2 size={16} />
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

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
