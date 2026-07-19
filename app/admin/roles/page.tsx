/**
 * app/admin/roles/page.tsx
 * RSR-APP-045
 *
 * Founder-only role management for internal team accounts. Roles per
 * schema (Blueprint §6.2 users/{uid}.role): support, contentManager,
 * financeManager, marketingManager, founder, superAdmin — separate from
 * customer/seller roles, which are never editable from this screen.
 * Role changes call setCustomClaims (RSR-FBS-008) via adminService —
 * this UI never writes the custom claim directly.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { adminService } from "@/services/adminService";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import Button from "@/components/Button";

type InternalRole =
  | "support"
  | "contentManager"
  | "financeManager"
  | "marketingManager"
  | "founder"
  | "superAdmin";

interface TeamMember {
  uid: string;
  fullName: string;
  email: string;
  role: InternalRole;
  status: "active" | "suspended";
  addedAt: string;
}

type ViewState = "loading" | "ready" | "empty" | "error";

const ROLE_LABEL: Record<InternalRole, string> = {
  support: "Support",
  contentManager: "Content Manager",
  financeManager: "Finance Manager",
  marketingManager: "Marketing Manager",
  founder: "Founder",
  superAdmin: "Super Admin",
};

const ASSIGNABLE_ROLES: InternalRole[] = [
  "support",
  "contentManager",
  "financeManager",
  "marketingManager",
];

export default function AdminRolesPage() {
  useRouteGuard({ requiredRole: "founder" });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InternalRole>("support");
  const [inviting, setInviting] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setViewState("loading");
    try {
      const data = await adminService.getTeamMembers();
      setMembers(data);
      setViewState(data.length === 0 ? "empty" : "ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load team members."
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setErrorMessage("Enter an email address.");
      return;
    }
    setInviting(true);
    setErrorMessage("");
    try {
      await adminService.inviteTeamMember(inviteEmail.trim(), inviteRole);
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteRole("support");
      await loadMembers();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not send invite."
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: InternalRole) => {
    setUpdatingUid(uid);
    const previous = members;
    setMembers((current) =>
      current.map((m) => (m.uid === uid ? { ...m, role: newRole } : m))
    );
    try {
      await adminService.setTeamMemberRole(uid, newRole);
    } catch (err) {
      setMembers(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not update this role."
      );
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    setUpdatingUid(member.uid);
    const previous = members;
    const nextStatus = member.status === "active" ? "suspended" : "active";
    setMembers((current) =>
      current.map((m) =>
        m.uid === member.uid ? { ...m, status: nextStatus } : m
      )
    );
    try {
      await adminService.setTeamMemberStatus(member.uid, nextStatus);
    } catch (err) {
      setMembers(previous);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not update this member."
      );
    } finally {
      setUpdatingUid(null);
    }
  };

  if (viewState === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Roles & Team
        </h1>
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  if (viewState === "error" && !showInviteForm) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-h1 text-black-900 mb-8">
          Roles & Team
        </h1>
        <ErrorState message={errorMessage} onRetry={loadMembers} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-h1 text-black-900">Roles & Team</h1>
        {!showInviteForm && (
          <Button variant="primary" onClick={() => setShowInviteForm(true)}>
            Invite Team Member
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md bg-error/10 px-4 py-3 text-caption text-error">
          {errorMessage}
        </div>
      )}

      {showInviteForm && (
        <div className="mb-8 rounded-md bg-ivory-50 p-6 shadow-card">
          <h2 className="font-display text-h3 text-black-900 mb-4">
            Invite Team Member
          </h2>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-caption text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-caption text-gray-700">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as InternalRole)
                }
                className="w-full rounded-sm border border-gray-300 px-3 py-2 text-body focus:border-gold-500 focus:outline-none"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" loading={inviting} onClick={handleInvite}>
              Send Invite
            </Button>
            <Button variant="ghost" onClick={() => setShowInviteForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {viewState === "empty" && !showInviteForm ? (
        <EmptyState
          title="No team members yet."
          description="Invite support, content, finance, or marketing team members here."
          actionLabel="Invite Team Member"
          onAction={() => setShowInviteForm(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <div
              key={member.uid}
              className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-ivory-50 p-4 shadow-card"
            >
              <div>
                <p className="text-body text-black-900">{member.fullName}</p>
                <p className="text-caption text-gray-500">{member.email}</p>
              </div>

              <div className="flex items-center gap-4">
                {member.role === "founder" || member.role === "superAdmin" ? (
                  <span className="rounded-full bg-gold-100 px-3 py-1 text-caption text-gold-600">
                    {ROLE_LABEL[member.role]}
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.uid, e.target.value as InternalRole)
                    }
                    disabled={updatingUid === member.uid}
                    className="rounded-sm border border-gray-300 px-3 py-2 text-caption focus:border-gold-500 focus:outline-none disabled:opacity-50"
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                )}

                <span
                  className={`rounded-full px-2.5 py-1 text-micro ${
                    member.status === "active"
                      ? "bg-success/10 text-success"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {member.status === "active" ? "Active" : "Suspended"}
                </span>

                {member.role !== "founder" && member.role !== "superAdmin" && (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(member)}
                    disabled={updatingUid === member.uid}
                    className="text-caption text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-error disabled:opacity-50"
                  >
                    {member.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
