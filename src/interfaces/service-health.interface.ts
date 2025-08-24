/**
 * Service Health Interface
 * Définit la structure des données de santé d'un service
 */
export interface ServiceHealth {
  name: string;
  url: string;
  status: "healthy" | "unhealthy" | "unknown";
  responseTime: number;
  lastChecked: string; // ISO string format
  error?: string;
  metadata?: {
    version?: string;
    uptime?: number;
    [key: string]: any;
  };
}

/**
 * Health Summary Interface
 * Résumé global de la santé du système
 */
export interface HealthSummary {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  averageResponseTime: number;
  systemStatus: "healthy" | "degraded" | "critical";
  lastUpdate: string; // ISO string format
}

/**
 * Service Configuration Interface
 * Configuration d'un service à surveiller
 */
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

/**
 * Health Check Result Interface
 * Résultat d'une vérification de santé
 */
export interface HealthCheckResult {
  service: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string; // ISO string format
}
