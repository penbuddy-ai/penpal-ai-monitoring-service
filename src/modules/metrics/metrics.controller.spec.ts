import { Test, TestingModule } from "@nestjs/testing";
import { MetricsController, MetricsApiController } from "./metrics.controller";
import { PrometheusService } from "./prometheus.service";
import { MetricsService } from "./metrics.service";

describe("MetricsController", () => {
  let controller: MetricsController;
  let apiController: MetricsApiController;
  let prometheusService: jest.Mocked<PrometheusService>;
  let metricsService: jest.Mocked<MetricsService>;

  const mockMetricsText = `# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status_code="200",service="monitoring"} 1

# HELP penpal_active_users Number of active users
# TYPE penpal_active_users gauge
penpal_active_users 150`;

  const mockMetricsSummary = {
    timestamp: "2024-01-01T00:00:00.000Z",
    health: {
      summary: {
        total: 4,
        healthy: 3,
        unhealthy: 1,
        percentage: 75,
      },
      timestamp: "2024-01-01T00:00:00.000Z",
      services: [],
    },
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
    const mockPrometheusService = {
      getMetrics: jest.fn().mockResolvedValue(mockMetricsText),
    };

    const mockMetricsService = {
      getMetricsSummary: jest.fn().mockResolvedValue(mockMetricsSummary),
      getServicesMetrics: jest.fn().mockResolvedValue(mockServicesMetrics),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController, MetricsApiController],
      providers: [
        { provide: PrometheusService, useValue: mockPrometheusService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    apiController = module.get<MetricsApiController>(MetricsApiController);
    prometheusService = module.get(PrometheusService);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("MetricsController", () => {
    it("should be defined", () => {
      expect(controller).toBeDefined();
    });

    describe("getMetrics", () => {
      it("should return Prometheus metrics as text", async () => {
        const result = await controller.getMetrics();

        expect(prometheusService.getMetrics).toHaveBeenCalled();
        expect(result).toBe(mockMetricsText);
        expect(typeof result).toBe("string");
      });

      it("should handle prometheus service errors", async () => {
        const error = new Error("Prometheus service error");
        prometheusService.getMetrics.mockRejectedValue(error);

        await expect(controller.getMetrics()).rejects.toThrow("Prometheus service error");
      });

      it("should return metrics in Prometheus format", async () => {
        const result = await controller.getMetrics();

        expect(result).toContain("# HELP");
        expect(result).toContain("# TYPE");
        expect(result).toContain("http_requests_total");
      });

      it("should call prometheus service exactly once", async () => {
        await controller.getMetrics();

        expect(prometheusService.getMetrics).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("MetricsApiController", () => {
    it("should be defined", () => {
      expect(apiController).toBeDefined();
    });

    describe("getMetricsSummary", () => {
      it("should return metrics summary in JSON format", async () => {
        const result = await apiController.getMetricsSummary();

        expect(metricsService.getMetricsSummary).toHaveBeenCalled();
        expect(result).toEqual(mockMetricsSummary);
      });

      it("should return summary with correct structure", async () => {
        const result = await apiController.getMetricsSummary();

        expect(result).toHaveProperty("timestamp");
        expect(result).toHaveProperty("health");
        expect(result).toHaveProperty("collection");
        expect(result).toHaveProperty("endpoints");
        expect(result.health).toHaveProperty("summary");
        expect(result.collection).toHaveProperty("status", "active");
      });

      it("should handle metrics service errors", async () => {
        const error = new Error("Metrics service error");
        metricsService.getMetricsSummary.mockRejectedValue(error);

        await expect(apiController.getMetricsSummary()).rejects.toThrow("Metrics service error");
      });

      it("should call metrics service exactly once", async () => {
        await apiController.getMetricsSummary();

        expect(metricsService.getMetricsSummary).toHaveBeenCalledTimes(1);
      });

      it("should return valid timestamp", async () => {
        const result = await apiController.getMetricsSummary();

        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it("should include health percentage calculation", async () => {
        const result = await apiController.getMetricsSummary();

        expect(result.health.summary.percentage).toBe(75);
        expect(result.health.summary.total).toBe(4);
        expect(result.health.summary.healthy).toBe(3);
        expect(result.health.summary.unhealthy).toBe(1);
      });
    });

    describe("getServicesMetrics", () => {
      it("should return services metrics", async () => {
        const result = await apiController.getServicesMetrics();

        expect(metricsService.getServicesMetrics).toHaveBeenCalled();
        expect(result).toEqual(mockServicesMetrics);
      });

      it("should return services with correct structure", async () => {
        const result = await apiController.getServicesMetrics();

        expect(result).toHaveProperty("timestamp");
        expect(result).toHaveProperty("services");
        expect(Array.isArray(result.services)).toBe(true);
        expect(result.services).toHaveLength(2);
      });

      it("should include service details", async () => {
        const result = await apiController.getServicesMetrics();

        const service = result.services[0];
        expect(service).toHaveProperty("name");
        expect(service).toHaveProperty("status");
        expect(service).toHaveProperty("responseTime");
        expect(service).toHaveProperty("lastChecked");
        expect(service).toHaveProperty("metricsAvailable");
      });

      it("should handle different service states", async () => {
        const result = await apiController.getServicesMetrics();

        const healthyService = result.services.find(s => s.status === "healthy");
        const unhealthyService = result.services.find(s => s.status === "unhealthy");

        expect(healthyService?.metricsAvailable).toBe(true);
        expect(unhealthyService?.metricsAvailable).toBe(false);
      });

      it("should handle services metrics errors", async () => {
        const error = new Error("Services metrics error");
        metricsService.getServicesMetrics.mockRejectedValue(error);

        await expect(apiController.getServicesMetrics()).rejects.toThrow("Services metrics error");
      });

      it("should call metrics service exactly once", async () => {
        await apiController.getServicesMetrics();

        expect(metricsService.getServicesMetrics).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete metrics flow", async () => {
      // Test the complete flow of getting both Prometheus and JSON metrics
      
      const prometheusMetrics = await controller.getMetrics();
      const metricsSummary = await apiController.getMetricsSummary();
      const servicesMetrics = await apiController.getServicesMetrics();

      expect(prometheusMetrics).toBeDefined();
      expect(metricsSummary).toBeDefined();
      expect(servicesMetrics).toBeDefined();

      expect(typeof prometheusMetrics).toBe("string");
      expect(typeof metricsSummary).toBe("object");
      expect(typeof servicesMetrics).toBe("object");
    });

    it("should handle concurrent requests", async () => {
      // Test concurrent requests to different endpoints
      const promises = [
        controller.getMetrics(),
        apiController.getMetricsSummary(),
        apiController.getServicesMetrics(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe(mockMetricsText);
      expect(results[1]).toEqual(mockMetricsSummary);
      expect(results[2]).toEqual(mockServicesMetrics);
    });
  });
});
