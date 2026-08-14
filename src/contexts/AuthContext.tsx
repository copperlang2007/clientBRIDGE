import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  photoURL?: string;
  phoneNumber?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  website?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  permissions: Permissions;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfileData>) => Promise<void>;
  logout: () => Promise<void>;
}

interface Permissions {
  manageSOWs: boolean;
  manageProposals: boolean;
  manageInvoices: boolean;
  manageProjects: boolean;
  manageRoles: boolean;
  viewAnalytics: boolean;
}

const DEFAULT_PERMISSIONS: Permissions = {
  manageSOWs: false,
  manageProposals: false,
  manageInvoices: false,
  manageProjects: false,
  manageRoles: false,
  viewAnalytics: false
};

const ADMIN_PERMISSIONS: Permissions = {
  manageSOWs: true,
  manageProposals: true,
  manageInvoices: true,
  manageProjects: true,
  manageRoles: true,
  viewAnalytics: true
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        
        try {
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const isAdmin = currentUser.email === 'Lang@theartificialbridge.com' || currentUser.email === 'mlang@team-iia.com' || currentUser.email === 'admin@demo.com';
            const newProfile: UserProfileData = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              photoURL: currentUser.photoURL || '',
              role: isAdmin ? 'admin' : 'client',
              createdAt: new Date().toISOString()
            };
            await setDoc(docRef, newProfile);
          } else {
            // Check auto-upgrade admin email
            const currentData = docSnap.data();
            const isAdminEmail = currentUser.email === 'Lang@theartificialbridge.com' || currentUser.email === 'mlang@team-iia.com' || currentUser.email === 'admin@demo.com';
            if (isAdminEmail && currentData.role !== 'admin') {
              await updateDoc(docRef, { role: 'admin' });
            }
          }
        } catch (error) {
          console.error('Error initializing user profile:', error);
        }

        // Real-time listener for user profile
        profileUnsub = onSnapshot(docRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfileData;
            setProfile(data);

            // Determine permissions
            if (data.role === 'admin') {
              setPermissions(ADMIN_PERMISSIONS);
            } else if (data.role === 'client') {
              setPermissions(DEFAULT_PERMISSIONS);
            } else {
              // Fetch custom role
              try {
                const roleRef = doc(db, 'roles', data.role);
                const roleSnap = await getDoc(roleRef);
                if (roleSnap.exists()) {
                  setPermissions(roleSnap.data().permissions);
                } else {
                  setPermissions(DEFAULT_PERMISSIONS);
                }
              } catch {
                setPermissions(DEFAULT_PERMISSIONS);
              }
            }
          } else {
            setProfile(null);
            setPermissions(DEFAULT_PERMISSIONS);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        });

      } else {
        setProfile(null);
        setPermissions(DEFAULT_PERMISSIONS);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(user, { displayName: name });
  };

  const updateUserProfile = async (data: Partial<UserProfileData>) => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    const uid = auth.currentUser.uid;
    const docRef = doc(db, 'users', uid);

    try {
      const cleanData: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };

      if (data.displayName !== undefined) cleanData.displayName = data.displayName;
      if (data.photoURL !== undefined) cleanData.photoURL = data.photoURL;
      if (data.phoneNumber !== undefined) cleanData.phoneNumber = data.phoneNumber;
      if (data.company !== undefined) cleanData.company = data.company;
      if (data.jobTitle !== undefined) cleanData.jobTitle = data.jobTitle;
      if (data.location !== undefined) cleanData.location = data.location;
      if (data.website !== undefined) cleanData.website = data.website;
      if (data.bio !== undefined) cleanData.bio = data.bio;

      await updateDoc(docRef, cleanData);

      // Sync Firebase Auth standard profile attributes
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (data.displayName) authUpdates.displayName = data.displayName;
      if (data.photoURL) authUpdates.photoURL = data.photoURL;
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser, authUpdates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      permissions,
      loading, 
      isAdmin: profile?.role === 'admin' || permissions.manageRoles,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      updateUserProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
