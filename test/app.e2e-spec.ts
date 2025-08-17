import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("MonitoringService (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("App Endpoints", () => {
    it("/api/v1/status (GET) - should return service status", () => {
      return request(app.getHttpServer())
        .get("/api/v1/status")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("uptime");
          expect(res.body).toHaveProperty("memory");
          expect(res.body).toHaveProperty("version");
        });
    });

    it("/ (GET) - should return service information", () => {
      return request(app.getHttpServer())
        .get("/")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("service");
          expect(res.body).toHaveProperty("version");
          expect(res.body).toHaveProperty("description");
          expect(res.body).toHaveProperty("endpoints");
          expect(res.body).toHaveProperty("features");
        });
    });
  });

  describe("Health Endpoints", () => {
    it("/api/v1/health (GET) - should return health check", () => {
      return request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
          expect(res.body).toHaveProperty("info");
          expect(res.body).toHaveProperty("details");
        });
    });

    it("/api/v1/health/services (GET) - should return services health", () => {
      return request(app.getHttpServer())
        .get("/api/v1/health/services")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty("name");
            expect(res.body[0]).toHaveProperty("status");
            expect(res.body[0]).toHaveProperty("responseTime");
            expect(res.body[0]).toHaveProperty("lastChecked");
          }
        });
    });

    it("/api/v1/health/summary (GET) - should return health summary", () => {
      return request(app.getHttpServer())
        .get("/api/v1/health/summary")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("summary");
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("services");
          expect(res.body.summary).toHaveProperty("total");
          expect(res.body.summary).toHaveProperty("healthy");
          expect(res.body.summary).toHaveProperty("unhealthy");
          expect(res.body.summary).toHaveProperty("percentage");
        });
    });
  });

  describe("Metrics Endpoints", () => {
    it("/metrics (GET) - should return Prometheus metrics", () => {
      return request(app.getHttpServer())
        .get("/metrics")
        .expect(200)
        .expect("Content-Type", /text\/plain/)
        .expect((res) => {
          expect(typeof res.text).toBe("string");
          expect(res.text.length).toBeGreaterThan(0);
          // Should contain some basic Prometheus metrics
          expect(res.text).toContain("# HELP");
          expect(res.text).toContain("# TYPE");
        });
    });

    it("/api/v1/metrics/summary (GET) - should return metrics summary", () => {
      return request(app.getHttpServer())
        .get("/api/v1/metrics/summary")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("health");
          expect(res.body).toHaveProperty("collection");
          expect(res.body).toHaveProperty("endpoints");
        });
    });

    it("/api/v1/metrics/services (GET) - should return services metrics", () => {
      return request(app.getHttpServer())
        .get("/api/v1/metrics/services")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("services");
          expect(Array.isArray(res.body.services)).toBe(true);
        });
    });
  });

  describe("Monitoring Endpoints", () => {
    it("/api/v1/monitoring/overview (GET) - should return system overview", () => {
      return request(app.getHttpServer())
        .get("/api/v1/monitoring/overview")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("status");
          expect(res.body).toHaveProperty("services");
          expect(res.body).toHaveProperty("metrics");
          expect(res.body).toHaveProperty("alerts");
        });
    });

    it("/api/v1/monitoring/alerts (GET) - should return alerts", () => {
      return request(app.getHttpServer())
        .get("/api/v1/monitoring/alerts")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("total");
          expect(res.body).toHaveProperty("critical");
          expect(res.body).toHaveProperty("warnings");
          expect(res.body).toHaveProperty("alerts");
          expect(Array.isArray(res.body.alerts)).toBe(true);
        });
    });

    it("/api/v1/monitoring/performance (GET) - should return performance metrics", () => {
      return request(app.getHttpServer())
        .get("/api/v1/monitoring/performance")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("timeRange");
          expect(res.body).toHaveProperty("metrics");
          expect(res.body).toHaveProperty("services");
          expect(res.body.metrics).toHaveProperty("averageResponseTime");
          expect(res.body.metrics).toHaveProperty("healthPercentage");
          expect(res.body.metrics).toHaveProperty("uptime");
        });
    });

    it("/api/v1/monitoring/performance?timeRange=24h (GET) - should accept time range parameter", () => {
      return request(app.getHttpServer())
        .get("/api/v1/monitoring/performance?timeRange=24h")
        .expect(200)
        .expect((res) => {
          expect(res.body.timeRange).toBe("24h");
        });
    });

    it("/api/v1/monitoring/usage (GET) - should return usage statistics", () => {
      return request(app.getHttpServer())
        .get("/api/v1/monitoring/usage")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("period");
          expect(res.body).toHaveProperty("statistics");
          expect(res.body).toHaveProperty("breakdown");
          expect(res.body.statistics).toHaveProperty("totalServices");
          expect(res.body.statistics).toHaveProperty("healthChecks");
          expect(res.body.statistics).toHaveProperty("averageUptime");
          expect(res.body.statistics).toHaveProperty("alertsGenerated");
        });
    });
  });

  describe("Dashboard Endpoints", () => {
    it("/api/v1/dashboard (GET) - should return dashboard overview", () => {
      return request(app.getHttpServer())
        .get("/api/v1/dashboard")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("system");
          expect(res.body).toHaveProperty("alerts");
          expect(res.body).toHaveProperty("performance");
        });
    });

    it("/api/v1/dashboard/widgets (GET) - should return widgets data", () => {
      return request(app.getHttpServer())
        .get("/api/v1/dashboard/widgets")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("timestamp");
          expect(res.body).toHaveProperty("widgets");
          expect(Array.isArray(res.body.widgets)).toBe(true);
          
          if (res.body.widgets.length > 0) {
            const widget = res.body.widgets[0];
            expect(widget).toHaveProperty("id");
            expect(widget).toHaveProperty("title");
            expect(widget).toHaveProperty("type");
            expect(widget).toHaveProperty("data");
          }
        });
    });

    it("/api/v1/dashboard/export (GET) - should export data in JSON format", () => {
      return request(app.getHttpServer())
        .get("/api/v1/dashboard/export")
        .expect(200)
        .expect("Content-Type", /application\/json/)
        .expect("Content-Disposition", /attachment/)
        .expect((res) => {
          expect(res.body).toHaveProperty("exportInfo");
          expect(res.body).toHaveProperty("data");
          expect(res.body.exportInfo).toHaveProperty("format", "json");
          expect(res.body.exportInfo).toHaveProperty("timeRange", "24h");
        });
    });

    it("/api/v1/dashboard/export?format=csv (GET) - should export data in CSV format", () => {
      return request(app.getHttpServer())
        .get("/api/v1/dashboard/export?format=csv")
        .expect(200)
        .expect("Content-Type", /text\/csv/)
        .expect("Content-Disposition", /attachment/)
        .expect((res) => {
          expect(typeof res.text).toBe("string");
          expect(res.text).toContain("Service,Status,Response Time");
        });
    });

    it("/api/v1/dashboard/export?timeRange=1h (GET) - should accept time range parameter", () => {
      return request(app.getHttpServer())
        .get("/api/v1/dashboard/export?timeRange=1h")
        .expect(200)
        .expect((res) => {
          expect(res.body.exportInfo.timeRange).toBe("1h");
        });
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent routes", () => {
      return request(app.getHttpServer())
        .get("/non-existent-route")
        .expect(404);
    });

    it("should handle malformed requests gracefully", () => {
      return request(app.getHttpServer())
        .get("/api/v1/monitoring/performance?timeRange=invalid")
        .expect(200) // Should handle gracefully
        .expect((res) => {
          expect(res.body).toHaveProperty("timeRange", "invalid");
        });
    });
  });

  describe("Response Format Validation", () => {
    it("should return consistent timestamp formats", async () => {
      const endpoints = [
        "/api/v1/status",
        "/api/v1/health/summary",
        "/api/v1/metrics/summary",
        "/api/v1/monitoring/overview",
        "/api/v1/dashboard",
      ];

      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .expect(200);

        expect(response.body.timestamp).toMatch(timestampRegex);
      }
    });

    it("should return valid JSON for all API endpoints", async () => {
      const jsonEndpoints = [
        "/",
        "/api/v1/status",
        "/api/v1/health",
        "/api/v1/health/services",
        "/api/v1/health/summary",
        "/api/v1/metrics/summary",
        "/api/v1/metrics/services",
        "/api/v1/monitoring/overview",
        "/api/v1/monitoring/alerts",
        "/api/v1/monitoring/performance",
        "/api/v1/monitoring/usage",
        "/api/v1/dashboard",
        "/api/v1/dashboard/widgets",
      ];

      for (const endpoint of jsonEndpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .expect(200)
          .expect("Content-Type", /json/);
      }
    });

    it("should handle CORS properly", () => {
      return request(app.getHttpServer())
        .options("/api/v1/health")
        .expect(204)
        .expect("Access-Control-Allow-Origin", "*");
    });
  });

  describe("Performance", () => {
    it("should respond to health check quickly", async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond in less than 5 seconds
    });

    it("should handle concurrent requests", async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get("/api/v1/status")
          .expect(200)
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(10000); // Should handle 5 concurrent requests in less than 10 seconds
    });
  });
});
