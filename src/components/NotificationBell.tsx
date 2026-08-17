import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationBell: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const userIds = isAdmin ? [user.uid, 'admin_global'] : [user.uid];
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', userIds),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gold/60 hover:text-gold transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-vanta text-[10px] font-black flex items-center justify-center rounded-full border-2 border-vanta">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[110]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-vanta border border-gold/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl z-[120]"
            >
              <div className="p-4 border-b border-gold/10 bg-gold/5 flex items-center justify-between">
                <h4 className="text-[10px] font-mono text-gold uppercase tracking-widest">Notifications</h4>
                <button onClick={() => setIsOpen(false)} className="text-oat/40 hover:text-gold transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-oat/20 font-mono text-[10px] uppercase tracking-widest">No notifications</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 border-b border-gold/5 hover:bg-gold/5 transition-colors cursor-pointer ${!notification.read ? 'bg-gold/5' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[8px] font-mono uppercase tracking-widest ${notification.type === 'reminder' ? 'text-gold' : 'text-blue-400'}`}>
                          {notification.type}
                        </span>
                        <span className="text-[8px] font-mono text-oat/20 uppercase tracking-widest">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h5 className="text-oat font-bold text-xs mb-1">{notification.title}</h5>
                      <p className="text-oat/60 text-[10px] leading-relaxed">{notification.message}</p>
                      {!notification.read && (
                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gold" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
