export type User = {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_admin: boolean;
  roles: string[];
};

export type DashboardSummary = {
  online_users: number;
  active_sessions: number;
  total_data_usage_mb: number;
  wan_status: { name: string; status: string };
  system_health: { cpu: number; memory: number; disk: number };
  recent_alerts: Array<{ severity: string; message: string; status: string }>;
  bandwidth_usage: Array<{ name: string; down: number; up: number }>;
  device_info: { product: string; firmware: string; license: string; timestamp: string };
};
