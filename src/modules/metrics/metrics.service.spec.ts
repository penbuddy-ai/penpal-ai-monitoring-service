import { Test, TestingModule } from "@nestjs/testing";
import { MetricsService } from "./metrics.service";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { PrometheusService } from "./prometheus.service";
import { HealthService } from "../health/health.service";
import { ConfigService } from "@nestjs/config";

describe("Monitoring MetricsService", () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: HttpService,
          useValue: { get: jest.fn().mockReturnValue(of({ data: {} })) },
        },
        {
          provide: PrometheusService,
          useValue: {
            setServiceHealth: jest.fn(),
            setServiceResponseTime: jest.fn(),
            setActiveUsers: jest.fn(),
            setTotalUsers: jest.fn(),
            setUsersByLanguage: jest.fn(),
            setAverageUserLevel: jest.fn(),
            incrementConversations: jest.fn(),
            incrementPayments: jest.fn(),
          },
        },
        {
          provide: HealthService,
          useValue: {
            checkAllServices: jest.fn().mockResolvedValue([]),
            getHealthSummary: jest.fn().mockResolvedValue({ status: "ok" }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("getMetricsSummary returns minimal structure", async () => {
    const summary = await service.getMetricsSummary();
    expect(summary).toHaveProperty("timestamp");
    expect(summary).toHaveProperty("health");
  });
});
