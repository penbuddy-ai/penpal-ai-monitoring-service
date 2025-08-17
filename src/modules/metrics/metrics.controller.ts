import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { MetricsService } from "./metrics.service";
import { PrometheusService } from "./prometheus.service";

@ApiTags("metrics")
@Controller()
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly prometheusService: PrometheusService
  ) {}

  // Endpoint metrics avec préfixe API pour Prometheus
  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  @ApiOperation({ summary: "Get Prometheus metrics" })
  @ApiResponse({ status: 200, description: "Prometheus metrics returned" })
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }
}

@ApiTags("metrics")
@Controller("metrics")
export class MetricsApiController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get("summary")
  @ApiOperation({ summary: "Get metrics summary in JSON format" })
  @ApiResponse({ status: 200, description: "Metrics summary retrieved" })
  async getMetricsSummary() {
    return this.metricsService.getMetricsSummary();
  }

  @Get("services")
  @ApiOperation({ summary: "Get metrics for all services" })
  @ApiResponse({ status: 200, description: "Services metrics retrieved" })
  async getServicesMetrics() {
    return this.metricsService.getServicesMetrics();
  }
}
