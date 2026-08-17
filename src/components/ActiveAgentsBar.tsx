import React, { useState } from 'react';
import { 
  Users, Mic, MicOff, Volume2, VolumeX, Sparkles, MessageSquare, 
  Settings, Check, ChevronRight, Play, Square, ShieldCheck, Zap
} from 'lucide-react';
import { MeetingPersona, AgentActivityStatus } from '../types/meetingAgents';

interface ActiveAgentsBarProps {
  personas: MeetingPersona[];
  onOpenPersonaManager: () => void;
  onSelectPersonaForQuery: (persona: MeetingPersona) => void;
  onToggleMute: (personaId: string, e: React.MouseEvent) => void;
  onTriggerAutonomousIntervention: (persona: MeetingPersona) => void;
  isProcessing?: boolean;
  activeSpeakingId?: string | null;
}

export const ActiveAgentsBar: React.FC<ActiveAgentsBarProps> = ({
  personas,
  onOpenPersonaManager,
  onSelectPersonaForQuery,
  onToggleMute,
  onTriggerAutonomousIntervention,
  isProcessing = false,
  activeSpeakingId = null
}) => {
  const [selectedAgentForPopover, setSelectedAgentForPopover] = useState<MeetingPersona | null>(null);
  const attendingPersonas = personas.filter(p => p.isAttending);

  const getStatusBadge = (status: AgentActivityStatus, isMuted: boolean, isSpeaking: boolean) => {
    if (isSpeaking) {
      return {
        label: 'Speaking',
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse',
        dot: 'bg-emerald-400 animate-ping'
      };
    }
    if (isMuted) {
      return {
        label: 'Muted',
        bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
        dot: 'bg-zinc-500'
      };
    }
    switch (status) {
      case 'processing':
        return {
          label: 'Processing',
          bg: 'bg-gold/20 text-gold border-gold/40 animate-pulse',
          dot: 'bg-gold animate-spin'
        };
      case 'speaking':
        return {
          label: 'Speaking',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse',
          dot: 'bg-emerald-400 animate-ping'
        };
      case 'listening':
      default:
        return {
          label: 'Listening',
          bg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
          dot: 'bg-blue-400'
        };
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 p-1.5 bg-vanta/90 border border-gold/20 rounded-xl shadow-lg backdrop-blur-sm">
        {/* Header Label */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 border-r border-gold/15">
          <div className="relative">
            <Users className="w-3.5 h-3.5 text-gold" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-gold hidden sm:inline">
            Active AI Board
          </span>
          <span className="px-1.5 py-0.2 bg-gold/15 text-gold text-[10px] rounded font-bold">
            {attendingPersonas.length}
          </span>
        </div>

        {/* List of Attending Agents */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-1 custom-scrollbar">
          {attendingPersonas.length === 0 ? (
            <div className="text-[11px] text-oat/50 px-2 py-1 flex items-center gap-1.5">
              <span>No AI agents in meeting.</span>
              <button
                onClick={onOpenPersonaManager}
                className="text-gold underline hover:text-gold/80 font-semibold"
              >
                Add Personas
              </button>
            </div>
          ) : (
            attendingPersonas.map((persona) => {
              const isSpeaking = activeSpeakingId === persona.id;
              const status = isSpeaking ? 'speaking' : persona.status;
              const badge = getStatusBadge(status, persona.isMuted, isSpeaking);

              return (
                <div
                  key={persona.id}
                  onClick={() => setSelectedAgentForPopover(persona)}
                  className={`group relative flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isSpeaking
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-500/20'
                      : 'bg-vanta-light/60 hover:bg-gold/10 border-gold/15 hover:border-gold/40'
                  }`}
                  title={`${persona.name} (${persona.role}) - Click to ask or configure`}
                >
                  {/* Avatar & Activity Ring */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={persona.avatarUrl}
                      alt={persona.name}
                      referrerPolicy="no-referrer"
                      className={`w-6 h-6 rounded-full object-cover border ${
                        isSpeaking 
                          ? 'border-emerald-400 ring-2 ring-emerald-400/40 ring-offset-1 ring-offset-vanta' 
                          : 'border-gold/30'
                      }`}
                    />
                    <span 
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-vanta ${badge.dot}`} 
                    />
                  </div>

                  {/* Name and Role */}
                  <div className="flex flex-col text-left min-w-[70px]">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-oat group-hover:text-gold transition-colors truncate max-w-[80px]">
                        {persona.name.split(' ')[0]}
                      </span>
                      {persona.isMuted && (
                        <VolumeX className="w-2.5 h-2.5 text-zinc-500 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-oat/50 truncate max-w-[85px] leading-tight">
                      {persona.role}
                    </span>
                  </div>

                  {/* Real-time Status Equalizer / Pill */}
                  <div className="flex items-center gap-1">
                    {isSpeaking ? (
                      <div className="flex items-center gap-0.5 h-3 px-1">
                        <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <span className={`px-1.5 py-0.5 text-[8px] rounded border font-mono uppercase tracking-wider ${badge.bg}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action: Manage Persona Board */}
        <div className="flex items-center gap-1 pl-1 border-l border-gold/15 flex-shrink-0">
          <button
            onClick={onOpenPersonaManager}
            className="p-1.5 text-oat/70 hover:text-gold hover:bg-gold/10 rounded-lg border border-gold/15 transition-all text-xs flex items-center gap-1"
            title="Configure AI voice personas attending meeting"
          >
            <Settings className="w-3.5 h-3.5 text-gold" />
            <span className="text-[10px] font-bold hidden md:inline">Personas</span>
          </button>
        </div>
      </div>

      {/* Quick Agent Popover Action Card */}
      {selectedAgentForPopover && (
        <div className="absolute top-full left-4 mt-2 z-50 w-80 p-4 bg-vanta border border-gold/40 rounded-xl shadow-2xl space-y-3 font-mono animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={selectedAgentForPopover.avatarUrl}
                alt={selectedAgentForPopover.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-gold/40"
              />
              <div>
                <h4 className="text-xs font-bold text-oat flex items-center gap-1.5">
                  {selectedAgentForPopover.name}
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-gold/15 text-gold font-normal">
                    {selectedAgentForPopover.role}
                  </span>
                </h4>
                <p className="text-[10px] text-oat/60">{selectedAgentForPopover.title}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedAgentForPopover(null)}
              className="text-oat/40 hover:text-oat text-xs"
            >
              ✕
            </button>
          </div>

          <p className="text-[10px] text-oat/70 leading-relaxed bg-vanta-light/60 p-2 rounded border border-gold/10">
            {selectedAgentForPopover.bio}
          </p>

          <div className="flex items-center justify-between text-[10px] pt-1">
            <span className="text-oat/50">Communication Style:</span>
            <span className="text-gold font-bold uppercase">{selectedAgentForPopover.communicationStyle}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gold/15">
            <button
              onClick={() => {
                onSelectPersonaForQuery(selectedAgentForPopover);
                setSelectedAgentForPopover(null);
              }}
              className="px-2.5 py-1.5 bg-gold hover:bg-gold/90 text-vanta font-bold rounded text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <MessageSquare className="w-3 h-3" />
              Ask Question
            </button>

            <button
              onClick={() => {
                onTriggerAutonomousIntervention(selectedAgentForPopover);
                setSelectedAgentForPopover(null);
              }}
              className="px-2.5 py-1.5 bg-vanta-light hover:bg-gold/10 text-gold border border-gold/30 font-bold rounded text-xs flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3 h-3" />
              Trigger Insight
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-oat/60 pt-1">
            <button
              onClick={(e) => onToggleMute(selectedAgentForPopover.id, e)}
              className="hover:text-gold flex items-center gap-1"
            >
              {selectedAgentForPopover.isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
              {selectedAgentForPopover.isMuted ? 'Unmute Voice' : 'Mute Voice'}
            </button>

            <button
              onClick={() => {
                setSelectedAgentForPopover(null);
                onOpenPersonaManager();
              }}
              className="text-gold hover:underline"
            >
              Edit Persona →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
