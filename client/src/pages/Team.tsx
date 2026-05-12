import "./Team.css";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Search,
  X,
  Check,
  ChevronDown,
  Mail,
  Shield,
  Store,
  Trash2,
  UserX,
  UserCog,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../lib/api";
import useAuthStore from "../stores/authStore";
import { ALL_PERMISSIONS } from "./teamPermissions";

// ─── Types ─────────────────────────────────────────────────
interface Shop {
  _id: string;
  name: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  assignedShops: { id: string; name: string }[];
  invitedBy: { id: string; name: string; email: string } | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  assignedShops_id: { id: string; name: string }[];
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  from: number;
  to: number;
}

type RoleFilter = "ALL" | "admin" | "manager" | "staff";


// ─── Permission grouping helper ────────────────────────────
function groupPermissions(perms: string[]) {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const [module] = p.split(":");
    if (!groups[module]) groups[module] = [];
    groups[module].push(p);
  }
  return groups;
}

const PERMISSION_GROUPS = groupPermissions(ALL_PERMISSIONS);


// ─── Stat Card ─────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <motion.div className="team-stat-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      <div className="team-stat-icon" style={{ background: `${color}15` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="team-stat-info">
        <h4>{title}</h4>
        <p>{value}</p>
      </div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════
// INVITE MODAL
// ═══════════════════════════════════════════════════════════
function InviteModal({ shops, onClose, onSuccess }: {
  shops: Shop[]; onClose: () => void; onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [customRole, setCustomRole] = useState("");
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const togglePerm = (p: string) => {
    setSelectedPerms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const toggleAllInGroup = (groupPerms: string[]) => {
    const allSelected = groupPerms.every(p => selectedPerms.includes(p));
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const selectAll = () => {
    if (selectedPerms.length === ALL_PERMISSIONS.length) {
      setSelectedPerms([]);
    } else {
      setSelectedPerms([...ALL_PERMISSIONS]);
    }
  };

  const toggleShop = (id: string) => {
    setSelectedShops(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  async function handleSubmit() {
    if (!email) { setError("Email is required"); return; }
    if (selectedPerms.length === 0) { setError("Select at least one permission"); return; }

    const finalRole = useCustomRole ? customRole.trim() : role;
    if (!finalRole) { setError("Role is required"); return; }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/api/users/invite", {
        email,
        role: finalRole,
        permissions: selectedPerms,
        assignedShops_id: selectedShops,
      });
      setSuccess("Invitation sent successfully!");
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="team-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="team-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="team-modal-header">
          <h3>Invite Team Member</h3>
          <button className="team-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="team-modal-body">

          {/* Email */}
          <div className="team-form-group">
            <label className="team-form-label">Email Address</label>
            <input className="team-form-input" type="email"
              placeholder="colleague@company.com" value={email}
              onChange={e => setEmail(e.target.value)} autoFocus />
          </div>

          {/* Role */}
          <div className="team-form-group">
            <label className="team-form-label">Role</label>
            <div className="team-form-row">
              <div style={{ position: "relative" }}>
                <select className="team-form-select" value={useCustomRole ? "__custom__" : role}
                  onChange={e => {
                    if (e.target.value === "__custom__") {
                      setUseCustomRole(true);
                    } else {
                      setUseCustomRole(false);
                      setRole(e.target.value);
                    }
                  }}>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="__custom__">Custom Role…</option>
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--dash-text-muted)" }} />
              </div>
              {useCustomRole && (
                <input className="team-form-input" type="text"
                  placeholder="e.g. Warehouse Lead"
                  value={customRole} onChange={e => setCustomRole(e.target.value)} />
              )}
            </div>
          </div>

          {/* Shop Assignment */}
          {shops.length > 0 && (
            <div className="team-form-group">
              <label className="team-form-label">
                Assign to Shops <span className="optional">(optional)</span>
              </label>
              <div className="shop-chips">
                {shops.map(shop => (
                  <button key={shop._id}
                    className={`shop-chip ${selectedShops.includes(shop._id) ? "selected" : ""}`}
                    onClick={() => toggleShop(shop._id)} type="button">
                    <Store size={14} />
                    {shop.name}
                    {selectedShops.includes(shop._id) && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div className="team-form-group">
            <label className="team-form-label">
              Permissions
              <span style={{ marginLeft: 8, fontSize: "0.75rem", color: "var(--dash-text-muted)", fontWeight: 400 }}>
                ({selectedPerms.length}/{ALL_PERMISSIONS.length} selected)
              </span>
            </label>

            <button type="button" className={`perm-select-all ${selectedPerms.length === ALL_PERMISSIONS.length ? "all-selected" : ""}`}
              onClick={selectAll}>
              <div className="check-icon" style={{ width: 14, height: 14, borderRadius: 4, border: selectedPerms.length === ALL_PERMISSIONS.length ? "1.5px solid #6366f1" : "1.5px solid var(--dash-border)", background: selectedPerms.length === ALL_PERMISSIONS.length ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selectedPerms.length === ALL_PERMISSIONS.length && <Check size={10} color="#fff" />}
              </div>
              Select All Permissions
            </button>

            {Object.entries(PERMISSION_GROUPS).map(([module, perms]) => {
              const allSelected = perms.every(p => selectedPerms.includes(p));
              const someSelected = perms.some(p => selectedPerms.includes(p));
              return (
                <div className="perm-section" key={module}>
                  <div className="perm-section-header" onClick={() => toggleAllInGroup(perms)}>
                    <div className="check-icon" style={{ width: 14, height: 14, borderRadius: 4, border: allSelected ? "1.5px solid #6366f1" : someSelected ? "1.5px solid #818cf8" : "1.5px solid var(--dash-border)", background: allSelected ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {allSelected && <Check size={10} color="#fff" />}
                      {someSelected && !allSelected && <div style={{ width: 6, height: 2, background: "#818cf8", borderRadius: 1 }} />}
                    </div>
                    <span className="perm-section-title">{module}</span>
                    <span className="perm-section-count">
                      {perms.filter(p => selectedPerms.includes(p)).length}/{perms.length}
                    </span>
                  </div>
                  <div className="perm-items">
                    {perms.map(p => {
                      const action = p.split(":")[1];
                      return (
                        <button key={p} type="button"
                          className={`perm-chip ${selectedPerms.includes(p) ? "selected" : ""}`}
                          onClick={() => togglePerm(p)}>
                          <span className="check-icon">
                            {selectedPerms.includes(p) && <Check size={9} color="#fff" />}
                          </span>
                          {action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <div className="team-error-msg">{error}</div>}
          {success && <div className="team-success-msg">{success}</div>}
        </div>

        {/* Footer */}
        <div className="team-modal-footer">
          <button className="team-modal-btn cancel" onClick={onClose}>Cancel</button>
          <button className="team-modal-btn confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending…" : "Send Invitation"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════
// MAIN TEAM PAGE
// ═══════════════════════════════════════════════════════════
export default function Team() {
  const user = useAuthStore(s => s.user);

  const [shops, setShops] = useState<Shop[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canInvite = user?.isSuperAdmin || user?.permissions?.includes("user:invite");

  // ── Fetch shops ──
  useEffect(() => {
    api.get("/api/shops").then(res => setShops(res.data.data || [])).catch(() => {});
  }, []);

  // ── Fetch pending invites ──
  const fetchInvites = useCallback(async () => {
    try {
      const res = await api.get("/api/invites");
      setInvites(res.data.data || []);
    } catch { setInvites([]); }
  }, []);

  // ── Fetch team members ──
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page };
      if (roleFilter !== "ALL") params.role = roleFilter;
      const res = await api.get("/api/users/listUsers", { params });
      setMembers(res.data.data.users || []);
      setPagination(res.data.data.pagination || null);
    } catch { setMembers([]); }
    finally { setLoading(false); }
  }, [page, roleFilter]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Actions ──
  async function handleRevoke(inviteId: string) {
    setActionLoading(inviteId);
    try {
      await api.delete(`/api/invites/${inviteId}`);
      fetchInvites();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  }

  async function handleDisable(userId: string) {
    setActionLoading(userId);
    try {
      await api.patch(`/api/users/${userId}/disable`);
      fetchMembers();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  }

  async function handleEnable(userId: string) {
    setActionLoading(userId);
    try {
      await api.patch(`/api/users/${userId}/enable`);
      fetchMembers();
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  }

  // ── Computed ──
  const stats = {
    total: pagination?.total || 0,
    pending: invites.length,
    active: members.filter(m => m.status === "active").length,
  };

  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  // ── Role badge ──
  function roleBadgeClass(role: string) {
    if (role === "admin") return "role-admin";
    if (role === "manager") return "role-manager";
    if (role === "staff") return "role-staff";
    return "role-custom";
  }

  // ── Render ──
  return (
    <div className="team-container">

      {/* Header */}
      <div className="team-header">
        <h1 className="team-title">Team</h1>
        {canInvite && (
          <button className="team-invite-btn" onClick={() => setShowInviteModal(true)}>
            <UserPlus size={18} /> Invite Member
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="team-stats-grid">
        <StatCard title="Total Members" value={stats.total} icon={Users} color="#6366f1" />
        <StatCard title="Active" value={stats.active} icon={UserCheck} color="#10b981" />
        <StatCard title="Pending Invites" value={stats.pending} icon={Clock} color="#f59e0b" />
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <motion.div className="team-section-card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="team-section-header">
            <h2 className="team-section-title">
              <Mail size={18} /> Pending Invitations
              <span className="team-section-badge">{invites.length}</span>
            </h2>
          </div>
          <div className="team-table-wrapper">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Shops</th>
                  <th>Invited By</th>
                  <th>Sent</th>
                  <th>Expires</th>
                  {canInvite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {invites.map(inv => (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="email-cell">{inv.email}</td>
                    <td>
                      <span className={`role-badge ${roleBadgeClass(inv.role)}`}>
                        {inv.role}
                      </span>
                    </td>
                    <td>
                      <div className="shops-cell">
                        {inv.assignedShops.length > 0
                          ? inv.assignedShops.map(s => (
                              <span className="team-shop-tag" key={s.id}>{s.name}</span>
                            ))
                          : <span style={{ color: "var(--dash-text-muted)", fontSize: "0.8125rem" }}>—</span>
                        }
                      </div>
                    </td>
                    <td className="date-cell">{inv.invitedBy?.name || "—"}</td>
                    <td className="date-cell">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="date-cell">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    {canInvite && (
                      <td>
                        <button className="team-action-btn btn-revoke"
                          onClick={() => handleRevoke(inv.id)}
                          disabled={actionLoading === inv.id}>
                          <Trash2 size={14} />
                          {actionLoading === inv.id ? "…" : "Revoke"}
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="team-toolbar">
        <div className="team-search">
          <Search size={16} className="team-search-icon" />
          <input type="text" placeholder="Search by name or email…"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="team-role-filter">
          {(
            [["ALL", "All"], ["admin", "Admin"], ["manager", "Manager"], ["staff", "Staff"]] as [RoleFilter, string][]
          ).map(([val, label]) => (
            <button key={val}
              className={`team-role-tab ${roleFilter === val ? "active" : ""}`}
              onClick={() => { setRoleFilter(val); setPage(1); }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Team Members Table */}
      <motion.div className="team-section-card"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="team-section-header">
          <h2 className="team-section-title">
            <Shield size={18} /> Team Members
            {pagination && <span className="team-section-badge">{pagination.total}</span>}
          </h2>
        </div>

        {loading ? (
          <div className="team-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="team-skeleton-row" />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="team-empty">
            <div className="team-empty-icon"><Users size={24} /></div>
            <h3>{members.length === 0 ? "No team members yet" : "No results"}</h3>
            <p>{members.length === 0
              ? "Invite your first team member to get started."
              : "Try adjusting your search or filter."}</p>
          </div>
        ) : (
          <>
            <div className="team-table-wrapper">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Shops</th>
                    <th>Joined</th>
                    {canInvite && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(m => (
                    <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td className="name-cell">{m.name || "—"}</td>
                      <td className="email-cell">{m.email}</td>
                      <td>
                        <span className={`role-badge ${roleBadgeClass(m.role)}`}>
                          {m.role}
                        </span>
                      </td>
                      <td>
                        <span className={`team-status-badge status-${m.status}`}>
                          <span className={`team-status-dot status-${m.status}`} />
                          {m.status}
                        </span>
                      </td>
                      <td>
                        <div className="shops-cell">
                          {m.assignedShops_id?.length > 0
                            ? m.assignedShops_id.map(s => (
                                <span className="team-shop-tag" key={s.id}>{s.name}</span>
                              ))
                            : <span style={{ color: "var(--dash-text-muted)", fontSize: "0.8125rem" }}>—</span>
                          }
                        </div>
                      </td>
                      <td className="date-cell">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      {canInvite && (
                        <td>
                          {m.status === "active" ? (
                            <button className="team-action-btn btn-disable"
                              onClick={() => handleDisable(m.id)}
                              disabled={actionLoading === m.id}>
                              <UserX size={14} />
                              {actionLoading === m.id ? "…" : "Disable"}
                            </button>
                          ) : m.status === "disabled" ? (
                            <button className="team-action-btn btn-enable"
                              onClick={() => handleEnable(m.id)}
                              disabled={actionLoading === m.id}>
                              <UserCog size={14} />
                              {actionLoading === m.id ? "…" : "Enable"}
                            </button>
                          ) : null}
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="team-pagination">
                <span className="team-pagination-info">
                  Showing {pagination.from}–{pagination.to} of {pagination.total}
                </span>
                <div className="team-pagination-btns">
                  <button className="team-page-btn" disabled={!pagination.hasPrevPage}
                    onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button className="team-page-btn" disabled={!pagination.hasNextPage}
                    onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal
            shops={shops}
            onClose={() => setShowInviteModal(false)}
            onSuccess={() => { fetchInvites(); fetchMembers(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
