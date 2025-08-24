import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckService, HttpHealthIndicator, HealthCheckResult } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { ServiceHealth } from "../../interfaces/service-health.interface";

describe("HealthController", () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let httpHealthIndicator: jest.Mocked<HttpHealthIndicator>;
  let healthService: jest.Mocked<HealthService>;

  const mockServiceHealth: ServiceHealth = {
    name: "test-service",
    url: "http://test-service/health",
    status: "healthy",
    responseTime: 100,
    lastChecked: "2024-01-01T00:00:00.000Z",
  };

  const mockHealthCheckResult: HealthCheckResult = {
    status: "ok",
    info: {
      "monitoring-service": {
        status: "up",
      },
    },
    error: {},
    details: {
      "monitoring-service": {
        status: "up",
      },
    },
  };

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn().mockResolvedValue(mockHealthCheckResult),
    };

    const mockHttpHealthIndicator = {
      pingCheck: jest.fn().mockResolvedValue({
        "monitoring-service": {
          status: "up",
        },
      }),
    };

    const mockHealthService = {
      checkAllServices: jest.fn().mockResolvedValue([mockServiceHealth]),
      getHealthSummary: jest.fn().mockResolvedValue({
        summary: {
          total: 1,
          healthy: 1,
          unhealthy: 0,
          percentage: 100,
        },
        timestamp: "2024-01-01T00:00:00.000Z",
        services: [mockServiceHealth],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: HttpHealthIndicator, useValue: mockHttpHealthIndicator },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    httpHealthIndicator = module.get(HttpHealthIndicator);
    healthService = module.get(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("check", () => {
    it("should perform health check", async () => {
      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
      expect(result).toEqual(mockHealthCheckResult);
    });

    it("should call http health indicator for monitoring service", async () => {
      await controller.check();

      // Verify that the function passed to check() calls the http indicator
      const checkFunction = healthCheckService.check.mock.calls[0][0][0];
      await checkFunction();

      expect(httpHealthIndicator.pingCheck).toHaveBeenCalledWith(
        "monitoring-service",
        "http://localhost:3005/api/v1/status"
      );
    });

    it("should handle health check errors gracefully", async () => {
      const error = new Error("Health check failed");
      healthCheckService.check.mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow("Health check failed");
    });
  });

  describe("checkAllServices", () => {
    it("should return health status of all services", async () => {
      const result = await controller.checkAllServices();

      expect(healthService.checkAllServices).toHaveBeenCalled();
      expect(result).toEqual([mockServiceHealth]);
    });

    it("should handle multiple services", async () => {
      const multipleServices: ServiceHealth[] = [
        {
          name: "auth-service",
          url: "http://auth-service/health",
          status: "healthy",
          responseTime: 150,
          lastChecked: "2024-01-01T00:00:00.000Z",
        },
        {
          name: "db-service",
          url: "http://db-service/health",
          status: "unhealthy",
          responseTime: 5000,
          lastChecked: "2024-01-01T00:00:00.000Z",
          error: "Connection timeout",
        },
      ];
      healthService.checkAllServices.mockResolvedValue(multipleServices);

      const result = await controller.checkAllServices();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("healthy");
      expect(result[1].status).toBe("unhealthy");
      expect(result[1]).toHaveProperty("error");
    });

    it("should handle service check errors", async () => {
      const error = new Error("Service check failed");
      healthService.checkAllServices.mockRejectedValue(error);

      await expect(controller.checkAllServices()).rejects.toThrow("Service check failed");
    });
  });

  describe("getHealthSummary", () => {
    it("should return health summary", async () => {
      const expectedSummary = {
        summary: {
          total: 1,
          healthy: 1,
          unhealthy: 0,
          percentage: 100,
        },
        timestamp: "2024-01-01T00:00:00.000Z",
        services: [mockServiceHealth],
      };

      const result = await controller.getHealthSummary();

      expect(healthService.getHealthSummary).toHaveBeenCalled();
      expect(result).toEqual(expectedSummary);
    });

    it("should handle health summary with mixed service states", async () => {
      const mixedSummary = {
        summary: {
          total: 4,
          healthy: 2,
          unhealthy: 2,
          percentage: 50,
        },
        timestamp: "2024-01-01T00:00:00.000Z",
        services: [
          mockServiceHealth,
          {
            ...mockServiceHealth,
            name: "unhealthy-service",
            status: "unhealthy" as const,
            error: "Service down",
          },
        ],
      };
      healthService.getHealthSummary.mockResolvedValue(mixedSummary);

      const result = await controller.getHealthSummary();

      expect(result.summary.percentage).toBe(50);
      expect(result.summary.healthy).toBe(2);
      expect(result.summary.unhealthy).toBe(2);
    });

    it("should handle health summary errors", async () => {
      const error = new Error("Summary generation failed");
      healthService.getHealthSummary.mockRejectedValue(error);

      await expect(controller.getHealthSummary()).rejects.toThrow("Summary generation failed");
    });

    it("should return valid timestamp format", async () => {
      const result = await controller.getHealthSummary();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
