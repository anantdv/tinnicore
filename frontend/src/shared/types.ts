export type User = {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  current_plan_id?: number | null;
  current_plan_name?: string | null;
  is_active: boolean;
  is_admin: boolean;
  roles: string[];
};

export type DashboardSummary = {
  online_users: number;
  active_sessions: number;
  total_users: number;
  total_plans: number;
  total_voucher_batches: number;
  total_lan_networks: number;
  total_interfaces: number;
  total_firewall_rules: number;
  total_data_usage_mb: number;
  wan_status: { name: string; status: string };
  wan_interfaces: Array<{ name: string; status: string; latency_ms?: number | null; loss_percent?: number | null }>;
  system_health: { cpu: number; memory: number; disk: number; temperature?: number | null };
  system_runtime: {
    uptime_seconds: number;
    uptime_label: string;
    hostname: string;
    primary_ip: string;
    cpu_cores: number;
    memory_total_mb: number;
    disk_total_gb: number;
    kernel_version: string;
  };
  recent_alerts: Array<{ severity: string; message: string; status: string }>;
  bandwidth_usage: Array<{ name: string; down: number; up: number }>;
  bandwidth_totals: { download_mb: number; upload_mb: number };
  interfaces: Array<{ name: string; role: string; address?: string | null; status: string; kind: string }>;
  device_info: {
    product: string;
    firmware: string;
    license: string;
    timestamp: string;
    model: string;
    serial_number: string;
    os_version: string;
    cpu_model: string;
    cpu_cores: number;
    memory_total_mb: number;
    disk_total_gb: number;
    hostname: string;
    primary_ip: string;
    kernel_version: string;
    uptime_label: string;
    license_expires_at?: string | null;
  };
};
