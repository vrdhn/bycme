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

@route("/api")
namespace Endpoints {
  @get
  @route("/health")
  op getHealth(): HealthStatus;

  @post
  @route("/auth/login")
  op login(@body body: LoginRequest): LoginResponse;

  @get
  @route("/auth/me")
  op getMe(@header authorization?: string): Person;

  @get
  @route("/persons")
  op listPersons(@header authorization?: string): Person[];
}
