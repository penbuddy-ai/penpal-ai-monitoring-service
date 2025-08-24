import { Test, TestingModule } from "@nestjs/testing";
import { DashboardService } from "./dashboard.service";
import { MonitoringService } from "../monitoring/monitoring.service";
import { MetricsService } from "../metrics/metrics.service";

describe("DashboardService", () => {
  let service: DashboardService;
  let monitoringService: jest.Mocked<MonitoringService>;
  let metricsService: jest.Mocked<MetricsService>;

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
      healthChecks: 288,
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

  const mockServicesMetrics = {
    timestamp: "2024-01-01T00:00:00.000Z",
    services: [
      {
        name: "auth-service",
        status: "healthy" as const,
        responseTime: 120,
        lastChecked: "2024-01-01T00:00:00.000Z",
        metricsAvailable: true,
      },
      {
        name: "db-service",
        status: "unhealthy" as const,
        responseTime: 5000,
        lastChecked: "2024-01-01T00:00:00.000Z",
        metricsAvailable: false,
      },
    ],
  };

  beforeEach(async () => {
    const mockMonitoringService = {
      getSystemOverview: jest.fn().mockResolvedValue(mockSystemOverview),
      getAlerts: jest.fn().mockResolvedValue(mockAlerts),
      getPerformanceMetrics: jest.fn().mockResolvedValue(mockPerformanceMetrics),
      getUsageStatistics: jest.fn().mockResolvedValue(mockUsageStatistics),
    };

    const mockMetricsService = {
      getServicesMetrics: jest.fn().mockResolvedValue(mockServicesMetrics),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: MonitoringService, useValue: mockMonitoringService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    monitoringService = module.get(MonitoringService);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboardOverview", () => {
    it("should return dashboard overview", async () => {
      const overview = await service.getDashboardOverview();

      expect(overview).toEqual({
        timestamp: expect.any(String),
        system: mockSystemOverview,
        alerts: {
          total: 2,
          critical: 1,
          warnings: 1,
          recent: [mockAlerts.alerts[0]], // First 5 alerts
        },
        performance: {
          averageResponseTime: 2560,
          healthPercentage: 75,
          uptime: 1, // 3600 / 3600 = 1 hour
        },
      });
    });

    it("should call all required services", async () => {
      await service.getDashboardOverview();

      expect(monitoringService.getSystemOverview).toHaveBeenCalled();
      expect(monitoringService.getAlerts).toHaveBeenCalled();
      expect(monitoringService.getPerformanceMetrics).toHaveBeenCalled();
    });

    it("should limit recent alerts to 5", async () => {
      const manyAlerts = {
        ...mockAlerts,
        total: 10,
        alerts: Array.from({ length: 10 }, (_, i) => ({
          id: `alert-${i + 1}`,
          severity: "warning",
          service: `service-${i + 1}`,
          message: `Alert ${i + 1}`,
          timestamp: "2024-01-01T00:00:00.000Z",
          status: "active",
        })),
      };
      monitoringService.getAlerts.mockResolvedValue(manyAlerts);

      const overview = await service.getDashboardOverview();

      expect(overview.alerts.recent).toHaveLength(5);
      expect(overview.alerts.total).toBe(10);
    });

    it("should convert uptime from seconds to hours", async () => {
      const metricsWithDifferentUptime = {
        ...mockPerformanceMetrics,
        metrics: {
          ...mockPerformanceMetrics.metrics,
          uptime: 7200, // 2 hours in seconds
        },
      };
      monitoringService.getPerformanceMetrics.mockResolvedValue(metricsWithDifferentUptime);

      const overview = await service.getDashboardOverview();

      expect(overview.performance.uptime).toBe(2); // 7200 / 3600 = 2
    });

    it("should handle monitoring service errors", async () => {
      const error = new Error("Monitoring service error");
      monitoringService.getSystemOverview.mockRejectedValue(error);

      await expect(service.getDashboardOverview()).rejects.toThrow("Monitoring service error");
    });

    it("should return valid timestamp", async () => {
      const overview = await service.getDashboardOverview();

      expect(overview.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("getWidgetsData", () => {
    it("should return widgets data", async () => {
      const widgets = await service.getWidgetsData();

      expect(widgets).toEqual({
        timestamp: expect.any(String),
        widgets: [
          {
            id: "services-status",
            title: "Services Status",
            type: "status-grid",
            data: mockServicesMetrics.services,
          },
          {
            id: "health-summary",
            title: "Health Summary",
            type: "donut-chart",
            data: {
              healthy: 3,
              unhealthy: 1,
              total: 4,
            },
          },
          {
            id: "response-times",
            title: "Response Times",
            type: "bar-chart",
            data: [
              { name: "auth-service", value: 120 },
              { name: "db-service", value: 5000 },
            ],
          },
          {
            id: "system-metrics",
            title: "System Metrics",
            type: "metrics-card",
            data: {
              uptime: expect.any(Number),
              memory: expect.any(Object),
              alerts: 2,
            },
          },
        ],
      });
    });

    it("should call required services", async () => {
      await service.getWidgetsData();

      expect(monitoringService.getSystemOverview).toHaveBeenCalled();
      expect(monitoringService.getUsageStatistics).toHaveBeenCalled();
      expect(metricsService.getServicesMetrics).toHaveBeenCalled();
    });

    it("should include all widget types", async () => {
      const widgets = await service.getWidgetsData();

      const widgetTypes = widgets.widgets.map(w => w.type);
      expect(widgetTypes).toContain("status-grid");
      expect(widgetTypes).toContain("donut-chart");
      expect(widgetTypes).toContain("bar-chart");
      expect(widgetTypes).toContain("metrics-card");
    });

    it("should transform response times data correctly", async () => {
      const widgets = await service.getWidgetsData();

      const responseTimesWidget = widgets.widgets.find(w => w.id === "response-times");
      expect(responseTimesWidget?.data).toEqual([
        { name: "auth-service", value: 120 },
        { name: "db-service", value: 5000 },
      ]);
    });

    it("should include system metrics widget", async () => {
      const widgets = await service.getWidgetsData();

      const systemMetricsWidget = widgets.widgets.find(w => w.id === "system-metrics");
      expect(systemMetricsWidget).toBeDefined();
      expect(systemMetricsWidget?.data).toBeDefined();
    });

    it("should handle service errors gracefully", async () => {
      const error = new Error("Metrics service error");
      metricsService.getServicesMetrics.mockRejectedValue(error);

      await expect(service.getWidgetsData()).rejects.toThrow("Metrics service error");
    });
  });

  describe("exportData", () => {
    it("should export data in JSON format by default", async () => {
      const exportData = await service.exportData("json", "24h");

      // Type guard to check if it's a JSON export
      if ('exportInfo' in exportData) {
        expect(exportData).toHaveProperty("exportInfo");
        expect(exportData).toHaveProperty("data");
        expect(exportData.exportInfo).toEqual({
          timestamp: expect.any(String),
          format: "json",
          timeRange: "24h",
          generatedBy: "Penpal AI Monitoring Service",
        });
      } else {
        fail("Expected JSON export format but got CSV format");
      }
    });

    it("should include monitoring data in export", async () => {
      const exportData = await service.exportData("json", "1h");

      // Type guard to check if it's a JSON export
      if ('exportInfo' in exportData) {
        expect(exportData).toHaveProperty("exportInfo");
        expect(exportData).toHaveProperty("data");
        expect(exportData.data).toHaveProperty("overview");
        expect(exportData.data).toHaveProperty("alerts");
        expect(exportData.data).toHaveProperty("performance");
        expect(exportData.data).toHaveProperty("usage");
      } else {
        fail("Expected JSON export format but got CSV format");
      }
    });

    it("should export data in CSV format", async () => {
      const exportData = await service.exportData("csv", "24h");

      // Type guard to check if it's a CSV export
      if ('format' in exportData && exportData.format === 'csv') {
        expect(exportData).toHaveProperty("format");
        expect(exportData).toHaveProperty("content");
        expect(exportData).toHaveProperty("filename");
        expect(exportData.format).toBe("csv");
        expect(exportData.content).toContain("Service,Status,Response Time");
        expect(exportData.filename).toMatch(/penpal-monitoring-\d{4}-\d{2}-\d{2}\.csv/);
      } else {
        fail("Expected CSV export format but got JSON format");
      }
    });

    it("should call monitoring services with correct time range", async () => {
      await service.exportData("json", "24h");

      expect(monitoringService.getSystemOverview).toHaveBeenCalled();
      expect(monitoringService.getAlerts).toHaveBeenCalled();
      expect(monitoringService.getPerformanceMetrics).toHaveBeenCalledWith("24h");
      expect(monitoringService.getUsageStatistics).toHaveBeenCalled();
    });

    it("should handle different time ranges", async () => {
      const timeRanges = ["1h", "24h", "7d", "30d"];

      for (const timeRange of timeRanges) {
        await service.exportData("json", timeRange);
        expect(monitoringService.getPerformanceMetrics).toHaveBeenCalledWith(timeRange);
      }
    });

    it("should handle monitoring service errors in export", async () => {
      const error = new Error("Export service error");
      monitoringService.getSystemOverview.mockRejectedValue(error);

      await expect(service.exportData("json", "1h")).rejects.toThrow("Export service error");
    });
  });



  describe("integration scenarios", () => {
    it("should handle complete dashboard flow", async () => {
      const [overview, widgets, exportData] = await Promise.all([
        service.getDashboardOverview(),
        service.getWidgetsData(),
        service.exportData("json", "1h"),
      ]);

      expect(overview).toBeDefined();
      expect(widgets).toBeDefined();
      expect(exportData).toBeDefined();

      // All should have timestamps
      expect(overview.timestamp).toBeDefined();
      expect(widgets.timestamp).toBeDefined();
      expect(exportData).toBeDefined();
    });

    it("should maintain data consistency across different methods", async () => {
      const overview = await service.getDashboardOverview();
      const widgets = await service.getWidgetsData();

      // System overview should match health summary widget
      const healthWidget = widgets.widgets.find(w => w.id === "health-summary");
      expect(healthWidget).toBeDefined();
      expect(overview.system.services.total).toBeDefined();
    });

    it("should handle concurrent dashboard requests", async () => {
      const startTime = Date.now();

      await Promise.all([
        service.getDashboardOverview(),
        service.getWidgetsData(),
        service.exportData("json", "1h"),
        service.exportData("csv", "24h"),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete reasonably fast
    });
  });

  describe("error handling", () => {
    it("should handle partial service failures in dashboard overview", async () => {
      monitoringService.getAlerts.mockRejectedValue(new Error("Alerts service down"));

      await expect(service.getDashboardOverview()).rejects.toThrow("Alerts service down");
    });

    it("should handle partial service failures in widgets", async () => {
      monitoringService.getUsageStatistics.mockRejectedValue(new Error("Usage service down"));

      await expect(service.getWidgetsData()).rejects.toThrow("Usage service down");
    });

    it("should handle service timeout gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      monitoringService.getSystemOverview.mockRejectedValue(timeoutError);
      monitoringService.getAlerts.mockRejectedValue(timeoutError);
      monitoringService.getPerformanceMetrics.mockRejectedValue(timeoutError);

      await expect(service.getDashboardOverview()).rejects.toThrow("Request timeout");
    });
  });

  describe("data formatting", () => {
    it("should format timestamps consistently", async () => {
      const overview = await service.getDashboardOverview();
      const widgets = await service.getWidgetsData();

      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(overview.timestamp).toMatch(timestampRegex);
      expect(widgets.timestamp).toMatch(timestampRegex);
    });

    it("should handle large numbers correctly", async () => {
      const largeMetrics = {
        ...mockPerformanceMetrics,
        metrics: {
          ...mockPerformanceMetrics.metrics,
          averageResponseTime: 999999,
          uptime: 999999999,
        },
      };
      monitoringService.getPerformanceMetrics.mockResolvedValue(largeMetrics);

      const overview = await service.getDashboardOverview();

      expect(overview.performance.averageResponseTime).toBe(999999);
      expect(overview.performance.uptime).toBe(Math.round(999999999 / 3600));
    });
  });
});
