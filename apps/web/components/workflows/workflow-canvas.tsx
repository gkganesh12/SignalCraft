'use client';

import { WorkflowStep } from '@/types/workflow';
import { Zap, PlayCircle, GitBranch, CheckSquare, Settings } from 'lucide-react';

interface WorkflowCanvasProps {
  steps: WorkflowStep[];
  onStepClick: (stepId: string) => void;
}

export function WorkflowCanvas({ steps, onStepClick }: WorkflowCanvasProps) {
  // Simple vertical layout with SVG connectors
  const nodeHeight = 80;
  const nodeWidth = 280;
  const gap = 40;
  
  const totalHeight = (steps.length + 1) * (nodeHeight + gap); // +1 for trigger

  return (
    <div className="relative min-h-[600px] w-full overflow-auto rounded-xl bg-slate-50 p-8 dark:bg-slate-900/50">
      <svg className="absolute left-0 top-0 h-full w-full pointer-events-none">
        {/* Draw lines between nodes */}
        {steps.map((step, index) => (
           <line 
             key={`line-${index}`}
             x1="50%" 
             y1={(index + 1) * (nodeHeight + gap) - gap} 
             x2="50%" 
             y2={(index + 1) * (nodeHeight + gap)} 
             stroke="#cbd5e1" 
             strokeWidth="2" 
             strokeDasharray="4"
           />
        ))}
         {/* Line from Trigger to First Step */}
         {steps.length > 0 && (
             <line 
             x1="50%" 
             y1={nodeHeight} 
             x2="50%" 
             y2={nodeHeight + gap} 
             stroke="#cbd5e1" 
             strokeWidth="2" 
           />
         )}
      </svg>

      <div className="flex flex-col items-center gap-[40px]">
        {/* Trigger Node */}
        <div className="relative z-10 flex h-[80px] w-[280px] cursor-pointer items-center gap-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 shadow-sm transition hover:border-blue-400 dark:border-blue-800 dark:bg-blue-900/20">
           <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
             <Zap className="h-5 w-5" />
           </div>
           <div>
             <div className="font-semibold text-gray-900 dark:text-gray-100">Trigger</div>
             <div className="text-xs text-gray-500">Alert Created</div>
           </div>
        </div>

        {/* Steps */}
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            onClick={() => onStepClick(step.id)}
            className="relative z-10 flex h-[80px] w-[280px] cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
               {step.type === 'condition' ? <GitBranch className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
             </div>
             <div className="flex-1">
               <div className="font-medium text-gray-900 dark:text-gray-100">
                 {step.type === 'condition' ? 'Check Condition' : 'Execute Action'}
               </div>
               <div className="text-xs text-gray-500">
                 {step.config.action || 'Configure step...'}
               </div>
             </div>
             <Settings className="h-4 w-4 text-gray-400" />
          </div>
        ))}

        {/* Add Step Node */}
        <div className="relative z-10 flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-transparent text-gray-400">
          <span className="text-xs mt-1">End</span>
        </div>
      </div>
    </div>
  );
}
