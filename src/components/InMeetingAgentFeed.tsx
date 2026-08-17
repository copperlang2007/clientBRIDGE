import React, { useState } from 'react';
import { 
  MessageSquare, Send, Sparkles, Volume2, VolumeX, Play, 
  Square, ShieldCheck, Zap, Bot, RefreshCw, UserCheck, AlertCircle
} from 'lucide-react';
import { MeetingPersona, AgentIntervention } from '../types/meetingAgents';
import { triggerAgentIntervention, voiceAgentEngine } from '../services/voiceAgentService';
import { GoogleMeeting } from '../services/googleMeet';

interface InMeetingAgentFeedProps {
  meeting: GoogleMeeting;
  personas: MeetingPersona[];
  interventions: AgentIntervention[];
  onAddIntervention: (intervention: AgentIntervention) => void;
  transcript: string;
  notes: string;
  activeSpeakingId: string | null;
  setActiveSpeakingId: (id: string | null) => void;
}

export const InMeetingAgentFeed: React.FC<InMeetingAgentFeedProps> = ({
  meeting,
  personas,
  interventions,
  onAddIntervention,
  transcript,
  notes,
  activeSpeakingId,
  setActiveSpeakingId
}) => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    personas.find(p => p.isAttending)?.id || personas[0]?.id || ''
  );
  const [customQuestion, setCustomQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentlyReplayingId, setCurrentlyReplayingId] = useState<string | null>(null);

  const attendingPersonas = personas.filter(p => p.isAttending);
  const currentPersona = personas.find(p => p.id === selectedPersonaId) || attendingPersonas[0] || personas[0];

  const handleAskAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPersona || isGenerating) return;

    setIsGenerating(true);
    try {
      const intervention = await triggerAgentIntervention({
        persona: currentPersona,
        userQuery: customQuestion.trim() || undefined,
        meetingTitle: meeting.title,
        meetingPhase: meeting.meetingPhase,
        clientName: meeting.clientName,
        notes: notes || meeting.notes,
        transcript: transcript || meeting.transcript,
        agenda: meeting.agenda,
        milestoneTitle: meeting.milestoneTitle
      });

      onAddIntervention(intervention);
      setCustomQuestion('');

      // Play audio via Browser Web Speech Synthesis
      if (!currentPersona.isMuted) {
        setActiveSpeakingId(currentPersona.id);
        await voiceAgentEngine.speak(currentPersona, intervention.spokenText);
        setActiveSpeakingId(null);
      }
    } catch (err) {
      console.error('Agent intervention failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReplayIntervention = async (item: AgentIntervention) => {
    const persona = personas.find(p => p.id === item.personaId) || currentPersona;
    if (currentlyReplayingId === item.id) {
      voiceAgentEngine.stopSpeaking(item.personaId);
      setCurrentlyReplayingId(null);
      setActiveSpeakingId(null);
      return;
    }

    setCurrentlyReplayingId(item.id);
    setActiveSpeakingId(item.personaId);
    await voiceAgentEngine.speak(persona, item.spokenText);
    setCurrentlyReplayingId(null);
    setActiveSpeakingId(null);
  };

  return (
    <div className="p-4 bg-vanta-light/50 border border-gold/20 rounded-xl space-y-4 font-mono shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
              Live AI Board Interventions
              <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-400 rounded font-normal">
                Bidirectional Voice
              </span>
            </h4>
            <span className="text-[10px] text-oat/50">
              Autonomous meeting attendees & strategic counsel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-oat/60">
            {interventions.length} Interventions
          </span>
        </div>
      </div>

      {/* Interventions Log / Discussion Stream */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        {interventions.length === 0 ? (
          <div className="p-5 text-center border border-dashed border-gold/15 rounded-xl space-y-2 bg-vanta/40">
            <Sparkles className="w-5 h-5 text-gold/40 mx-auto animate-pulse" />
            <p className="text-xs text-oat/70 font-semibold">AI Specialists are actively listening to the room.</p>
            <p className="text-[10px] text-oat/40 max-w-sm mx-auto">
              Select an agent below to ask a direct question, or let them provide strategic insights as the meeting discussion unfolds.
            </p>
          </div>
        ) : (
          interventions.map((item) => {
            const isSpeakingNow = activeSpeakingId === item.personaId || currentlyReplayingId === item.id;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all space-y-2 ${
                  isSpeakingNow
                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/30'
                    : 'bg-vanta/80 border-gold/15 hover:border-gold/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.avatarUrl}
                      alt={item.personaName}
                      referrerPolicy="no-referrer"
                      className={`w-7 h-7 rounded-full object-cover border ${
                        isSpeakingNow ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-gold/30'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-oat">{item.personaName}</span>
                        <span className="px-1.5 py-0.2 text-[9px] bg-gold/10 text-gold rounded border border-gold/20">
                          {item.role}
                        </span>
                      </div>
                      <span className="text-[9px] text-oat/40">{item.timestamp}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleReplayIntervention(item)}
                    className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 font-bold transition-all ${
                      isSpeakingNow
                        ? 'bg-emerald-500 text-vanta animate-pulse'
                        : 'bg-vanta hover:bg-gold/20 text-gold border border-gold/20'
                    }`}
                    title="Replay Voice Speech"
                  >
                    {isSpeakingNow ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    <span>{isSpeakingNow ? 'Speaking...' : 'Play Audio'}</span>
                  </button>
                </div>

                {/* Spoken Quote Box */}
                <div className="p-2.5 bg-vanta-light/50 rounded-lg border border-gold/10 text-xs text-oat/90 leading-relaxed font-sans">
                  "{item.spokenText}"
                </div>

                {/* Structured Takeaway & Next Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px]">
                  <div className="flex items-center gap-1 text-amber-300">
                    <Zap className="w-3 h-3 text-gold" />
                    <span><strong className="text-gold">Key Takeaway:</strong> {item.keyPoint}</span>
                  </div>
                  {item.suggestedAction && (
                    <div className="text-emerald-400">
                      → Action: {item.suggestedAction}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Direct Prompt & Question Console */}
      <form onSubmit={handleAskAgent} className="pt-2 border-t border-gold/15 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gold font-bold uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Direct Inquiry / Solicit Intervention
          </span>
          <span className="text-[10px] text-oat/50">
            Targeting: <strong className="text-oat font-bold">{currentPersona.name}</strong>
          </span>
        </div>

        {/* Persona Select Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {personas.map((p) => {
            const isSelected = p.id === selectedPersonaId;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelectedPersonaId(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-gold text-vanta font-bold border-gold shadow'
                    : 'bg-vanta border-gold/15 text-oat/70 hover:border-gold/40'
                }`}
              >
                <img
                  src={p.avatarUrl}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
                <span>{p.name.split(' ')[0]}</span>
                <span className="text-[9px] opacity-75">({p.role.split(' ')[0]})</span>
              </button>
            );
          })}
        </div>

        {/* Input Box & Submit */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder={`Ask ${currentPersona.name} about architecture, SOW boundaries, or risk (or leave blank for spontaneous insight)...`}
            className="flex-1 p-2.5 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
          />

          <button
            type="submit"
            disabled={isGenerating}
            className="px-4 py-2.5 bg-gold hover:bg-gold/90 text-vanta font-bold rounded-lg text-xs flex items-center gap-1.5 shadow disabled:opacity-50 flex-shrink-0"
          >
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isGenerating ? 'Synthesizing...' : 'Solicit Spoken Input'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
