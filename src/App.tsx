import React, { useEffect, useState } from 'react';
import { ParticleBackground } from './components/ParticleBackground';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { DocumentArchitect } from './components/DocumentArchitect';
import { ProposalArchitect } from './components/ProposalArchitect';
import { InvoiceArchitect } from './components/InvoiceArchitect';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { ProjectManager } from './components/ProjectManager';
import { RoleManager } from './components/RoleManager';
import { NotificationCenter } from './components/NotificationCenter';
import { Auth } from './components/Auth';
import { Features } from './components/Features';
import { UserProfile } from './components/UserProfile';
import { EngageIntake } from './components/EngageIntake';
import { EngageBuild } from './components/EngageBuild';
import { EngageVerify } from './components/EngageVerify';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Loader2, User as UserIcon } from 'lucide-react';

function AppContent() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancel' | 'verifying' | null>(null);
  const [activeArchitect, setActiveArchitect] = useState<'intake' | 'build' | 'verify' | 'sow' | 'proposal' | 'invoice' | 'projects' | 'roles'>('intake');
  const [selectedBuildContract, setSelectedBuildContract] = useState<any>(null);
  const [selectedVerifyBuild, setSelectedVerifyBuild] = useState<any>(null);
  const [selectedProposalPackage, setSelectedProposalPackage] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user, profile, permissions, isAdmin, loading, logout } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const isCancel = window.location.pathname === '/payment-cancel' || params.has('cancel');

    if (isCancel) {
      setPaymentStatus('cancel');
      return;
    }

    if (sessionId) {
      const verifyPayment = async () => {
        setPaymentStatus('verifying');
        try {
          const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await response.json();
          if (data.status === 'paid') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('cancel');
          }
        } catch (error) {
          console.error('Verification failed:', error);
          setPaymentStatus('cancel');
        }
      };
      verifyPayment();
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-vanta flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-gold font-mono text-xs uppercase tracking-widest">Initializing Infrastructure...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen font-sans selection:bg-gold selection:text-vanta">
      {/* Scroll Progress Bar */}
      <div id="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* Background Layers */}
      <ParticleBackground />
      <div className="fixed inset-0 bg-vanta/20 pointer-events-none z-0" />

      <Navbar />

      <main className="relative z-10">
        <Hero />

        <section className="max-w-7xl mx-auto px-6 pb-32">
          {paymentStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-12 p-6 rounded-[32px] border flex items-center gap-4 ${
                paymentStatus === 'success' ? 'bg-green-400/10 border-green-400/20 text-green-400' :
                paymentStatus === 'verifying' ? 'bg-gold/10 border-gold/20 text-gold' :
                'bg-red-400/10 border-red-400/20 text-red-400'
              }`}
            >
              {paymentStatus === 'success' && <CheckCircle size={24} />}
              {paymentStatus === 'cancel' && <XCircle size={24} />}
              {paymentStatus === 'verifying' && <Loader2 size={24} className="animate-spin" />}
              <div>
                <h3 className="font-bold uppercase tracking-widest text-xs">
                  {paymentStatus === 'success' ? 'Payment Successful' : 
                   paymentStatus === 'verifying' ? 'Verifying Payment...' :
                   'Payment Cancelled'}
                </h3>
                <p className="text-[10px] opacity-60 mt-1">
                  {paymentStatus === 'success' ? 'Your invoice has been marked as paid. Thank you!' :
                   paymentStatus === 'verifying' ? 'Please wait while we confirm your transaction with Stripe.' :
                   'The payment process was cancelled. No charges were made.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setPaymentStatus(null);
                  window.history.replaceState({}, '', window.location.pathname);
                }}
                className="ml-auto text-[10px] font-mono uppercase tracking-widest hover:underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {!user ? (
            <Auth />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
                <div className="flex flex-col">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-oat uppercase">
                    {isAdmin ? 'Admin Control' : 'Client Portal'}
                  </h2>
                  <p className="text-gold font-mono text-[10px] uppercase tracking-widest mt-1">
                    Logged in as: {profile?.displayName || user.email}
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <NotificationCenter />
                  <button 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold font-mono text-[10px] uppercase tracking-widest rounded-full transition-all group"
                  >
                    {profile?.photoURL ? (
                      <img 
                        src={profile.photoURL} 
                        alt="Profile" 
                        className="w-4 h-4 rounded-full object-cover border border-gold/40"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserIcon size={13} className="group-hover:scale-110 transition-transform" />
                    )}
                    <span>Profile</span>
                  </button>
                  <button 
                    onClick={logout}
                    className="flex-1 sm:flex-none px-6 py-2.5 border border-gold/20 text-gold/80 hover:text-gold font-mono text-[10px] uppercase tracking-widest rounded-full hover:bg-gold/10 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>

              {/* Profile Modal Overlay */}
              <AnimatePresence>
                {isProfileModalOpen && (
                  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-vanta/80 backdrop-blur-md overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                      <UserProfile onClose={() => setIsProfileModalOpen(false)} />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {isAdmin ? (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-12"
                  >
                    <AdminDashboard />
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 p-1 bg-gold/5 border border-gold/10 rounded-full w-fit overflow-x-auto">
                        {[
                          { id: 'intake', label: 'Engage Intake (Phase 1)', permission: 'manageProposals' },
                          { id: 'build', label: 'Engage Build (Phase 2)', permission: 'manageProposals' },
                          { id: 'verify', label: 'Engage Verify (Phase 3)', permission: 'manageProposals' },
                          { id: 'sow', label: 'SOW Architect', permission: 'manageSOWs' },
                          { id: 'proposal', label: 'Proposal Architect', permission: 'manageProposals' },
                          { id: 'invoice', label: 'Invoice Architect', permission: 'manageInvoices' },
                          { id: 'projects', label: 'Project Manager', permission: 'manageProjects' },
                          { id: 'roles', label: 'Role Manager', permission: 'manageRoles' }
                        ].filter(tab => permissions[tab.permission as keyof typeof permissions] || isAdmin).map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveArchitect(tab.id as any)}
                            className={`px-6 py-2 rounded-full text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap ${
                              activeArchitect === tab.id 
                                ? 'bg-gold text-vanta font-bold shadow-lg shadow-gold/20' 
                                : 'text-oat/40 hover:text-gold'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        {activeArchitect === 'intake' && (
                          <motion.div
                            key="intake"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <EngageIntake 
                              initialContract={selectedBuildContract}
                              onNavigateToSow={() => setActiveArchitect('sow')}
                              onNavigateToBuild={(contract) => {
                                setSelectedBuildContract(contract);
                                setActiveArchitect('build');
                              }}
                            />
                          </motion.div>
                        )}
                        {activeArchitect === 'build' && (
                          <motion.div
                            key="build"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <EngageBuild 
                              initialContract={selectedBuildContract}
                              onNavigateToIntake={() => setActiveArchitect('intake')}
                              onNavigateToVerify={(buildRun) => {
                                setSelectedVerifyBuild(buildRun);
                                setActiveArchitect('verify');
                              }}
                            />
                          </motion.div>
                        )}
                        {activeArchitect === 'verify' && (
                          <motion.div
                            key="verify"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <EngageVerify 
                              initialContract={selectedBuildContract}
                              initialBuildRun={selectedVerifyBuild}
                              onNavigateToIntake={(seededContract) => {
                                if (seededContract) setSelectedBuildContract(seededContract);
                                setActiveArchitect('intake');
                              }}
                              onNavigateToBuild={(contract) => {
                                if (contract) setSelectedBuildContract(contract);
                                setActiveArchitect('build');
                              }}
                              onNavigateToSow={(pkg) => {
                                if (pkg) setSelectedProposalPackage(pkg);
                                setActiveArchitect('sow');
                              }}
                              onNavigateToInvoice={(pkg) => {
                                if (pkg) setSelectedProposalPackage(pkg);
                                setActiveArchitect('invoice');
                              }}
                            />
                          </motion.div>
                        )}
                        {activeArchitect === 'sow' && permissions.manageSOWs && (
                          <motion.div
                            key="sow"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <DocumentArchitect initialProposalPackage={selectedProposalPackage} />
                          </motion.div>
                        )}
                        {activeArchitect === 'proposal' && permissions.manageProposals && (
                          <motion.div
                            key="proposal"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ProposalArchitect />
                          </motion.div>
                        )}
                        {activeArchitect === 'invoice' && permissions.manageInvoices && (
                          <motion.div
                            key="invoice"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <InvoiceArchitect initialProposalPackage={selectedProposalPackage} />
                          </motion.div>
                        )}
                        {activeArchitect === 'projects' && permissions.manageProjects && (
                          <motion.div
                            key="projects"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ProjectManager />
                          </motion.div>
                        )}
                        {activeArchitect === 'roles' && permissions.manageRoles && (
                          <motion.div
                            key="roles"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <RoleManager />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="client"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <ClientDashboard />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </section>

        <Features />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gold/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-oat/40 uppercase tracking-[0.3em]">© 2026 artificialBRIDGE</span>
            <div className="h-4 w-[1px] bg-gold/20" />
            <span className="text-xs font-mono text-oat/40 uppercase tracking-[0.3em]">All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest text-oat/40 hover:text-gold transition-colors">Privacy</a>
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest text-oat/40 hover:text-gold transition-colors">Terms</a>
            <a href="#" className="text-[10px] font-mono uppercase tracking-widest text-oat/40 hover:text-gold transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
