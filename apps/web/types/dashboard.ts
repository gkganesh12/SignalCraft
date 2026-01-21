export interface WidgetConfig {
    status?: string;
    limit?: number;
    hoursBack?: number;
    [key: string]: any;
}

export interface Widget {
    id: string;
    type: 'alert_count' | 'alerts_by_severity' | 'recent_alerts' | 'alert_timeline';
    title: string;
    config: WidgetConfig;
    w: number;
    h: number;
    x?: number;
    y?: number;
}

export interface GridLayout {
    type: 'grid';
    columns: number;
}

export interface CustomDashboard {
    id: string;
    workspaceId: string;
    name: string;
    description?: string;
    layout: GridLayout;
    widgets: Widget[];
    isDefault: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    creator?: {
        id: string;
        email: string;
        displayName: string;
    };
}

export interface CreateDashboardDto {
    name: string;
    description?: string;
    layout: GridLayout;
    widgets: Widget[];
    isDefault?: boolean;
}

export interface UpdateDashboardDto extends Partial<CreateDashboardDto> { }

export interface DashboardTemplate {
    name: string;
    description: string;
    layout: GridLayout;
    widgets: Omit<Widget, 'id'>[];
}
