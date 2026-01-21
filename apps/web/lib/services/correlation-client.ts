import { apiFetch } from '../api';
import { CorrelationRule, CorrelationGroup, CreateRuleDto } from '../../types/correlation';

class CorrelationClient {
    private getHeaders(workspaceId: string) {
        return {
            'x-workspace-id': workspaceId,
        };
    }

    async listRules(workspaceId: string): Promise<CorrelationRule[]> {
        return apiFetch<CorrelationRule[]>('/api/correlations/rules', {
            headers: this.getHeaders(workspaceId),
        });
    }

    async createRule(workspaceId: string, data: CreateRuleDto): Promise<CorrelationRule> {
        return apiFetch<CorrelationRule>('/api/correlations/rules', {
            method: 'POST',
            headers: this.getHeaders(workspaceId),
            body: JSON.stringify(data),
        });
    }

    async listGroups(workspaceId: string): Promise<CorrelationGroup[]> {
        return apiFetch<CorrelationGroup[]>('/api/correlations/groups', {
            headers: this.getHeaders(workspaceId),
        });
    }

    async getGroup(id: string, workspaceId: string): Promise<CorrelationGroup> {
        return apiFetch<CorrelationGroup>(`/api/correlations/groups/${id}`, {
            headers: this.getHeaders(workspaceId),
        });
    }
}

export const correlationClient = new CorrelationClient();
