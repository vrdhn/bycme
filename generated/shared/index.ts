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
  buildingType?: BuildingType;
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
  isPreapproved?: boolean;
}

export interface ManagerInvitation {
  id: string;
  token: string;
  parkingId: string;
  role: PersonRole;
  createdBy: string;
  status: InvitationStatus;
  isPreapproved: boolean;
  expiresAt: string;
  inviteUrl: string;
  whatsappMessage: string;
  parkingName?: string;
  cityName?: string;
  createdByName?: string;
  createdAt: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface InvitationDetails {
  token: string;
  role: PersonRole;
  isPreapproved: boolean;
  parkingId: string;
  parkingName: string;
  buildingName?: string;
  cityName?: string;
  createdByName?: string;
  expiresAt: string;
  currentParkingId?: string;
  currentParkingName?: string;
  currentCityName?: string;
}

export type ManagerRequestStatus = "pending" | "approved" | "rejected";

export interface ManagerRequest {
  id: string;
  parkingId: string;
  personId: string;
  invitationId?: string;
  status: ManagerRequestStatus;
  createdAt: string;
  updatedAt: string;
  parkingName?: string;
  cityName?: string;
  personName?: string;
  personEmail?: string;
}

export interface RiderRequest {
  id: string;
  parkingId: string;
  personId: string;
  invitationId?: string;
  previousParkingId?: string;
  isSwitch: boolean;
  status: ManagerRequestStatus;
  createdAt: string;
  updatedAt: string;
  parkingName?: string;
  cityName?: string;
  personName?: string;
  personEmail?: string;
  previousParkingName?: string;
  previousCityName?: string;
}

export interface ParkingManager {
  id: string;
  parkingId: string;
  personId: string;
  assignedBy?: string;
  createdAt: string;
  parkingName?: string;
  cityName?: string;
  personName?: string;
  personEmail?: string;
}

export interface ParkingRider {
  id: string;
  parkingId: string;
  personId: string;
  assignedBy?: string;
  createdAt: string;
  parkingName?: string;
  cityName?: string;
  personName?: string;
  personEmail?: string;
}

export interface RespondInvitationRequest {
  confirmSwitch?: boolean;
}

export interface RespondInvitationResponse {
  action: string;
  status: string;
  message: string;
  currentParkingName?: string;
  currentCityName?: string;
  targetParkingName?: string;
  request?: ManagerRequest;
  riderRequest?: RiderRequest;
  parkingManager?: ParkingManager;
  parkingRider?: ParkingRider;
}

export type CycleStatus = "Working" | "Puncture" | "Broken";

export interface Cycle {
  id: string;
  publicCycleId: string;
  parkingId: string;
  brand: string;
  cycleModel: string;
  colour: string;
  status: CycleStatus;
  lockCode: string;
  qrCode: string;
  qrUrl: string;
  createdAt: string;
  updatedAt: string;
  parkingName?: string;
  cityName?: string;
}

export interface CreateCycleRequest {
  publicCycleId?: string;
  brand: string;
  cycleModel: string;
  colour: string;
  status?: CycleStatus;
  lockCode: string;
  qrCode?: string;
}

export interface UpdateCycleRequest {
  brand?: string;
  cycleModel?: string;
  colour?: string;
  status?: CycleStatus;
  lockCode?: string;
  qrCode?: string;
  parkingId?: string;
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

  register(body: RegisterRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  getInvitation(token: string, authToken?: string): Promise<InvitationDetails> {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return this.request<InvitationDetails>(`/api/invitations/${encodeURIComponent(token)}`, { headers });
  }

  respondToInvitation(
    tokenStr: string,
    body?: RespondInvitationRequest,
    authToken?: string
  ): Promise<RespondInvitationResponse> {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return this.request<RespondInvitationResponse>(
      `/api/invitations/${encodeURIComponent(tokenStr)}/respond`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body || {}),
      }
    );
  }

  createRiderInvitation(
    parkingId: string,
    body: CreateManagerInvitationRequest,
    token?: string
  ): Promise<ManagerInvitation> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<ManagerInvitation>(
      `/api/parkings/${encodeURIComponent(parkingId)}/rider-invitations`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );
  }

  listRiderInvitations(parkingId: string, token?: string): Promise<ManagerInvitation[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<ManagerInvitation[]>(
      `/api/parkings/${encodeURIComponent(parkingId)}/rider-invitations`,
      { headers }
    );
  }

  revokeRiderInvitation(
    parkingId: string,
    invitationId: string,
    token?: string
  ): Promise<ManagerInvitation> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<ManagerInvitation>(
      `/api/parkings/${encodeURIComponent(parkingId)}/rider-invitations/${encodeURIComponent(invitationId)}/revoke`,
      {
        method: "POST",
        headers,
      }
    );
  }

  listParkingRiderRequests(parkingId: string, token?: string): Promise<RiderRequest[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<RiderRequest[]>(
      `/api/me/parkings/${encodeURIComponent(parkingId)}/rider-requests`,
      { headers }
    );
  }

  approveParkingRiderRequest(
    parkingId: string,
    requestId: string,
    token?: string
  ): Promise<RiderRequest> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<RiderRequest>(
      `/api/me/parkings/${encodeURIComponent(parkingId)}/rider-requests/${encodeURIComponent(requestId)}/approve`,
      {
        method: "POST",
        headers,
      }
    );
  }

  rejectParkingRiderRequest(
    parkingId: string,
    requestId: string,
    token?: string
  ): Promise<RiderRequest> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<RiderRequest>(
      `/api/me/parkings/${encodeURIComponent(parkingId)}/rider-requests/${encodeURIComponent(requestId)}/reject`,
      {
        method: "POST",
        headers,
      }
    );
  }

  listParkingRiders(parkingId: string, token?: string): Promise<ParkingRider[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<ParkingRider[]>(
      `/api/me/parkings/${encodeURIComponent(parkingId)}/riders`,
      { headers }
    );
  }

  getMyManagerRequests(authToken?: string): Promise<ManagerRequest[]> {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return this.request<ManagerRequest[]>("/api/me/manager-requests", { headers });
  }

  listAdminManagerRequests(authToken?: string): Promise<ManagerRequest[]> {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return this.request<ManagerRequest[]>("/api/admin/manager-requests", { headers });
  }

  approveManagerRequest(id: string, authToken?: string): Promise<ManagerRequest> {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return this.request<ManagerRequest>(
      `/api/admin/manager-requests/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",
        headers,
      }
    );
  }

  rejectManagerRequest(id: string, authToken?: string): Promise<ManagerRequest> {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return this.request<ManagerRequest>(
      `/api/admin/manager-requests/${encodeURIComponent(id)}/reject`,
      {
        method: "POST",
        headers,
      }
    );
  }

  listAdminInvitations(token?: string, status?: string): Promise<ManagerInvitation[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<ManagerInvitation[]>(`/api/admin/invitations${q}`, { headers });
  }

  revokeAdminInvitation(id: string, token?: string): Promise<ManagerInvitation> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<ManagerInvitation>(
      `/api/admin/invitations/${encodeURIComponent(id)}/revoke`,
      {
        method: "POST",
        headers,
      }
    );
  }

  getMyManagedParkings(token?: string): Promise<Parking[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Parking[]>("/api/me/parkings", { headers });
  }

  listParkingCycles(parkingId: string, token?: string): Promise<Cycle[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Cycle[]>(`/api/parkings/${encodeURIComponent(parkingId)}/cycles`, { headers });
  }

  createCycle(parkingId: string, body: CreateCycleRequest, token?: string): Promise<Cycle> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Cycle>(`/api/parkings/${encodeURIComponent(parkingId)}/cycles`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  updateCycle(id: string, body: UpdateCycleRequest, token?: string): Promise<Cycle> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Cycle>(`/api/cycles/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  }

  lookupCycle(identifier: string, token?: string): Promise<Cycle> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return this.request<Cycle>(`/api/cycles/lookup/${encodeURIComponent(identifier)}`, { headers });
  }
}
