import React, { useState } from 'react';
import { DemoReport } from '../types';
import { FilePlus, Sparkles, Send, MessageSquareText, AlertCircle } from 'lucide-react';

interface ReportIntakePanelProps {
  demoReports: DemoReport[];
  onSubmitReport: (rawReportText: string) => void;
  isRunningPipeline: boolean;
}

export const ReportIntakePanel: React.FC<ReportIntakePanelProps> = ({
  demoReports,
  onSubmitReport,
  isRunningPipeline,
}) => {
  const [reportText, setReportText] = useState<string>('');

  const handleSelectDemo = (demo: DemoReport) => {
    setReportText(demo.rawText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim() || isRunningPipeline) return;
    onSubmitReport(reportText.trim());
    setReportText('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <MessageSquareText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Disaster Report Intake & Agent Dispatch</h3>
            <p className="text-xs text-slate-400">Submit unstructured disaster communications or choose demo scenarios</p>
          </div>
        </div>
      </div>

      {/* Pre-scripted Demo Reports Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pre-Scripted Demo Reports (One-Click)</span>
          </span>
          <span className="text-[10px] text-slate-500">Orion Global Hackathon Demo Suite</span>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          {demoReports.map((demo) => (
            <button
              key={demo.id}
              onClick={() => handleSelectDemo(demo)}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left shrink-0 transition-all cursor-pointer w-64 group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider truncate">
                  {demo.category}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    demo.urgencyBadge === 'Critical'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {demo.urgencyBadge}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                {demo.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Text Area Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Type or paste unstructured emergency disaster report here (e.g., 'URGENT: Floodwaters rising at St. Mary Hospital, 120 patients need clean water and generators immediately')..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Triggers Intake -&gt; Prioritization -&gt; VRP Solver -&gt; Dispatch Agent</span>
          </div>

          <button
            type="submit"
            disabled={!reportText.trim() || isRunningPipeline}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs shadow-md shadow-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isRunningPipeline ? 'Processing Agents...' : 'Run Agent Pipeline'}</span>
          </button>
        </div>
      </form>

    </div>
  );
};
