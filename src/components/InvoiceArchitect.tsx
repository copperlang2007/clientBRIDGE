import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Plus, Trash2, CheckCircle, AlertCircle, Briefcase, Bell, Calendar as CalendarIcon, ExternalLink, Download, FileText } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { sendNotification } from '../lib/notifications';
import { exportInvoiceToPDF } from '../services/invoicePdfExport';
import { logAuditEvent } from '../services/auditLogger';

interface InvoiceArchitectProps {
  initialProposalPackage?: any;
}

export const InvoiceArchitect: React.FC<InvoiceArchitectProps> = ({ initialProposalPackage }) => {
  const [prompt, setPrompt] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [isPaying, setIsPaying] = useState<string | null>(null);

  // Auto-populate when receiving verified proposal package
  useEffect(() => {
    if (initialProposalPackage) {
      const { clientName, winningWedge, milestonePriceUsd, complianceCertificate } = initialProposalPackage;
      setPrompt(`Verified Milestone: ${winningWedge} for ${clientName}. Compliance Certificate: ${complianceCertificate?.status || 'VERIFIED'} (SHA256: ${complianceCertificate?.sha256Digest?.slice(0, 12)}...). Price: $${milestonePriceUsd}`);
    }
  }, [initialProposalPackage]);

  useEffect(() => {
    // Set default due date to 14 days from now
    const date = new Date();
    date.setDate(date.getDate() + 14);
    setDueDate(date.toISOString().split('T')[0]);

    const unsubscribeInvoices = onSnapshot(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invoices'));

    const unsubscribeProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    return () => {
      unsubscribeInvoices();
      unsubscribeProjects();
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt || !selectedProject || !dueDate) return;
    setIsGenerating(true);
    
    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) return;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on this project description and requirements: "${prompt}", determine a fair invoice amount in USD. Return only a JSON object with "amount" (in cents, e.g. 50000 for $500) and "description" (short summary of work).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.INTEGER },
              description: { type: Type.STRING }
            },
            required: ["amount", "description"]
          }
        }
      });
      
      const result = JSON.parse(response.text);

      const docRef = await addDoc(collection(db, 'invoices'), {
        projectId: selectedProject,
        clientUid: project.clientUid,
        amount: result.amount,
        description: result.description,
        status: 'unpaid',
        dueDate: new Date(dueDate).toISOString(),
        createdAt: new Date().toISOString()
      });
      
      // Notify client
      await sendNotification({
        userId: project.clientUid,
        title: 'New Invoice Available',
        message: `A new invoice for "${project.title}" has been generated. Amount: $${(result.amount / 100).toLocaleString()}.`,
        type: 'update'
      });

      // Record in audit log
      await logAuditEvent({
        action: 'INVOICE_GENERATED',
        category: 'payment_completion',
        actorEmail: 'admin@theartificialbridge.com',
        actorName: 'Lead Architect',
        actorRole: 'admin',
        targetEntity: 'invoice',
        targetId: docRef.id,
        targetTitle: `Invoice for ${project.title}`,
        previousValue: 'none',
        newValue: 'unpaid',
        details: `Generated Invoice #${docRef.id.slice(0, 8)} for $${(result.amount / 100).toLocaleString()} (Due: ${new Date(dueDate).toLocaleDateString()}).`,
        metadata: {
          projectId: selectedProject,
          amountCents: result.amount
        }
      });
      
      setPrompt('');
      setSelectedProject('');
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = (invoice: any) => {
    const project = projects.find(p => p.id === invoice.projectId);
    exportInvoiceToPDF({
      id: invoice.id,
      projectId: invoice.projectId,
      projectTitle: project?.title || 'Client Project',
      clientUid: invoice.clientUid,
      clientName: invoice.clientName || project?.title?.split(' - ')[0] || 'Enterprise Client',
      clientEmail: invoice.clientEmail,
      amount: invoice.amount,
      description: invoice.description || 'Milestone Implementation & AI Acceptance Verification',
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      paidAt: invoice.paidAt,
      stripeSessionId: invoice.stripeSessionId
    });
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteDoc(doc(db, 'invoices', invoiceId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `invoices/${invoiceId}`);
    }
  };

  const sendReminder = async (invoice: any) => {
    try {
      await sendNotification({
        userId: invoice.clientUid,
        title: 'Payment Reminder',
        message: `Your invoice for ${invoice.description || 'Service'} is due on ${new Date(invoice.dueDate).toLocaleDateString()}. Please settle the payment at your earliest convenience.`,
        type: 'reminder'
      });
      alert('Reminder sent successfully!');
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  };

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
          clientEmail: '' // Optional, Stripe will ask if not provided
        })
      });

      const session = await response.json();
      if (session.url) {
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

  return (
    <div className="p-6 md:p-8 border border-gold/10 bg-vanta/50 rounded-[24px] md:rounded-[32px] backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-4">
        <div>
          <h2 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em] mb-2">Admin View</h2>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight text-oat">Invoice Architect</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="text-[8px] md:text-[10px] font-mono text-gold uppercase">Financial Engine Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1">
                <label className="block text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-widest mb-2">Target Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="">Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-widest mb-2">Due Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the work to be invoiced (e.g., 'Phase 1 development completion', '10 hours of consulting')..."
                className="w-full h-32 md:h-40 bg-vanta border border-gold/20 rounded-2xl p-4 md:p-6 text-oat font-mono text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder-oat/20 resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || !selectedProject || !dueDate}
                className="absolute bottom-4 right-4 px-5 md:px-6 py-2 bg-gold text-vanta font-bold rounded-full flex items-center gap-2 hover:bg-oat transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
              >
                {isGenerating ? (
                  <span className="animate-pulse">Calculating...</span>
                ) : (
                  <>
                    <Plus size={16} />
                    Generate Invoice
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {invoices.map((inv) => {
              const overdue = isOverdue(inv.dueDate, inv.status);
              return (
                <motion.div
                  key={inv.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 border rounded-2xl transition-colors gap-4 ${
                    overdue ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50' : 'border-gold/5 bg-gold/5 hover:border-gold/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${
                      overdue ? 'bg-red-500/10 text-red-500' : 'bg-gold/10 text-gold'
                    }`}>
                      <CreditCard size={18} className="md:w-5 md:h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-oat font-bold text-sm md:text-base line-clamp-1">
                          ${(inv.amount / 100).toLocaleString()} - {inv.description || 'Service Invoice'}
                        </h4>
                        {overdue && (
                          <span className="px-2 py-0.5 bg-red-500 text-vanta text-[8px] font-black uppercase tracking-tighter rounded">Overdue</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                        <span className="hidden sm:inline text-oat/20">•</span>
                        <p className="text-[8px] md:text-[10px] font-mono text-gold/60 uppercase tracking-widest">
                          {projects.find(p => p.id === inv.projectId)?.title || 'Unknown Project'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                      {inv.status === 'paid' ? (
                        <CheckCircle size={14} className="text-gold" />
                      ) : (
                        <AlertCircle size={14} className={overdue ? "text-red-500" : "text-oat/40"} />
                      )}
                      <span className={`text-[8px] md:text-[10px] font-mono uppercase tracking-widest ${inv.status === 'paid' ? 'text-gold' : overdue ? 'text-red-500' : 'text-oat/40'}`}>
                        {inv.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* PDF Export Action */}
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        className="p-2 text-gold/60 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                        title="Download Professional PDF Invoice"
                      >
                        <Download size={14} className="md:w-4 md:h-4" />
                      </button>

                      {inv.status === 'unpaid' && (
                        <>
                          <button 
                            onClick={() => handlePayment(inv)}
                            disabled={isPaying === inv.id}
                            className={`p-2 transition-colors ${isPaying === inv.id ? 'text-gold opacity-50' : 'text-gold/40 hover:text-gold'}`}
                            title="Generate Payment Link"
                          >
                            {isPaying === inv.id ? (
                              <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ExternalLink size={14} className="md:w-4 md:h-4" />
                            )}
                          </button>
                          <button 
                            onClick={() => sendReminder(inv)}
                            className="p-2 text-gold/40 hover:text-gold transition-colors"
                            title="Send Reminder"
                          >
                            <Bell size={14} className="md:w-4 md:h-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="p-2 text-oat/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete Invoice"
                      >
                        <Trash2 size={14} className="md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em]">Billing Tools</h4>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {[
              { id: 'bill-01', name: 'Tax Optimizer', desc: 'Calculate regional tax implications' },
              { id: 'bill-02', name: 'Late Fee Engine', desc: 'Automate penalty application for overdue bills' },
              { id: 'bill-03', name: 'Payment Link', desc: 'Generate direct Stripe checkout URLs' }
            ].map((tool) => (
              <button
                key={tool.id}
                className="p-3 md:p-4 border border-gold/10 bg-vanta/40 rounded-xl text-left hover:border-gold/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-tighter">{tool.id}</span>
                  <div className="w-1 h-1 rounded-full bg-gold/40 group-hover:bg-gold transition-colors" />
                </div>
                <p className="text-[10px] md:text-xs font-bold text-oat mb-1 line-clamp-1">{tool.name}</p>
                <p className="hidden sm:block text-[8px] md:text-[9px] font-mono text-oat/30 leading-tight line-clamp-2">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
