import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{
  title: "Bycme Bicycle Sharing API",
})
@server("https://bycme-staging.pages.dev", "Staging environment")
namespace Bycme;

model Station {
  id: string;
  name: string;
  latitude: float32;
  longitude: float32;
  totalDocks: int32;
  availableBikes: int32;
}

enum BikeStatus {
  available,
  inUse,
  maintenance,
}

model Bike {
  id: string;
  stationId: string;
  bikeModel: string;
  batteryLevel: int32;
  status: BikeStatus;
}

enum RideStatus {
  active,
  completed,
}

model Ride {
  id: string;
  bikeId: string;
  userId: string;
  startStationId: string;
  endStationId?: string;
  startTime: string;
  endTime?: string;
  status: RideStatus;
  cost?: float32;
}

model StartRideRequest {
  bikeId: string;
  userId: string;
}

model EndRideRequest {
  endStationId: string;
}

model HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
}

@route("/api/health")
interface HealthOperations {
  @get getHealth(): HealthStatus;
}

@route("/api/stations")
interface StationOperations {
  @get listStations(): Station[];
  @get getStation(@path id: string): Station;
}

@route("/api/bikes")
interface BikeOperations {
  @get listBikes(@query stationId?: string): Bike[];
  @get getBike(@path id: string): Bike;
}

@route("/api/rides")
interface RideOperations {
  @get listActiveRides(): Ride[];
  @post startRide(@body body: StartRideRequest): Ride;
  @route("/{id}/end")
  @post endRide(@path id: string, @body body: EndRideRequest): Ride;
}
