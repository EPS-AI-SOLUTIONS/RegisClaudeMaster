/**
 * Metrics Dashboard Component
 * Displays real-time metrics, alerts, and provider statistics
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Clock,
  TrendingUp,
  Server,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';

// Types matching the API response
interface RequestMetric {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  tokens: number;
  cost: number;
  latency: number;
  success: boolean;
  errorType?: string;
}

interface AggregatedMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  errorsByType: Record<string, number>;
  requestsByProvider: Record<string, number>;
  costByProvider: Record<string, number>;
  requestsPerMinute: number[];
}

interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

interface ProviderLatencyBreakdown {
  provider: string;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

interface TimeSeriesPoint {
  timestamp: number;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

interface Alert {
  id: string;
  type: 'cost' | 'error_rate' | 'latency' | 'provider_down';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
  provider?: string;
}

interface DashboardData {
  aggregated: AggregatedMetrics;
  latencyPercentiles: LatencyPercentiles;
  providerLatency: ProviderLatencyBreakdown[];
  timeSeries: TimeSeriesPoint[];
  recentErrors: RequestMetric[];
  rollingErrorRate: number;
  alerts: Alert[];
  metricsCount: number;
  timestamp: string;
}

// API base URL
const API_BASE = '/api';

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

/**
 * Format latency
 */
function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Alert Badge Component
 */
function AlertBadge({ alert }: { alert: Alert }) {
  const isCritical = alert.severity === 'critical';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-start gap-3 p-4 rounded-xl border ${
        isCritical
          ? 'bg-red-500/10 border-red-500/30 text-red-200'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
      }`}
    >
      {isCritical ? (
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium">{alert.message}</p>
        <p className="text-xs opacity-70 mt-1">
          {formatRelativeTime(alert.timestamp)} | Value: {alert.value.toFixed(2)} | Threshold: {alert.threshold}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  colorClass = 'text-emerald-300',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}) {
  return (
    <div className="bg-emerald-950/60 border border-emerald-400/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="text-emerald-300/70 text-sm">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-emerald-100">{value}</span>
        {trend && (
          <span
            className={`text-xs ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-emerald-300/50'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3 inline" />
            ) : trend === 'down' ? (
              <ChevronDown className="w-3 h-3 inline" />
            ) : (
              '-'
            )}
          </span>
        )}
      </div>
      {subValue && <p className="text-xs text-emerald-300/50 mt-1">{subValue}</p>}
    </div>
  );
}

/**
 * Provider Card Component
 */
function ProviderCard({
  provider,
  requests,
  cost,
  latency,
}: {
  provider: string;
  requests: number;
  cost: number;
  latency?: ProviderLatencyBreakdown;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-emerald-900/40 border border-emerald-400/20 rounded-xl p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-300" />
          <span className="font-medium text-emerald-100 capitalize">{provider}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-emerald-300/70" />
        ) : (
          <ChevronDown className="w-4 h-4 text-emerald-300/70" />
        )}
      </button>

      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <div>
          <p className="text-emerald-300/50">Requests</p>
          <p className="text-emerald-100 font-medium">{formatNumber(requests)}</p>
        </div>
        <div>
          <p className="text-emerald-300/50">Cost</p>
          <p className="text-emerald-100 font-medium">{formatCurrency(cost)}</p>
        </div>
      </div>

      <AnimatePresence>
        {expanded && latency && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-400/10 text-sm">
              <div>
                <p className="text-emerald-300/50">P50</p>
                <p className="text-emerald-100">{formatLatency(latency.p50)}</p>
              </div>
              <div>
                <p className="text-emerald-300/50">P95</p>
                <p className="text-emerald-100">{formatLatency(latency.p95)}</p>
              </div>
              <div>
                <p className="text-emerald-300/50">P99</p>
                <p className="text-emerald-100">{formatLatency(latency.p99)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Error Row Component
 */
function ErrorRow({ error }: { error: RequestMetric }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-red-500/5 rounded-lg border border-red-500/20">
      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-emerald-100 truncate">
          {error.provider} / {error.model}
        </p>
        <p className="text-xs text-emerald-300/50">
          {error.errorType ?? 'Unknown error'} | {formatRelativeTime(error.timestamp)}
        </p>
      </div>
      <span className="text-xs text-emerald-300/50">{formatLatency(error.latency)}</span>
    </div>
  );
}

/**
 * Simple Sparkline Component
 */
function Sparkline({ data, height = 40 }: { data: number[]; height?: number }) {
  const max = Math.max(...data, 1);
  const width = 200;
  const barWidth = width / data.length - 1;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((value, index) => {
        const barHeight = (value / max) * height;
        return (
          <rect
            key={index}
            x={index * (barWidth + 1)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            className="fill-emerald-400/60"
            rx={1}
          />
        );
      })}
    </svg>
  );
}

/**
 * Main Dashboard Component
 */
export function MetricsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/metrics-dashboard`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json() as DashboardData;
      setData(result);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`${API_BASE}/metrics-dashboard?action=export&format=${format}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-emerald-300 animate-spin" />
        <span className="ml-2 text-emerald-300">Loading metrics...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-200">{error}</p>
        <button
          type="button"
          onClick={() => void fetchDashboardData()}
          className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-200 rounded-lg hover:bg-emerald-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return <></>;

  const { aggregated, latencyPercentiles, providerLatency, recentErrors, alerts } = data;

  // Build provider latency map for quick lookup
  const latencyByProvider = new Map(providerLatency.map((p) => [p.provider, p]));

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-emerald-300" />
          <h2 className="text-xl font-semibold text-emerald-100">Metrics Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-300/50">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <label className="flex items-center gap-2 text-sm text-emerald-300/70 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-emerald-400/30 bg-emerald-950/60"
            />
            Auto-refresh
          </label>
          <button
            type="button"
            onClick={() => void fetchDashboardData()}
            disabled={isLoading}
            className="p-2 rounded-lg border border-emerald-400/20 bg-emerald-950/60 hover:bg-emerald-900/70 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-300 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => void handleExport('json')}
            className="p-2 rounded-lg border border-emerald-400/20 bg-emerald-950/60 hover:bg-emerald-900/70 transition-colors"
            title="Export JSON"
          >
            <Download className="w-4 h-4 text-emerald-300" />
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-emerald-300/70 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Active Alerts ({alerts.length})
          </h3>
          <AnimatePresence>
            {alerts.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Total Requests"
          value={formatNumber(aggregated.totalRequests)}
          subValue={`${data.metricsCount} tracked`}
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCurrency(aggregated.totalCost)}
          colorClass="text-amber-300"
        />
        <StatCard
          icon={CheckCircle}
          label="Success Rate"
          value={`${aggregated.successRate.toFixed(1)}%`}
          colorClass={aggregated.successRate >= 95 ? 'text-emerald-300' : 'text-amber-300'}
        />
        <StatCard
          icon={Clock}
          label="Avg Latency"
          value={formatLatency(aggregated.avgLatency)}
          subValue={`P95: ${formatLatency(latencyPercentiles.p95)}`}
        />
      </div>

      {/* Requests per Minute Sparkline */}
      <div className="bg-emerald-950/60 border border-emerald-400/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-emerald-300/70">Requests per Minute (last 60 min)</h3>
          <span className="text-xs text-emerald-300/50">
            Total: {formatNumber(aggregated.requestsPerMinute.reduce((a, b) => a + b, 0))}
          </span>
        </div>
        <Sparkline data={aggregated.requestsPerMinute} height={50} />
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Providers */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-emerald-300/70 flex items-center gap-2">
            <Server className="w-4 h-4" />
            Providers ({Object.keys(aggregated.requestsByProvider).length})
          </h3>
          <div className="space-y-2">
            {Object.entries(aggregated.requestsByProvider)
              .sort(([, a], [, b]) => b - a)
              .map(([provider, requests]) => (
                <ProviderCard
                  key={provider}
                  provider={provider}
                  requests={requests}
                  cost={aggregated.costByProvider[provider] ?? 0}
                  latency={latencyByProvider.get(provider)}
                />
              ))}
            {Object.keys(aggregated.requestsByProvider).length === 0 && (
              <p className="text-emerald-300/50 text-sm text-center py-4">No provider data yet</p>
            )}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-emerald-300/70 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Recent Errors ({recentErrors.length})
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {recentErrors.length > 0 ? (
              recentErrors.map((error) => <ErrorRow key={error.id} error={error} />)
            ) : (
              <div className="flex items-center justify-center py-8 text-emerald-300/50">
                <CheckCircle className="w-5 h-5 mr-2" />
                No recent errors
              </div>
            )}
          </div>

          {/* Error Types Breakdown */}
          {Object.keys(aggregated.errorsByType).length > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-400/10">
              <h4 className="text-xs font-medium text-emerald-300/50 mb-2">Errors by Type</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(aggregated.errorsByType).map(([type, count]) => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-200"
                  >
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Latency Percentiles */}
      <div className="bg-emerald-950/60 border border-emerald-400/20 rounded-xl p-4">
        <h3 className="text-sm font-medium text-emerald-300/70 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Latency Percentiles
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-emerald-100">{formatLatency(latencyPercentiles.p50)}</p>
            <p className="text-xs text-emerald-300/50">P50 (Median)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-emerald-100">{formatLatency(latencyPercentiles.p95)}</p>
            <p className="text-xs text-emerald-300/50">P95</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-emerald-100">{formatLatency(latencyPercentiles.p99)}</p>
            <p className="text-xs text-emerald-300/50">P99</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-emerald-300/40 pt-4">
        Metrics data retained for 24 hours | {formatNumber(data.metricsCount)} total records
      </div>
    </section>
  );
}

export default MetricsDashboard;
