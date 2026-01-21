export interface WorkflowStep {
    id: string;
    type: 'condition' | 'action' | 'trigger';
    config: Record<string, any>;
    nextStepId?: string;
    branches?: {
        true: string;
        false: string;
    };
}

export interface WorkflowTrigger {
    type: 'alert_created' | 'webhook' | 'scedule';
    config: Record<string, any>;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
    createdAt: string;
    updatedAt: string;
    lastRunAt?: string;
    runCount: number;
}

export interface CreateWorkflowDto {
    name: string;
    description?: string;
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
    isEnabled?: boolean;
}

export interface UpdateWorkflowDto extends Partial<CreateWorkflowDto> { }

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt: string;
    completedAt?: string;
    logs: string[];
}
