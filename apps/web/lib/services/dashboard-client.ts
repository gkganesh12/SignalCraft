import { apiFetch } from '../api';
import {
    CustomDashboard,
    CreateDashboardDto,
    UpdateDashboardDto,
    DashboardTemplate,
    Widget
} from '../../types/dashboard';

class DashboardClient {
    private getHeaders(workspaceId: string) {
        return {
            'x-workspace-id': workspaceId,
        };
    }

    async list(workspaceId: string): Promise<CustomDashboard[]> {
        return apiFetch<CustomDashboard[]>('/api/dashboards', {
            headers: this.getHeaders(workspaceId),
        });
    }

    async get(id: string, workspaceId: string): Promise<CustomDashboard> {
        return apiFetch<CustomDashboard>(`/api/dashboards/${id}`, {
            headers: this.getHeaders(workspaceId),
        });
    }

    async create(workspaceId: string, data: CreateDashboardDto): Promise<CustomDashboard> {
        return apiFetch<CustomDashboard>('/api/dashboards', {
            method: 'POST',
            headers: this.getHeaders(workspaceId),
            body: JSON.stringify(data),
        });
    }

    async update(id: string, workspaceId: string, data: UpdateDashboardDto): Promise<CustomDashboard> {
        return apiFetch<CustomDashboard>(`/api/dashboards/${id}`, {
            method: 'PATCH',
            headers: this.getHeaders(workspaceId),
            body: JSON.stringify(data),
        });
    }

    async delete(id: string, workspaceId: string): Promise<void> {
        return apiFetch<void>(`/api/dashboards/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(workspaceId),
        });
    }

    async getTemplates(): Promise<DashboardTemplate[]> {
        return apiFetch<DashboardTemplate[]>('/api/dashboards/templates');
    }

    async getWidgetData(dashboardId: string, workspaceId: string): Promise<{
        dashboard: CustomDashboard;
        widgetData: { id: string; data: any }[];
    }> {
        return apiFetch<{
            dashboard: CustomDashboard;
            widgetData: { id: string; data: any }[];
        }>(`/api/dashboards/${dashboardId}/data`, {
            headers: this.getHeaders(workspaceId),
        });
    }
}

export const dashboardClient = new DashboardClient();
