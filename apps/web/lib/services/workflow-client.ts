import { apiFetch } from '../api';
import {
    Workflow,
    CreateWorkflowDto,
    UpdateWorkflowDto,
    WorkflowExecution
} from '../../types/workflow';

class WorkflowClient {
    private getHeaders(workspaceId: string) {
        return {
            'x-workspace-id': workspaceId,
        };
    }

    async list(workspaceId: string): Promise<Workflow[]> {
        return apiFetch<Workflow[]>('/api/workflows', {
            headers: this.getHeaders(workspaceId),
        });
    }

    async get(id: string, workspaceId: string): Promise<Workflow> {
        return apiFetch<Workflow>(`/api/workflows/${id}`, {
            headers: this.getHeaders(workspaceId),
        });
    }

    async create(workspaceId: string, data: CreateWorkflowDto): Promise<Workflow> {
        return apiFetch<Workflow>('/api/workflows', {
            method: 'POST',
            headers: this.getHeaders(workspaceId),
            body: JSON.stringify(data),
        });
    }

    async update(id: string, workspaceId: string, data: UpdateWorkflowDto): Promise<Workflow> {
        return apiFetch<Workflow>(`/api/workflows/${id}`, {
            method: 'PATCH',
            headers: this.getHeaders(workspaceId),
            body: JSON.stringify(data),
        });
    }

    async delete(id: string, workspaceId: string): Promise<void> {
        return apiFetch<void>(`/api/workflows/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(workspaceId),
        });
    }

    async toggle(id: string, workspaceId: string, isEnabled: boolean): Promise<Workflow> {
        return this.update(id, workspaceId, { isEnabled });
    }

    async getExecutions(id: string, workspaceId: string): Promise<WorkflowExecution[]> {
        return apiFetch<WorkflowExecution[]>(`/api/workflows/${id}/executions`, {
            headers: this.getHeaders(workspaceId),
        });
    }
}

export const workflowClient = new WorkflowClient();
