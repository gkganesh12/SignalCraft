export interface CorrelationRule {
    id: string;
    name: string;
    description?: string;
    conditions: Record<string, any>; // JSON logic or specific schema
    windowMinutes: number;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CorrelationGroup {
    id: string;
    ruleId?: string;
    primaryAlertId: string;
    relatedAlertIds: string[];
    status: 'active' | 'resolved';
    createdAt: string;
    updatedAt: string;
    confidenceScore: number;
    rootCauseAnalysis?: string;
}

export interface CreateRuleDto {
    name: string;
    description?: string;
    conditions: Record<string, any>;
    windowMinutes: number;
    isEnabled?: boolean;
}
