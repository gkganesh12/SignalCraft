'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboardClient } from '@/lib/services/dashboard-client';
import { CustomDashboard, CreateDashboardDto, Widget } from '@/types/dashboard';
import { AlertCountWidget } from './widgets/alert-count-widget';
import { AlertsBySeverityWidget } from './widgets/alerts-by-severity-widget';
import { RecentAlertsWidget } from './widgets/recent-alerts-widget';
import { 
  Plus, 
  Save, 
  BarChart3, 
  List, 
  Trash2,
  Activity
} from 'lucide-react';

interface DashboardBuilderProps {
  dashboardId?: string;
}

export function DashboardBuilder({ dashboardId }: DashboardBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!dashboardId);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isEditing, setIsEditing] = useState(!dashboardId);

  // Mock data for preview in builder
  const mockData = {
    alert_count: { count: 42 },
    alerts_by_severity: [
      { severity: 'CRITICAL', count: 5 },
      { severity: 'HIGH', count: 12 },
      { severity: 'MEDIUM', count: 15 },
      { severity: 'LOW', count: 10 },
    ],
    recent_alerts: [
      { id: '1', title: 'High CPU Usage', severity: 'CRITICAL', status: 'OPEN', lastSeenAt: new Date().toISOString() },
      { id: '2', title: 'Memory Leak Detected', severity: 'HIGH', status: 'OPEN', lastSeenAt: new Date().toISOString() },
      { id: '3', title: 'Disk Space Warning', severity: 'MEDIUM', status: 'RESOLVED', lastSeenAt: new Date().toISOString() },
    ],
    alert_timeline: [], // Not implemented yet
  };

  useEffect(() => {
    if (dashboardId) {
      loadDashboard(dashboardId);
    }
  }, [dashboardId]);

  async function loadDashboard(id: string) {
    try {
      const workspaceId = 'default-workspace';
      const dashboard = await dashboardClient.get(id, workspaceId);
      setName(dashboard.name);
      setDescription(dashboard.description || '');
      setWidgets(dashboard.widgets);
      setIsEditing(false); // Start in view mode for existing
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Please enter a dashboard name');
      return;
    }

    setSaving(true);
    try {
      const workspaceId = 'default-workspace';
      const dto: CreateDashboardDto = {
        name,
        description,
        widgets,
        layout: { type: 'grid', columns: 3 },
      };

      let result;
      if (dashboardId) {
        result = await dashboardClient.update(dashboardId, workspaceId, dto);
        setIsEditing(false);
      } else {
        result = await dashboardClient.create(workspaceId, dto);
        router.push(`/dashboard/analytics/custom/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      alert('Failed to save dashboard');
    } finally {
      setSaving(false);
    }
  }

  const addWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget_${Date.now()}`,
      type,
      title: getWidgetTitle(type),
      config: getDefaultConfig(type),
      w: 1,
      h: 1,
    };
    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const getWidgetTitle = (type: Widget['type']) => {
    switch (type) {
      case 'alert_count': return 'Total Alerts';
      case 'alerts_by_severity': return 'Alerts by Severity';
      case 'recent_alerts': return 'Recent Alerts';
      default: return 'New Widget';
    }
  };

  const getDefaultConfig = (type: Widget['type']) => {
    switch (type) {
      case 'recent_alerts': return { limit: 5 };
      default: return {};
    }
  };

  const renderWidgetPreview = (widget: Widget) => {
    // In builder mode, we show mock data
    const data = mockData[widget.type as keyof typeof mockData];
    
    switch (widget.type) {
      case 'alert_count':
        return <AlertCountWidget title={widget.title} data={data as any} loading={false} />;
      case 'alerts_by_severity':
        return <AlertsBySeverityWidget title={widget.title} data={data as any} loading={false} />;
      case 'recent_alerts':
        return <RecentAlertsWidget title={widget.title} data={data as any} loading={false} />;
      default:
        return <div className="p-4 text-center text-gray-500">Unknown Widget Type</div>;
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 flex-1">
          {isEditing ? (
            <div className="space-y-4 max-w-xl">
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Dashboard Name"
                className="text-lg font-bold"
              />
              <Input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Description (optional)"
              />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{name}</h1>
              <p className="text-gray-500">{description}</p>
            </>
          )}
        </div>
        <div className="flex gap-2">
           {isEditing ? (
              <>
                {dashboardId && (
                  <Button variant="ghost" onClick={() => {
                    setIsEditing(false);
                    // Revert changes logic would go here, maybe reload
                    loadDashboard(dashboardId);
                  }}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Dashboard'}
                </Button>
              </>
           ) : (
             <Button onClick={() => setIsEditing(true)} variant="outline">
               Edit Dashboard
             </Button>
           )}
        </div>
      </div>

      {isEditing && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">Add Component</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => addWidget('alert_count')}>
              <Activity className="mr-2 h-4 w-4" /> Metric
            </Button>
            <Button variant="outline" size="sm" onClick={() => addWidget('alerts_by_severity')}>
              <BarChart3 className="mr-2 h-4 w-4" /> Chart
            </Button>
            <Button variant="outline" size="sm" onClick={() => addWidget('recent_alerts')}>
              <List className="mr-2 h-4 w-4" /> List
            </Button>
          </div>
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
           <p className="text-gray-500">No widgets added. Click above to add some.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => (
            <div key={widget.id} className="relative group">
              {isEditing && (
                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon" 
                    variant="destructive"
                    className="h-8 w-8 rounded-full shadow-sm" 
                    onClick={() => removeWidget(widget.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="h-64">
                 {renderWidgetPreview(widget)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
