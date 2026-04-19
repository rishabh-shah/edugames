import { ReviewDashboard } from "../components/review-dashboard";
import { loadAdminDashboardData } from "../lib/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const dashboardData = await loadAdminDashboardData();

  return <ReviewDashboard {...dashboardData} />;
}
