import { Test, TestingModule } from "@nestjs/testing";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringService } from "./monitoring.service";

describe("MonitoringController", () => {
  let controller: MonitoringController;
  let monitoringService: jest.Mocked<MonitoringService>;

  const mockSystemOverview = {
    timestamp: "2024-01-01T00:00:00.000Z",
    status: "degraded",
    services: {
      total: 4,
      healthy: 3,
      unhealthy: 1,
      percentage: 75,
    },
    metrics: {
      collectionActive: true,
      lastUpdate: "2024-01-01T00:00:00.000Z",
    },
    alerts: 2,
  };

  const mockAlerts = {
    timestamp: "2024-01-01T00:00:00.000Z",
    total: 2,
    critical: 1,
    warnings: 1,
    alerts: [
      {
        id: "alert-1",
        severity: "critical",
        service: "db-service",
        message: "Service is down",
        timestamp: "2024-01-01T00:00:00.000Z",
        status: "active",
      },
      {
        id: "alert-2",
        severity: "warning",
        service: "auth-service",
        message: "Slow response time",
        timestamp: "2024-01-01T00:00:00.000Z",
        status: "active",
      },
    ],
  };

  const mockPerformanceMetrics = {
    timestamp: "2024-01-01T00:00:00.000Z",
    timeRange: "1h",
    metrics: {
      averageResponseTime: 2560,
      healthPercentage: 75,
      uptime: 3600,
      memoryUsage: {
        rss: 123456,
        heapTotal: 234567,
        heapUsed: 345678,
        external: 456789,
        arrayBuffers: 567890,
      },
    },
    services: [
      {
        name: "auth-service",
        responseTime: 120,
        status: "healthy" as const,
      },
      {
        name: "db-service",
        responseTime: 5000,
        status: "unhealthy" as const,
      },
    ],
  };

  const mockUsageStatistics = {
    timestamp: "2024-01-01T00:00:00.000Z",
    period: "24h",
    statistics: {
      totalServices: 4,
      healthChecks: 288, // 4 services * 24 hours * 3 checks per hour
      averageUptime: 75,
      alertsGenerated: 5,
    },
    breakdown: {
      services: [
        {
          name: "auth-service",
          status: "healthy" as const,
          lastChecked: "2024-01-01T00:00:00.000Z",
        },
        {
          name: "db-service",
          status: "unhealthy" as const,
          lastChecked: "2024-01-01T00:00:00.000Z",
        },
      ],
    },
  };

  beforeEach(async () => {
    const mockMonitoringService = {
      getSystemOverview: jest.fn().mockResolvedValue(mockSystemOverview),
      getAlerts: jest.fn().mockResolvedValue(mockAlerts),
      getPerformanceMetrics: jest.fn().mockResolvedValue(mockPerformanceMetrics),
      getUsageStatistics: jest.fn().mockResolvedValue(mockUsageStatistics),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: MonitoringService, useValue: mockMonitoringService },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    monitoringService = module.get(MonitoringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getSystemOverview", () => {
    it("should return system overview", async () => {
      const result = await controller.getSystemOverview();

      expect(monitoringService.getSystemOverview).toHaveBeenCalled();
      expect(result).toEqual(mockSystemOverview);
    });

    it("should return overview with correct structure", async () => {
      const result = await controller.getSystemOverview();

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("services");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("alerts");
    });

    it("should return valid status values", async () => {
      const result = await controller.getSystemOverview();

      expect(["healthy", "degraded", "critical"]).toContain(result.status);
    });

    it("should include services statistics", async () => {
      const result = await controller.getSystemOverview();

      expect(result.services).toHaveProperty("total");
      expect(result.services).toHaveProperty("healthy");
      expect(result.services).toHaveProperty("unhealthy");
      expect(result.services).toHaveProperty("percentage");
      expect(result.services.total).toBe(result.services.healthy + result.services.unhealthy);
    });

    it("should include metrics information", async () => {
      const result = await controller.getSystemOverview();

      expect(result.metrics).toHaveProperty("collectionActive");
      expect(result.metrics).toHaveProperty("lastUpdate");
      expect(typeof result.metrics.collectionActive).toBe("boolean");
    });

    it("should handle monitoring service errors", async () => {
      const error = new Error("Monitoring service error");
      monitoringService.getSystemOverview.mockRejectedValue(error);

      await expect(controller.getSystemOverview()).rejects.toThrow("Monitoring service error");
    });

    it("should call monitoring service exactly once", async () => {
      await controller.getSystemOverview();

      expect(monitoringService.getSystemOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAlerts", () => {
    it("should return alerts information", async () => {
      const result = await controller.getAlerts();

      expect(monitoringService.getAlerts).toHaveBeenCalled();
      expect(result).toEqual(mockAlerts);
    });

    it("should return alerts with correct structure", async () => {
      const result = await controller.getAlerts();

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("critical");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("alerts");
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it("should have consistent alert counts", async () => {
      const result = await controller.getAlerts();

      expect(result.total).toBe(result.critical + result.warnings);
      expect(result.alerts).toHaveLength(result.total);
    });

    it("should include alert details", async () => {
      const result = await controller.getAlerts();

      if (result.alerts.length > 0) {
        const alert = result.alerts[0];
        expect(alert).toHaveProperty("id");
        expect(alert).toHaveProperty("severity");
        expect(alert).toHaveProperty("service");
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("timestamp");
        expect(alert).toHaveProperty("status");
      }
    });

    it("should handle different alert severities", async () => {
      const result = await controller.getAlerts();

      const criticalAlerts = result.alerts.filter(a => a.severity === "critical");
      const warningAlerts = result.alerts.filter(a => a.severity === "warning");

      expect(criticalAlerts.length).toBe(result.critical);
      expect(warningAlerts.length).toBe(result.warnings);
    });

    it("should handle monitoring service errors in alerts", async () => {
      const error = new Error("Alerts service error");
      monitoringService.getAlerts.mockRejectedValue(error);

      await expect(controller.getAlerts()).rejects.toThrow("Alerts service error");
    });

    it("should call monitoring service exactly once", async () => {
      await controller.getAlerts();

      expect(monitoringService.getAlerts).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should return performance metrics with default time range", async () => {
      const result = await controller.getPerformanceMetrics();

      expect(monitoringService.getPerformanceMetrics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockPerformanceMetrics);
    });

    it("should return performance metrics with custom time range", async () => {
      const customMetrics = { ...mockPerformanceMetrics, timeRange: "24h" };
      monitoringService.getPerformanceMetrics.mockResolvedValue(customMetrics);

      const result = await controller.getPerformanceMetrics("24h");

      expect(monitoringService.getPerformanceMetrics).toHaveBeenCalledWith("24h");
      expect(result.timeRange).toBe("24h");
    });

    it("should return metrics with correct structure", async () => {
      const result = await controller.getPerformanceMetrics();

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("timeRange");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("services");
    });

    it("should include performance metrics data", async () => {
      const result = await controller.getPerformanceMetrics();

      expect(result.metrics).toHaveProperty("averageResponseTime");
      expect(result.metrics).toHaveProperty("healthPercentage");
      expect(result.metrics).toHaveProperty("uptime");
      expect(result.metrics).toHaveProperty("memoryUsage");
    });

    it("should include services performance data", async () => {
      const result = await controller.getPerformanceMetrics();

      expect(Array.isArray(result.services)).toBe(true);
      expect(result.services.length).toBeGreaterThan(0);
      
      const service = result.services[0];
      expect(service).toHaveProperty("name");
      expect(service).toHaveProperty("responseTime");
      expect(service).toHaveProperty("status");
    });

    it("should handle various time range formats", async () => {
      const timeRanges = ["1h", "24h", "7d", "30d"];

      for (const timeRange of timeRanges) {
        await controller.getPerformanceMetrics(timeRange);
        expect(monitoringService.getPerformanceMetrics).toHaveBeenCalledWith(timeRange);
      }
    });

    it("should handle monitoring service errors in performance metrics", async () => {
      const error = new Error("Performance metrics error");
      monitoringService.getPerformanceMetrics.mockRejectedValue(error);

      await expect(controller.getPerformanceMetrics()).rejects.toThrow("Performance metrics error");
    });
  });

  describe("getUsageStatistics", () => {
    it("should return usage statistics", async () => {
      const result = await controller.getUsageStatistics();

      expect(monitoringService.getUsageStatistics).toHaveBeenCalled();
      expect(result).toEqual(mockUsageStatistics);
    });

    it("should return statistics with correct structure", async () => {
      const result = await controller.getUsageStatistics();

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("statistics");
      expect(result).toHaveProperty("breakdown");
    });

    it("should include usage statistics data", async () => {
      const result = await controller.getUsageStatistics();

      expect(result.statistics).toHaveProperty("totalServices");
      expect(result.statistics).toHaveProperty("healthChecks");
      expect(result.statistics).toHaveProperty("averageUptime");
      expect(result.statistics).toHaveProperty("alertsGenerated");
    });

    it("should include service breakdown", async () => {
      const result = await controller.getUsageStatistics();

      expect(result.breakdown).toHaveProperty("services");
      expect(Array.isArray(result.breakdown.services)).toBe(true);
      
      if (result.breakdown.services.length > 0) {
        const service = result.breakdown.services[0];
        expect(service).toHaveProperty("name");
        expect(service).toHaveProperty("status");
        expect(service).toHaveProperty("lastChecked");
      }
    });

    it("should have reasonable statistics values", async () => {
      const result = await controller.getUsageStatistics();

      expect(result.statistics.totalServices).toBeGreaterThan(0);
      expect(result.statistics.healthChecks).toBeGreaterThan(0);
      expect(result.statistics.averageUptime).toBeGreaterThanOrEqual(0);
      expect(result.statistics.averageUptime).toBeLessThanOrEqual(100);
      expect(result.statistics.alertsGenerated).toBeGreaterThanOrEqual(0);
    });

    it("should handle monitoring service errors in usage statistics", async () => {
      const error = new Error("Usage statistics error");
      monitoringService.getUsageStatistics.mockRejectedValue(error);

      await expect(controller.getUsageStatistics()).rejects.toThrow("Usage statistics error");
    });

    it("should call monitoring service exactly once", async () => {
      await controller.getUsageStatistics();

      expect(monitoringService.getUsageStatistics).toHaveBeenCalledTimes(1);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete monitoring flow", async () => {
      const [overview, alerts, performance, usage] = await Promise.all([
        controller.getSystemOverview(),
        controller.getAlerts(),
        controller.getPerformanceMetrics(),
        controller.getUsageStatistics(),
      ]);

      expect(overview).toBeDefined();
      expect(alerts).toBeDefined();
      expect(performance).toBeDefined();
      expect(usage).toBeDefined();

      // Verify all endpoints called their respective services
      expect(monitoringService.getSystemOverview).toHaveBeenCalled();
      expect(monitoringService.getAlerts).toHaveBeenCalled();
      expect(monitoringService.getPerformanceMetrics).toHaveBeenCalled();
      expect(monitoringService.getUsageStatistics).toHaveBeenCalled();
    });

    it("should handle concurrent requests efficiently", async () => {
      const startTime = Date.now();

      await Promise.all([
        controller.getSystemOverview(),
        controller.getAlerts(),
        controller.getPerformanceMetrics("1h"),
        controller.getUsageStatistics(),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Concurrent requests should be faster than sequential
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it("should maintain data consistency across endpoints", async () => {
      const overview = await controller.getSystemOverview();
      const performance = await controller.getPerformanceMetrics();
      const usage = await controller.getUsageStatistics();

      // Health percentage should be consistent
      expect(overview.services.percentage).toBe(performance.metrics.healthPercentage);
      
      // Total services should be consistent
      expect(overview.services.total).toBe(usage.statistics.totalServices);
    });
  });

  describe("error handling", () => {
    it("should handle service unavailability gracefully", async () => {
      const error = new Error("Service temporarily unavailable");
      monitoringService.getSystemOverview.mockRejectedValue(error);
      monitoringService.getAlerts.mockRejectedValue(error);
      monitoringService.getPerformanceMetrics.mockRejectedValue(error);
      monitoringService.getUsageStatistics.mockRejectedValue(error);

      await expect(controller.getSystemOverview()).rejects.toThrow("Service temporarily unavailable");
      await expect(controller.getAlerts()).rejects.toThrow("Service temporarily unavailable");
      await expect(controller.getPerformanceMetrics()).rejects.toThrow("Service temporarily unavailable");
      await expect(controller.getUsageStatistics()).rejects.toThrow("Service temporarily unavailable");
    });

    it("should handle partial service failures", async () => {
      // Only one endpoint fails
      monitoringService.getAlerts.mockRejectedValue(new Error("Alerts service down"));

      // Other endpoints should still work
      const overview = await controller.getSystemOverview();
      const performance = await controller.getPerformanceMetrics();
      const usage = await controller.getUsageStatistics();

      expect(overview).toBeDefined();
      expect(performance).toBeDefined();
      expect(usage).toBeDefined();

      // But alerts should fail
      await expect(controller.getAlerts()).rejects.toThrow("Alerts service down");
    });
  });
});
