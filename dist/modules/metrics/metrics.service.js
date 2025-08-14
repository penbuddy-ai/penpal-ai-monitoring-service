"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const prometheus_service_1 = require("./prometheus.service");
const health_service_1 = require("../health/health.service");
let MetricsService = MetricsService_1 = class MetricsService {
    constructor(httpService, prometheusService, healthService, configService) {
        this.httpService = httpService;
        this.prometheusService = prometheusService;
        this.healthService = healthService;
        this.configService = configService;
        this.logger = new common_1.Logger(MetricsService_1.name);
    }
    async collectMetrics() {
        this.logger.debug("Collecting metrics from all services...");
        try {
            await this.collectHealthMetrics();
            await this.collectBusinessMetrics();
        }
        catch (error) {
            this.logger.error("Error collecting metrics:", error.message);
        }
    }
    async collectHealthMetrics() {
        const services = await this.healthService.checkAllServices();
        for (const service of services) {
            this.prometheusService.setServiceHealth(service.name, service.url, service.status === "healthy");
            this.prometheusService.setServiceResponseTime(service.name, service.responseTime);
        }
    }
    async collectBusinessMetrics() {
        try {
            await this.collectUserMetrics();
            await this.collectConversationMetrics();
            await this.collectPaymentMetrics();
        }
        catch (error) {
            this.logger.warn("Error collecting business metrics:", error.message);
        }
    }
    async collectUserMetrics() {
        try {
            const authServiceUrl = this.configService.get("AUTH_SERVICE_URL", "http://auth-service:3002");
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${authServiceUrl}/api/v1/users/metrics`, {
                timeout: 5000,
            }));
            if (response.data) {
                const { activeUsers, totalUsers, usersByLanguage, averageUserLevel } = response.data;
                if (activeUsers !== undefined) {
                    this.prometheusService.setActiveUsers(activeUsers);
                }
                if (totalUsers !== undefined) {
                    this.prometheusService.setTotalUsers(totalUsers);
                }
                if (usersByLanguage) {
                    for (const language in usersByLanguage) {
                        this.prometheusService.setUsersByLanguage(language, usersByLanguage[language]);
                    }
                }
                if (averageUserLevel) {
                    for (const language in averageUserLevel) {
                        this.prometheusService.setAverageUserLevel(language, averageUserLevel[language]);
                    }
                }
            }
        }
        catch (error) {
            this.logger.debug("Could not collect user metrics:", error.message);
        }
    }
    async collectConversationMetrics() {
        var _a;
        try {
            const aiServiceUrl = this.configService.get("AI_SERVICE_URL", "http://ai-service:3003");
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${aiServiceUrl}/api/v1/metrics/conversations`, {
                timeout: 5000,
            }));
            if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.newConversations) {
                this.prometheusService.incrementConversations("created");
            }
        }
        catch (error) {
            this.logger.debug("Could not collect conversation metrics:", error.message);
        }
    }
    async collectPaymentMetrics() {
        var _a;
        try {
            const paymentServiceUrl = this.configService.get("PAYMENT_SERVICE_URL", "http://payment-service:3004");
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${paymentServiceUrl}/api/v1/metrics/payments`, {
                timeout: 5000,
            }));
            if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.successfulPayments) {
                this.prometheusService.incrementPayments("success");
            }
        }
        catch (error) {
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
};
exports.MetricsService = MetricsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsService.prototype, "collectMetrics", null);
exports.MetricsService = MetricsService = MetricsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        prometheus_service_1.PrometheusService,
        health_service_1.HealthService,
        config_1.ConfigService])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map