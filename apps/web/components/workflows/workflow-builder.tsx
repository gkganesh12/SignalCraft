'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { workflowClient } from '@/lib/services/workflow-client';
import { 
  Workflow, 
  CreateWorkflowDto, 
  WorkflowStep,
  WorkflowTrigger 
} from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Save, 
  ArrowRight,
  Zap,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

interface WorkflowBuilderProps {
  workflowId?: string;
}

export function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!workflowId);
  const [saving, setSaving] = useState(false);
  
  // Workflow State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  
  const [trigger, setTrigger] = useState<WorkflowTrigger>({
    type: 'alert_created',
    config: {},
  });
  
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  async function loadWorkflow(id: string) {
    try {
      const workspaceId = 'default-workspace';
      const data = await workflowClient.get(id, workspaceId);
      setName(data.name);
      setDescription(data.description || '');
      setIsEnabled(data.isEnabled);
      setTrigger(data.trigger);
      setSteps(data.steps);
    } catch (error) {
       console.error('Failed to load workflow:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return alert('Name is required');
    
    setSaving(true);
    try {
      const workspaceId = 'default-workspace';
      const dto: CreateWorkflowDto = {
        name,
        description,
        isEnabled,
        trigger,
        steps
      };

      if (workflowId) {
        await workflowClient.update(workflowId, workspaceId, dto);
      } else {
        await workflowClient.create(workspaceId, dto);
      }
      router.push('/dashboard/workflows');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  }

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type: 'action', // Default type
      config: { action: 'notify_slack' },
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  if (loading) return <div>Loading Builder...</div>;

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6 dark:border-gray-800">
        <div className="space-y-1">
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Workflow Name" 
            className="text-2xl font-bold border-none px-0 h-auto focus-visible:ring-0"
          />
          <Input 
             value={description}
             onChange={(e) => setDescription(e.target.value)}
             placeholder="Description (optional)"
             className="text-sm text-gray-500 border-none px-0 h-auto focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard/workflows')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>

      {/* Trigger Section */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
            <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-2">
             <h3 className="font-semibold text-gray-900 dark:text-gray-100">Trigger: When Alert Created</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400">
               This workflow starts automatically when a new alert matches the criteria.
             </p>
             {/* Configuration inputs for trigger could go here */}
          </div>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Steps Visualization (Linear List for MVP) */}
      <div className="space-y-4">
        {steps.map((step, index) => (
           <div key={step.id} className="relative">
             {/* Connector Line */}
             <div className="absolute left-6 -top-4 h-4 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
             
             <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                   <div className="text-sm font-bold text-gray-500">{index + 1}</div>
                </div>
                <div className="flex-1">
                   <select 
                      value={step.type}
                      onChange={(e) => updateStep(step.id, { type: e.target.value as any })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 sm:text-sm"
                   >
                     <option value="action">Action</option>
                     <option value="condition">Condition</option>
                   </select>
                   <div className="mt-2 text-xs text-gray-400">Step details configuration...</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeStep(step.id)} className="text-red-500 hover:text-red-600">
                  <XCircle className="h-5 w-5" />
                </Button>
             </div>
           </div>
        ))}

        {/* Add Step Button */}
        <div className="relative pt-4">
            {steps.length > 0 && (
               <div className="absolute left-6 -top-4 h-8 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
            )}
            <Button 
               onClick={addStep} 
               variant="outline" 
               className="w-full border-dashed py-8 text-gray-500 hover:border-blue-500 hover:text-blue-500"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Workflow Step
            </Button>
        </div>
      </div>
    </div>
  );
}
