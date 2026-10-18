/**
 * @generated
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Generated types and API client for Bycme Bicycle Sharing.
 * Source: typespec/main.tsp -> generated/schema/openapi.json
 */

export type BikeStatus = "available" | "in_use" | "maintenance";
export type RideStatus = "active" | "completed";

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  totalDocks: number;
  availableBikes: number;
}

export interface Bike {
  id: string;
  stationId: string;
  bikeModel: string;
  batteryLevel: number;
  status: BikeStatus;
}

export interface Ride {
  id: string;
  bikeId: string;
  userId: string;
  startStationId: string;
  endStationId?: string;
  startTime: string;
  endTime?: string;
  status: RideStatus;
  cost?: number;
}

export interface StartRideRequest {
  bikeId: string;
  userId: string;
}

export interface EndRideRequest {
  endStationId: string;
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
      throw new Error(`API Error ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  }

  getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>("/api/health");
  }

  listStations(): Promise<Station[]> {
    return this.request<Station[]>("/api/stations");
  }

  getStation(id: string): Promise<Station> {
    return this.request<Station>(`/api/stations/${encodeURIComponent(id)}`);
  }

  listBikes(stationId?: string): Promise<Bike[]> {
    const query = stationId ? `?stationId=${encodeURIComponent(stationId)}` : "";
    return this.request<Bike[]>(`/api/bikes${query}`);
  }

  getBike(id: string): Promise<Bike> {
    return this.request<Bike>(`/api/bikes/${encodeURIComponent(id)}`);
  }

  listActiveRides(): Promise<Ride[]> {
    return this.request<Ride[]>("/api/rides");
  }

  startRide(body: StartRideRequest): Promise<Ride> {
    return this.request<Ride>("/api/rides", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  endRide(id: string, body: EndRideRequest): Promise<Ride> {
    return this.request<Ride>(`/api/rides/${encodeURIComponent(id)}/end`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}
