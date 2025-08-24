import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { PrometheusService } from "./prometheus.service";
import { HealthService } from "../health/health.service";

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prometheusService: PrometheusService,
    private readonly healthService: HealthService,
    private readonly configService: ConfigService
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async collectMetrics() {
    this.logger.debug("Collecting metrics from all services...");

    try {
      // Collect health metrics
      await this.collectHealthMetrics();

      // Collect business metrics
      await this.collectBusinessMetrics();
    } catch (error) {
      this.logger.error("Error collecting metrics:", error.message);
    }
  }

  private async collectHealthMetrics() {
    const services = await this.healthService.checkAllServices();

    for (const service of services) {
      this.prometheusService.setServiceHealth(
        service.name,
        service.url,
        service.status === "healthy"
      );

      this.prometheusService.setServiceResponseTime(
        service.name,
        service.responseTime
      );
    }
  }

  private async collectBusinessMetrics() {
    try {
      // Collect user metrics from auth service
      await this.collectUserMetrics();

      // Collect conversation metrics from ai service
      await this.collectConversationMetrics();

      // Collect payment metrics from payment service
      await this.collectPaymentMetrics();
    } catch (error) {
      this.logger.warn("Error collecting business metrics:", error.message);
    }
  }

  private async collectUserMetrics() {
    try {
      const authServiceUrl = this.configService.get(
        "AUTH_SERVICE_URL",
        "http://auth-service:3002"
      );
      const response = await firstValueFrom(
        this.httpService.get(`${authServiceUrl}/api/v1/users/metrics`, {
          timeout: 5000,
        })
      );

      if (response.data) {
        const { activeUsers, totalUsers, usersByLanguage, averageUserLevel } =
          response.data;

        if (activeUsers !== undefined) {
          this.prometheusService.setActiveUsers(activeUsers);
        }

        if (totalUsers !== undefined) {
          this.prometheusService.setTotalUsers(totalUsers);
        }

        if (usersByLanguage) {
          // Clear previous language metrics
          for (const language in usersByLanguage) {
            this.prometheusService.setUsersByLanguage(
              language,
              usersByLanguage[language]
            );
          }
        }

        if (averageUserLevel) {
          for (const language in averageUserLevel) {
            this.prometheusService.setAverageUserLevel(
              language,
              averageUserLevel[language]
            );
          }
        }
      }
    } catch (error) {
      this.logger.debug("Could not collect user metrics:", error.message);
    }
  }

  private async collectConversationMetrics() {
    try {
      const aiServiceUrl = this.configService.get(
        "AI_SERVICE_URL",
        "http://ai-service:3003"
      );
      const response = await firstValueFrom(
        this.httpService.get(`${aiServiceUrl}/api/v1/metrics/conversations`, {
          timeout: 5000,
        })
      );

      if (response.data?.newConversations) {
        this.prometheusService.incrementConversations("created");
      }
    } catch (error) {
      this.logger.debug(
        "Could not collect conversation metrics:",
        error.message
      );
    }
  }

  private async collectPaymentMetrics() {
    try {
      const paymentServiceUrl = this.configService.get(
        "PAYMENT_SERVICE_URL",
        "http://payment-service:3004"
      );
      const response = await firstValueFrom(
        this.httpService.get(`${paymentServiceUrl}/api/v1/metrics/payments`, {
          timeout: 5000,
        })
      );

      if (response.data?.successfulPayments) {
        this.prometheusService.incrementPayments("success");
      }
    } catch (error) {
      this.logger.debug("Could not collect payment metrics:", error.message);
    }
  }

  async getMetricsSummary() {
    const healthSummary = await this.healthService.getHealthSummary();

    return {
      timestamp: new Date().toISOString(),
      health: healthSummary,
      collection: {
        lastRun: new Date().toISOString(),
        status: "active",
        interval: "30 seconds",
      },
      endpoints: {
        prometheus: "/metrics",
        health: "/api/v1/health",
        summary: "/api/v1/metrics/summary",
      },
    };
  }

  async getServicesMetrics() {
    const services = await this.healthService.checkAllServices();

    return {
      timestamp: new Date().toISOString(),
      services: services.map((service) => ({
        name: service.name,
        status: service.status,
        responseTime: service.responseTime,
        lastChecked: service.lastChecked,
        metricsAvailable: service.status === "healthy",
      })),
    };
  }
}
