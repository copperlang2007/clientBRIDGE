import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  MapPin, 
  Globe, 
  FileText, 
  Upload, 
  Camera, 
  Trash2, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Calendar, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileProps {
  onClose?: () => void;
  standalone?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose, standalone = false }) => {
  const { user, profile, updateUserProfile, isAdmin } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  
  // Avatar state
  const [photoURL, setPhotoURL] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Status state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setCompany(profile.company || '');
      setJobTitle(profile.jobTitle || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setBio(profile.bio || '');
      setPhotoURL(profile.photoURL || user?.photoURL || '');
    } else if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
    }
  }, [profile, user]);

  // Clean up object URLs when preview changes
  useEffect(() => {
    return () => {
      if (previewURL && previewURL.startsWith('blob:')) {
        URL.revokeObjectURL(previewURL);
      }
    };
  }, [previewURL]);

  // Handle file selection using File API
  const handleFileChange = (file: File) => {
    setErrorMessage(null);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPEG, WebP, or GIF).');
      return;
    }

    // Validate size (5MB max)
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`Image size must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewURL(objectUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (previewURL && previewURL.startsWith('blob:')) {
      URL.revokeObjectURL(previewURL);
    }
    setPreviewURL(null);
    setPhotoURL('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      let finalPhotoURL = photoURL;

      // If a new file was chosen via File API, upload to Firebase Storage or compress
      if (selectedFile) {
        setUploadProgress(10);
        try {
          const timestamp = Date.now();
          const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `avatars/${user.uid}/${timestamp}_${cleanFileName}`;
          const storageRef = ref(storage, storagePath);

          const uploadTask = uploadBytesResumable(storageRef, selectedFile, {
            contentType: selectedFile.type
          });

          await new Promise<string>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 90;
                setUploadProgress(Math.round(progress));
              },
              (error) => {
                console.warn('Storage upload error, falling back to data URL:', error);
                // Fallback to reading file via FileReader File API
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Failed to read image file'));
                reader.readAsDataURL(selectedFile);
              },
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              }
            );
          }).then((url) => {
            finalPhotoURL = url;
            setPhotoURL(url);
          });
        } catch (storageErr) {
          console.error('Error during image upload:', storageErr);
          // Fallback reading via FileReader API
          const fallbackDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to process image'));
            reader.readAsDataURL(selectedFile);
          });
          finalPhotoURL = fallbackDataUrl;
          setPhotoURL(fallbackDataUrl);
        }
      }

      setUploadProgress(95);

      // Save full profile to Firestore
      await updateUserProfile({
        displayName: displayName.trim() || (user.email?.split('@')[0] || 'User'),
        phoneNumber: phoneNumber.trim(),
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        location: location.trim(),
        website: website.trim(),
        bio: bio.trim(),
        photoURL: finalPhotoURL
      });

      setSelectedFile(null);
      setPreviewURL(null);
      setUploadProgress(null);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);

    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
      setUploadProgress(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setCompany(profile.company || '');
      setJobTitle(profile.jobTitle || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setBio(profile.bio || '');
      setPhotoURL(profile.photoURL || user?.photoURL || '');
    }
    handleRemovePhoto();
    setErrorMessage(null);
    setSaveSuccess(false);
  };

  const currentDisplayPhoto = previewURL || photoURL;
  const initials = (displayName || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const formattedJoinDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric', day: 'numeric' })
    : 'Active';

  return (
    <div className={`w-full max-w-4xl mx-auto ${standalone ? '' : 'p-2 md:p-4'}`}>
      <div className="relative bg-vanta/90 border border-gold/20 rounded-[28px] md:rounded-[36px] overflow-hidden backdrop-blur-2xl shadow-2xl shadow-black/60">
        
        {/* Top Header Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/20 via-gold to-gold/20" />

        {/* Modal / Card Header */}
        <div className="p-6 md:p-8 border-b border-gold/10 flex items-center justify-between bg-gold/5">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center text-gold shadow-inner">
              <User size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-oat tracking-tight uppercase">
                  Account Profile
                </h2>
                <span className="px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-widest rounded-full bg-gold/10 border border-gold/20 text-gold font-bold">
                  {isAdmin ? 'Administrator' : 'Client Partner'}
                </span>
              </div>
              <p className="text-[10px] font-mono text-oat/50 uppercase tracking-widest mt-0.5">
                Manage your credentials, contact information, and avatar
              </p>
            </div>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="p-2.5 text-oat/40 hover:text-gold hover:bg-gold/10 rounded-full transition-all"
              aria-label="Close profile"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 md:p-10 space-y-8">
          
          {/* Status Banners */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3 text-green-400"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check size={18} />
                </div>
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider">Profile Updated Successfully</p>
                  <p className="text-[10px] text-green-400/80">Your contact info and profile image are live across the portal.</p>
                </div>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400"
              >
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider">Update Notice</p>
                  <p className="text-[10px] text-red-400/80">{errorMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 1: Avatar & Quick Info Hero */}
          <div className="p-6 rounded-[24px] bg-gold/[0.03] border border-gold/15 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            
            {/* Avatar Preview & Dropzone */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full cursor-pointer group transition-all duration-300 ${
                  isDragging 
                    ? 'ring-4 ring-gold scale-105 shadow-xl shadow-gold/20' 
                    : 'ring-2 ring-gold/30 hover:ring-gold/60'
                }`}
              >
                {currentDisplayPhoto ? (
                  <img 
                    src={currentDisplayPhoto} 
                    alt={displayName || 'User Avatar'} 
                    className="w-full h-full rounded-full object-cover shadow-inner"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-gold/20 via-vanta to-gold/10 flex items-center justify-center text-2xl md:text-3xl font-black font-mono text-gold border border-gold/20">
                    {initials}
                  </div>
                )}

                {/* Hover Overlay with Camera Icon */}
                <div className="absolute inset-0 rounded-full bg-vanta/70 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gold">
                  <Camera size={24} className="mb-1" />
                  <span className="text-[8px] font-mono uppercase tracking-widest font-bold">Change</span>
                </div>

                {/* Active upload progress indicator */}
                {uploadProgress !== null && (
                  <div className="absolute inset-0 rounded-full bg-vanta/85 flex flex-col items-center justify-center text-gold">
                    <RefreshCw size={20} className="animate-spin mb-1" />
                    <span className="text-[9px] font-mono font-bold">{uploadProgress}%</span>
                  </div>
                )}
              </div>

              {/* Hidden File API input */}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/png, image/jpeg, image/webp, image/gif" 
                onChange={handleInputChange}
                className="hidden" 
                id="avatar-file-input"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 rounded-full text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={12} />
                  Browse
                </button>
                {currentDisplayPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 size={12} />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Avatar Details & Meta */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-oat tracking-tight">
                    {displayName || 'Anonymous Client'}
                  </h3>
                  <p className="text-xs font-mono text-gold/80 flex items-center justify-center md:justify-start gap-1.5">
                    <Mail size={12} />
                    {user?.email}
                  </p>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/5 border border-gold/15 text-[10px] font-mono text-oat/70">
                    <Calendar size={12} className="text-gold" />
                    <span>Member since {formattedJoinDate}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-oat/60 leading-relaxed pt-2">
                Upload a professional portrait or company emblem. Drag and drop directly onto the circle above, or click browse (PNG, JPG, WebP up to 5MB).
              </p>

              {selectedFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gold/10 border border-gold/30 text-[10px] font-mono text-gold mt-2">
                  <Sparkles size={12} />
                  <span>Staged: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Personal & Identity Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gold/10 pb-2">
              <ShieldCheck size={16} className="text-gold" />
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gold font-bold">
                Identity & Display
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                  Display Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/40" size={16} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    required
                    maxLength={100}
                    className="w-full bg-vanta/60 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat font-mono focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-oat/20"
                  />
                </div>
              </div>

              {/* Email Address (Immutable/System) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                    Account Email
                  </label>
                  <span className="text-[8px] font-mono text-gold/60 uppercase tracking-widest">Verified Account</span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/40" size={16} />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-vanta/40 border border-gold/10 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat/50 font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Business Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gold/10 pb-2">
              <Briefcase size={16} className="text-gold" />
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gold font-bold">
                Contact & Business Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/40" size={16} />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    maxLength={50}
                    className="w-full bg-vanta/60 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat font-mono focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-oat/20"
                  />
                </div>
              </div>

              {/* Company / Organization */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/40" size={16} />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Innovations Inc."
                    maxLength={100}
                    className="w-full bg-vanta/60 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat font-mono focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-oat/20"
                  />
                </div>
              </div>

              {/* Job Title / Role */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                  Job Title / Function
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/40" size={16} />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Director of Technology"
                    maxLength={100}
                    className="w-full bg-vanta/60 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat font-mono focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-oat/20"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                  Location / Timezone
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/40" size={16} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA (UTC-8)"
                    maxLength={100}
                    className="w-full bg-vanta/60 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat font-mono focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-oat/20"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                  Website / Web Link
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/40" size={16} />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://artificialbridge.com"
                    maxLength={200}
                    className="w-full bg-vanta/60 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat font-mono focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-oat/20"
                  />
                </div>
              </div>

              {/* Bio / Project Notes */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] font-mono text-oat/70 uppercase tracking-widest">
                  Bio / Project Collaboration Notes
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 text-gold/40" size={16} />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Key contact preferences, project background, or collaboration notes..."
                    maxLength={800}
                    className="w-full bg-vanta/60 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-oat font-mono focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all placeholder:text-oat/20 resize-none"
                  />
                </div>
                <div className="text-right text-[9px] font-mono text-oat/40">
                  {bio.length}/800 characters
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-4 border-t border-gold/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3 border border-gold/20 hover:border-gold/40 text-oat/60 hover:text-oat rounded-xl text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              Reset Changes
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none px-6 py-3 border border-gold/20 hover:bg-gold/5 text-gold rounded-xl text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none px-8 py-3.5 bg-gold hover:bg-oat text-vanta font-bold rounded-xl text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-gold/20 hover:shadow-gold/30 transition-all disabled:opacity-50 group"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} className="group-hover:scale-110 transition-transform" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
