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

enum PersonRole {
  Admin: "Admin",
  Manager: "Manager",
  Rider: "Rider",
}

enum BuildingType {
  Private: "Private",
  Public: "Public",
}

enum CycleCondition {
  Working: "Working",
  Broken: "Broken",
  Puncture: "Puncture",
}

enum RideStatus {
  active: "active",
  finished: "finished",
}

enum MembershipStatus {
  pending: "pending",
  approved: "approved",
  disapproved: "disapproved",
}

enum InvitationStatus {
  active: "active",
  expired: "expired",
  revoked: "revoked",
}

model Building {
  id: string;
  name: string;
  buildingType: BuildingType;
  createdAt: string;
}

model Parking {
  id: string;
  buildingId: string;
  name: string;
  capacity: int32;
  managerIds: string[];
  createdAt: string;
}

model Person {
  id: string;
  name: string;
  email: string;
  roles: PersonRole[];
  parkingIds: string[];
  createdAt: string;
}

model Cycle {
  id: string;
  publicCycleId: string;
  parkingId: string;
  makeModel: string;
  qrCode: string;
  condition: CycleCondition;
  createdAt: string;
}

model CycleConditionTrail {
  id: string;
  cycleId: string;
  personId: string;
  fromCondition: string;
  toCondition: string;
  notes: string;
  createdAt: string;
}

model Ride {
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

model Invitation {
  id: string;
  code: string;
  parkingId: string;
  createdBy: string;
  status: InvitationStatus;
  createdAt: string;
}

model ParkingMembership {
  id: string;
  parkingId: string;
  personId: string;
  status: MembershipStatus;
  createdAt: string;
  personName?: string;
  personEmail?: string;
  parkingName?: string;
}

model CreateBuildingRequest {
  name: string;
  buildingType: BuildingType;
}

model CreateParkingRequest {
  buildingId: string;
  name: string;
  capacity: int32;
  managerIds?: string[];
}

model UpdateParkingManagersRequest {
  managerIds: string[];
}

model UpdateUserRolesRequest {
  roles: PersonRole[];
}

model CreateInvitationRequest {
  parkingId: string;
}

model AcceptInvitationRequest {
  code: string;
  name: string;
  email: string;
  password: string;
}

model UpdateMembershipRequest {
  status: MembershipStatus;
}

model CreateCycleRequest {
  parkingId: string;
  publicCycleId: string;
  makeModel: string;
}

model UpdateCycleConditionRequest {
  condition: CycleCondition;
  notes: string;
}

model CheckoutCycleRequest {
  cycleId: string;
  checkoutNotes?: string;
}

model CheckinCycleRequest {
  checkinNotes?: string;
  conditionChange?: CycleCondition;
}

model HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
}

@route("/api")
namespace Endpoints {
  @get
  @route("/health")
  op getHealth(): HealthStatus;

  @get
  @route("/persons")
  op listPersons(): Person[];

  @put
  @route("/persons/{id}/roles")
  op updatePersonRoles(@path id: string, @body body: UpdateUserRolesRequest): Person;

  @get
  @route("/buildings")
  op listBuildings(): Building[];

  @post
  @route("/buildings")
  op createBuilding(@body body: CreateBuildingRequest): Building;

  @get
  @route("/parkings")
  op listParkings(@query managerId?: string): Parking[];

  @post
  @route("/parkings")
  op createParking(@body body: CreateParkingRequest): Parking;

  @put
  @route("/parkings/{id}/managers")
  op updateParkingManagers(@path id: string, @body body: UpdateParkingManagersRequest): Parking;

  @get
  @route("/cycles")
  op listCycles(@query parkingId?: string): Cycle[];

  @post
  @route("/cycles")
  op createCycle(@body body: CreateCycleRequest): Cycle;

  @put
  @route("/cycles/{id}/condition")
  op updateCycleCondition(@path id: string, @body body: UpdateCycleConditionRequest): Cycle;

  @get
  @route("/cycles/{id}/trails")
  op getCycleTrails(@path id: string): CycleConditionTrail[];

  @get
  @route("/rides")
  op listRides(@query parkingId?: string, @query riderId?: string, @query status?: RideStatus): Ride[];

  @post
  @route("/rides/checkout")
  op checkoutCycle(@body body: CheckoutCycleRequest): Ride;

  @post
  @route("/rides/{id}/checkin")
  op checkinCycle(@path id: string, @body body: CheckinCycleRequest): Ride;

  @post
  @route("/invitations")
  op createInvitation(@body body: CreateInvitationRequest): Invitation;

  @post
  @route("/invitations/accept")
  op acceptInvitation(@body body: AcceptInvitationRequest): ParkingMembership;

  @get
  @route("/memberships")
  op listMemberships(@query parkingId?: string): ParkingMembership[];

  @put
  @route("/memberships/{id}")
  op updateMembership(@path id: string, @body body: UpdateMembershipRequest): ParkingMembership;
}
