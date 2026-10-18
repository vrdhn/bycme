/**
 * @generated
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Base types and client for Bycme.
 * Source: typespec/main.tsp -> generated/schema/openapi.json
 */

export interface HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
}

export class BycmeClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API Error ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  }

  getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>("/api/health");
  }
}
