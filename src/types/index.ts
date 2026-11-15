export type DatabaseStatus = "up" | "down";

export type HealthStatus = {
  status: "ok" | "degraded";
  service: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: DatabaseStatus;
  };
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
};
