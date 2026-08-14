import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Plus, Send, Trash2, Edit3, CheckCircle, AlertCircle, User, ShieldCheck, Search, X, Loader2, PenTool, Briefcase } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { SOWSigning } from './SOWSigning';

interface DocumentArchitectProps {
  initialProposalPackage?: any;
}

export const DocumentArchitect: React.FC<DocumentArchitectProps> = ({ initialProposalPackage }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [markAsSigned, setMarkAsSigned] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeReview, setActiveReview] = useState<any[] | null>(null);
  const [viewMode, setViewMode] = useState<'architect' | 'history'>('architect');
  const [selectedSowForSigning, setSelectedSowForSigning] = useState<any | null>(null);

  // New detailed fields
  const [sowDescription, setSowDescription] = useState('');
  const [sowTimeline, setSowTimeline] = useState('');
  const [sowCost, setSowCost] = useState('');

  // Handle incoming verified proposal package
  useEffect(() => {
    if (initialProposalPackage) {
      const { clientName, winningWedge, milestonePriceUsd, outcomeSummary, evidenceAppendix, complianceCertificate } = initialProposalPackage;
      setSowDescription(`Statement of Work for ${winningWedge}\nClient: ${clientName}\nCompliance Standard: ${complianceCertificate?.tier || 'Regulated'}\n\nKey Outcomes & Verifications:\n${(outcomeSummary || []).map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}\n\nEvidence Appendix (Law 9 Proof Pointers):\n${(evidenceAppendix || []).map((e: any) => `- [${e.acId}] ${e.proofPointer} (SHA256: ${e.artifactDigest?.slice(0, 16)}...)`).join('\n')}`);
      setSowCost(`$${(milestonePriceUsd || 8500).toLocaleString()}`);
      setSowTimeline('Immediate Deployment (Verified Build Artifacts Staged)');
      setPrompt(`Generate an executable Statement of Work for ${clientName} covering ${winningWedge} with fixed milestone price $${milestonePriceUsd} based on verified deterministic artifacts.`);
    }
  }, [initialProposalPackage]);

  useEffect(() => {
    const unsubscribeSows = onSnapshot(query(collection(db, 'sows'), orderBy('createdAt', 'desc')), (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sows'));

    const unsubscribeTemplates = onSnapshot(collection(db, 'sowTemplates'), (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sowTemplates'));

    const fetchClients = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setClients(snapshot.docs.map(doc => doc.data()).filter(u => u.role === 'client'));
    };
    fetchClients();

    return () => {
      unsubscribeSows();
      unsubscribeTemplates();
    };
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setPrompt(template.content);
    }
  };

  const seedTemplates = async () => {
    const initialTemplates = [
      { name: 'Web Development SOW', content: 'Create a comprehensive SOW for a full-stack web application development project. Include React frontend, Node.js backend, and PostgreSQL database. Define phases for discovery, design, development, testing, and deployment.' },
      { name: 'Mobile App SOW', content: 'Draft a Statement of Work for a cross-platform mobile application using React Native. Focus on user authentication, push notifications, and integration with a REST API. Include milestones for UI/UX design and App Store submission.' },
      { name: 'Cloud Migration SOW', content: 'Generate an SOW for migrating an on-premise infrastructure to AWS. Detail the assessment of current assets, the migration strategy (lift and shift), security configurations, and post-migration support.' }
    ];

    for (const template of initialTemplates) {
      await addDoc(collection(db, 'sowTemplates'), template);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClient) return;
    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const promptContext = `
        Project Description: ${sowDescription || prompt}
        Timeline: ${sowTimeline}
        Investment/Cost: ${sowCost}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a full Statement of Work (SOW) in Markdown based on this context: ${promptContext}. 
        Include sections for Project Overview, Detailed Scope, Deliverables, Timeline (with milestones), and Investment/Terms. 
        Ensure the timeline and cost provided are explicitly included in the document.
        Return only the Markdown content.`
      });
      
      let contentLines = response.text.split('\n');
      let titleIndex = contentLines.findIndex(line => line.trim().startsWith('#'));
      if (titleIndex === -1) titleIndex = 0;
      
      const title = contentLines[titleIndex].replace(/#/g, '').trim() || 'Statement of Work';

      const client = clients.find(c => c.uid === selectedClient);
      if (client) {
        const clientInfo = `\n**Prepared For:**\n${client.displayName || 'Client'}\n${client.email}\n`;
        contentLines.splice(titleIndex + 1, 0, clientInfo);
      }
      
      const finalContent = contentLines.join('\n');

      const sowRef = await addDoc(collection(db, 'sows'), {
        title,
        content: finalContent,
        clientUid: selectedClient,
        description: sowDescription || prompt,
        timeline: sowTimeline,
        cost: sowCost,
        projectId: '', // Will be updated if signed
        status: markAsSigned ? 'signed' : 'pending',
        createdAt: new Date().toISOString(),
        signedAt: markAsSigned ? new Date().toISOString() : null,
        signature: markAsSigned ? 'ADMIN_DIRECT_SIGN' : null
      });

      if (markAsSigned) {
        const projectRef = await addDoc(collection(db, 'projects'), {
          title,
          clientUid: selectedClient,
          sowId: sowRef.id,
          status: 'active',
          createdAt: new Date().toISOString(),
          deliverables: []
        });
        
        await updateDoc(doc(db, 'sows', sowRef.id), {
          projectId: projectRef.id
        });
      }
      
      setPrompt('');
      setSowDescription('');
      setSowTimeline('');
      setSowCost('');
      setMarkAsSigned(false);
      setViewMode('history');
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleReview = async (sow: any) => {
    setIsReviewing(true);
    setReviewingId(sow.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following Statement of Work (SOW) for potential inconsistencies, missing information, compliance issues, or general improvements. Return the feedback in a structured JSON format.
        
        SOW Content:
        ${sow.content}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                severity: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["category", "severity", "description"]
            }
          }
        }
      });
      
      const feedback = JSON.parse(response.text);
      setActiveReview(feedback);
      
      await updateDoc(doc(db, 'sows', sow.id), {
        reviewFeedback: feedback
      });
    } catch (error) {
      console.error('Review failed:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleToolAction = (toolId: string) => {
    console.log(`Executing tool action for: ${toolId}`);
    // Generic handler for tools 04-10
  };

  const tools = Array.from({ length: 7 }, (_, i) => ({
    id: `tool-0${i + 4}`,
    name: `Architect Tool 0${i + 4}`,
    desc: `Automated processing unit for document structure 0${i + 4}`
  }));

  return (
    <div className="p-6 md:p-8 border border-gold/10 bg-vanta/50 rounded-[24px] md:rounded-[32px] backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-4">
        <div>
          <h2 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em] mb-2">Admin View</h2>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight text-oat">Document Architect</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-vanta border border-gold/20 rounded-xl p-1">
            <button
              onClick={() => setViewMode('architect')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${
                viewMode === 'architect' ? 'bg-gold text-vanta font-bold' : 'text-oat/40 hover:text-oat'
              }`}
            >
              Architect
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${
                viewMode === 'history' ? 'bg-gold text-vanta font-bold' : 'text-oat/40 hover:text-oat'
              }`}
            >
              History
            </button>
          </div>
          {templates.length === 0 && (
            <button
              onClick={seedTemplates}
              className="px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-[8px] md:text-[10px] font-mono text-gold uppercase hover:bg-gold/20 transition-colors"
            >
              Seed Templates
            </button>
          )}
        </div>
      </div>

      {viewMode === 'architect' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex-1">
                <label className="block text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-widest mb-2">SOW Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="">Select a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-widest mb-2">Target Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.uid} value={client.uid}>{client.displayName || client.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4 p-6 border border-gold/10 bg-gold/5 rounded-2xl">
              <h4 className="text-[10px] font-mono text-gold uppercase tracking-widest">Project Details</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[8px] font-mono text-oat/40 uppercase tracking-widest mb-2">Detailed Description</label>
                  <textarea
                    value={sowDescription}
                    onChange={(e) => setSowDescription(e.target.value)}
                    placeholder="Describe the project scope in detail..."
                    className="w-full h-24 bg-vanta border border-gold/20 rounded-xl p-4 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors placeholder-oat/20 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-mono text-oat/40 uppercase tracking-widest mb-2">Timeline / Milestones</label>
                    <input
                      type="text"
                      value={sowTimeline}
                      onChange={(e) => setSowTimeline(e.target.value)}
                      placeholder="e.g., 12 weeks, Phase 1: Discovery..."
                      className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-mono text-oat/40 uppercase tracking-widest mb-2">Project Cost / Investment</label>
                    <input
                      type="text"
                      value={sowCost}
                      onChange={(e) => setSowCost(e.target.value)}
                      placeholder="e.g., $15,000 USD"
                      className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setMarkAsSigned(!markAsSigned)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  markAsSigned 
                    ? 'bg-gold/20 border-gold text-gold' 
                    : 'bg-vanta border-gold/10 text-oat/40 hover:border-gold/30'
                }`}
              >
                <CheckCircle size={14} />
                <span className="text-[10px] font-mono uppercase tracking-widest">Generate as Signed</span>
              </button>
              <p className="text-[8px] font-mono text-oat/20 uppercase tracking-widest">
                {markAsSigned ? 'Will automatically create an active project' : 'Will create a pending SOW for client review'}
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedClient || (!sowDescription && !prompt)}
              className="w-full py-4 bg-gold text-vanta font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-oat transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-[0.2em]"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Architecting Statement of Work...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Generate Statement of Work
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            <h4 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em]">Unified Tool Grid</h4>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolAction(tool.id)}
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
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {documents.length === 0 && (
            <div className="p-12 text-center border border-gold/5 bg-gold/5 rounded-3xl">
              <p className="text-oat/40 font-mono text-xs uppercase tracking-widest">No historical SOWs found</p>
            </div>
          )}
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="group flex flex-col items-stretch p-4 md:p-6 border border-gold/5 bg-gold/5 rounded-2xl hover:border-gold/20 transition-colors gap-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gold/10 rounded-xl flex items-center justify-center text-gold group-hover:scale-110 transition-transform shrink-0">
                    <FileText size={18} className="md:w-5 md:h-5" />
                  </div>
                  <div>
                    <h4 className="text-oat font-bold text-sm md:text-base line-clamp-1">{doc.title}</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest">{new Date(doc.createdAt).toLocaleDateString()}</p>
                      <span className="hidden sm:inline text-oat/20">•</span>
                      <p className="text-[8px] md:text-[10px] font-mono text-gold/60 uppercase tracking-widest">
                        {clients.find(c => c.uid === doc.clientUid)?.displayName || 'Unknown Client'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 md:gap-6">
                  <div className="flex items-center gap-2">
                    {doc.status === 'signed' ? (
                      <CheckCircle size={14} className="text-gold" />
                    ) : (
                      <AlertCircle size={14} className="text-oat/40" />
                    )}
                    <span className={`text-[8px] md:text-[10px] font-mono uppercase tracking-widest ${doc.status === 'signed' ? 'text-gold' : 'text-oat/40'}`}>
                      {doc.status}
                    </span>
                  </div>

                  {doc.status === 'signed' && doc.projectId && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-gold/5 border border-gold/10 rounded-lg shrink-0">
                      <Briefcase size={12} className="text-gold/60" />
                      <span className="text-[8px] md:text-[10px] font-mono text-gold/60 uppercase tracking-widest">
                        Project: {doc.projectId.slice(0, 8)}
                      </span>
                    </div>
                  )}

                  {doc.status === 'pending' && (
                    <button 
                      onClick={() => setSelectedSowForSigning(doc)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gold text-vanta font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-oat transition-all shrink-0"
                    >
                      <PenTool size={12} />
                      Review & Sign
                    </button>
                  )}
                  
                  <div className="flex items-center gap-1 md:gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        if (doc.reviewFeedback && reviewingId !== doc.id) {
                          setActiveReview(doc.reviewFeedback);
                          setReviewingId(doc.id);
                        } else {
                          handleReview(doc);
                        }
                      }}
                      disabled={isReviewing}
                      className="p-2 text-oat/40 hover:text-gold transition-colors"
                      title="AI Review"
                    >
                      {isReviewing && reviewingId === doc.id ? (
                        <Loader2 size={14} className="animate-spin text-gold" />
                      ) : (
                        <Search size={14} className="md:w-4 md:h-4" />
                      )}
                    </button>
                    <button className="p-2 text-oat/40 hover:text-gold transition-colors"><Edit3 size={14} className="md:w-4 md:h-4" /></button>
                    <button className="p-2 text-oat/40 hover:text-gold transition-colors"><Send size={14} className="md:w-4 md:h-4" /></button>
                    <button className="p-2 text-oat/40 hover:text-destructive transition-colors"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
                  </div>
                </div>
              </div>

              {doc.cost && (
                <div className="flex flex-wrap gap-4 pt-4 border-t border-gold/5">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-mono text-gold/40 uppercase tracking-widest">Investment</span>
                    <span className="text-xs font-mono text-gold">{doc.cost}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] font-mono text-gold/40 uppercase tracking-widest">Timeline</span>
                    <span className="text-xs font-mono text-oat/60">{doc.timeline}</span>
                  </div>
                </div>
              )}
              
              {activeReview && reviewingId === doc.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="w-full p-4 bg-gold/5 border border-gold/10 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-mono text-gold uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={12} />
                      AI Architect Review
                    </h5>
                    <button onClick={() => setActiveReview(null)} className="text-oat/40 hover:text-gold">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {activeReview.map((item, idx) => (
                      <div key={idx} className="flex gap-3 text-[10px] md:text-xs">
                        <span className={`shrink-0 px-2 py-0.5 rounded uppercase font-mono text-[8px] h-fit ${
                          item.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                          item.severity === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gold/20 text-gold'
                        }`}>
                          {item.severity}
                        </span>
                        <div className="space-y-1">
                          <span className="text-gold/60 font-mono uppercase text-[8px] tracking-tighter">[{item.category.replace('_', ' ')}]</span>
                          <p className="text-oat/80 leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {selectedSowForSigning && (
          <SOWSigning sow={selectedSowForSigning} onClose={() => setSelectedSowForSigning(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
