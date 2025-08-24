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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let PrometheusService = class PrometheusService {
    constructor() {
        prom_client_1.register.clear();
        (0, prom_client_1.collectDefaultMetrics)({ register: prom_client_1.register });
        this.httpRequestsTotal = new prom_client_1.Counter({
            name: "http_requests_total",
            help: "Total number of HTTP requests",
            labelNames: ["method", "route", "status_code", "service"],
            registers: [prom_client_1.register],
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: "http_request_duration_seconds",
            help: "Duration of HTTP requests in seconds",
            labelNames: ["method", "route", "service"],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
            registers: [prom_client_1.register],
        });
        this.serviceHealthStatus = new prom_client_1.Gauge({
            name: "service_health_status",
            help: "Health status of services (1 = healthy, 0 = unhealthy)",
            labelNames: ["service_name", "service_url"],
            registers: [prom_client_1.register],
        });
        this.serviceResponseTime = new prom_client_1.Gauge({
            name: "service_response_time_seconds",
            help: "Response time of service health checks in seconds",
            labelNames: ["service_name"],
            registers: [prom_client_1.register],
        });
        this.activeUsers = new prom_client_1.Gauge({
            name: "penpal_active_users_total",
            help: "Number of active users in the system",
            registers: [prom_client_1.register],
        });
        this.totalUsers = new prom_client_1.Gauge({
            name: "penpal_total_users",
            help: "Total number of registered users",
            registers: [prom_client_1.register],
        });
        this.usersByLanguage = new prom_client_1.Gauge({
            name: "penpal_users_by_language",
            help: "Number of users studying each language",
            labelNames: ["language"],
            registers: [prom_client_1.register],
        });
        this.averageUserLevel = new prom_client_1.Gauge({
            name: "penpal_average_user_level",
            help: "Average user level across all users",
            labelNames: ["language"],
            registers: [prom_client_1.register],
        });
        this.conversationsTotal = new prom_client_1.Counter({
            name: "penpal_conversations_total",
            help: "Total number of conversations created",
            labelNames: ["status"],
            registers: [prom_client_1.register],
        });
        this.paymentsTotal = new prom_client_1.Counter({
            name: "penpal_payments_total",
            help: "Total number of payments processed",
            labelNames: ["status", "amount_range"],
            registers: [prom_client_1.register],
        });
        this.tokensConsumed = new prom_client_1.Counter({
            name: "penpal_ai_tokens_consumed_total",
            help: "Total number of AI tokens consumed",
            labelNames: ["provider", "model"],
            registers: [prom_client_1.register],
        });
    }
    onModuleInit() {
        this.activeUsers.set(0);
    }
    incrementHttpRequests(method, route, statusCode, service) {
        this.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode,
            service,
        });
    }
    observeHttpDuration(method, route, service, duration) {
        this.httpRequestDuration.observe({ method, route, service }, duration);
    }
    setServiceHealth(serviceName, serviceUrl, isHealthy) {
        this.serviceHealthStatus.set({ service_name: serviceName, service_url: serviceUrl }, isHealthy ? 1 : 0);
    }
    setServiceResponseTime(serviceName, responseTime) {
        this.serviceResponseTime.set({ service_name: serviceName }, responseTime / 1000);
    }
    setActiveUsers(count) {
        this.activeUsers.set(count);
    }
    setTotalUsers(count) {
        this.totalUsers.set(count);
    }
    setUsersByLanguage(language, count) {
        this.usersByLanguage.set({ language }, count);
    }
    setAverageUserLevel(language, averageLevel) {
        this.averageUserLevel.set({ language }, averageLevel);
    }
    incrementConversations(status) {
        this.conversationsTotal.inc({ status });
    }
    incrementPayments(status, amount) {
        let amountRange = "unknown";
        if (amount !== undefined) {
            if (amount < 10)
                amountRange = "0-10";
            else if (amount < 50)
                amountRange = "10-50";
            else if (amount < 100)
                amountRange = "50-100";
            else
                amountRange = "100+";
        }
        this.paymentsTotal.inc({ status, amount_range: amountRange });
    }
    incrementTokensConsumed(provider, model, tokens) {
        this.tokensConsumed.inc({ provider, model }, tokens);
    }
    async getMetrics() {
        return prom_client_1.register.metrics();
    }
    getRegister() {
        return prom_client_1.register;
    }
};
exports.PrometheusService = PrometheusService;
exports.PrometheusService = PrometheusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrometheusService);
//# sourceMappingURL=prometheus.service.js.map