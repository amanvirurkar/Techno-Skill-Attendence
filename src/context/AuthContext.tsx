import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  verifyPasswordResetCode,
  updatePassword,
  User,
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db, phoneOtpAuth } from '../lib/firebase';
import { getDeviceId } from '../lib/device';
import { clearStoredOTP, sendEmail } from '../utils/emailService';

export type UserRole = 'admin' | 'teacher';

const AUTH_STORAGE_KEY = 'technoskill_auth';
const ADMIN_OTP_STORAGE_KEY = 'technoskill_admin_otp';
const OTP_TTL_MS = 5 * 60 * 1000;
const PHONE_REGEX = /^\+\d{10,15}$/;

const firebaseAuthWindow = globalThis as typeof globalThis & {
  recaptchaVerifier?: RecaptchaVerifier;
};

export interface PendingAdminOtp {
  uid: string;
  email: string;
  phone: string;
  device: string;
  expiresAt: number;
}

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  isMainAdmin: boolean;
  isActive?: boolean;
  mobile?: string;
  adminPhone?: string;
  allowedDevice?: string;
  deviceId?: string;
  displayName?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  appUser: AppUser | null;
  hasAdminAccount: boolean;
  isAdminRegistryLoading: boolean;
  pendingAdminOtp: PendingAdminOtp | null;
  login: (email: string, pass: string, selectedRole: UserRole) => Promise<{ requiresOtp: boolean }>;
  registerMainAdmin: (name: string, email: string, password: string, mobile: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  validateResetCode: (code: string) => Promise<string>;
  resetPassword: (code: string, newPassword: string) => Promise<void>;
  updateCurrentUserPassword: (newPassword: string) => Promise<void>;
  transferAdminOwnership: (email: string) => Promise<void>;
  saveAdminPhoneNumber: (phone: string) => Promise<void>;
  updateTeacherMobileNumber: (phone: string) => Promise<void>;
  verifyAdminOtp: (otp: string) => Promise<void>;
  toggleTeacherStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasAdminAccount, setHasAdminAccount] = useState(false);
  const [isAdminRegistryLoading, setIsAdminRegistryLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AppUser;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  });
  const [pendingAdminOtp, setPendingAdminOtp] = useState<PendingAdminOtp | null>(() => {
    const stored = localStorage.getItem(ADMIN_OTP_STORAGE_KEY);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as PendingAdminOtp;
      if (parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(ADMIN_OTP_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(ADMIN_OTP_STORAGE_KEY);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<ConfirmationResult | null>(null);

  const persistAppUser = (nextUser: AppUser | null) => {
    setAppUser(nextUser);
    if (nextUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const persistPendingAdminOtp = (nextChallenge: PendingAdminOtp | null) => {
    setPendingAdminOtp(nextChallenge);
    if (nextChallenge) {
      localStorage.setItem(ADMIN_OTP_STORAGE_KEY, JSON.stringify(nextChallenge));
    } else {
      localStorage.removeItem(ADMIN_OTP_STORAGE_KEY);
    }
  };

  const buildAppUser = (
    firebaseUser: User,
    role: UserRole,
    profile?: {
      displayName?: string;
      name?: string;
      isMainAdmin?: boolean;
      isActive?: boolean;
      mobile?: string;
      adminPhone?: string;
      allowedDevice?: string;
      deviceId?: string;
    }
  ) => {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      role,
      isMainAdmin: profile?.isMainAdmin === true,
      isActive: profile?.isActive === true,
      mobile: profile?.mobile || '',
      adminPhone: profile?.adminPhone || '',
      allowedDevice: profile?.allowedDevice || '',
      deviceId: profile?.deviceId || '',
      displayName: profile?.displayName || profile?.name || firebaseUser.displayName || undefined,
    };
  };

  const getCurrentDevice = () => getDeviceId();

  const canAccessAdminPanel = (email: string, data?: { role?: unknown; isMainAdmin?: unknown }) => {
    return (
      (data?.role as UserRole | undefined) === 'admin' &&
      data?.isMainAdmin === true &&
      Boolean(email)
    );
  };

  const logUnauthorizedAdminAccess = async (email: string) => {
    try {
      await addDoc(collection(db, 'securityLogs'), {
        email,
        time: serverTimestamp(),
        type: 'unauthorized_admin_access',
        device: getCurrentDevice(),
      });
      const mainAdminEmail = await getMainAdminEmail();
      if (mainAdminEmail) {
        await sendEmail(
          mainAdminEmail,
          'Admin',
          'Unauthorized login attempt detected on your account.'
        );
      }
    } catch (error) {
      console.error('Failed to save security log:', error);
    }
  };

  const getMainAdminEmail = async () => {
    const mainAdminSnapshot = await getDocs(
      query(
        collection(db, 'users'),
        where('role', '==', 'admin'),
        where('isMainAdmin', '==', true)
      )
    );

    return mainAdminSnapshot.docs[0]?.data()?.email || '';
  };

  const logSecurityEvent = async (email: string, type: string) => {
    try {
      await addDoc(collection(db, 'securityLogs'), {
        email,
        time: serverTimestamp(),
        type,
        device: getCurrentDevice(),
      });
    } catch (error) {
      console.error('Failed to save security log:', error);
    }
  };

  const normalizePhoneNumber = (phone: string) => phone.trim();

  const ensureRecaptchaVerifier = () => {
    const existingVerifier = firebaseAuthWindow.recaptchaVerifier;
    if (existingVerifier) {
      return existingVerifier;
    }

    const verifier = new RecaptchaVerifier(phoneOtpAuth, 'recaptcha-container', {
      size: 'invisible',
    });
    firebaseAuthWindow.recaptchaVerifier = verifier;
    return verifier;
  };

  const sendPhoneOtp = async (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!PHONE_REGEX.test(normalizedPhone)) {
      throw new Error('Enter phone number in +91XXXXXXXXXX format');
    }

    const confirmationResult = await signInWithPhoneNumber(
      phoneOtpAuth,
      normalizedPhone,
      ensureRecaptchaVerifier()
    );

    setPhoneConfirmationResult(confirmationResult);
    return normalizedPhone;
  };

  const ensureAdminOtpChallenge = async (
    firebaseUser: User,
    profile: { adminPhone?: string; mobile?: string; allowedDevice?: string }
  ) => {
    const allowedDevice = profile.allowedDevice || '';
    const currentDevice = getCurrentDevice();

    if (!allowedDevice || allowedDevice === currentDevice) {
      return false;
    }

    const existingChallenge = pendingAdminOtp;
    if (
      existingChallenge &&
      existingChallenge.uid === firebaseUser.uid &&
      existingChallenge.device === currentDevice &&
      existingChallenge.expiresAt > Date.now()
    ) {
      return true;
    }

    const phoneNumber = normalizePhoneNumber(profile.adminPhone || profile.mobile || '');
    if (!phoneNumber) {
      throw new Error('Admin phone number is not configured');
    }

    persistPendingAdminOtp({
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      phone: phoneNumber,
      device: currentDevice,
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    try {
      await sendPhoneOtp(phoneNumber);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw new Error('Failed to send OTP');
    }
    await logSecurityEvent(firebaseUser.email || '', 'otp_verification_required');
    return true;
  };

  useEffect(() => {
    const checkAdminAccount = async () => {
      try {
        const adminSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
        setHasAdminAccount(!adminSnapshot.empty);
      } finally {
        setIsAdminRegistryLoading(false);
      }
    };

    void checkAdminAccount();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const email = firebaseUser.email || '';
            const currentDeviceId = getCurrentDevice();

            console.log('Local Device ID:', currentDeviceId);
            console.log('Firestore Device ID:', data.deviceId || '');

            if ((data.role as UserRole) === 'admin' && !canAccessAdminPanel(email, data)) {
              await logUnauthorizedAdminAccess(email);
              await signOut(auth);
              persistAppUser(null);
              setIsLoading(false);
              return;
            }

            if ((data.role as UserRole) === 'admin' && !data.deviceId) {
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                deviceId: currentDeviceId,
                allowedDevice: currentDeviceId,
              });
              data.deviceId = currentDeviceId;
              data.allowedDevice = currentDeviceId;
            }

            if ((data.role as UserRole) === 'admin' && data.deviceId !== currentDeviceId) {
              await logUnauthorizedAdminAccess(email);
              await signOut(auth);
              persistAppUser(null);
              setIsLoading(false);
              return;
            }

            if ((data.role as UserRole) === 'admin') {
              const requiresOtp = await ensureAdminOtpChallenge(firebaseUser, data);
              if (requiresOtp) {
                persistAppUser(null);
                setIsLoading(false);
                return;
              }
            }

            persistAppUser(buildAppUser(firebaseUser, data.role as UserRole, data));
          } else {
            persistAppUser(null);
          }
        } catch {
          persistAppUser(null);
        }
      } else {
        persistAppUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [pendingAdminOtp]);

  const registerMainAdmin = async (name: string, email: string, password: string, mobile: string) => {
    const adminSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));

    if (!adminSnapshot.empty) {
      throw new Error('Admin already registered');
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const deviceId = getCurrentDevice();

    try {
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name,
        email,
        mobile,
        role: 'admin',
        isMainAdmin: true,
        isActive: false,
        deviceId,
        allowedDevice: deviceId,
        adminPhone: mobile,
        createdAt: serverTimestamp(),
      });

      setHasAdminAccount(true);
      persistAppUser({
        uid: credential.user.uid,
        email: credential.user.email || email,
        role: 'admin',
        isMainAdmin: true,
        isActive: false,
        mobile,
        adminPhone: mobile,
        allowedDevice: deviceId,
        deviceId,
        displayName: name,
      });
    } catch (error) {
      try {
        await deleteUser(credential.user);
      } catch (deleteError) {
        console.error('Failed to rollback admin registration:', deleteError);
      }
      throw error;
    }
  };

  const login = async (email: string, pass: string, selectedRole: UserRole) => {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    
    // Fetch role from Firestore
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

    let roleData: {
      role: UserRole;
      displayName?: string;
      name?: string;
      isMainAdmin?: boolean;
      isActive?: boolean;
      mobile?: string;
      adminPhone?: string;
      allowedDevice?: string;
      deviceId?: string;
    } | null = null;

    if (userDoc.exists()) {
      const data = userDoc.data();
      const currentDeviceId = getCurrentDevice();

      console.log('Local Device ID:', currentDeviceId);
      console.log('Firestore Device ID:', data.deviceId || '');

      roleData = {
        role: data.role as UserRole,
        displayName: data.displayName,
        name: data.name,
        isMainAdmin: data.isMainAdmin === true,
        isActive: data.isActive === true,
        mobile: data.mobile || '',
        adminPhone: data.adminPhone || '',
        allowedDevice: data.allowedDevice || '',
        deviceId: data.deviceId || '',
      };
      if (selectedRole === 'admin' && !canAccessAdminPanel(credential.user.email || '', data)) {
        await logUnauthorizedAdminAccess(credential.user.email || '');
        await signOut(auth);
        throw new Error('Access denied');
      }

      if ((data.role as UserRole) === 'admin' && !data.deviceId) {
        await updateDoc(doc(db, 'users', credential.user.uid), {
          deviceId: currentDeviceId,
          allowedDevice: currentDeviceId,
        });
        roleData.deviceId = currentDeviceId;
        roleData.allowedDevice = currentDeviceId;
      }
    }

    if (!roleData) {
      await signOut(auth);
      throw new Error('Account not found in system. Please contact administrator.');
    }

    const firestoreRole = roleData.role as UserRole;

    // Validate role matches selection
    if (firestoreRole !== selectedRole) {
      await signOut(auth);
      throw new Error(
        selectedRole === 'admin'
          ? 'This is not an admin account. Please use Teacher Login.'
          : 'This is not a teacher account. Please use Admin Login.'
      );
    }

    if (firestoreRole === 'admin' && roleData.deviceId !== getCurrentDevice()) {
      await logUnauthorizedAdminAccess(credential.user.email || '');
      await signOut(auth);
      throw new Error('Unauthorized device');
    }

    if (firestoreRole === 'admin') {
      const requiresOtp = await ensureAdminOtpChallenge(credential.user, roleData);
      if (requiresOtp) {
        persistAppUser(null);
        return { requiresOtp: true };
      }
    }

    persistAppUser(buildAppUser(credential.user, firestoreRole, roleData));
    persistPendingAdminOtp(null);
    return { requiresOtp: false };
  };

  const signup = async (name: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name,
        email,
        role: 'teacher',
        isMainAdmin: false,
        isActive: false,
        mobile: '',
        assignedBatches: [],
        deviceId: '',
        allowedDevice: '',
        adminPhone: '',
        createdAt: serverTimestamp(),
      });

      console.log('Teacher saved in Firestore');

      persistAppUser({
        uid: credential.user.uid,
        email: credential.user.email || email,
        role: 'teacher',
        isMainAdmin: false,
        isActive: false,
        mobile: '',
        adminPhone: '',
        allowedDevice: '',
        displayName: name,
      });
    } catch (error) {
      console.error('Failed to save teacher in Firestore:', error);

      try {
        await deleteUser(credential.user);
      } catch (deleteError) {
        console.error('Failed to rollback auth user after Firestore error:', deleteError);
        await signOut(auth);
      }

      throw new Error('Signup failed, try again');
    }
  };

  const logout = async () => {
    await signOut(auth);
    persistAppUser(null);
    persistPendingAdminOtp(null);
    setPhoneConfirmationResult(null);
    clearStoredOTP();
  };

  const forgotPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/login`,
    });
  };

  const validateResetCode = async (code: string) => {
    return verifyPasswordResetCode(auth, code);
  };

  const resetPassword = async (code: string, newPassword: string) => {
    await confirmPasswordReset(auth, code, newPassword);
  };

  const updateCurrentUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to update password');
    }

    await updatePassword(auth.currentUser, newPassword);
  };

  const transferAdminOwnership = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!appUser || appUser.role !== 'admin' || !appUser.isMainAdmin || !auth.currentUser) {
      throw new Error('Only the main admin can transfer ownership');
    }

    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    if (normalizedEmail === appUser.email.toLowerCase()) {
      throw new Error('Already admin');
    }

    const snapshot = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));

    if (snapshot.empty) {
      throw new Error('User not found');
    }

    const newOwnerDoc = snapshot.docs[0];
    const newOwnerData = newOwnerDoc.data();

    const ownershipBatch = writeBatch(db);
    ownershipBatch.set(doc(db, 'users', newOwnerDoc.id), {
      ...newOwnerData,
      role: 'admin',
      isMainAdmin: true,
    }, { merge: true });
    ownershipBatch.set(doc(db, 'users', appUser.uid), {
      isMainAdmin: false,
    }, { merge: true });
    await ownershipBatch.commit();

    await signOut(auth);
    persistAppUser(null);
    persistPendingAdminOtp(null);
    setPhoneConfirmationResult(null);
    clearStoredOTP();
  };

  const saveAdminPhoneNumber = async (phone: string) => {
    if (!appUser || appUser.role !== 'admin' || !auth.currentUser) {
      throw new Error('Only admin can update phone number');
    }

    const trimmedPhone = normalizePhoneNumber(phone);
    if (!trimmedPhone) {
      throw new Error('Phone number is required');
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      throw new Error('Enter phone number in +91XXXXXXXXXX format');
    }

    const currentDevice = getCurrentDevice();
    await updateDoc(doc(db, 'users', appUser.uid), {
      adminPhone: trimmedPhone,
      allowedDevice: currentDevice,
    });

    persistAppUser({
      ...appUser,
      adminPhone: trimmedPhone,
      allowedDevice: currentDevice,
    });
  };

  const updateTeacherMobileNumber = async (phone: string) => {
    if (!appUser || appUser.role !== 'teacher' || !auth.currentUser) {
      throw new Error('Only teachers can update mobile number');
    }

    const trimmedPhone = phone.trim();
    if (!/^\d{10}$/.test(trimmedPhone)) {
      throw new Error('Mobile number must be 10 digits');
    }

    await updateDoc(doc(db, 'users', appUser.uid), {
      mobile: trimmedPhone,
    });

    persistAppUser({
      ...appUser,
      mobile: trimmedPhone,
    });
  };

  const verifyAdminOtp = async (otp: string) => {
    const trimmedOtp = otp.trim();

    if (!pendingAdminOtp || !auth.currentUser) {
      throw new Error('No OTP verification is pending');
    }

    if (pendingAdminOtp.expiresAt <= Date.now()) {
      persistPendingAdminOtp(null);
      setPhoneConfirmationResult(null);
      clearStoredOTP();
      throw new Error('OTP expired');
    }

    if (!phoneConfirmationResult) {
      throw new Error('OTP session expired. Please login again.');
    }

    try {
      await phoneConfirmationResult.confirm(trimmedOtp);
    } catch {
      throw new Error('Invalid OTP');
    }

    await updateDoc(doc(db, 'users', pendingAdminOtp.uid), {
      allowedDevice: pendingAdminOtp.device,
    });

    const userDoc = await getDoc(doc(db, 'users', pendingAdminOtp.uid));
    if (!userDoc.exists()) {
      throw new Error('Account not found in system. Please contact administrator.');
    }

    const data = userDoc.data();
    persistAppUser(buildAppUser(auth.currentUser, data.role as UserRole, data));
    persistPendingAdminOtp(null);
    setPhoneConfirmationResult(null);
    clearStoredOTP();
  };

  const toggleTeacherStatus = async () => {
    if (!appUser || appUser.role !== 'teacher' || !auth.currentUser) {
      throw new Error('Only teachers can update status');
    }

    const nextStatus = !appUser.isActive;
    await updateDoc(doc(db, 'users', appUser.uid), {
      isActive: nextStatus,
    });

    persistAppUser({
      ...appUser,
      isActive: nextStatus,
    });
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated: !!user || !!appUser, 
        isLoading, 
        user,
        appUser,
        hasAdminAccount,
        isAdminRegistryLoading,
        pendingAdminOtp,
        login,
        registerMainAdmin,
        signup,
        logout, 
        forgotPassword,
        validateResetCode,
        resetPassword,
        updateCurrentUserPassword,
        transferAdminOwnership,
        saveAdminPhoneNumber,
        updateTeacherMobileNumber,
        verifyAdminOtp,
        toggleTeacherStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
