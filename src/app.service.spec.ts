import { Test, TestingModule } from "@nestjs/testing";
import { AppService } from "./app.service";

describe("AppService", () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getServiceInfo", () => {
    it("should return service information", () => {
      const result = service.getServiceInfo();

      expect(result).toEqual({
        service: "Penpal AI Monitoring Service",
        version: "1.0.0",
        description: "Service de monitoring et métriques pour l'écosystème Penpal AI",
        endpoints: {
          health: "/api/v1/health",
          metrics: "/metrics",
          dashboard: "/api/v1/dashboard",
          documentation: "/api/docs",
        },
        features: [
          "Real-time metrics collection",
          "Prometheus integration",
          "Service health monitoring",
          "Performance analytics",
          "Dashboard visualization",
        ],
      });
    });

    it("should return consistent data structure", () => {
      const result = service.getServiceInfo();

      expect(result).toHaveProperty("service");
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("endpoints");
      expect(result).toHaveProperty("features");
      expect(Array.isArray(result.features)).toBe(true);
      expect(typeof result.endpoints).toBe("object");
    });
  });

  describe("getStatus", () => {
    it("should return service status", () => {
      const result = service.getStatus();

      expect(result).toHaveProperty("status", "healthy");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("uptime");
      expect(result).toHaveProperty("memory");
      expect(result).toHaveProperty("version");
      expect(typeof result.uptime).toBe("number");
      expect(typeof result.memory).toBe("object");
    });

    it("should return valid timestamp", () => {
      const result = service.getStatus();
      const timestamp = new Date(result.timestamp);

      expect(timestamp.getTime()).not.toBeNaN();
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it("should return positive uptime", () => {
      const result = service.getStatus();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should return memory usage object", () => {
      const result = service.getStatus();

      expect(result.memory).toHaveProperty("rss");
      expect(result.memory).toHaveProperty("heapTotal");
      expect(result.memory).toHaveProperty("heapUsed");
      expect(result.memory).toHaveProperty("external");
    });
  });
});
