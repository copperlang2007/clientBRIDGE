import React, { useState, useEffect } from 'react';
import { 
  Heart, Sparkles, RefreshCw, AlertTriangle, ShieldCheck, 
  TrendingUp, Compass, Activity, CheckCircle2, ChevronRight, Zap
} from 'lucide-react';
import { MeetingSentimentAnalysis } from '../types/meetingAgents';
import { analyzeMeetingSentimentWithAI } from '../services/voiceAgentService';

interface LiveSentimentGaugeProps {
  meetingTitle: string;
  transcript: string;
  notes?: string;
  agenda?: string;
  meetingPhase?: string;
  onSentimentUpdated?: (sentiment: MeetingSentimentAnalysis) => void;
}

export const LiveSentimentGauge: React.FC<LiveSentimentGaugeProps> = ({
  meetingTitle,
  transcript,
  notes,
  agenda,
  meetingPhase,
  onSentimentUpdated
}) => {
  const [sentiment, setSentiment] = useState<MeetingSentimentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  const fetchSentiment = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeMeetingSentimentWithAI({
        meetingTitle,
        transcript: transcript || 'Meeting beginning. Participants reviewing milestone requirements and scope.',
        notes,
        agenda,
        meetingPhase
      });
      setSentiment(result);
      setLastAnalyzedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (onSentimentUpdated) {
        onSentimentUpdated(result);
      }
    } catch (err) {
      console.warn('Sentiment analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Initial load or periodic refresh if transcript has grown
  useEffect(() => {
    if (!sentiment) {
      fetchSentiment();
    }
  }, [meetingTitle]);

  const getToneColor = (tone?: string) => {
    switch (tone) {
      case 'Collaborative & Constructive':
      case 'Productive / Action-Oriented':
        return {
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          gauge: '#10B981',
          gradient: 'from-emerald-500 to-teal-400'
        };
      case 'Analytical & Cautious':
        return {
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          gauge: '#3B82F6',
          gradient: 'from-blue-500 to-indigo-400'
        };
      case 'Creative & Visionary':
        return {
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          gauge: '#8B5CF6',
          gradient: 'from-purple-500 to-pink-400'
        };
      case 'Tense / High Scrutiny':
      case 'Skeptical / Scope-Sensitive':
        return {
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          gauge: '#F43F5E',
          gradient: 'from-rose-500 to-amber-500'
        };
      default:
        return {
          badge: 'bg-gold/20 text-gold border-gold/40',
          gauge: '#F59E0B',
          gradient: 'from-gold to-amber-400'
        };
    }
  };

  const toneColor = getToneColor(sentiment?.overallTone);

  // Map -100 to 100 to 0% to 100% for the circular progress / gauge
  const sentimentPercent = sentiment ? Math.min(100, Math.max(0, Math.round(((sentiment.sentimentScore + 100) / 200) * 100))) : 75;

  return (
    <div className="p-4 bg-vanta-light/60 border border-gold/20 rounded-xl space-y-4 font-mono shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
              Live Sentiment & Emotional Tone
              <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-400 rounded font-normal">
                Gemini 3.7
              </span>
            </h4>
            <span className="text-[10px] text-oat/50">
              {lastAnalyzedAt ? `Updated ${lastAnalyzedAt}` : 'Real-time tone monitoring'}
            </span>
          </div>
        </div>

        <button
          onClick={fetchSentiment}
          disabled={isAnalyzing}
          className="px-2.5 py-1 bg-vanta hover:bg-gold/10 text-gold border border-gold/20 rounded text-[11px] flex items-center gap-1 font-bold transition-all disabled:opacity-50"
          title="Recalculate sentiment using latest audio transcript"
        >
          <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Analyzing...' : 'Refresh Tone'}</span>
        </button>
      </div>

      {/* Main Tone Gauge & Indicator Block */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-vanta/70 p-3.5 rounded-xl border border-gold/10">
        {/* Left: Visual Tone Meter */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-2 text-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG Circular Gauge */}
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                className="text-vanta-light/80"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={toneColor.gauge}
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - sentimentPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Center Sentiment Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-oat tracking-tight">
                {sentiment ? `${sentiment.sentimentScore > 0 ? '+' : ''}${sentiment.sentimentScore}` : '+78'}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-oat/50">
                Tone Index
              </span>
            </div>
          </div>

          <div className="mt-2">
            <span className={`px-2.5 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider border ${toneColor.badge}`}>
              {sentiment?.overallTone || 'Collaborative & Constructive'}
            </span>
          </div>
        </div>

        {/* Right: Key Psychological Indexes */}
        <div className="sm:col-span-7 space-y-2.5">
          {/* Collaboration Index */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-oat/70">Collaboration Index</span>
              <span className="text-emerald-400 font-bold">{sentiment?.collaborationIndex || 88}%</span>
            </div>
            <div className="w-full h-2 bg-vanta rounded-full overflow-hidden border border-gold/10">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${sentiment?.collaborationIndex || 88}%` }}
              />
            </div>
          </div>

          {/* Scope & Requirement Clarity */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-oat/70">Scope & Decision Clarity</span>
              <span className="text-blue-400 font-bold">{sentiment?.clarityScore || 82}%</span>
            </div>
            <div className="w-full h-2 bg-vanta rounded-full overflow-hidden border border-gold/10">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${sentiment?.clarityScore || 82}%` }}
              />
            </div>
          </div>

          {/* Alignment Confidence */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-oat/70">Stakeholder Alignment</span>
              <span className="text-gold font-bold">{sentiment?.alignmentConfidence || 91}%</span>
            </div>
            <div className="w-full h-2 bg-vanta rounded-full overflow-hidden border border-gold/10">
              <div
                className="h-full bg-gold rounded-full transition-all duration-700"
                style={{ width: `${sentiment?.alignmentConfidence || 91}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Tactical Advice / Recommendations for Room */}
      {sentiment?.liveTacticalAdvice && sentiment.liveTacticalAdvice.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] uppercase font-bold text-gold flex items-center gap-1">
            <Zap className="w-3 h-3 text-gold" />
            Real-Time Facilitator Tactical Cues:
          </span>
          <div className="space-y-1">
            {sentiment.liveTacticalAdvice.map((advice, idx) => (
              <div
                key={idx}
                className="p-2 bg-vanta/60 rounded border border-gold/10 text-[10px] text-oat/80 flex items-start gap-1.5"
              >
                <span className="text-gold font-bold">›</span>
                <span>{advice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emotional Pillars Breakdown */}
      {sentiment?.emotionalPillars && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {sentiment.emotionalPillars.map((pillar, idx) => (
            <div key={idx} className="p-2 bg-vanta/50 rounded-lg border border-gold/10 text-center">
              <span className="text-[9px] text-oat/50 block truncate">{pillar.name}</span>
              <span className="text-xs font-bold text-oat">{pillar.score}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
