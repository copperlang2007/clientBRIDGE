import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Trash2, X, Info, AlertTriangle, BellRing } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export const NotificationCenter: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen for notifications for the current user OR global admin notifications if the user is an admin
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [user.uid, ...(isAdmin ? ['admin_global'] : [])]),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const clearAll = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-full border border-gold/20 bg-gold/5 text-gold hover:bg-gold/10 transition-all"
      >
        {unreadCount > 0 ? <BellRing size={18} className="animate-pulse" /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-vanta">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 md:w-96 bg-vanta border border-gold/20 rounded-[24px] shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
            >
              <div className="p-4 border-b border-gold/10 flex items-center justify-between bg-gold/5">
                <h3 className="text-[10px] font-mono font-bold text-gold uppercase tracking-widest">Notifications</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[8px] font-mono text-oat/40 hover:text-gold uppercase tracking-widest"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearAll}
                      className="text-[8px] font-mono text-red-400/60 hover:text-red-400 uppercase tracking-widest"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-8 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    <span className="text-[8px] font-mono text-oat/20 uppercase tracking-widest">Syncing...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 bg-gold/5 rounded-full flex items-center justify-center text-gold/20">
                      <Bell size={24} />
                    </div>
                    <div>
                      <p className="text-oat/60 text-[10px] font-bold uppercase tracking-widest">No notifications</p>
                      <p className="text-oat/20 text-[8px] font-mono uppercase tracking-widest mt-1">You're all caught up</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gold/5">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-4 transition-colors group relative ${notif.read ? 'bg-transparent' : 'bg-gold/5'}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                            notif.type === 'alert' ? 'bg-red-400/10 text-red-400' :
                            notif.type === 'reminder' ? 'bg-gold/10 text-gold' :
                            'bg-blue-400/10 text-blue-400'
                          }`}>
                            {notif.type === 'alert' ? <AlertTriangle size={14} /> :
                             notif.type === 'reminder' ? <Bell size={14} /> :
                             <Info size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className={`text-[10px] font-bold uppercase tracking-widest truncate ${notif.read ? 'text-oat/60' : 'text-oat'}`}>
                                {notif.title}
                              </h4>
                              <span className="text-[8px] font-mono text-oat/20 whitespace-nowrap">
                                {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                            </div>
                            <p className={`text-[10px] leading-relaxed ${notif.read ? 'text-oat/40' : 'text-oat/70'}`}>
                              {notif.message}
                            </p>
                            <div className="mt-3 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notif.read && (
                                <button 
                                  onClick={() => markAsRead(notif.id)}
                                  className="flex items-center gap-1 text-[8px] font-mono text-gold hover:text-oat uppercase tracking-widest"
                                >
                                  <Check size={10} /> Mark read
                                </button>
                              )}
                              <button 
                                onClick={() => deleteNotification(notif.id)}
                                className="flex items-center gap-1 text-[8px] font-mono text-red-400/60 hover:text-red-400 uppercase tracking-widest"
                              >
                                <Trash2 size={10} /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
