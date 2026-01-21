import { DashboardBuilder } from '@/components/dashboard/dashboard-builder';

export default function EditDashboardPage({ params }: { params: { id: string } }) {
  return <DashboardBuilder dashboardId={params.id} />;
}
