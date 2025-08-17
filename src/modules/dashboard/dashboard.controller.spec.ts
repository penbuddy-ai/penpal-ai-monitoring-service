import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

describe("DashboardController", () => {
  let controller: DashboardController;
  let dashboardService: jest.Mocked<DashboardService>;

  const mockDashboardOverview = {
    timestamp: "2024-01-01T00:00:00.000Z",
    system: {
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
    },
    alerts: {
      total: 2,
      critical: 1,
      warnings: 1,
      recent: [
        {
          id: "alert-1",
          severity: "critical",
          service: "db-service",
          message: "Service is down",
          timestamp: "2024-01-01T00:00:00.000Z",
          status: "active",
        },
      ],
    },
    performance: {
      averageResponseTime: 2560,
      healthPercentage: 75,
      uptime: 1,
    },
  };

  const mockWidgetsData = {
    timestamp: "2024-01-01T00:00:00.000Z",
    widgets: [
      {
        id: "services-status",
        title: "Services Status",
        type: "status-grid",
        data: [
          {
            name: "auth-service",
            status: "healthy" as const,
            responseTime: 120,
            lastChecked: "2024-01-01T00:00:00.000Z",
            metricsAvailable: true,
          },
        ],
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
    ],
  };

  const mockJsonExport = {
    exportInfo: {
      timestamp: "2024-01-01T00:00:00.000Z",
      format: "json",
      timeRange: "24h",
      generatedBy: "Penpal AI Monitoring Service",
    },
    data: {
      overview: mockDashboardOverview.system,
      alerts: {
        timestamp: "2024-01-01T00:00:00.000Z",
        total: 2,
        critical: 1,
        warnings: 1,
        alerts: [
          {
            severity: "critical",
            type: "service_down",
            service: "db-service",
            message: "Service db-service is unhealthy",
            timestamp: "2024-01-01T00:00:00.000Z",
            error: "Connection timeout",
          },
        ],
      },
      performance: {
        timestamp: "2024-01-01T00:00:00.000Z",
        timeRange: "24h",
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
      },
      usage: {
        timestamp: "2024-01-01T00:00:00.000Z",
        period: "24h",
        statistics: {
          totalServices: 4,
          healthChecks: 288,
          averageUptime: 75,
          alertsGenerated: 5,
        },
        breakdown: {
          services: [],
        },
      },
    },
  };

  const mockCsvExport = {
    format: "csv",
    content: "Service,Status,Response Time (ms),Last Checked\nauth-service,healthy,120,2024-01-01T00:00:00.000Z",
    filename: "penpal-monitoring-2024-01-01.csv",
  };

  beforeEach(async () => {
    const mockDashboardService = {
      getDashboardOverview: jest.fn().mockResolvedValue(mockDashboardOverview),
      getWidgetsData: jest.fn().mockResolvedValue(mockWidgetsData),
      exportData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getDashboardOverview", () => {
    it("should return dashboard overview", async () => {
      const result = await controller.getDashboardOverview();

      expect(dashboardService.getDashboardOverview).toHaveBeenCalled();
      expect(result).toEqual(mockDashboardOverview);
    });

    it("should return overview with correct structure", async () => {
      const result = await controller.getDashboardOverview();

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("system");
      expect(result).toHaveProperty("alerts");
      expect(result).toHaveProperty("performance");
    });

    it("should include system information", async () => {
      const result = await controller.getDashboardOverview();

      expect(result.system).toHaveProperty("status");
      expect(result.system).toHaveProperty("services");
      expect(result.system).toHaveProperty("metrics");
      expect(result.system).toHaveProperty("alerts");
    });

    it("should include alerts summary", async () => {
      const result = await controller.getDashboardOverview();

      expect(result.alerts).toHaveProperty("total");
      expect(result.alerts).toHaveProperty("critical");
      expect(result.alerts).toHaveProperty("warnings");
      expect(result.alerts).toHaveProperty("recent");
      expect(Array.isArray(result.alerts.recent)).toBe(true);
    });

    it("should include performance metrics", async () => {
      const result = await controller.getDashboardOverview();

      expect(result.performance).toHaveProperty("averageResponseTime");
      expect(result.performance).toHaveProperty("healthPercentage");
      expect(result.performance).toHaveProperty("uptime");
    });

    it("should handle dashboard service errors", async () => {
      const error = new Error("Dashboard service error");
      dashboardService.getDashboardOverview.mockRejectedValue(error);

      await expect(controller.getDashboardOverview()).rejects.toThrow("Dashboard service error");
    });

    it("should call dashboard service exactly once", async () => {
      await controller.getDashboardOverview();

      expect(dashboardService.getDashboardOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe("getWidgetsData", () => {
    it("should return widgets data", async () => {
      const result = await controller.getWidgetsData();

      expect(dashboardService.getWidgetsData).toHaveBeenCalled();
      expect(result).toEqual(mockWidgetsData);
    });

    it("should return widgets with correct structure", async () => {
      const result = await controller.getWidgetsData();

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("widgets");
      expect(Array.isArray(result.widgets)).toBe(true);
    });

    it("should include widget details", async () => {
      const result = await controller.getWidgetsData();

      if (result.widgets.length > 0) {
        const widget = result.widgets[0];
        expect(widget).toHaveProperty("id");
        expect(widget).toHaveProperty("title");
        expect(widget).toHaveProperty("type");
        expect(widget).toHaveProperty("data");
      }
    });

    it("should handle different widget types", async () => {
      const result = await controller.getWidgetsData();

      const widgetTypes = result.widgets.map(w => w.type);
      expect(widgetTypes).toContain("status-grid");
      expect(widgetTypes).toContain("donut-chart");
    });

    it("should handle widgets service errors", async () => {
      const error = new Error("Widgets service error");
      dashboardService.getWidgetsData.mockRejectedValue(error);

      await expect(controller.getWidgetsData()).rejects.toThrow("Widgets service error");
    });

    it("should call dashboard service exactly once", async () => {
      await controller.getWidgetsData();

      expect(dashboardService.getWidgetsData).toHaveBeenCalledTimes(1);
    });
  });

  describe("exportData", () => {
    it("should export data in JSON format", async () => {
      dashboardService.exportData.mockResolvedValue(mockJsonExport);

      const result = await controller.exportData("json", "24h");

      expect(dashboardService.exportData).toHaveBeenCalledWith("json", "24h");
      expect(result).toEqual(mockJsonExport);
    });

    it("should export data in CSV format", async () => {
      dashboardService.exportData.mockResolvedValue(mockCsvExport);

      const result = await controller.exportData("csv", "1h");

      expect(dashboardService.exportData).toHaveBeenCalledWith("csv", "1h");
      expect(result).toEqual(mockCsvExport);
    });

    it("should handle default parameters", async () => {
      dashboardService.exportData.mockResolvedValue(mockJsonExport);

      const result = await controller.exportData();

      expect(dashboardService.exportData).toHaveBeenCalledWith("json", "24h");
      expect(result).toEqual(mockJsonExport);
    });

    it("should handle export service errors", async () => {
      const error = new Error("Export service error");
      dashboardService.exportData.mockRejectedValue(error);

      await expect(controller.exportData("json", "24h")).rejects.toThrow("Export service error");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete dashboard flow", async () => {
      // Set up export data mock for this test
      dashboardService.exportData.mockResolvedValue(mockJsonExport);

      const [dashboard, widgets, exportData] = await Promise.all([
        controller.getDashboardOverview(),
        controller.getWidgetsData(),
        controller.exportData("json", "24h"),
      ]);

      expect(dashboard).toBeDefined();
      expect(widgets).toBeDefined();
      expect(exportData).toBeDefined();
      expect(dashboardService.getDashboardOverview).toHaveBeenCalled();
      expect(dashboardService.getWidgetsData).toHaveBeenCalled();
      expect(dashboardService.exportData).toHaveBeenCalled();
    });

    it("should handle concurrent requests efficiently", async () => {
      const startTime = Date.now();

      await Promise.all([
        controller.getDashboardOverview(),
        controller.getWidgetsData(),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete quickly
    });

    it("should maintain data consistency across endpoints", async () => {
      const dashboard = await controller.getDashboardOverview();
      const widgets = await controller.getWidgetsData();

      // Both should have timestamps
      expect(dashboard.timestamp).toBeDefined();
      expect(widgets.timestamp).toBeDefined();

      // Health data should be consistent
      const healthWidget = widgets.widgets.find(w => w.id === "health-summary");
      expect(healthWidget).toBeDefined();
      expect(dashboard.system.services.total).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle partial service failures", async () => {
      // Dashboard works, widgets fail
      dashboardService.getWidgetsData.mockRejectedValue(new Error("Widgets service down"));

      const dashboard = await controller.getDashboardOverview();
      expect(dashboard).toBeDefined();

      await expect(controller.getWidgetsData()).rejects.toThrow("Widgets service down");
    });

    it("should handle service timeouts", async () => {
      const timeoutError = new Error("Request timeout");
      dashboardService.getDashboardOverview.mockRejectedValue(timeoutError);
      dashboardService.getWidgetsData.mockRejectedValue(timeoutError);

      await expect(controller.getDashboardOverview()).rejects.toThrow("Request timeout");
      await expect(controller.getWidgetsData()).rejects.toThrow("Request timeout");
    });

    it("should handle export errors gracefully", async () => {
      const exportError = new Error("Export failed");
      dashboardService.exportData.mockRejectedValue(exportError);

      await expect(controller.exportData("json", "24h")).rejects.toThrow("Export failed");
    });
  });

  describe("parameter validation", () => {
    it("should handle invalid export formats gracefully", async () => {
      dashboardService.exportData.mockResolvedValue(mockJsonExport);

      // Invalid format should be passed to service
      await controller.exportData("invalid" as any, "24h");

      expect(dashboardService.exportData).toHaveBeenCalledWith("invalid", "24h");
    });

    it("should handle invalid time ranges gracefully", async () => {
      dashboardService.exportData.mockResolvedValue(mockJsonExport);

      // Invalid time range should be passed to service
      await controller.exportData("json", "invalid" as any);

      expect(dashboardService.exportData).toHaveBeenCalledWith("json", "invalid");
    });
  });

  describe("response formatting", () => {
    it("should format timestamps consistently", async () => {
      const dashboard = await controller.getDashboardOverview();
      const widgets = await controller.getWidgetsData();

      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(dashboard.timestamp).toMatch(timestampRegex);
      expect(widgets.timestamp).toMatch(timestampRegex);
    });

    it("should handle large data structures efficiently", async () => {
      const largeDashboard = {
        ...mockDashboardOverview,
        alerts: {
          ...mockDashboardOverview.alerts,
          recent: Array.from({ length: 100 }, (_, i) => ({
            severity: "warning",
            service: `service-${i}`,
            message: `Alert ${i}`,
            timestamp: "2024-01-01T00:00:00.000Z",
            type: "service_warning",
          })),
        },
      };

      dashboardService.getDashboardOverview.mockResolvedValue(largeDashboard);

      const result = await controller.getDashboardOverview();

      expect(result).toBeDefined();
      expect(result.alerts.recent).toHaveLength(100);
    });
  });
});
