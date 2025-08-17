import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { HealthService } from "./health.service";
import { of, throwError } from "rxjs";

describe("HealthService", () => {
  let service: HealthService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values = {
          AUTH_SERVICE_URL: "http://auth-service:3002",
          DB_SERVICE_URL: "http://db-service:3001",
          AI_SERVICE_URL: "http://ai-service:3003",
          PAYMENT_SERVICE_URL: "http://payment-service:3004",
        };
        return values[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);

    // Mock logger to avoid console output in tests
    Object.defineProperty(service, "logger", {
      value: {
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
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

  describe("checkServiceHealth", () => {
    it("should return healthy status for successful response", async () => {
      const mockResponse = { status: 200, data: { status: "healthy" } } as any;
      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.checkServiceHealth("test-service", "http://test-service/health");

      expect(result).toEqual({
        name: "test-service",
        url: "http://test-service/health",
        status: "healthy",
        responseTime: expect.any(Number),
        lastChecked: expect.any(String),
      });
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("should return unhealthy status for non-200 response", async () => {
      const mockResponse = { status: 500, data: { status: "error" } } as any;
      httpService.get.mockReturnValue(of(mockResponse));

      const result = await service.checkServiceHealth("test-service", "http://test-service/health");

      expect(result).toEqual({
        name: "test-service",
        url: "http://test-service/health",
        status: "unhealthy",
        responseTime: expect.any(Number),
        lastChecked: expect.any(String),
      });
    });

    it("should return unhealthy status for connection error", async () => {
      const error = new Error("Connection refused");
      httpService.get.mockReturnValue(throwError(() => error));

      const result = await service.checkServiceHealth("test-service", "http://test-service/health");

      expect(result).toEqual({
        name: "test-service",
        url: "http://test-service/health",
        status: "unhealthy",
        responseTime: expect.any(Number),
        lastChecked: expect.any(String),
        error: "Connection refused",
      });
    });

    it("should use correct timeout and headers", async () => {
      const mockResponse = { status: 200, data: {} } as any;
      httpService.get.mockReturnValue(of(mockResponse));

      await service.checkServiceHealth("test-service", "http://test-service/health");

      expect(httpService.get).toHaveBeenCalledWith("http://test-service/health", {
        timeout: 5000,
        headers: {
          Accept: "application/json",
        },
      });
    });
  });

  describe("checkAllServices", () => {
    it("should check all configured services", async () => {
      const mockResponse = { status: 200, data: {} } as any;
      httpService.get.mockReturnValue(of(mockResponse));

      const results = await service.checkAllServices();

      expect(results).toHaveLength(4);
      expect(results.map(r => r.name)).toEqual([
        "auth-service",
        "db-service",
        "ai-service",
        "payment-service",
      ]);
      expect(httpService.get).toHaveBeenCalledTimes(4);
    });

    it("should handle mix of healthy and unhealthy services", async () => {
      httpService.get
        .mockReturnValueOnce(of({ status: 200, data: {} } as any)) // auth-service healthy
        .mockReturnValueOnce(throwError(() => new Error("Service down"))) // db-service unhealthy
        .mockReturnValueOnce(of({ status: 200, data: {} } as any)) // ai-service healthy
        .mockReturnValueOnce(of({ status: 500, data: {} } as any)); // payment-service unhealthy

      const results = await service.checkAllServices();

      expect(results).toHaveLength(4);
      expect(results[0].status).toBe("healthy");
      expect(results[1].status).toBe("unhealthy");
      expect(results[2].status).toBe("healthy");
      expect(results[3].status).toBe("unhealthy");
    });
  });

  describe("getHealthSummary", () => {
    it("should return correct summary for all healthy services", async () => {
      const mockResponse = { status: 200, data: {} } as any;
      httpService.get.mockReturnValue(of(mockResponse));

      const summary = await service.getHealthSummary();

      expect(summary).toEqual({
        summary: {
          total: 4,
          healthy: 4,
          unhealthy: 0,
          percentage: 100,
        },
        timestamp: expect.any(String),
        services: expect.any(Array),
      });
    });

    it("should return correct summary for mixed service states", async () => {
      httpService.get
        .mockReturnValueOnce(of({ status: 200, data: {} } as any)) // healthy
        .mockReturnValueOnce(throwError(() => new Error("Error"))) // unhealthy
        .mockReturnValueOnce(of({ status: 200, data: {} } as any)) // healthy
        .mockReturnValueOnce(of({ status: 500, data: {} } as any)); // unhealthy

      const summary = await service.getHealthSummary();

      expect(summary).toEqual({
        summary: {
          total: 4,
          healthy: 2,
          unhealthy: 2,
          percentage: 50,
        },
        timestamp: expect.any(String),
        services: expect.any(Array),
      });
    });

    it("should return correct summary for all unhealthy services", async () => {
      httpService.get.mockReturnValue(throwError(() => new Error("All down")));

      const summary = await service.getHealthSummary();

      expect(summary).toEqual({
        summary: {
          total: 4,
          healthy: 0,
          unhealthy: 4,
          percentage: 0,
        },
        timestamp: expect.any(String),
        services: expect.any(Array),
      });
    });

    it("should include services array in response", async () => {
      const mockResponse = { status: 200, data: {} } as any;
      httpService.get.mockReturnValue(of(mockResponse));

      const summary = await service.getHealthSummary();

      expect(summary.services).toHaveLength(4);
      expect(summary.services[0]).toHaveProperty("name");
      expect(summary.services[0]).toHaveProperty("status");
      expect(summary.services[0]).toHaveProperty("responseTime");
    });
  });

  describe("constructor", () => {
    it("should initialize services with correct URLs from config", () => {
      expect(configService.get).toHaveBeenCalledWith("AUTH_SERVICE_URL", "http://auth-service:3002");
      expect(configService.get).toHaveBeenCalledWith("DB_SERVICE_URL", "http://db-service:3001");
      expect(configService.get).toHaveBeenCalledWith("AI_SERVICE_URL", "http://ai-service:3003");
      expect(configService.get).toHaveBeenCalledWith("PAYMENT_SERVICE_URL", "http://payment-service:3004");
    });
  });
});