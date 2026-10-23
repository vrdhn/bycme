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

@route("/api")
namespace Endpoints {
  @get
  @route("/health")
  op getHealth(): HealthStatus;
}
