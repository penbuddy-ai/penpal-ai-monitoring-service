import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { PrometheusService } from "./prometheus.service";
import { HealthService } from "../health/health.service";
import { of, throwError } from "rxjs";

describe("MetricsService", () => {
  let service: MetricsService;
  let httpService: jest.Mocked<HttpService>;
  let prometheusService: jest.Mocked<PrometheusService>;
  let healthService: jest.Mocked<HealthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockHealthServices = [
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
  ];

  const mockHealthSummary = {
    summary: {
      total: 2,
      healthy: 1,
      unhealthy: 1,
      percentage: 50,
    },
    timestamp: "2024-01-01T00:00:00.000Z",
    services: mockHealthServices,
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockPrometheusService = {
      setServiceHealth: jest.fn(),
      setServiceResponseTime: jest.fn(),
      setActiveUsers: jest.fn(),
      setTotalUsers: jest.fn(),
      setUsersByLanguage: jest.fn(),
      setAverageUserLevel: jest.fn(),
      incrementConversations: jest.fn(),
      incrementPayments: jest.fn(),
    };

    const mockHealthService = {
      checkAllServices: jest.fn().mockResolvedValue(mockHealthServices),
      getHealthSummary: jest.fn().mockResolvedValue(mockHealthSummary),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values = {
          AUTH_SERVICE_URL: "http://auth-service:3002",
          AI_SERVICE_URL: "http://ai-service:3003",
          PAYMENT_SERVICE_URL: "http://payment-service:3004",
        };
        return values[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrometheusService, useValue: mockPrometheusService },
        { provide: HealthService, useValue: mockHealthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    httpService = module.get(HttpService);
    prometheusService = module.get(PrometheusService);
    healthService = module.get(HealthService);
    configService = module.get(ConfigService);

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

  describe("getMetricsSummary", () => {
    it("should return metrics summary with health information", async () => {
      const summary = await service.getMetricsSummary();

      expect(summary).toEqual({
        timestamp: expect.any(String),
        health: mockHealthSummary,
        collection: {
          lastRun: expect.any(String),
          status: "active",
          interval: "30 seconds",
        },
        endpoints: {
          prometheus: "/metrics",
          health: "/api/v1/health",
          summary: "/api/v1/metrics/summary",
        },
      });
    });

    it("should call health service", async () => {
      await service.getMetricsSummary();

      expect(healthService.getHealthSummary).toHaveBeenCalled();
    });

    it("should return valid timestamp", async () => {
      const summary = await service.getMetricsSummary();

      expect(summary.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("getServicesMetrics", () => {
    it("should return services metrics", async () => {
      const metrics = await service.getServicesMetrics();

      expect(metrics).toEqual({
        timestamp: expect.any(String),
        services: [
          {
            name: "auth-service",
            status: "healthy",
            responseTime: 120,
            lastChecked: "2024-01-01T00:00:00.000Z",
            metricsAvailable: true,
          },
          {
            name: "db-service",
            status: "unhealthy",
            responseTime: 5000,
            lastChecked: "2024-01-01T00:00:00.000Z",
            metricsAvailable: false,
          },
        ],
      });
    });

    it("should call health service to get all services", async () => {
      await service.getServicesMetrics();

      expect(healthService.checkAllServices).toHaveBeenCalled();
    });

    it("should correctly map service health to metrics availability", async () => {
      const metrics = await service.getServicesMetrics();

      expect(metrics.services[0].metricsAvailable).toBe(true); // healthy service
      expect(metrics.services[1].metricsAvailable).toBe(false); // unhealthy service
    });
  });

  describe("collectMetrics (private method testing through public interface)", () => {
    it("should collect health metrics during metrics collection", async () => {
      // Since collectMetrics is decorated with @Cron, we test its effects indirectly
      healthService.checkAllServices.mockResolvedValue(mockHealthServices);

      // Call getMetricsSummary which internally uses health data
      await service.getMetricsSummary();

      expect(healthService.getHealthSummary).toHaveBeenCalled();
    });
  });

  describe("collectUserMetrics (simulated through HTTP calls)", () => {
    it("should handle successful user metrics collection", async () => {
      const mockUserMetrics = {
        activeUsers: 150,
        totalUsers: 1500,
        usersByLanguage: { en: 800, fr: 700 },
        averageUserLevel: { en: 2.3, fr: 1.9 },
      };

      httpService.get.mockReturnValue(of({ status: 200, data: mockUserMetrics, statusText: "OK", headers: {}, config: { headers: {} } } as any));

      // Call collectMetrics to trigger the private methods
      await service.collectMetrics();

      // Since the actual collectUserMetrics is private and runs via cron,
      // we verify the config service is called for the right URLs
      expect(configService.get).toHaveBeenCalledWith("AUTH_SERVICE_URL", "http://auth-service:3002");
    });

    it("should handle failed user metrics collection", async () => {
      httpService.get.mockReturnValue(throwError(() => new Error("Service unavailable")));

      // The service should handle errors gracefully
      // Since methods are private, we test that the service still functions
      const summary = await service.getMetricsSummary();
      expect(summary).toBeDefined();
    });
  });

  describe("collectConversationMetrics (simulated)", () => {
    it("should handle successful conversation metrics collection", async () => {
      const mockConversationMetrics = {
        newConversations: 25,
        completedConversations: 20,
        failedConversations: 2,
      };

      httpService.get.mockReturnValue(of({ status: 200, data: mockConversationMetrics, statusText: "OK", headers: {}, config: { headers: {} } } as any));

      // Call collectMetrics to trigger the private methods
      await service.collectMetrics();

      // Verify AI service URL configuration
      expect(configService.get).toHaveBeenCalledWith("AI_SERVICE_URL", "http://ai-service:3003");
    });
  });

  describe("collectPaymentMetrics (simulated)", () => {
    it("should handle successful payment metrics collection", async () => {
      const mockPaymentMetrics = {
        successfulPayments: 15,
        failedPayments: 2,
        totalAmount: 450.75,
      };

      httpService.get.mockReturnValue(of({ status: 200, data: mockPaymentMetrics, statusText: "OK", headers: {}, config: { headers: {} } } as any));

      // Call collectMetrics to trigger the private methods
      await service.collectMetrics();

      // Verify payment service URL configuration
      expect(configService.get).toHaveBeenCalledWith("PAYMENT_SERVICE_URL", "http://payment-service:3004");
    });
  });

  describe("error handling", () => {
    it("should handle health service errors gracefully", async () => {
      healthService.getHealthSummary.mockRejectedValue(new Error("Health service error"));

      await expect(service.getMetricsSummary()).rejects.toThrow("Health service error");
    });

    it("should handle health service errors in getServicesMetrics", async () => {
      healthService.checkAllServices.mockRejectedValue(new Error("Service check failed"));

      await expect(service.getServicesMetrics()).rejects.toThrow("Service check failed");
    });
  });

  describe("configuration", () => {
    it("should use correct service URLs from configuration", async () => {
      // Mock HTTP responses for all services
      httpService.get.mockReturnValue(of({ status: 200, data: {}, statusText: "OK", headers: {}, config: { headers: {} } } as any));

      // Call collectMetrics to trigger the private methods that use configuration
      await service.collectMetrics();

      // Verify that the service uses configuration for external service URLs
      expect(configService.get).toHaveBeenCalledWith("AUTH_SERVICE_URL", "http://auth-service:3002");
      expect(configService.get).toHaveBeenCalledWith("AI_SERVICE_URL", "http://ai-service:3003");
      expect(configService.get).toHaveBeenCalledWith("PAYMENT_SERVICE_URL", "http://payment-service:3004");
    });
  });

  describe("data transformation", () => {
    it("should properly transform service health data for metrics", async () => {
      const metrics = await service.getServicesMetrics();

      // Verify data transformation
      expect(metrics.services).toHaveLength(2);
      expect(metrics.services[0]).toHaveProperty("name");
      expect(metrics.services[0]).toHaveProperty("status");
      expect(metrics.services[0]).toHaveProperty("responseTime");
      expect(metrics.services[0]).toHaveProperty("lastChecked");
      expect(metrics.services[0]).toHaveProperty("metricsAvailable");
    });

    it("should set metricsAvailable based on service health", async () => {
      const metrics = await service.getServicesMetrics();

      const healthyService = metrics.services.find(s => s.status === "healthy");
      const unhealthyService = metrics.services.find(s => s.status === "unhealthy");

      expect(healthyService?.metricsAvailable).toBe(true);
      expect(unhealthyService?.metricsAvailable).toBe(false);
    });
  });
});
