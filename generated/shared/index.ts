/**
 * @generated
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Base types and client for Bycme.
 * Source: typespec/main.tsp -> generated/schema/openapi.json
 */

export type PersonRole = "Admin" | "Manager" | "Rider";

export interface HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
}

export interface Person {
  id: string;
  email: string;
  name: string;
  roles: PersonRole[];
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Person;
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
      let errorMsg = err;
      try {
        const parsed = JSON.parse(err);
        if (parsed.error) errorMsg = parsed.error;
      } catch {
        // fallback to raw text
      }
      throw new Error(`API Error ${res.status}: ${errorMsg}`);
    }
    return res.json() as Promise<T>;
  }

  getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>("/api/health");
  }

  login(body: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  getMe(token: string): Promise<Person> {
    return this.request<Person>("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  listPersons(token?: string): Promise<Person[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Person[]>("/api/persons", { headers });
  }
}
