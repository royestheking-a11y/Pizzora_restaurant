import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Star, Award, Image, User, Briefcase, FileText, X, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Chef } from '../../data/restaurantData';
import { compressImage } from '../../utils/imageUpload';
import { ChefCardSkeleton } from '../Skeletons';
import { ConfirmModal } from '../ConfirmModal';

export function ChefManagement() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingChef, setEditingChef] = useState<Chef | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const adminRole = sessionStorage.getItem('pizzora_admin_role') || 'admin';
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [form, setForm] = useState({
    name: '', position: '', experience: '', speciality: '', image: '', bio: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.position || !form.image) return;

    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));

    if (editingChef) {
      dispatch({ type: 'UPDATE_CHEF', payload: { ...editingChef, ...form } });
    } else {
      dispatch({ type: 'ADD_CHEF', payload: { id: Date.now().toString(), ...form } });
    }
    setShowForm(false);
    setEditingChef(null);
    setForm({ name: '', position: '', experience: '', speciality: '', image: '', bio: '' });
    setIsSaving(false);
  };

  const handleEdit = (chef: Chef) => {
    setEditingChef(chef);
    setForm({ ...chef });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p style={{ color: '#6B7280', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
          <span style={{ fontWeight: 700, color: '#111', fontFamily: 'var(--font-heading)' }}>{state.chefs.length}</span> chefs
        </p>
        <button
          onClick={() => { setEditingChef(null); setForm({ name: '', position: '', experience: '', speciality: '', image: '', bio: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #F9002B, #C8001F)', fontFamily: 'var(--font-heading)' }}
        >
          <Plus size={15} /> Add New Chef
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.isInitialLoading ? (
          Array.from({ length: 4 }).map((_, i) => <ChefCardSkeleton key={i} />)
        ) : (
          state.chefs.map(chef => (
          <div key={chef.id} className="bg-white rounded-2xl overflow-hidden shadow-sm group" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="relative h-48 overflow-hidden">
              <img src={chef.image} alt={chef.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-4">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: '#111' }}>{chef.name}</h3>
              <p style={{ color: '#F9002B', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>{chef.position}</p>
              
              <div className="flex items-center gap-2 mb-1.5 text-gray-500 text-xs">
                <Star size={12} style={{ color: '#F9002B' }} /> {chef.experience}
              </div>
              <div className="flex items-center gap-2 mb-4 text-gray-500 text-xs">
                <Award size={12} style={{ color: '#F9002B' }} /> {chef.speciality}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(chef)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-blue-50 text-blue-600"
                >
                  <Edit2 size={12} /> Edit
                </button>
                {adminRole === 'admin' && (
                  <button
                    onClick={() => setDeleteConfirm({
                      isOpen: true,
                      title: 'Delete Chef?',
                      message: `Are you sure you want to delete ${chef.name}?`,
                      onConfirm: () => {
                        dispatch({ type: 'DELETE_CHEF', payload: chef.id });
                        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
                      }
                    })}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-red-50 text-red-600"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                {editingChef ? 'Edit Chef' : 'Add New Chef'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:text-black">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Position</label>
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      value={form.position}
                      onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                      placeholder="e.g. Head Chef"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Chef Photo *</label>
                  {isUploading && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 animate-pulse bg-blue-50 px-2 py-0.5 rounded-full">
                      <Loader2 size={10} className="animate-spin" /> Processing...
                    </div>
                  )}
                </div>
                
                {!form.image ? (
                  <div className="relative group mt-1">
                    <input
                      required
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploading(true);
                          try {
                            const base64 = await compressImage(file, 800);
                            setForm(f => ({ ...f, image: base64 }));
                          } catch (error) {
                            console.error("Error compressing image:", error);
                            alert("Failed to process image.");
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                    />
                    <div 
                      className={`w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${isUploading ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:border-red-300 hover:bg-red-50/30'}`}
                    >
                      <Image size={20} className={isUploading ? 'text-blue-500 mb-2' : 'text-gray-400 mb-2'} />
                      <span className="text-xs font-bold text-gray-700">
                        {isUploading ? 'Uploading...' : 'Click or Drag Photo'}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-1 font-medium">JPEG, PNG</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden h-32 w-32 bg-white border border-gray-200 shadow-sm group mt-1 mx-auto">
                    <img src={form.image} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image: '' }))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10 cursor-pointer"
                      title="Remove image"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Experience</label>
                  <div className="relative">
                    <Star size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      value={form.experience}
                      onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
                      placeholder="e.g. 15 Years"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Speciality</label>
                  <div className="relative">
                    <Award size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      required
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      value={form.speciality}
                      onChange={e => setForm(f => ({ ...f, speciality: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Bio</label>
                <textarea
                  required
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={isUploading || isSaving}
                  className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || isSaving || !form.image}
                  className="flex-1 py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#F9002B' }}
                >
                  {isSaving ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    <>Save Chef</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
