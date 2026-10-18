/**
 * @generated
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Domain models and API client for Bycme Cycle Sharing.
 * Source: typespec/main.tsp -> generated/schema/openapi.json
 */

export type PersonRole = "Admin" | "Manager" | "Rider";
export type BuildingType = "Private" | "Public";
export type CycleCondition = "Working" | "Broken" | "Puncture";
export type RideStatus = "active" | "finished";
export type MembershipStatus = "pending" | "approved" | "disapproved";
export type InvitationStatus = "active" | "expired" | "revoked";

export interface Building {
  id: string;
  name: string;
  buildingType: BuildingType;
  createdAt: string;
}

export interface Parking {
  id: string;
  buildingId: string;
  name: string;
  capacity: number;
  managerIds: string[];
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  roles: PersonRole[];
  parkingIds: string[];
  createdAt: string;
}

export interface Cycle {
  id: string;
  publicCycleId: string;
  parkingId: string;
  makeModel: string;
  qrCode: string;
  condition: CycleCondition;
  createdAt: string;
}

export interface CycleConditionTrail {
  id: string;
  cycleId: string;
  personId: string;
  fromCondition: string;
  toCondition: string;
  notes: string;
  createdAt: string;
}

export interface Ride {
  id: string;
  cycleId: string;
  riderId: string;
  parkingId: string;
  status: RideStatus;
  startTime: string;
  endTime?: string;
  checkoutNotes: string;
  checkinNotes: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  code: string;
  parkingId: string;
  createdBy: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface ParkingMembership {
  id: string;
  parkingId: string;
  personId: string;
  status: MembershipStatus;
  createdAt: string;
  personName?: string;
  personEmail?: string;
  parkingName?: string;
}

export interface CreateBuildingRequest {
  name: string;
  buildingType: BuildingType;
}

export interface CreateParkingRequest {
  buildingId: string;
  name: string;
  capacity: number;
  managerIds?: string[];
}

export interface UpdateParkingManagersRequest {
  managerIds: string[];
}

export interface UpdateUserRolesRequest {
  roles: PersonRole[];
}

export interface CreateInvitationRequest {
  parkingId: string;
}

export interface AcceptInvitationRequest {
  code: string;
  name: string;
  email: string;
  password: string;
}

export interface UpdateMembershipRequest {
  status: MembershipStatus;
}

export interface CreateCycleRequest {
  parkingId: string;
  publicCycleId: string;
  makeModel: string;
}

export interface UpdateCycleConditionRequest {
  condition: CycleCondition;
  notes: string;
}

export interface CheckoutCycleRequest {
  cycleId: string;
  checkoutNotes?: string;
}

export interface CheckinCycleRequest {
  checkinNotes?: string;
  conditionChange?: CycleCondition;
}

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

  listPersons(): Promise<Person[]> {
    return this.request<Person[]>("/api/persons");
  }

  updatePersonRoles(id: string, body: UpdateUserRolesRequest): Promise<Person> {
    return this.request<Person>(`/api/persons/${encodeURIComponent(id)}/roles`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  listBuildings(): Promise<Building[]> {
    return this.request<Building[]>("/api/buildings");
  }

  createBuilding(body: CreateBuildingRequest): Promise<Building> {
    return this.request<Building>("/api/buildings", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  listParkings(managerId?: string): Promise<Parking[]> {
    const q = managerId ? `?managerId=${encodeURIComponent(managerId)}` : "";
    return this.request<Parking[]>(`/api/parkings${q}`);
  }

  createParking(body: CreateParkingRequest): Promise<Parking> {
    return this.request<Parking>("/api/parkings", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  updateParkingManagers(id: string, body: UpdateParkingManagersRequest): Promise<Parking> {
    return this.request<Parking>(`/api/parkings/${encodeURIComponent(id)}/managers`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  listCycles(parkingId?: string): Promise<Cycle[]> {
    const q = parkingId ? `?parkingId=${encodeURIComponent(parkingId)}` : "";
    return this.request<Cycle[]>(`/api/cycles${q}`);
  }

  createCycle(body: CreateCycleRequest): Promise<Cycle> {
    return this.request<Cycle>("/api/cycles", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  updateCycleCondition(id: string, body: UpdateCycleConditionRequest): Promise<Cycle> {
    return this.request<Cycle>(`/api/cycles/${encodeURIComponent(id)}/condition`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  getCycleTrails(id: string): Promise<CycleConditionTrail[]> {
    return this.request<CycleConditionTrail[]>(`/api/cycles/${encodeURIComponent(id)}/trails`);
  }

  listRides(params?: { parkingId?: string; riderId?: string; status?: RideStatus }): Promise<Ride[]> {
    const searchParams = new URLSearchParams();
    if (params?.parkingId) searchParams.set("parkingId", params.parkingId);
    if (params?.riderId) searchParams.set("riderId", params.riderId);
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return this.request<Ride[]>(`/api/rides${qs ? `?${qs}` : ""}`);
  }

  checkoutCycle(body: CheckoutCycleRequest, riderId: string): Promise<Ride> {
    return this.request<Ride>("/api/rides/checkout", {
      method: "POST",
      headers: {
        "x-user-id": riderId,
      },
      body: JSON.stringify(body),
    });
  }

  checkinCycle(rideId: string, body: CheckinCycleRequest, riderId: string): Promise<Ride> {
    return this.request<Ride>(`/api/rides/${encodeURIComponent(rideId)}/checkin`, {
      method: "POST",
      headers: {
        "x-user-id": riderId,
      },
      body: JSON.stringify(body),
    });
  }

  createInvitation(body: CreateInvitationRequest, managerId: string): Promise<Invitation> {
    return this.request<Invitation>("/api/invitations", {
      method: "POST",
      headers: {
        "x-user-id": managerId,
      },
      body: JSON.stringify(body),
    });
  }

  acceptInvitation(body: AcceptInvitationRequest): Promise<ParkingMembership> {
    return this.request<ParkingMembership>("/api/invitations/accept", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  listMemberships(parkingId?: string): Promise<ParkingMembership[]> {
    const q = parkingId ? `?parkingId=${encodeURIComponent(parkingId)}` : "";
    return this.request<ParkingMembership[]>(`/api/memberships${q}`);
  }

  updateMembership(id: string, body: UpdateMembershipRequest): Promise<ParkingMembership> {
    return this.request<ParkingMembership>(`/api/memberships/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}
