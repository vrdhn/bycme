/**
 * Data response formatters for invitations, cycles, and checkouts.
 */

/**
 * Format raw invitation database row into API client response shape.
 */
export function formatManagerInvitation(
  row: {
    id: string;
    token: string;
    parking_id: string;
    role: string;
    created_by: string;
    status: string;
    is_preapproved?: number;
    expires_at: string;
    created_at: string;
    parking_name?: string;
    city_name?: string;
    created_by_name?: string;
  },
  frontendBase: string = "https://bycme-staging.pages.dev",
  explicitHours?: number
) {
  const isPreapproved = Boolean(row.is_preapproved);
  const routePrefix = row.role === "Rider" ? "join/rider" : "join/mgr";
  const inviteUrl = `${frontendBase}/#/${routePrefix}/${row.token}`;
  const hours =
    explicitHours ||
    Math.max(
      1,
      Math.round((new Date(row.expires_at).getTime() - Date.now()) / (3600 * 1000))
    );
  const parkingInfo = row.parking_name
    ? `${row.parking_name}${row.city_name ? ` (${row.city_name})` : ""}`
    : "this parking lot";
  const inviter = row.created_by_name || (row.role === "Rider" ? "Parking Manager" : "System Admin");

  const accessNote = isPreapproved
    ? `Note: This is a direct pre-approved invitation (single-use) valid for ${hours} hours.`
    : `Note: This link is valid for ${hours} hours. Submissions require approval.`;

  const actionText = row.role === "Rider" ? "ride bicycles at" : "manage";
  const whatsappMessage =
    `${inviter} is inviting you to ${actionText} ${parkingInfo}.\n` +
    `Click here to register and get started:\n` +
    `${inviteUrl}\n\n` +
    accessNote;

  return {
    id: row.id,
    token: row.token,
    parkingId: row.parking_id,
    role: row.role,
    createdBy: row.created_by,
    status: row.status,
    isPreapproved,
    expiresAt: row.expires_at,
    inviteUrl,
    whatsappMessage,
    parkingName: row.parking_name,
    cityName: row.city_name,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

/**
 * Format raw cycle database row into API client response shape.
 */
export function formatCycle(
  row: {
    id: string;
    public_cycle_id: string;
    parking_id: string;
    company: string;
    model: string;
    colour: string;
    status: string;
    lock_code?: string;
    qr_code: string;
    created_at: string;
    updated_at: string;
    parking_name?: string;
    city_name?: string;
  },
  frontendBase: string = "https://bycme-staging.pages.dev",
  includeLockCode: boolean = true,
  isAvailable?: boolean,
  isCheckedOutByMe?: boolean
) {
  return {
    id: row.id,
    publicCycleId: row.public_cycle_id,
    parkingId: row.parking_id,
    brand: row.company,
    cycleModel: row.model,
    colour: row.colour,
    status: row.status,
    lockCode: includeLockCode ? row.lock_code : undefined,
    qrCode: row.qr_code,
    qrUrl: `${frontendBase}/#/cycle/${row.qr_code}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parkingName: row.parking_name,
    cityName: row.city_name,
    isAvailable: isAvailable ?? (row.status === "Working"),
    isCheckedOutByMe: isCheckedOutByMe ?? false,
  };
}

/**
 * Format raw checkout database row into API client response shape.
 */
export function formatCycleCheckout(row: {
  id: string;
  cycle_id: string;
  person_id: string;
  parking_id: string;
  checked_out_at: string;
  returned_at?: string | null;
  status: string;
  public_cycle_id?: string;
  company?: string;
  model?: string;
  colour?: string;
  lock_code?: string;
  parking_name?: string;
  city_name?: string;
  return_condition?: string | null;
  return_notes?: string | null;
}) {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    personId: row.person_id,
    parkingId: row.parking_id,
    checkedOutAt: row.checked_out_at,
    returnedAt: row.returned_at || undefined,
    status: row.status,
    publicCycleId: row.public_cycle_id,
    brand: row.company,
    cycleModel: row.model,
    colour: row.colour,
    lockCode: row.lock_code,
    parkingName: row.parking_name,
    cityName: row.city_name,
    returnCondition: row.return_condition || undefined,
    returnNotes: row.return_notes || undefined,
  };
}
