import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, PenTool, CheckCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { notifyAdmin } from '../lib/notifications';

interface SOWSigningProps {
  sow: any;
  onClose: () => void;
}

export const SOWSigning: React.FC<SOWSigningProps> = ({ sow, onClose }) => {
  const [signature, setSignature] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [step, setStep] = useState<'sign' | 'confirm'>('sign');

  const finalizeSign = async () => {
    if (!signature) return;
    setIsSigning(true);
    try {
      const signedAt = new Date().toISOString();
      
      // Create project
      const projectRef = await addDoc(collection(db, 'projects'), {
        title: sow.title || 'New Project',
        clientUid: sow.clientUid,
        sowId: sow.id,
        status: 'active',
        createdAt: signedAt,
        deliverables: []
      });

      // Update SOW
      await updateDoc(doc(db, 'sows', sow.id), {
        signature,
        signedAt,
        status: 'signed',
        projectId: projectRef.id
      });
      
      // Notify admin
      await notifyAdmin(
        'SOW Signed',
        `A new SOW "${sow.title}" has been signed by ${signature}. A new project has been automatically created.`,
        'alert'
      );
      
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sows/${sow.id}`);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-vanta/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-vanta border border-gold/20 rounded-[24px] md:rounded-[32px] overflow-hidden flex flex-col"
      >
        <div className="p-6 md:p-8 border-b border-gold/10 flex items-center justify-between bg-gold/5">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
              <FileText size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-oat line-clamp-1">{sow.title}</h2>
              <p className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest">Legal Document Review</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-oat/40 hover:text-gold transition-colors">
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 prose prose-invert prose-gold max-w-none prose-sm md:prose-base">
          <div className="markdown-body">
            <ReactMarkdown>{sow.content}</ReactMarkdown>
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-gold/10 bg-gold/5">
          {step === 'sign' ? (
            <div className="space-y-6">
              {signature && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-4 border-b border-gold/10"
                >
                  <p className="text-3xl md:text-4xl font-serif italic text-gold/80 tracking-tight">
                    {signature}
                  </p>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-px bg-gold/30 mt-2 max-w-[300px]"
                  />
                </motion.div>
              )}
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="flex-1 w-full">
                  <label className="block text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-widest mb-2">Digital Signature (Type Full Name)</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Your Legal Name"
                    className="w-full bg-vanta border border-gold/20 rounded-xl px-4 md:px-6 py-3 md:py-4 text-oat font-mono text-xs md:text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!signature}
                  className="w-full md:w-auto px-8 md:px-10 py-3 md:py-4 bg-gold text-vanta font-bold rounded-full flex items-center justify-center gap-2 hover:bg-oat transition-colors disabled:opacity-50"
                >
                  <PenTool size={18} />
                  Sign Document
                </button>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div className="flex-1">
                <h4 className="text-gold font-mono text-[10px] uppercase tracking-[0.2em] mb-2">Confirm Your Signature</h4>
                <p className="text-2xl md:text-3xl font-serif italic text-oat mb-2 border-b border-gold/20 pb-2 inline-block min-w-[200px]">
                  {signature}
                </p>
                <p className="text-[10px] text-oat/40 font-mono uppercase tracking-widest">
                  By confirming, you agree to the terms and an active project will be created.
                </p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button
                  onClick={() => setStep('sign')}
                  className="flex-1 md:flex-none px-6 py-3 border border-gold/20 text-gold font-bold rounded-full hover:bg-gold/10 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={finalizeSign}
                  disabled={isSigning}
                  className="flex-1 md:flex-none px-8 md:px-10 py-3 md:py-4 bg-gold text-vanta font-bold rounded-full flex items-center justify-center gap-2 hover:bg-oat transition-colors disabled:opacity-50"
                >
                  {isSigning ? (
                    <span className="animate-pulse">Finalizing...</span>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Confirm & Sign
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
