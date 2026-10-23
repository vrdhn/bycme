import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{
  title: "Bycme API",
})
@server("https://bycme-staging.bycme-backend.workers.dev", "Staging environment")
namespace Bycme;

model HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
}

enum PersonRole {
  Admin,
  Manager,
  Rider,
}

model Person {
  id: string;
  email: string;
  name: string;
  roles: PersonRole[];
  createdAt: string;
}

model LoginRequest {
  email: string;
  password: string;
}

model LoginResponse {
  token: string;
  user: Person;
}

model City {
  id: string;
  name: string;
  state: string;
  createdAt: string;
}

model CreateCityRequest {
  name: string;
  state: string;
}

model UpdateCityRequest {
  name?: string;
  state?: string;
}

enum BuildingType {
  Private,
  Public,
}

model Building {
  id: string;
  cityId: string;
  name: string;
  buildingType: BuildingType;
  createdAt: string;
  cityName?: string;
}

model CreateBuildingRequest {
  cityId: string;
  name: string;
  buildingType: BuildingType;
}

model UpdateBuildingRequest {
  cityId?: string;
  name?: string;
  buildingType?: BuildingType;
}

model Parking {
  id: string;
  buildingId: string;
  name: string;
  capacity: int32;
  createdAt: string;
  buildingName?: string;
  cityName?: string;
  buildingType?: BuildingType;
}

model CreateParkingRequest {
  buildingId: string;
  name: string;
  capacity: int32;
}

model UpdateParkingRequest {
  buildingId?: string;
  name?: string;
  capacity?: int32;
}

enum InvitationStatus {
  active,
  used,
  revoked,
}

model CreateManagerInvitationRequest {
  durationHours?: int32;
  isPreapproved?: boolean;
}

model ManagerInvitation {
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

model RegisterRequest {
  name: string;
  email: string;
  password: string;
}

model InvitationDetails {
  token: string;
  role: PersonRole;
  isPreapproved: boolean;
  parkingId: string;
  parkingName: string;
  buildingName?: string;
  cityName?: string;
  createdByName?: string;
  expiresAt: string;
}

enum ManagerRequestStatus {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
}

model ManagerRequest {
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

model ParkingManager {
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

model RespondInvitationResponse {
  action: string;
  status: string;
  message: string;
  request?: ManagerRequest;
  parkingManager?: ParkingManager;
}

enum CycleStatus {
  Working: "Working",
  Puncture: "Puncture",
  Broken: "Broken",
}

model Cycle {
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

model CreateCycleRequest {
  publicCycleId: string;
  brand: string;
  cycleModel: string;
  colour: string;
  status?: CycleStatus;
  lockCode: string;
  qrCode?: string;
}

model UpdateCycleRequest {
  brand?: string;
  cycleModel?: string;
  colour?: string;
  status?: CycleStatus;
  lockCode?: string;
  qrCode?: string;
  parkingId?: string;
}

@route("/api")
namespace Endpoints {
  @get
  @route("/health")
  op getHealth(): HealthStatus;

  @post
  @route("/auth/login")
  op login(@body body: LoginRequest): LoginResponse;

  @post
  @route("/auth/register")
  op register(@body body: RegisterRequest): LoginResponse;

  @get
  @route("/auth/me")
  op getMe(@header authorization?: string): Person;

  @get
  @route("/persons")
  op listPersons(@header authorization?: string): Person[];

  @get
  @route("/cities")
  op listCities(@header authorization?: string): City[];

  @post
  @route("/cities")
  op createCity(@body body: CreateCityRequest, @header authorization?: string): City;

  @put
  @route("/cities/{id}")
  op updateCity(@path id: string, @body body: UpdateCityRequest, @header authorization?: string): City;

  @get
  @route("/buildings")
  op listBuildings(@header authorization?: string, @query cityId?: string): Building[];

  @post
  @route("/buildings")
  op createBuilding(@body body: CreateBuildingRequest, @header authorization?: string): Building;

  @put
  @route("/buildings/{id}")
  op updateBuilding(@path id: string, @body body: UpdateBuildingRequest, @header authorization?: string): Building;

  @get
  @route("/parkings")
  op listParkings(@header authorization?: string, @query buildingId?: string): Parking[];

  @post
  @route("/parkings")
  op createParking(@body body: CreateParkingRequest, @header authorization?: string): Parking;

  @put
  @route("/parkings/{id}")
  op updateParking(@path id: string, @body body: UpdateParkingRequest, @header authorization?: string): Parking;

  @post
  @route("/parkings/{id}/manager-invitations")
  op createManagerInvitation(
    @path id: string,
    @body body: CreateManagerInvitationRequest,
    @header authorization?: string
  ): ManagerInvitation;

  @get
  @route("/parkings/{id}/manager-invitations")
  op listManagerInvitations(
    @path id: string,
    @header authorization?: string
  ): ManagerInvitation[];

  @get
  @route("/invitations/{token}")
  op getInvitation(@path token: string): InvitationDetails;

  @post
  @route("/invitations/{token}/respond")
  op respondToInvitation(
    @path token: string,
    @header authorization?: string
  ): RespondInvitationResponse;

  @get
  @route("/me/manager-requests")
  op getMyManagerRequests(@header authorization?: string): ManagerRequest[];

  @get
  @route("/admin/manager-requests")
  op listAdminManagerRequests(@header authorization?: string): ManagerRequest[];

  @post
  @route("/admin/manager-requests/{id}/approve")
  op approveManagerRequest(
    @path id: string,
    @header authorization?: string
  ): ManagerRequest;

  @post
  @route("/admin/manager-requests/{id}/reject")
  op rejectManagerRequest(
    @path id: string,
    @header authorization?: string
  ): ManagerRequest;

  @get
  @route("/admin/invitations")
  op listAdminInvitations(
    @header authorization?: string,
    @query status?: string
  ): ManagerInvitation[];

  @post
  @route("/admin/invitations/{id}/revoke")
  op revokeAdminInvitation(
    @path id: string,
    @header authorization?: string
  ): ManagerInvitation;

  @get
  @route("/me/parkings")
  op getMyManagedParkings(@header authorization?: string): Parking[];

  @get
  @route("/parkings/{id}/cycles")
  op listParkingCycles(
    @path id: string,
    @header authorization?: string
  ): Cycle[];

  @post
  @route("/parkings/{id}/cycles")
  op createCycle(
    @path id: string,
    @body body: CreateCycleRequest,
    @header authorization?: string
  ): Cycle;

  @put
  @route("/cycles/{id}")
  op updateCycle(
    @path id: string,
    @body body: UpdateCycleRequest,
    @header authorization?: string
  ): Cycle;

  @get
  @route("/cycles/lookup/{identifier}")
  op lookupCycle(
    @path identifier: string,
    @header authorization?: string
  ): Cycle;
}
