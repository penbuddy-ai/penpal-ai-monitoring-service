import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { MonitoringService } from "./monitoring.service";
import { HealthService } from "../health/health.service";
import { MetricsService } from "../metrics/metrics.service";

describe("MonitoringService", () => {
  let service: MonitoringService;
  let healthService: jest.Mocked<HealthService>;
  let metricsService: jest.Mocked<MetricsService>;

  const mockHealthSummary = {
    summary: {
      total: 4,
      healthy: 3,
      unhealthy: 1,
      percentage: 75,
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    services: [
      {
        name: "auth-service",
        url: "http://auth-service:3002/api/v1/health",
        status: "healthy" as const,
        responseTime: 120,
        lastChecked: "2024-01-01T00:00:00.000Z",
      },
      {
        name: "db-service",
        url: "http://db-service:3001/api/v1/health",
        status: "unhealthy" as const,
        responseTime: 5000,
        lastChecked: "2024-01-01T00:00:00.000Z",
        error: "Connection timeout",
      },
    ],
  };

  const mockMetricsSummary = {
    timestamp: "2024-01-01T00:00:00.000Z",
    health: mockHealthSummary,
    collection: {
      lastRun: "2024-01-01T00:00:00.000Z",
      status: "active",
      interval: "30 seconds",
    },
    endpoints: {
      prometheus: "/metrics",
      health: "/api/v1/health",
      summary: "/api/v1/metrics/summary",
    },
  };

  beforeEach(async () => {
    const mockHealthService = {
      getHealthSummary: jest.fn().mockResolvedValue(mockHealthSummary),
      checkAllServices: jest.fn().mockResolvedValue(mockHealthSummary.services),
    };

    const mockMetricsService = {
      getMetricsSummary: jest.fn().mockResolvedValue(mockMetricsSummary),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: HealthService, useValue: mockHealthService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    healthService = module.get(HealthService);
    metricsService = module.get(MetricsService);

    // Mock logger to avoid console output in tests
    Object.defineProperty(service, "logger", {
      value: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSystemOverview", () => {
    it("should return system overview", async () => {
      const overview = await service.getSystemOverview();

      expect(overview).toEqual({
        timestamp: expect.any(String),
        status: "degraded", // 75% healthy
        services: {
          total: 4,
          healthy: 3,
          unhealthy: 1,
          percentage: 75,
        },
        metrics: {
          collectionActive: true,
          lastUpdate: expect.any(String),
        },
        alerts: expect.any(Number),
      });
    });

    it("should determine system status based on health percentage", async () => {
      // Test healthy system (100%)
      const healthySummary = {
        ...mockHealthSummary,
        summary: { total: 4, healthy: 4, unhealthy: 0, percentage: 100 },
      };
      healthService.getHealthSummary.mockResolvedValue(healthySummary);

      const healthyOverview = await service.getSystemOverview();
      expect(healthyOverview.status).toBe("healthy");

      // Test degraded system (75%)
      healthService.getHealthSummary.mockResolvedValue(mockHealthSummary);
      const degradedOverview = await service.getSystemOverview();
      expect(degradedOverview.status).toBe("degraded");

      // Test degraded system (25%) - still degraded, not critical
      const lowHealthSummary = {
        ...mockHealthSummary,
        summary: { total: 4, healthy: 1, unhealthy: 3, percentage: 25 },
      };
      healthService.getHealthSummary.mockResolvedValue(lowHealthSummary);
      const lowHealthOverview = await service.getSystemOverview();
      expect(lowHealthOverview.status).toBe("degraded");
    });

    it("should call health service", async () => {
      await service.getSystemOverview();

      expect(healthService.getHealthSummary).toHaveBeenCalled();
    });

    it("should return valid timestamp", async () => {
      const overview = await service.getSystemOverview();

      expect(overview.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should handle health service errors", async () => {
      const error = new Error("Health service error");
      healthService.getHealthSummary.mockRejectedValue(error);

      await expect(service.getSystemOverview()).rejects.toThrow("Health service error");
    });
  });

  describe("getAlerts", () => {
    it("should return alerts with critical and warning categories", async () => {
      const alerts = await service.getAlerts();

      expect(alerts).toEqual({
        timestamp: expect.any(String),
        total: expect.any(Number),
        critical: expect.any(Number),
        warnings: expect.any(Number),
        alerts: expect.any(Array),
      });
    });

    it("should generate alerts for unhealthy services", async () => {
      const alerts = await service.getAlerts();

      expect(alerts.critical).toBeGreaterThan(0); // Should have critical alerts for unhealthy services
      expect(alerts.alerts.length).toBeGreaterThan(0);
    });

    it("should include alert details", async () => {
      const alerts = await service.getAlerts();

      if (alerts.alerts.length > 0) {
        const alert = alerts.alerts[0];
        expect(alert).toHaveProperty("severity");
        expect(alert).toHaveProperty("type");
        expect(alert).toHaveProperty("service");
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("timestamp");
        expect(alert).toHaveProperty("error");
      }
    });

    it("should handle different alert severities", async () => {
      const alerts = await service.getAlerts();

      expect(alerts.total).toBe(alerts.critical + alerts.warnings);
    });

    it("should generate alerts for slow response times", async () => {
      // Mock a service with slow response time
      const slowService = {
        ...mockHealthSummary,
        services: [
          {
            name: "slow-service",
            url: "http://slow-service/health",
            status: "healthy" as const,
            responseTime: 6000, // > 5 seconds
            lastChecked: "2024-01-01T00:00:00.000Z",
          },
        ],
      };
      healthService.getHealthSummary.mockResolvedValue(slowService);

      const alerts = await service.getAlerts();

      expect(alerts.warnings).toBeGreaterThan(0);
    });

    it("should handle health service errors in alerts", async () => {
      const error = new Error("Health service error");
      healthService.getHealthSummary.mockRejectedValue(error);

      await expect(service.getAlerts()).rejects.toThrow("Health service error");
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should return performance metrics for default time range", async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics).toEqual({
        timestamp: expect.any(String),
        timeRange: "1h",
        metrics: {
          averageResponseTime: expect.any(Number),
          healthPercentage: 75,
          uptime: expect.any(Number),
          memoryUsage: expect.any(Object),
        },
        services: expect.any(Array),
      });
    });

    it("should return performance metrics for custom time range", async () => {
      const metrics = await service.getPerformanceMetrics("24h");

      expect(metrics.timeRange).toBe("24h");
    });

    it("should calculate average response time correctly", async () => {
      const metrics = await service.getPerformanceMetrics();

      // Average of 120ms and 5000ms should be 2560ms
      expect(metrics.metrics.averageResponseTime).toBe(2560);
    });

    it("should include system uptime", async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics.metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.metrics.uptime).toBe("number");
    });

    it("should include memory usage", async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics.metrics.memoryUsage).toHaveProperty("rss");
      expect(metrics.metrics.memoryUsage).toHaveProperty("heapTotal");
      expect(metrics.metrics.memoryUsage).toHaveProperty("heapUsed");
      expect(metrics.metrics.memoryUsage).toHaveProperty("external");
    });

    it("should include services performance data", async () => {
      const metrics = await service.getPerformanceMetrics();

      expect(metrics.services).toHaveLength(2);
      expect(metrics.services[0]).toHaveProperty("name");
      expect(metrics.services[0]).toHaveProperty("responseTime");
      expect(metrics.services[0]).toHaveProperty("status");
    });

    it("should handle health service errors in performance metrics", async () => {
      const error = new Error("Health service error");
      healthService.getHealthSummary.mockRejectedValue(error);

      await expect(service.getPerformanceMetrics()).rejects.toThrow("Health service error");
    });
  });

  describe("getUsageStatistics", () => {
    it("should return usage statistics", async () => {
      const stats = await service.getUsageStatistics();

      expect(stats).toEqual({
        timestamp: expect.any(String),
        period: "24h",
        statistics: {
          totalServices: 4,
          healthChecks: expect.any(Number),
          averageUptime: expect.any(Number),
          alertsGenerated: expect.any(Number),
        },
        breakdown: {
          services: expect.any(Array),
        },
      });
    });

    it("should calculate correct statistics", async () => {
      const stats = await service.getUsageStatistics();

      expect(stats.statistics.totalServices).toBe(4);
      expect(stats.statistics.healthChecks).toBeGreaterThan(0);
      expect(stats.statistics.averageUptime).toBeGreaterThanOrEqual(0);
      expect(stats.statistics.averageUptime).toBeLessThanOrEqual(100);
    });

    it("should include service breakdown", async () => {
      const stats = await service.getUsageStatistics();

      expect(stats.breakdown.services).toHaveLength(2);
      expect(stats.breakdown.services[0]).toHaveProperty("name");
      expect(stats.breakdown.services[0]).toHaveProperty("status");
      expect(stats.breakdown.services[0]).toHaveProperty("lastChecked");
    });

    it("should handle health service errors in usage statistics", async () => {
      const error = new Error("Health service error");
      healthService.getHealthSummary.mockRejectedValue(error);

      await expect(service.getUsageStatistics()).rejects.toThrow("Health service error");
    });
  });

  describe("private methods (tested through public interface)", () => {
    it("should calculate active alerts count correctly", async () => {
      const alerts = await service.getAlerts();

      // Should have at least one alert for the unhealthy service
      expect(alerts.total).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should handle multiple service failures gracefully", async () => {
      const multiFailureSummary = {
        ...mockHealthSummary,
        summary: { total: 4, healthy: 0, unhealthy: 4, percentage: 0 },
        services: [
          {
            name: "auth-service",
            url: "http://auth-service:3002/api/v1/health",
            status: "unhealthy" as const,
            responseTime: 5000,
            lastChecked: "2024-01-01T00:00:00.000Z",
            error: "Connection timeout",
          },
          {
            name: "db-service",
            url: "http://db-service:3001/api/v1/health",
            status: "unhealthy" as const,
            responseTime: 5000,
            lastChecked: "2024-01-01T00:00:00.000Z",
            error: "Service unavailable",
          },
        ],
      };
      healthService.getHealthSummary.mockResolvedValue(multiFailureSummary);

      const overview = await service.getSystemOverview();
      const alerts = await service.getAlerts();

      expect(overview.status).toBe("degraded");
      expect(alerts.critical).toBeGreaterThan(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete monitoring flow", async () => {
      const [overview, alerts, performance, usage] = await Promise.all([
        service.getSystemOverview(),
        service.getAlerts(),
        service.getPerformanceMetrics(),
        service.getUsageStatistics(),
      ]);

      expect(overview).toBeDefined();
      expect(alerts).toBeDefined();
      expect(performance).toBeDefined();
      expect(usage).toBeDefined();

      // All should have timestamps
      expect(overview.timestamp).toBeDefined();
      expect(alerts.timestamp).toBeDefined();
      expect(performance.timestamp).toBeDefined();
      expect(usage.timestamp).toBeDefined();
    });

    it("should maintain consistency across different endpoints", async () => {
      const overview = await service.getSystemOverview();
      const performance = await service.getPerformanceMetrics();

      // Should have the same health percentage
      expect(overview.services.percentage).toBe(performance.metrics.healthPercentage);
      expect(overview.services.total).toBe(4);
    });
  });
});
