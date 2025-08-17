import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getServiceInfo: jest.fn().mockReturnValue({
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
            }),
            getStatus: jest.fn().mockReturnValue({
              status: "healthy",
              timestamp: "2024-01-01T00:00:00.000Z",
              uptime: 3600,
              memory: {
                rss: 123456,
                heapTotal: 234567,
                heapUsed: 345678,
                external: 456789,
                arrayBuffers: 567890,
              },
              version: "v18.0.0",
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getServiceInfo", () => {
    it("should return service information", () => {
      const result = controller.getServiceInfo();

      expect(service.getServiceInfo).toHaveBeenCalled();
      expect(result).toHaveProperty("service", "Penpal AI Monitoring Service");
      expect(result).toHaveProperty("version", "1.0.0");
      expect(result).toHaveProperty("endpoints");
      expect(result).toHaveProperty("features");
    });

    it("should call service method once", () => {
      controller.getServiceInfo();

      expect(service.getServiceInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStatus", () => {
    it("should return service status", () => {
      const result = controller.getStatus();

      expect(service.getStatus).toHaveBeenCalled();
      expect(result).toHaveProperty("status", "healthy");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("uptime");
      expect(result).toHaveProperty("memory");
      expect(result).toHaveProperty("version");
    });

    it("should call service method once", () => {
      controller.getStatus();

      expect(service.getStatus).toHaveBeenCalledTimes(1);
    });
  });
});
