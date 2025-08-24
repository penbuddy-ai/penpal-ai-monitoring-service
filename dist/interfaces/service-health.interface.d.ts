export interface ServiceHealth {
    name: string;
    url: string;
    status: "healthy" | "unhealthy" | "unknown";
    responseTime: number;
    lastChecked: string;
    error?: string;
    metadata?: {
        version?: string;
        uptime?: number;
        [key: string]: any;
    };
}
export interface HealthSummary {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    averageResponseTime: number;
    systemStatus: "healthy" | "degraded" | "critical";
    lastUpdate: string;
}
export interface ServiceConfig {
    name: string;
    url: string;
    healthEndpoint?: string;
    timeout?: number;
    interval?: number;
    retries?: number;
    expectedStatusCode?: number;
    headers?: Record<string, string>;
}
export interface HealthCheckResult {
    service: string;
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: string;
    timestamp: string;
}
