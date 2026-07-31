import React from 'react';
import { AgentStepLog, AgentPipelineRun } from '../types';
import { Bot, FileText, AlertTriangle, Route, Send, CheckCircle2, Clock, Sparkles, ChevronRight, Activity } from 'lucide-react';

interface AgentPipelineTrackerProps {
  pipelineRun: AgentPipelineRun | null;
  isRunning: boolean;
}

const AGENTS_CONFIG = [
  {
    name: 'Intake Agent',
    role: 'Natural Language Report Parser',
    icon: FileText,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  {
    name: 'Prioritization Agent',
    role: 'Urgency & Window Scoring',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    name: 'Routing Solver',
    role: 'OR VRP Optimization Engine',
    icon: Route,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    name: 'Dispatch Agent',
    role: 'Manifest & Driver Instructions',
    icon: Send,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
];

export const AgentPipelineTracker: React.FC<AgentPipelineTrackerProps> = ({
  pipelineRun,
  isRunning,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Multi-Agent Workflow Pipeline</h3>
            <p className="text-xs text-slate-400">Autonomous processing sequence from report to route dispatch</p>
          </div>
        </div>

        {isRunning ? (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold animate-pulse">
            <Activity className="w-3.5 h-3.5 animate-spin text-rose-400" />
            <span>Pipeline Running...</span>
          </div>
        ) : pipelineRun?.status === 'completed' ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Execution Active</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Idle / Ready</span>
        )}
      </div>

      {/* 4 Agent Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {AGENTS_CONFIG.map((agent, index) => {
          const Icon = agent.icon;
          const log = pipelineRun?.stepLogs?.find((l) => l.agentName === agent.name);
          const isStepRunning = isRunning && !log;
          const isStepDone = !!log && log.status === 'success';

          return (
            <div
              key={agent.name}
              className={`p-3.5 rounded-xl border transition-all relative ${
                isStepDone
                  ? `${agent.bgColor} ${agent.borderColor}`
                  : isStepRunning
                  ? 'bg-slate-800/80 border-rose-500/50 shadow-lg shadow-rose-950/30 animate-pulse'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              {/* Step Sequence Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Agent 0{index + 1}
                </span>
                {isStepDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isStepRunning ? (
                  <Sparkles className="w-4 h-4 text-rose-400 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                )}
              </div>

              {/* Agent Title & Icon */}
              <div className="flex items-center space-x-2 mb-1.5">
                <Icon className={`w-4 h-4 ${agent.color}`} />
                <h4 className="font-semibold text-xs text-white truncate">{agent.name}</h4>
              </div>

              <p className="text-[10px] text-slate-400 mb-2 leading-snug">{agent.role}</p>

              {/* Log Output Summary */}
              {log ? (
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                  <p className="line-clamp-2 leading-relaxed font-sans text-slate-200">
                    {log.summary}
                  </p>
                  {log.durationMs && (
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      Execution time: {log.durationMs}ms
                    </span>
                  )}
                </div>
              ) : isStepRunning ? (
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-rose-300 italic">
                  Analyzing & solving...
                </div>
              ) : (
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-600 italic">
                  Waiting for trigger...
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
