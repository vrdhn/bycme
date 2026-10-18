import React, { useState } from "react";
import { BycmeClient, ParkingMembership } from "../../../generated/shared";

interface Props {
  client: BycmeClient;
}

export const AnonInviteView: React.FC<Props> = ({ client }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submittedMembership, setSubmittedMembership] = useState<ParkingMembership | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !email.trim() || !password.trim()) return;

    setIsLoading(true);
    setFeedback("");
    try {
      const res = await client.acceptInvitation({
        code: code.trim(),
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      setSubmittedMembership(res);
      setFeedback("Invitation accepted! Your membership request has been submitted to the parking manager.");
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to claim invitation");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="view-container">
      <div className="card max-w-md mx-auto">
        <h2>Claim Parking Invitation</h2>
        <p className="sub-text">Enter your invitation code to request rider access to a parking stand.</p>

        {feedback && <div className="banner-info">{feedback}</div>}

        {submittedMembership ? (
          <div className="success-box">
            <h4>✓ Request Submitted</h4>
            <p>
              Your rider application for parking <strong>{submittedMembership.parkingId}</strong> is currently:
            </p>
            <div className="badge badge-req-pending">Pending Manager Approval</div>
            <p className="text-muted text-sm mt-3">
              Once the manager approves your request, your account will be activated as a Rider for this stand.
            </p>
            <button
              className="btn-secondary mt-3"
              onClick={() => {
                setSubmittedMembership(null);
                setCode("");
                setName("");
                setEmail("");
                setPassword("");
              }}
            >
              Submit Another Code
            </button>
          </div>
        ) : (
          <form onSubmit={handleAcceptInvite} className="form-stack">
            <label>
              Invitation Code:
              <input
                type="text"
                placeholder="e.g. JOIN-NORTH-2026"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            <label>
              Your Full Name:
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Your Email Address:
              <input
                type="email"
                placeholder="e.g. john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Account Password:
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Accept Invitation & Request Access"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
