import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export type NotificationType = 'reminder' | 'update' | 'alert';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
}

export const sendNotification = async (payload: Omit<NotificationPayload, 'read'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...payload,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
  }
};

export const notifyAdmin = async (title: string, message: string, type: NotificationType = 'update') => {
  // In a real app, we might fetch all admins. For now, we'll send to a specific admin or a general "admin" flag if we had one.
  // Since we have a demo admin, let's assume we can notify by role or specific UIDs.
  // For simplicity in this demo, we'll notify the 'admin@demo.com' user if we can find their UID, 
  // or just create a notification that admins can see (security rules allow admins to read all notifications).
  // However, notifications usually need a recipient. Let's send to a "system_admin" placeholder or similar if needed,
  // but better to target actual admin UIDs.
  
  // For this implementation, we'll just use a generic "admin" recipient ID for global admin notifications
  // and update the rules/UI to show these to all admins.
  await sendNotification({
    userId: 'admin_global',
    title,
    message,
    type,
  });
};
