import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { notifyAdmin } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, CreditCard, Download, ExternalLink, PenTool, CheckCircle, FileImage, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet, File, Globe, User, Building2, Briefcase, MapPin, Sparkles, Mic } from 'lucide-react';
import { SOWSigning } from './SOWSigning';
import { UserProfile } from './UserProfile';
import { EngageIntake } from './EngageIntake';
import { EngageBuild } from './EngageBuild';
import { EngageVerify } from './EngageVerify';

const getFileIcon = (type?: string, name?: string) => {
  const mime = type?.toLowerCase() || '';
  const ext = name?.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <FileImage size={16} className="text-blue-400" />;
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return <FileVideo size={16} className="text-purple-400" />;
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) return <FileAudio size={16} className="text-pink-400" />;
  if (mime.includes('pdf') || ext === 'pdf') return <FileText size={16} className="text-red-400" />;
  if (mime.includes('zip') || mime.includes('tar') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={16} className="text-orange-400" />;
  if (mime.includes('spreadsheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={16} className="text-green-400" />;
  if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || ['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css'].includes(ext)) return <FileCode size={16} className="text-yellow-400" />;
  
  if (!type && name?.startsWith('http')) return <Globe size={16} className="text-gold/60" />;

  return <File size={16} className="text-gold/40" />;
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const ClientDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'intake' | 'build' | 'verify' | 'profile'>('overview');
  const [selectedBuildContract, setSelectedBuildContract] = useState<any>(null);
  const [selectedVerifyBuild, setSelectedVerifyBuild] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [sows, setSows] = useState<any[]>([]);
  const [selectedSow, setSelectedSow] = useState<any | null>(null);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [deliverableFilter, setDeliverableFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;

    const projectsQuery = query(
      collection(db, 'projects'),
      where('clientUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const projectsUnsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('clientUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const invoicesUnsubscribe = onSnapshot(invoicesQuery, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invoices'));

    const sowsQuery = query(
      collection(db, 'sows'),
      where('clientUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const sowsUnsubscribe = onSnapshot(sowsQuery, (snapshot) => {
      setSows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sows'));

    return () => {
      projectsUnsubscribe();
      invoicesUnsubscribe();
      sowsUnsubscribe();
    };
  }, [user]);

  const handlePayment = async (invoice: any) => {
    setIsPaying(invoice.id);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.amount,
          title: `Invoice #${invoice.id.slice(0, 8)}`,
          clientEmail: user?.email
        })
      });

      const session = await response.json();
      if (session.url) {
        // Notify admin about payment initiation
        await notifyAdmin(
          'Payment Initiated',
          `Client ${user?.displayName || user?.email} has initiated a payment of $${(invoice.amount / 100).toLocaleString()} for Invoice #${invoice.id.slice(0, 8)}.`,
          'update'
        );
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsPaying(null);
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'paid') return false;
    return new Date(dueDate) < new Date();
  };

  const initials = (profile?.displayName || user?.displayName || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const userPhoto = profile?.photoURL || user?.photoURL;

  return (
    <div className="space-y-8">
      {/* Top Client Header with Profile Summary Card */}
      <div className="p-6 md:p-8 border border-gold/15 bg-gradient-to-br from-gold/[0.07] via-vanta/60 to-gold/[0.02] rounded-[28px] md:rounded-[36px] backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="relative shrink-0">
            {userPhoto ? (
              <img 
                src={userPhoto} 
                alt={profile?.displayName || 'Client Avatar'} 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-gold/40 shadow-lg shadow-gold/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center text-xl md:text-2xl font-black font-mono text-gold shadow-lg shadow-gold/10">
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-vanta" title="Online" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-oat tracking-tight">
                {profile?.displayName || user?.displayName || 'Client Partner'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-[9px] font-mono uppercase tracking-widest font-bold">
                Client Portal
              </span>
            </div>

            <p className="text-xs font-mono text-oat/60 flex items-center gap-2">
              <span>{user?.email}</span>
              {profile?.phoneNumber && (
                <>
                  <span className="text-gold/40">•</span>
                  <span className="text-gold/80">{profile.phoneNumber}</span>
                </>
              )}
            </p>

            {(profile?.company || profile?.jobTitle || profile?.location) && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-mono text-oat/50">
                {profile.company && (
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="text-gold" />
                    {profile.company}
                  </span>
                )}
                {profile.jobTitle && (
                  <span className="flex items-center gap-1">
                    <Briefcase size={11} className="text-gold" />
                    {profile.jobTitle}
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-gold" />
                    {profile.location}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-vanta/60 border border-gold/15 rounded-2xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                : 'text-oat/60 hover:text-gold'
            }`}
          >
            Hub Overview
          </button>
          <button
            onClick={() => setActiveTab('intake')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'intake'
                ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                : 'text-oat/60 hover:text-gold'
            }`}
          >
            <Sparkles size={13} />
            AI Intake Interview
          </button>
          <button
            onClick={() => setActiveTab('build')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'build'
                ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                : 'text-oat/60 hover:text-gold'
            }`}
          >
            <Sparkles size={13} className="text-emerald-400" />
            Client Build (Phase 2)
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'verify'
                ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                : 'text-oat/60 hover:text-gold'
            }`}
          >
            <Sparkles size={13} className="text-purple-400" />
            Verify (Phase 3)
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                : 'text-oat/60 hover:text-gold'
            }`}
          >
            <User size={13} />
            My Profile
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <UserProfile standalone />
          </motion.div>
        ) : activeTab === 'intake' ? (
          <motion.div
            key="intake-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <EngageIntake 
              initialContract={selectedBuildContract}
              onNavigateToBuild={(contract) => {
                setSelectedBuildContract(contract);
                setActiveTab('build');
              }}
            />
          </motion.div>
        ) : activeTab === 'build' ? (
          <motion.div
            key="build-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <EngageBuild 
              initialContract={selectedBuildContract}
              onNavigateToIntake={() => setActiveTab('intake')}
              onNavigateToVerify={(buildRun) => {
                setSelectedVerifyBuild(buildRun);
                setActiveTab('verify');
              }}
            />
          </motion.div>
        ) : activeTab === 'verify' ? (
          <motion.div
            key="verify-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <EngageVerify 
              initialContract={selectedBuildContract}
              initialBuildRun={selectedVerifyBuild}
              onNavigateToIntake={() => setActiveTab('intake')}
              onNavigateToBuild={(contract) => {
                if (contract) setSelectedBuildContract(contract);
                setActiveTab('build');
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="overview-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          >
            {/* SOWs */}
            <div className="p-6 md:p-10 border border-gold/10 bg-gold/5 rounded-[24px] md:rounded-[32px] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-bold text-oat">Statements of Work</h3>
          <PenTool className="text-gold md:w-6 md:h-6" size={20} />
        </div>
        <div className="space-y-4">
          {sows.length === 0 && <p className="text-oat/30 text-sm italic">No SOWs assigned.</p>}
          {sows.map(sow => (
            <div key={sow.id} className="p-4 md:p-6 border border-gold/5 bg-vanta/40 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest mb-1">SOW #{sow.id.slice(0, 8)}</p>
                  <p className="text-base md:text-lg font-bold text-oat">{sow.title}</p>
                </div>
                <span className={`px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] font-mono uppercase tracking-widest ${sow.status === 'signed' ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-gold/10 text-gold border border-gold/20'}`}>
                  {sow.status}
                </span>
              </div>
              {sow.status === 'pending' ? (
                <button 
                  onClick={() => setSelectedSow(sow)}
                  className="w-full py-2.5 md:py-3 bg-gold text-vanta font-bold rounded-xl text-[10px] md:text-xs hover:bg-oat transition-colors flex items-center justify-center gap-2"
                >
                  <PenTool size={12} className="md:w-3.5 md:h-3.5" />
                  Review & Sign
                </button>
              ) : (
                <div className="flex items-center gap-2 text-gold text-[8px] md:text-[10px] font-mono uppercase tracking-widest">
                  <CheckCircle size={12} className="md:w-3.5 md:h-3.5" /> Signed on {new Date(sow.signedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Deliverables */}
      <div className="p-6 md:p-10 border border-gold/10 bg-gold/5 rounded-[24px] md:rounded-[32px] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-bold text-oat">Deliverables</h3>
          <FileText className="text-gold md:w-6 md:h-6" size={20} />
        </div>
        
        {projects.length > 1 && (
          <div className="mb-6">
            <select
              value={deliverableFilter}
              onChange={(e) => setDeliverableFilter(e.target.value)}
              className="w-full bg-vanta/40 border border-gold/10 rounded-xl px-4 py-2 text-[10px] font-mono text-gold uppercase tracking-widest focus:outline-none focus:border-gold/30"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-6">
          {projects.length === 0 && <p className="text-oat/30 text-sm italic">No active projects.</p>}
          {projects.length > 0 && projects.every(p => !p.deliverables || p.deliverables.length === 0) && (
            <p className="text-oat/30 text-sm italic">No deliverables available yet.</p>
          )}
          {projects
            .filter(p => deliverableFilter === 'all' || p.id === deliverableFilter)
            .map(project => {
              const hasDeliverables = project.deliverables && project.deliverables.length > 0;
              if (!hasDeliverables) return null;
              
              return (
                <div key={project.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-gold/10" />
                    <p className="text-[8px] md:text-[10px] font-mono text-gold/40 uppercase tracking-[0.2em]">{project.title}</p>
                    <div className="h-[1px] flex-1 bg-gold/10" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {project.deliverables.map((del: any, i: number) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 border border-gold/10 bg-vanta/60 rounded-2xl group hover:border-gold/30 transition-all"
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="w-10 h-10 bg-gold/5 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gold/10 transition-colors">
                            {getFileIcon(del.type, del.name)}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-bold text-oat line-clamp-1 group-hover:text-gold transition-colors">{del.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-mono text-oat/40 uppercase tracking-widest">
                                {del.uploadedAt ? new Date(del.uploadedAt).toLocaleDateString() : 'Unknown Date'}
                              </span>
                              {del.size && (
                                <>
                                  <span className="text-[8px] text-oat/20">•</span>
                                  <span className="text-[8px] font-mono text-oat/40 uppercase tracking-widest">
                                    {formatSize(del.size)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <a 
                          href={del.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-2 text-gold/40 hover:text-gold transition-colors"
                          title="Download / View"
                        >
                          <Download size={16} />
                        </a>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Invoices */}
      <div className="p-6 md:p-10 border border-gold/10 bg-gold/5 rounded-[24px] md:rounded-[32px] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-bold text-oat">Invoices</h3>
          <CreditCard className="text-gold md:w-6 md:h-6" size={20} />
        </div>
        <div className="space-y-4">
          {invoices.length === 0 && <p className="text-oat/30 text-sm italic">No invoices found.</p>}
          {invoices.map(invoice => {
            const overdue = isOverdue(invoice.dueDate, invoice.status);
            return (
              <div key={invoice.id} className={`p-4 md:p-6 border rounded-2xl transition-colors ${
                overdue ? 'border-red-500/30 bg-red-500/5' : 'border-gold/5 bg-vanta/40'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest">Invoice #{invoice.id.slice(0, 8)}</p>
                      {overdue && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-vanta text-[7px] font-black uppercase tracking-tighter rounded">Overdue</span>
                      )}
                    </div>
                    <p className="text-xl md:text-2xl font-black text-oat">${(invoice.amount / 100).toLocaleString()}</p>
                    <p className="text-[8px] md:text-[10px] font-mono text-oat/30 uppercase tracking-widest mt-1">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[8px] font-mono uppercase tracking-widest ${invoice.status === 'paid' ? 'bg-green-400/10 text-green-400 border border-green-400/20' : overdue ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gold/10 text-gold border border-gold/20'}`}>
                    {invoice.status}
                  </span>
                </div>
                {invoice.status === 'unpaid' && (
                  <button 
                    onClick={() => handlePayment(invoice)}
                    disabled={isPaying !== null}
                    className={`w-full py-2.5 md:py-3 font-bold rounded-xl text-[10px] md:text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      overdue ? 'bg-red-500 text-vanta hover:bg-red-400' : 'bg-gold text-vanta hover:bg-oat'
                    }`}
                  >
                    {isPaying === invoice.id ? (
                      <div className="w-4 h-4 border-2 border-vanta border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ExternalLink size={12} className="md:w-3.5 md:h-3.5" />
                    )}
                    {isPaying === invoice.id ? 'Redirecting...' : 'Pay with Stripe'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSow && (
          <SOWSigning sow={selectedSow} onClose={() => setSelectedSow(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
