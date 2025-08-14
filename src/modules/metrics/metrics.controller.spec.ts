import { Test, TestingModule } from "@nestjs/testing";
import { MetricsController, MetricsApiController } from "./metrics.controller";
import { PrometheusService } from "./prometheus.service";
import { MetricsService } from "./metrics.service";

describe("Monitoring MetricsController", () => {
  let controller: MetricsController;
  let apiController: MetricsApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController, MetricsApiController],
      providers: [
        { provide: PrometheusService, useValue: { getMetrics: jest.fn().mockResolvedValue("ok") } },
        { provide: MetricsService, useValue: { getMetricsSummary: jest.fn().mockResolvedValue({ ok: true }) } },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    apiController = module.get<MetricsApiController>(MetricsApiController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("getMetrics returns text", async () => {
    const res = await controller.getMetrics();
    expect(res).toBe("ok");
  });

  it("getMetricsSummary returns object", async () => {
    const res = await apiController.getMetricsSummary();
    expect(res).toHaveProperty("ok", true);
  });
});


