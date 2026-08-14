import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Plus, Send, Trash2, Edit3, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export const ProposalArchitect: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [activeReview, setActiveReview] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeProposals = onSnapshot(query(collection(db, 'proposals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProposals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'proposals'));

    const unsubscribeTemplates = onSnapshot(collection(db, 'proposalTemplates'), (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'proposalTemplates'));

    const fetchClients = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setClients(snapshot.docs.map(doc => doc.data()).filter(u => u.role === 'client'));
    };
    fetchClients();

    return () => {
      unsubscribeProposals();
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
      { name: 'Standard Service Proposal', content: 'Create a professional service proposal for a new client. Include sections for Executive Summary, Problem Statement, Proposed Solution, Methodology, and Pricing.' },
      { name: 'Technical Consulting Proposal', content: 'Draft a technical consulting proposal focusing on system architecture and performance optimization. Detail the assessment phase, implementation plan, and expected outcomes.' },
      { name: 'Marketing Campaign Proposal', content: 'Generate a proposal for a comprehensive digital marketing campaign. Include social media strategy, SEO optimization, and content creation milestones.' }
    ];

    for (const template of initialTemplates) {
      await addDoc(collection(db, 'proposalTemplates'), template);
    }
  };

  const handleGenerate = async () => {
    if (!prompt || !selectedClient) return;
    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a professional project proposal in Markdown based on this prompt: ${prompt}. Include sections for Overview, Objectives, Scope of Work, Deliverables, and Investment. Return only the Markdown content.`
      });
      
      const content = response.text;
      const title = content.split('\n')[0].replace('#', '').trim() || 'Project Proposal';

      await addDoc(collection(db, 'proposals'), {
        title,
        content,
        clientUid: selectedClient,
        status: 'draft',
        createdAt: new Date().toISOString()
      });
      
      setPrompt('');
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (proposal: any) => {
    setReviewingId(proposal.id);
    setIsReviewing(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Review this project proposal for clarity, completeness, and potential issues. 
        Proposal Content:
        ${proposal.content}
        
        Provide feedback in a structured JSON format with an array of objects.
        Each object should have:
        - category: one of ["clarity", "completeness", "potential_issue", "suggestion"]
        - severity: one of ["low", "medium", "high"]
        - description: a clear explanation of the feedback.
        
        Return ONLY the JSON array.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, enum: ["clarity", "completeness", "potential_issue", "suggestion"] },
                severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                description: { type: Type.STRING }
              },
              required: ["category", "severity", "description"]
            }
          }
        }
      });

      const feedback = JSON.parse(response.text);
      await updateDoc(doc(db, 'proposals', proposal.id), {
        reviewFeedback: feedback
      });
      setActiveReview(proposal.id);
    } catch (error) {
      console.error('Review failed:', error);
    } finally {
      setIsReviewing(false);
      setReviewingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 border border-gold/10 bg-vanta/50 rounded-[24px] md:rounded-[32px] backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-4">
        <div>
          <h2 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em] mb-2">Admin View</h2>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight text-oat">Proposal Architect</h3>
        </div>
        <div className="flex items-center gap-4">
          {templates.length === 0 && (
            <button
              onClick={seedTemplates}
              className="px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-[8px] md:text-[10px] font-mono text-gold uppercase hover:bg-gold/20 transition-colors"
            >
              Seed Templates
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-[8px] md:text-[10px] font-mono text-gold uppercase">AI Engine Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1">
                <label className="block text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-widest mb-2">Proposal Template</label>
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
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the proposal you want to architect..."
                className="w-full h-32 md:h-40 bg-vanta border border-gold/20 rounded-2xl p-4 md:p-6 text-oat font-mono text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder-oat/20 resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || !selectedClient}
                className="absolute bottom-4 right-4 px-5 md:px-6 py-2 bg-gold text-vanta font-bold rounded-full flex items-center gap-2 hover:bg-oat transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
              >
                {isGenerating ? (
                  <span className="animate-pulse">Architecting...</span>
                ) : (
                  <>
                    <Plus size={16} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {proposals.map((prop) => (
              <React.Fragment key={prop.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 border border-gold/5 bg-gold/5 rounded-2xl hover:border-gold/20 transition-colors gap-4"
                >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gold/10 rounded-xl flex items-center justify-center text-gold group-hover:scale-110 transition-transform shrink-0">
                    <FileText size={18} className="md:w-5 md:h-5" />
                  </div>
                  <div>
                    <h4 className="text-oat font-bold text-sm md:text-base line-clamp-1">{prop.title}</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest">{new Date(prop.createdAt).toLocaleDateString()}</p>
                      <span className="hidden sm:inline text-oat/20">•</span>
                      <p className="text-[8px] md:text-[10px] font-mono text-gold/60 uppercase tracking-widest">
                        {clients.find(c => c.uid === prop.clientUid)?.displayName || 'Unknown Client'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 md:gap-6">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] md:text-[10px] font-mono uppercase tracking-widest text-oat/40`}>
                      {prop.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 md:gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => activeReview === prop.id ? setActiveReview(null) : setActiveReview(prop.id)}
                      className={`p-2 transition-colors ${activeReview === prop.id ? 'text-gold' : 'text-oat/40 hover:text-gold'}`}
                    >
                      <Search size={14} className="md:w-4 md:h-4" />
                    </button>
                    <button 
                      onClick={() => handleReview(prop)}
                      disabled={isReviewing && reviewingId === prop.id}
                      className="p-2 text-oat/40 hover:text-gold transition-colors disabled:opacity-50"
                    >
                      {isReviewing && reviewingId === prop.id ? (
                        <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                      ) : (
                        <CheckCircle size={14} className="md:w-4 md:h-4" />
                      )}
                    </button>
                    <button className="p-2 text-oat/40 hover:text-gold transition-colors"><Edit3 size={14} className="md:w-4 md:h-4" /></button>
                    <button className="p-2 text-oat/40 hover:text-gold transition-colors"><Send size={14} className="md:w-4 md:h-4" /></button>
                    <button className="p-2 text-oat/40 hover:text-destructive transition-colors"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
                  </div>
                </div>
              </motion.div>

              {activeReview === prop.id && prop.reviewFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-4 bg-gold/5 border border-gold/10 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-mono text-gold uppercase tracking-widest">AI Review Feedback</h5>
                    <button 
                      onClick={() => handleReview(prop)}
                      disabled={isReviewing}
                      className="text-[8px] font-mono text-gold/60 hover:text-gold uppercase tracking-widest transition-colors"
                    >
                      {isReviewing ? 'Analyzing...' : 'Re-run Review'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {prop.reviewFeedback.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-vanta/40 rounded-lg border border-gold/5">
                        <div className={`mt-0.5 shrink-0 ${
                          item.severity === 'high' ? 'text-red-400' : 
                          item.severity === 'medium' ? 'text-gold' : 'text-blue-400'
                        }`}>
                          {item.category === 'potential_issue' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-mono text-gold uppercase tracking-tighter px-1.5 py-0.5 bg-gold/10 rounded">
                              {item.category.replace('_', ' ')}
                            </span>
                            <span className={`text-[8px] font-mono uppercase tracking-tighter ${
                              item.severity === 'high' ? 'text-red-400' : 
                              item.severity === 'medium' ? 'text-gold' : 'text-blue-400'
                            }`}>
                              {item.severity} priority
                            </span>
                          </div>
                          <p className="text-[10px] text-oat/70 leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </React.Fragment>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em]">Proposal Tools</h4>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {[
              { id: 'prop-01', name: 'Market Analysis', desc: 'Auto-generate market context for proposals' },
              { id: 'prop-02', name: 'Competitor Bench', desc: 'Compare proposed solution with market standards' },
              { id: 'prop-03', name: 'ROI Calculator', desc: 'Estimate project value and return on investment' }
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
