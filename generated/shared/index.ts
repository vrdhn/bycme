/**
 * @generated
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Base types and client for Bycme.
 * Source: typespec/main.tsp -> generated/schema/openapi.json
 */

export type PersonRole = "Admin" | "Manager" | "Rider";
export type BuildingType = "Private" | "Public";

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

export interface City {
  id: string;
  name: string;
  state: string;
  createdAt: string;
}

export interface CreateCityRequest {
  name: string;
  state: string;
}

export interface UpdateCityRequest {
  name?: string;
  state?: string;
}

export interface Building {
  id: string;
  cityId: string;
  name: string;
  buildingType: BuildingType;
  createdAt: string;
  cityName?: string;
}

export interface CreateBuildingRequest {
  cityId: string;
  name: string;
  buildingType: BuildingType;
}

export interface UpdateBuildingRequest {
  cityId?: string;
  name?: string;
  buildingType?: BuildingType;
}

export interface Parking {
  id: string;
  buildingId: string;
  name: string;
  capacity: number;
  createdAt: string;
  buildingName?: string;
  cityName?: string;
}

export interface CreateParkingRequest {
  buildingId: string;
  name: string;
  capacity: number;
}

export interface UpdateParkingRequest {
  buildingId?: string;
  name?: string;
  capacity?: number;
}

export type InvitationStatus = "active" | "used" | "revoked";

export interface CreateManagerInvitationRequest {
  durationHours?: number;
}

export interface ManagerInvitation {
  id: string;
  token: string;
  parkingId: string;
  role: PersonRole;
  createdBy: string;
  status: InvitationStatus;
  expiresAt: string;
  inviteUrl: string;
  whatsappMessage: string;
  parkingName?: string;
  cityName?: string;
  createdByName?: string;
  createdAt: string;
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

  listCities(token?: string): Promise<City[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<City[]>("/api/cities", { headers });
  }

  createCity(body: CreateCityRequest, token?: string): Promise<City> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<City>("/api/cities", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  updateCity(id: string, body: UpdateCityRequest, token?: string): Promise<City> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<City>(`/api/cities/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  }

  listBuildings(cityId?: string, token?: string): Promise<Building[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const q = cityId ? `?cityId=${encodeURIComponent(cityId)}` : "";
    return this.request<Building[]>(`/api/buildings${q}`, { headers });
  }

  createBuilding(body: CreateBuildingRequest, token?: string): Promise<Building> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Building>("/api/buildings", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  updateBuilding(id: string, body: UpdateBuildingRequest, token?: string): Promise<Building> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Building>(`/api/buildings/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  }

  listParkings(buildingId?: string, token?: string): Promise<Parking[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const q = buildingId ? `?buildingId=${encodeURIComponent(buildingId)}` : "";
    return this.request<Parking[]>(`/api/parkings${q}`, { headers });
  }

  createParking(body: CreateParkingRequest, token?: string): Promise<Parking> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Parking>("/api/parkings", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  updateParking(id: string, body: UpdateParkingRequest, token?: string): Promise<Parking> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Parking>(`/api/parkings/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  }

  createManagerInvitation(
    parkingId: string,
    body: CreateManagerInvitationRequest,
    token?: string
  ): Promise<ManagerInvitation> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<ManagerInvitation>(
      `/api/parkings/${encodeURIComponent(parkingId)}/manager-invitations`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );
  }

  listManagerInvitations(parkingId: string, token?: string): Promise<ManagerInvitation[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<ManagerInvitation[]>(
      `/api/parkings/${encodeURIComponent(parkingId)}/manager-invitations`,
      { headers }
    );
  }
}
