/**
 * Metrics Dashboard Types
 * Extracted from MetricsDashboard.tsx for reusability
 */

export interface RequestMetric {
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

export interface AggregatedMetrics {
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

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export interface ProviderLatencyBreakdown {
  provider: string;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

export interface Alert {
  id: string;
  type: 'cost' | 'error_rate' | 'latency' | 'provider_down';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
  provider?: string;
}

export interface DashboardData {
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
