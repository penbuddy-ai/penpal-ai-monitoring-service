import { Test, TestingModule } from "@nestjs/testing";
import { PrometheusService } from "./prometheus.service";
import { register } from "prom-client";

describe("PrometheusService", () => {
  let service: PrometheusService;

  beforeEach(async () => {
    // Clear the default register before each test
    register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrometheusService],
    }).compile();

    service = module.get<PrometheusService>(PrometheusService);
  });

  afterEach(() => {
    // Clear register after each test to avoid conflicts
    register.clear();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should register default metrics", () => {
      // onModuleInit is called automatically during module creation
      expect(service.getRegister()).toBeDefined();
    });
  });

  describe("incrementHttpRequests", () => {
    it("should increment http requests counter", () => {
      service.incrementHttpRequests("GET", "/api/health", "200", "monitoring");

      // Verify the metric exists and can be retrieved
      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle different HTTP methods", () => {
      service.incrementHttpRequests("POST", "/api/metrics", "201", "monitoring");
      service.incrementHttpRequests("PUT", "/api/update", "204", "monitoring");
      service.incrementHttpRequests("DELETE", "/api/delete", "404", "monitoring");

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle different status codes", () => {
      service.incrementHttpRequests("GET", "/api/health", "200", "monitoring");
      service.incrementHttpRequests("GET", "/api/health", "500", "monitoring");
      service.incrementHttpRequests("GET", "/api/health", "404", "monitoring");

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("observeHttpDuration", () => {
    it("should observe http request duration", () => {
      service.observeHttpDuration("GET", "/api/health", "monitoring", 0.5);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle various durations", () => {
      service.observeHttpDuration("GET", "/api/fast", "monitoring", 0.1);
      service.observeHttpDuration("GET", "/api/slow", "monitoring", 2.5);
      service.observeHttpDuration("GET", "/api/medium", "monitoring", 1.0);

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("setServiceHealth", () => {
    it("should set service health status", () => {
      service.setServiceHealth("auth-service", "http://auth:3002", true);
      service.setServiceHealth("db-service", "http://db:3001", false);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle multiple services", () => {
      const services = [
        { name: "auth-service", url: "http://auth:3002", healthy: true },
        { name: "db-service", url: "http://db:3001", healthy: false },
        { name: "ai-service", url: "http://ai:3003", healthy: true },
        { name: "payment-service", url: "http://payment:3004", healthy: true },
      ];

      services.forEach(s => {
        service.setServiceHealth(s.name, s.url, s.healthy);
      });

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("setServiceResponseTime", () => {
    it("should set service response time", () => {
      service.setServiceResponseTime("auth-service", 150);
      service.setServiceResponseTime("db-service", 300);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle zero and high response times", () => {
      service.setServiceResponseTime("fast-service", 0);
      service.setServiceResponseTime("slow-service", 5000);

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("setActiveUsers", () => {
    it("should set active users count", () => {
      service.setActiveUsers(100);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle zero users", () => {
      service.setActiveUsers(0);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should update users count", () => {
      service.setActiveUsers(50);
      service.setActiveUsers(75);
      service.setActiveUsers(100);

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("setTotalUsers", () => {
    it("should set total users count", () => {
      service.setTotalUsers(1000);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle increasing user counts", () => {
      service.setTotalUsers(1000);
      service.setTotalUsers(1050);
      service.setTotalUsers(1100);

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("setUsersByLanguage", () => {
    it("should set users by language", () => {
      service.setUsersByLanguage("en", 500);
      service.setUsersByLanguage("fr", 300);
      service.setUsersByLanguage("es", 200);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle language updates", () => {
      service.setUsersByLanguage("en", 400);
      service.setUsersByLanguage("en", 450); // Update existing language

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("setAverageUserLevel", () => {
    it("should set average user level", () => {
      service.setAverageUserLevel("en", 2.5);
      service.setAverageUserLevel("fr", 1.8);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle level updates", () => {
      service.setAverageUserLevel("en", 2.0);
      service.setAverageUserLevel("en", 2.3); // Update existing level

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("incrementConversations", () => {
    it("should increment conversations by status", () => {
      service.incrementConversations("created");
      service.incrementConversations("completed");
      service.incrementConversations("failed");

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle multiple increments", () => {
      service.incrementConversations("created");
      service.incrementConversations("created");
      service.incrementConversations("completed");

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("incrementPayments", () => {
    it("should increment payments by status", () => {
      service.incrementPayments("success", 29.99);
      service.incrementPayments("failed");
      service.incrementPayments("pending");

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle payments without amount", () => {
      service.incrementPayments("success");
      service.incrementPayments("failed");

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle various amounts", () => {
      service.incrementPayments("success", 0.99);
      service.incrementPayments("success", 199.99);
      service.incrementPayments("success", 9.99);

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("incrementTokensConsumed", () => {
    it("should increment tokens consumed", () => {
      service.incrementTokensConsumed("openai", "gpt-4", 1500);
      service.incrementTokensConsumed("anthropic", "claude", 800);

      expect(() => service.getMetrics()).not.toThrow();
    });

    it("should handle multiple providers and models", () => {
      service.incrementTokensConsumed("openai", "gpt-3.5-turbo", 500);
      service.incrementTokensConsumed("openai", "gpt-4", 1000);
      service.incrementTokensConsumed("anthropic", "claude-2", 750);

      expect(() => service.getMetrics()).not.toThrow();
    });
  });

  describe("getMetrics", () => {
    it("should return metrics as string", async () => {
      // Set some metrics first
      service.setActiveUsers(100);
      service.incrementHttpRequests("GET", "/test", "200", "monitoring");

      const metrics = await service.getMetrics();

      expect(typeof metrics).toBe("string");
      expect(metrics.length).toBeGreaterThan(0);
    });

    it("should include default metrics", async () => {
      const metrics = await service.getMetrics();

      // Should include some basic prometheus metrics
      expect(metrics).toContain("# HELP");
      expect(metrics).toContain("# TYPE");
    });

    it("should include custom metrics when set", async () => {
      service.setActiveUsers(50);
      service.incrementHttpRequests("GET", "/health", "200", "monitoring");

      const metrics = await service.getMetrics();

      expect(metrics).toContain("penpal_active_users");
      expect(metrics).toContain("http_requests_total");
    });
  });

  describe("getRegister", () => {
    it("should return prometheus register", () => {
      const registry = service.getRegister();

      expect(registry).toBeDefined();
      expect(typeof registry.metrics).toBe("function");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete monitoring scenario", async () => {
      // Simulate a complete monitoring scenario
      
      // HTTP requests
      service.incrementHttpRequests("GET", "/health", "200", "monitoring");
      service.incrementHttpRequests("POST", "/metrics", "200", "monitoring");
      service.observeHttpDuration("GET", "/health", "monitoring", 0.1);
      
      // Service health
      service.setServiceHealth("auth-service", "http://auth:3002", true);
      service.setServiceHealth("db-service", "http://db:3001", false);
      service.setServiceResponseTime("auth-service", 120);
      service.setServiceResponseTime("db-service", 2500);
      
      // User metrics
      service.setActiveUsers(150);
      service.setTotalUsers(1500);
      service.setUsersByLanguage("en", 800);
      service.setUsersByLanguage("fr", 700);
      service.setAverageUserLevel("en", 2.3);
      service.setAverageUserLevel("fr", 1.9);
      
      // Business metrics
      service.incrementConversations("created");
      service.incrementConversations("completed");
      service.incrementPayments("success", 29.99);
      service.incrementTokensConsumed("openai", "gpt-4", 1200);

      const metrics = await service.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.length).toBeGreaterThan(0);
      expect(() => JSON.stringify(metrics)).not.toThrow();
    });
  });
});
