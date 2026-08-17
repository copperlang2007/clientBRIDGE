import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Trash2, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileArchive, 
  FileCode, 
  FileSpreadsheet, 
  File, 
  Globe, 
  Layers,
  Clock,
  Filter,
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

export interface TimelineDeliverable {
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
  projectId?: string;
  projectTitle?: string;
  clientName?: string;
  status?: string;
}

interface ProjectTimelineViewProps {
  projects: any[];
  clients: any[];
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string | null) => void;
  onDeleteDeliverable?: (projectId: string, deliverable: any) => void;
}

const getFileIcon = (type?: string, name?: string) => {
  const mime = type?.toLowerCase() || '';
  const ext = name?.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) 
    return <FileImage size={18} className="text-blue-400" />;
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) 
    return <FileVideo size={18} className="text-purple-400" />;
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) 
    return <FileAudio size={18} className="text-pink-400" />;
  if (mime.includes('pdf') || ext === 'pdf') 
    return <FileText size={18} className="text-red-400" />;
  if (mime.includes('zip') || mime.includes('tar') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) 
    return <FileArchive size={18} className="text-orange-400" />;
  if (mime.includes('spreadsheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) 
    return <FileSpreadsheet size={18} className="text-green-400" />;
  if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || ['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css'].includes(ext)) 
    return <FileCode size={18} className="text-yellow-400" />;
  
  if (!type && name?.startsWith('http')) return <Globe size={18} className="text-gold/60" />;

  return <File size={18} className="text-gold/40" />;
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const ProjectTimelineView: React.FC<ProjectTimelineViewProps> = ({
  projects,
  clients,
  selectedProjectId,
  onSelectProject,
  onDeleteDeliverable
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filterProject, setFilterProject] = useState<string>(selectedProjectId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect all deliverables sorted chronologically
  const timelineItems: TimelineDeliverable[] = React.useMemo(() => {
    const list: TimelineDeliverable[] = [];

    projects.forEach(project => {
      if (filterProject !== 'all' && project.id !== filterProject) return;

      const client = clients.find(c => c.uid === project.clientUid);
      const clientName = client?.displayName || client?.email?.split('@')[0] || 'Enterprise Client';

      if (project.deliverables && Array.isArray(project.deliverables)) {
        project.deliverables.forEach((del: any) => {
          list.push({
            ...del,
            projectId: project.id,
            projectTitle: project.title,
            clientName,
            status: project.status || 'active'
          });
        });
      }
    });

    // Sort by uploadedAt ascending (chronological timeline)
    return list
      .filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.projectTitle?.toLowerCase().includes(q) ||
          item.clientName?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return timeA - timeB;
      });
  }, [projects, clients, filterProject, searchQuery]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Timeline Controls & Filters */}
      <div className="p-4 md:p-5 bg-vanta/60 border border-gold/15 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gold font-mono text-xs uppercase tracking-wider">
            <Filter size={14} />
            <span>Filter Project:</span>
          </div>
          <select
            value={filterProject}
            onChange={(e) => {
              setFilterProject(e.target.value);
              if (onSelectProject) onSelectProject(e.target.value === 'all' ? null : e.target.value);
            }}
            className="bg-vanta border border-gold/20 rounded-xl px-3 py-1.5 text-xs text-oat font-mono focus:outline-none focus:border-gold/50"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.deliverables?.length || 0} items)
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search deliverables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-vanta border border-gold/20 rounded-xl px-3 py-1.5 text-xs text-oat font-mono placeholder:text-oat/30 focus:outline-none focus:border-gold/50"
          />
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <span className="text-[10px] font-mono text-oat/40">
            {timelineItems.length} Milestones Mapped
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={scrollLeft}
              className="p-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 transition-colors"
              title="Scroll Timeline Left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={scrollRight}
              className="p-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 transition-colors"
              title="Scroll Timeline Right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {timelineItems.length === 0 ? (
        <div className="p-12 text-center border border-gold/10 bg-vanta/40 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 mx-auto flex items-center justify-center text-gold">
            <Calendar size={22} />
          </div>
          <h4 className="text-base font-bold text-oat">No Timeline Deliverables Found</h4>
          <p className="text-xs text-oat/40 max-w-sm mx-auto font-mono">
            {filterProject !== 'all' 
              ? 'This project does not have any deliverables uploaded yet.' 
              : 'Upload files or attach deliverable links to project milestones to render the horizontal timeline.'}
          </p>
        </div>
      ) : (
        /* Horizontal Scrollable Timeline using CSS Grid */
        <div className="relative w-full bg-vanta/50 border border-gold/15 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

          {/* Timeline Track Line (Continuous Horizontal Spine) */}
          <div className="relative">
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto pb-6 pt-2 custom-scrollbar scroll-smooth"
            >
              {/* Top Horizon Line */}
              <div className="relative min-w-max mb-8">
                <div className="absolute top-4 left-0 right-0 h-[2px] bg-gradient-to-r from-gold/10 via-gold/40 to-gold/10 z-0" />
              </div>

              {/* CSS Grid for Horizontal Timeline Flow */}
              <div 
                className="grid grid-flow-col auto-cols-[300px] md:auto-cols-[340px] gap-6 min-w-max items-start pt-2 px-2"
                style={{
                  gridTemplateRows: 'auto'
                }}
              >
                {timelineItems.map((item, index) => {
                  const dateObj = item.uploadedAt ? new Date(item.uploadedAt) : new Date();
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="relative flex flex-col items-center group"
                    >
                      {/* Timeline Node Connector Point */}
                      <div className="relative z-10 flex flex-col items-center mb-6">
                        <div className="w-9 h-9 rounded-full bg-vanta border-2 border-gold flex items-center justify-center text-gold shadow-md shadow-gold/20 group-hover:scale-110 group-hover:bg-gold group-hover:text-vanta transition-all">
                          <span className="font-mono text-[10px] font-black">
                            0{index + 1}
                          </span>
                        </div>
                        <div className="w-[2px] h-6 bg-gold/30 mt-1" />
                        <span className="px-2 py-0.5 mt-1 rounded-full bg-gold/10 border border-gold/20 text-gold font-mono text-[8px] uppercase tracking-wider">
                          {formattedDate}
                        </span>
                      </div>

                      {/* Deliverable Card */}
                      <div className="w-full bg-vanta-dark border border-gold/15 hover:border-gold/40 rounded-2xl p-5 space-y-4 shadow-xl transition-all group-hover:-translate-y-1">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                              {getFileIcon(item.type, item.name)}
                            </div>
                            <div className="overflow-hidden">
                              <h5 className="text-xs font-bold text-oat line-clamp-1 group-hover:text-gold transition-colors" title={item.name}>
                                {item.name}
                              </h5>
                              <p className="text-[9px] font-mono text-gold/60 truncate mt-0.5">
                                {item.projectTitle}
                              </p>
                            </div>
                          </div>
                          
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[8px] uppercase font-bold shrink-0">
                            Verified
                          </span>
                        </div>

                        {/* Metadata Details */}
                        <div className="p-3 bg-vanta rounded-xl border border-gold/10 space-y-1.5 text-[9px] font-mono">
                          <div className="flex items-center justify-between text-oat/50">
                            <span>Client:</span>
                            <span className="text-oat/80 font-medium truncate max-w-[140px]">{item.clientName}</span>
                          </div>
                          <div className="flex items-center justify-between text-oat/50">
                            <span>Timestamp:</span>
                            <span className="text-oat/80">{formattedTime}</span>
                          </div>
                          {item.size && (
                            <div className="flex items-center justify-between text-oat/50">
                              <span>Payload Size:</span>
                              <span className="text-gold/80">{formatSize(item.size)}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-gold/10">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-vanta font-bold rounded-lg text-[9px] uppercase tracking-wider hover:bg-oat transition-colors shadow-sm"
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </a>

                          {onDeleteDeliverable && item.projectId && (
                            <button
                              onClick={() => onDeleteDeliverable(item.projectId!, item)}
                              className="p-1.5 text-oat/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete Deliverable"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
