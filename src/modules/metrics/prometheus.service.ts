import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from "prom-client";

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly serviceHealthStatus: Gauge<string>;
  private readonly serviceResponseTime: Gauge<string>;
  private readonly activeUsers: Gauge<string>;
  private readonly totalUsers: Gauge<string>;
  private readonly usersByLanguage: Gauge<string>;
  private readonly averageUserLevel: Gauge<string>;
  private readonly conversationsTotal: Counter<string>;
  private readonly paymentsTotal: Counter<string>;
  private readonly tokensConsumed: Counter<string>;

  constructor() {
    // Clear any existing metrics
    register.clear();

    // Collect default Node.js metrics
    collectDefaultMetrics({ register });

    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code", "service"],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "service"],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    // Service health metrics
    this.serviceHealthStatus = new Gauge({
      name: "service_health_status",
      help: "Health status of services (1 = healthy, 0 = unhealthy)",
      labelNames: ["service_name", "service_url"],
      registers: [register],
    });

    this.serviceResponseTime = new Gauge({
      name: "service_response_time_seconds",
      help: "Response time of service health checks in seconds",
      labelNames: ["service_name"],
      registers: [register],
    });

    // Business metrics
    this.activeUsers = new Gauge({
      name: "penpal_active_users_total",
      help: "Number of active users in the system",
      registers: [register],
    });

    this.totalUsers = new Gauge({
      name: "penpal_total_users",
      help: "Total number of registered users",
      registers: [register],
    });

    this.usersByLanguage = new Gauge({
      name: "penpal_users_by_language",
      help: "Number of users studying each language",
      labelNames: ["language"],
      registers: [register],
    });

    this.averageUserLevel = new Gauge({
      name: "penpal_average_user_level",
      help: "Average user level across all users",
      labelNames: ["language"],
      registers: [register],
    });

    this.conversationsTotal = new Counter({
      name: "penpal_conversations_total",
      help: "Total number of conversations created",
      labelNames: ["status"],
      registers: [register],
    });

    this.paymentsTotal = new Counter({
      name: "penpal_payments_total",
      help: "Total number of payments processed",
      labelNames: ["status", "amount_range"],
      registers: [register],
    });

    this.tokensConsumed = new Counter({
      name: "penpal_ai_tokens_consumed_total",
      help: "Total number of AI tokens consumed",
      labelNames: ["provider", "model"],
      registers: [register],
    });
  }

  onModuleInit() {
    // Initialize some default values
    this.activeUsers.set(0);
  }

  // HTTP Metrics
  incrementHttpRequests(
    method: string,
    route: string,
    statusCode: string,
    service: string
  ) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
      service,
    });
  }

  observeHttpDuration(
    method: string,
    route: string,
    service: string,
    duration: number
  ) {
    this.httpRequestDuration.observe({ method, route, service }, duration);
  }

  // Service Health Metrics
  setServiceHealth(
    serviceName: string,
    serviceUrl: string,
    isHealthy: boolean
  ) {
    this.serviceHealthStatus.set(
      { service_name: serviceName, service_url: serviceUrl },
      isHealthy ? 1 : 0
    );
  }

  setServiceResponseTime(serviceName: string, responseTime: number) {
    this.serviceResponseTime.set(
      { service_name: serviceName },
      responseTime / 1000
    ); // Convert to seconds
  }

  // Business Metrics
  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  setTotalUsers(count: number) {
    this.totalUsers.set(count);
  }

  setUsersByLanguage(language: string, count: number) {
    this.usersByLanguage.set({ language }, count);
  }

  setAverageUserLevel(language: string, averageLevel: number) {
    this.averageUserLevel.set({ language }, averageLevel);
  }

  incrementConversations(status: "created" | "completed" | "failed") {
    this.conversationsTotal.inc({ status });
  }

  incrementPayments(status: "success" | "failed" | "pending", amount?: number) {
    let amountRange = "unknown";
    if (amount !== undefined) {
      if (amount < 10) amountRange = "0-10";
      else if (amount < 50) amountRange = "10-50";
      else if (amount < 100) amountRange = "50-100";
      else amountRange = "100+";
    }
    this.paymentsTotal.inc({ status, amount_range: amountRange });
  }

  incrementTokensConsumed(provider: string, model: string, tokens: number) {
    this.tokensConsumed.inc({ provider, model }, tokens);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  getRegister() {
    return register;
  }
}
