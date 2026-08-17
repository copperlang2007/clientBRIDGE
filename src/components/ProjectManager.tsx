import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, OperationType, handleFirestoreError } from '../firebase';
import { sendNotification } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Plus, Link as LinkIcon, FileText, Upload, Trash2, CheckCircle, X, FileImage, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet, File, Globe, CheckSquare, Clock, Calendar, LayoutGrid, Layers } from 'lucide-react';
import { MilestoneProgressBar } from './MilestoneProgressBar';
import { ProjectTimelineView } from './ProjectTimelineView';
import { logAuditEvent } from '../services/auditLogger';

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

export const ProjectManager: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [sows, setSows] = useState<any[]>([]);
  const [mainView, setMainView] = useState<'cards' | 'timeline'>('cards');
  const [projectDisplayMode, setProjectDisplayMode] = useState<Record<string, 'grid' | 'timeline'>>({});
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newDeliverableUrl, setNewDeliverableUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const projectsUnsubscribe = onSnapshot(
      query(collection(db, 'projects'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
    );

    const clientsUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setClients(snapshot.docs.map(doc => doc.data()));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const sowsUnsubscribe = onSnapshot(
      collection(db, 'sows'),
      (snapshot) => {
        setSows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sows')
    );

    return () => {
      projectsUnsubscribe();
      clientsUnsubscribe();
      sowsUnsubscribe();
    };
  }, []);

  const handleStatusChange = async (project: any, newStatus: string) => {
    try {
      const oldStatus = project.status;
      await updateDoc(doc(db, 'projects', project.id), {
        status: newStatus
      });

      await logAuditEvent({
        action: 'PROJECT_STATUS_CHANGED',
        category: 'status_change',
        actorEmail: 'admin@theartificialbridge.com',
        actorName: 'Lead Architect',
        actorRole: 'admin',
        targetEntity: 'project',
        targetId: project.id,
        targetTitle: project.title,
        previousValue: oldStatus,
        newValue: newStatus,
        details: `Project "${project.title}" status transitioned from "${oldStatus}" to "${newStatus}".`
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storageRef = ref(storage, `deliverables/${projectId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error('Upload failed:', error);
        setUploadProgress(null);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(db, 'projects', projectId), {
          deliverables: arrayUnion({
            name: file.name,
            url: downloadURL,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString()
          })
        });

        // Notify client
        const project = projects.find(p => p.id === projectId);
        if (project) {
          await sendNotification({
            userId: project.clientUid,
            title: 'New Deliverable Uploaded',
            message: `A new file "${file.name}" has been uploaded to your project "${project.title}".`,
            type: 'update'
          });
        }

        setUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    );
  };

  const handleAddDeliverable = async (projectId: string) => {
    if (!newDeliverableName || !newDeliverableUrl) return;
    setIsAdding(true);

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        deliverables: arrayUnion({
          name: newDeliverableName,
          url: newDeliverableUrl,
          uploadedAt: new Date().toISOString()
        })
      });

      // Notify client
      const project = projects.find(p => p.id === projectId);
      if (project) {
        await sendNotification({
          userId: project.clientUid,
          title: 'New Deliverable Available',
          message: `A new deliverable "${newDeliverableName}" has been added to your project "${project.title}".`,
          type: 'update'
        });
      }

      setNewDeliverableName('');
      setNewDeliverableUrl('');
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to add deliverable:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDeliverable = async (projectId: string, deliverable: any) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        deliverables: arrayRemove(deliverable)
      });
    } catch (error) {
      console.error('Failed to delete deliverable:', error);
    }
  };

  return (
    <div className="p-6 md:p-8 border border-gold/10 bg-vanta/50 rounded-[24px] md:rounded-[32px] backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-4">
        <div>
          <h2 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em] mb-2">Admin View</h2>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight text-oat">Project Manager</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher: Projects List vs Project Timeline */}
          <div className="flex items-center p-1 bg-vanta border border-gold/20 rounded-xl">
            <button
              onClick={() => setMainView('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all ${
                mainView === 'cards'
                  ? 'bg-gold text-vanta font-bold shadow-sm'
                  : 'text-oat/60 hover:text-gold'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Projects List</span>
            </button>
            <button
              onClick={() => setMainView('timeline')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all ${
                mainView === 'timeline'
                  ? 'bg-gold text-vanta font-bold shadow-sm'
                  : 'text-oat/60 hover:text-gold'
              }`}
            >
              <Calendar size={13} />
              <span>Project Timeline</span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-xl">
            <Briefcase size={12} className="text-gold" />
            <span className="text-[8px] md:text-[10px] font-mono text-gold uppercase font-semibold">
              {projects.length} Active
            </span>
          </div>
        </div>
      </div>

      {mainView === 'timeline' ? (
        <ProjectTimelineView 
          projects={projects}
          clients={clients}
          onDeleteDeliverable={handleDeleteDeliverable}
        />
      ) : (
        <div className="space-y-6">
          {projects.length === 0 && (
            <div className="p-12 text-center border border-gold/5 bg-gold/5 rounded-3xl">
              <p className="text-oat/40 font-mono text-xs uppercase tracking-widest">No active projects found</p>
            </div>
          )}
          
          {projects.map(project => {
            const client = clients.find(c => c.uid === project.clientUid);
            const matchedSow = sows.find(s => s.id === project.sowId || s.projectId === project.id);
            const deliverablesList = project.deliverables || [];
            const isProjectTimeline = projectDisplayMode[project.id] === 'timeline';

            return (
              <motion.div
                key={project.id}
                layout
                className="p-6 border border-gold/10 bg-vanta/40 rounded-2xl space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-oat">{project.title}</h4>
                      <select
                        value={project.status || 'active'}
                        onChange={(e) => handleStatusChange(project, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-[8px] font-mono uppercase tracking-widest bg-vanta border cursor-pointer focus:outline-none transition-colors ${
                          project.status === 'active' ? 'text-green-400 border-green-400/30' :
                          project.status === 'completed' ? 'text-blue-400 border-blue-400/30' :
                          'text-gold border-gold/30'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="in_review">In Review</option>
                        <option value="completed">Completed</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-mono text-oat/40 uppercase tracking-widest">
                        Client: {client?.displayName || client?.email || 'Unknown'}
                      </p>
                      {matchedSow && (
                        <>
                          <span className="text-oat/20">•</span>
                          <p className="text-[10px] font-mono text-gold/60 uppercase tracking-widest">
                            SOW: #{matchedSow.id.slice(0, 8)} ({matchedSow.cost || 'Fixed Milestone'})
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileUpload(e, project.id)}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadProgress !== null}
                      className="px-4 py-2 bg-gold text-vanta rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-oat transition-colors flex items-center gap-2"
                    >
                      <Upload size={14} />
                      {uploadProgress !== null ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload File'}
                    </button>
                    <button
                      onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                      className="px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-xl text-[10px] font-mono uppercase tracking-widest hover:bg-gold/20 transition-colors flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Add Link
                    </button>
                  </div>
                </div>

                {/* Real-time SOW Milestone Progress Bar */}
                <MilestoneProgressBar
                  projectId={project.id}
                  sowTitle={matchedSow?.title || project.title}
                  sowTimeline={matchedSow?.timeline || 'Agreed SOW Deliverable Schedule'}
                  sowContent={matchedSow?.content}
                  deliverablesCount={deliverablesList.length}
                />

                {uploadProgress !== null && selectedProject === null && (
                  <div className="w-full bg-gold/10 rounded-full h-1 mt-2">
                    <div 
                      className="bg-gold h-1 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {selectedProject === project.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-gold/5 border border-gold/10 rounded-xl space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] font-mono text-gold uppercase tracking-widest mb-2">Deliverable Name</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/40" size={14} />
                          <input
                            type="text"
                            value={newDeliverableName}
                            onChange={(e) => setNewDeliverableName(e.target.value)}
                            placeholder="e.g., Final Design Assets"
                            className="w-full bg-vanta border border-gold/20 rounded-lg pl-9 pr-4 py-2 text-oat font-mono text-xs focus:outline-none focus:border-gold/50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono text-gold uppercase tracking-widest mb-2">Download URL</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/40" size={14} />
                          <input
                            type="url"
                            value={newDeliverableUrl}
                            onChange={(e) => setNewDeliverableUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-vanta border border-gold/20 rounded-lg pl-9 pr-4 py-2 text-oat font-mono text-xs focus:outline-none focus:border-gold/50"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="px-4 py-2 text-oat/40 hover:text-oat text-[10px] uppercase font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddDeliverable(project.id)}
                        disabled={isAdding || !newDeliverableName || !newDeliverableUrl}
                        className="px-6 py-2 bg-gold text-vanta font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-oat transition-colors disabled:opacity-50"
                      >
                        {isAdding ? 'Adding...' : 'Save Deliverable'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {project.deliverables && project.deliverables.length > 0 && (
                  <div className="space-y-4 mt-8 pt-6 border-t border-gold/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h5 className="text-[10px] font-mono text-gold/60 uppercase tracking-widest">Project Deliverables</h5>
                        <span className="text-[8px] font-mono text-oat/20 uppercase tracking-widest">
                          {project.deliverables.length} Items
                        </span>
                      </div>

                      {/* Display Mode Toggle for this Project */}
                      <div className="flex items-center p-0.5 bg-vanta border border-gold/15 rounded-lg">
                        <button
                          onClick={() => setProjectDisplayMode(prev => ({ ...prev, [project.id]: 'grid' }))}
                          className={`px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider flex items-center gap-1 transition-all ${
                            !isProjectTimeline ? 'bg-gold/20 text-gold font-bold' : 'text-oat/40 hover:text-oat'
                          }`}
                          title="Grid View"
                        >
                          <LayoutGrid size={11} />
                          <span>Grid</span>
                        </button>
                        <button
                          onClick={() => setProjectDisplayMode(prev => ({ ...prev, [project.id]: 'timeline' }))}
                          className={`px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider flex items-center gap-1 transition-all ${
                            isProjectTimeline ? 'bg-gold/20 text-gold font-bold' : 'text-oat/40 hover:text-oat'
                          }`}
                          title="Horizontal Scrollable Timeline View"
                        >
                          <Calendar size={11} />
                          <span>Timeline</span>
                        </button>
                      </div>
                    </div>

                    {isProjectTimeline ? (
                      /* Per-Project Horizontal Scrollable Timeline using CSS Grid */
                      <div className="overflow-x-auto pb-4 pt-2 custom-scrollbar">
                        <div 
                          className="grid grid-flow-col auto-cols-[280px] md:auto-cols-[300px] gap-4 min-w-max items-start py-2"
                        >
                          {project.deliverables.map((del: any, idx: number) => {
                            const dateStr = del.uploadedAt ? new Date(del.uploadedAt).toLocaleDateString() : 'Scheduled';
                            return (
                              <div 
                                key={idx}
                                className="p-4 border border-gold/15 bg-vanta/70 rounded-2xl space-y-3 relative group hover:border-gold/40 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold font-mono text-[8px] font-bold">
                                    Milestone 0{idx + 1}
                                  </span>
                                  <span className="text-[8px] font-mono text-oat/40">
                                    {dateStr}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                                    {getFileIcon(del.type, del.name)}
                                  </div>
                                  <div className="overflow-hidden">
                                    <h6 className="text-xs font-bold text-oat line-clamp-1 group-hover:text-gold transition-colors">
                                      {del.name}
                                    </h6>
                                    {del.size && (
                                      <p className="text-[8px] font-mono text-oat/40">
                                        {formatSize(del.size)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gold/10">
                                  <a
                                    href={del.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-gold text-vanta font-bold rounded-md text-[8px] uppercase tracking-wider hover:bg-oat transition-colors"
                                  >
                                    Download
                                  </a>
                                  <button
                                    onClick={() => handleDeleteDeliverable(project.id, del)}
                                    className="p-1 text-red-500/30 hover:text-red-500 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Standard Grid View */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {project.deliverables.map((del: any, idx: number) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
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
                            <div className="flex items-center gap-2">
                              <a 
                                href={del.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 text-gold/40 hover:text-gold transition-colors"
                                title="Download / View"
                              >
                                <Upload size={14} className="rotate-180" />
                              </a>
                              <button
                                onClick={() => handleDeleteDeliverable(project.id, del)}
                                className="p-2 text-red-500/20 hover:text-red-500 transition-colors"
                                title="Delete Deliverable"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
