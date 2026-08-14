import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Plus, Trash2, Save, X, Check, Settings } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  permissions: {
    manageSOWs: boolean;
    manageProposals: boolean;
    manageInvoices: boolean;
    manageProjects: boolean;
    manageRoles: boolean;
    viewAnalytics: boolean;
  };
}

export const RoleManager: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    permissions: {
      manageSOWs: false,
      manageProposals: false,
      manageInvoices: false,
      manageProjects: false,
      manageRoles: false,
      viewAnalytics: false
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const rolesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
      setRoles(rolesData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'roles'));

    return unsubscribe;
  }, []);

  const handleCreateRole = async () => {
    if (!newRole.name) return;
    try {
      await addDoc(collection(db, 'roles'), {
        ...newRole,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewRole({
        name: '',
        permissions: {
          manageSOWs: false,
          manageProposals: false,
          manageInvoices: false,
          manageProjects: false,
          manageRoles: false,
          viewAnalytics: false
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'roles');
    }
  };

  const handleUpdateRole = async (role: Role) => {
    try {
      const { id, ...data } = role;
      await updateDoc(doc(db, 'roles', id), data);
      setEditingRole(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `roles/${role.id}`);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? Users assigned to this role will lose access.')) return;
    try {
      await deleteDoc(doc(db, 'roles', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `roles/${id}`);
    }
  };

  const togglePermission = (role: Partial<Role>, permission: keyof Role['permissions']) => {
    return {
      ...role,
      permissions: {
        ...role.permissions!,
        [permission]: !role.permissions![permission]
      }
    };
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-mono text-gold uppercase tracking-[0.3em] mb-2">Access Control</h2>
          <h3 className="text-2xl font-light text-oat">Role Management</h3>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-vanta font-bold rounded-full text-[10px] uppercase tracking-widest hover:bg-oat transition-colors"
        >
          <Plus size={14} />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 border border-gold/30 bg-gold/10 rounded-3xl backdrop-blur-xl space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gold uppercase tracking-widest">Role Name</label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g. Project Manager"
                  className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-2 text-oat font-mono text-xs focus:outline-none focus:border-gold/50"
                />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-mono text-oat/40 uppercase tracking-widest">Permissions</p>
                {Object.keys(newRole.permissions!).map((perm) => (
                  <button
                    key={perm}
                    onClick={() => setNewRole(togglePermission(newRole, perm as any))}
                    className="flex items-center justify-between w-full p-3 rounded-xl border border-gold/10 bg-vanta/50 hover:bg-gold/5 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-oat/60 uppercase tracking-widest">{perm.replace('manage', 'Manage ')}</span>
                    {newRole.permissions![perm as keyof Role['permissions']] ? (
                      <Check size={14} className="text-gold" />
                    ) : (
                      <X size={14} className="text-oat/20" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateRole}
                  className="flex-1 py-3 bg-gold text-vanta font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-oat transition-colors"
                >
                  Save Role
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-3 border border-gold/20 text-oat/40 rounded-xl hover:bg-gold/5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {roles.map((role) => (
            <motion.div
              key={role.id}
              layout
              className={`p-6 border rounded-3xl backdrop-blur-xl space-y-6 transition-all ${
                editingRole?.id === role.id ? 'border-gold/50 bg-gold/10' : 'border-gold/10 bg-gold/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold/10 rounded-lg text-gold">
                    <Shield size={16} />
                  </div>
                  <h4 className="font-bold text-oat uppercase tracking-widest text-sm">{role.name}</h4>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRole(editingRole?.id === role.id ? null : role)}
                    className="p-2 text-oat/40 hover:text-gold transition-colors"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 text-oat/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(role.permissions).map(([perm, value]) => (
                  <div key={perm} className="flex items-center justify-between py-1 border-b border-gold/5">
                    <span className="text-[8px] font-mono text-oat/40 uppercase tracking-widest">{perm.replace('manage', '')}</span>
                    {editingRole?.id === role.id ? (
                      <button
                        onClick={() => setEditingRole(togglePermission(editingRole, perm as any) as Role)}
                        className={`p-1 rounded transition-colors ${value ? 'text-gold' : 'text-oat/20'}`}
                      >
                        {value ? <Check size={12} /> : <X size={12} />}
                      </button>
                    ) : (
                      value ? <Check size={12} className="text-gold/60" /> : <X size={12} className="text-oat/10" />
                    )}
                  </div>
                ))}
              </div>

              {editingRole?.id === role.id && (
                <button
                  onClick={() => handleUpdateRole(editingRole)}
                  className="w-full py-3 bg-gold text-vanta font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-oat transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  Update Permissions
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
