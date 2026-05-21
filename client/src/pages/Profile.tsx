import "./Profile.css";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Shield,
  Edit3,
  Save,
  X,
  Check,
  Crown,
  AtSign,
  Image,
  KeyRound,
} from "lucide-react";
import useAuthStore from "../stores/authStore";


// ─── Helper: generate initials from name ───
function getInitials(name?: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Helper: group permissions by module ───
function groupPermissions(perms: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const [module] = p.split(":");
    if (!groups[module]) groups[module] = [];
    groups[module].push(p);
  }
  return groups;
}

// ─── Helper: role badge class ───
function roleBadgeClass(role?: string): string {
  if (role === "admin") return "role-admin";
  if (role === "manager") return "role-manager";
  if (role === "staff") return "role-staff";
  return "role-custom";
}


// ═══════════════════════════════════════════════════════════
// PROFILE PAGE COMPONENT
// ═══════════════════════════════════════════════════════════

export default function Profile() {
  const { user, updateProfile } = useAuthStore();

  // ── Edit Mode State ──
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Form fields (only the editable ones) ──
  const [formData, setFormData] = useState({
    username: user?.username || "",
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    profile_image: user?.profile_image || "",
  });

  // ── Handlers ──
  function handleEdit() {
    setFormData({
      username: user?.username || "",
      name: user?.name || "",
      phone: user?.phone || "",
      address: user?.address || "",
      profile_image: user?.profile_image || "",
    });
    setIsEditing(true);
    setSuccessMsg("");
    setErrorMsg("");
  }

  function handleCancel() {
    setIsEditing(false);
    setErrorMsg("");
  }

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Build the payload — only send fields that actually changed
    const payload: Record<string, string> = {};
    if (formData.username !== (user?.username || "")) payload.username = formData.username;
    if (formData.name !== (user?.name || "")) payload.name = formData.name;
    if (formData.phone !== (user?.phone || "")) payload.phone = formData.phone;
    if (formData.address !== (user?.address || "")) payload.address = formData.address;
    if (formData.profile_image !== (user?.profile_image || "")) payload.profile_image = formData.profile_image;

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      setSaving(false);
      return;
    }

    try {
      await updateProfile(payload);
      setSuccessMsg("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  // ── Derived values ──
  const role = user?.customRole || user?.builtInRole || "—";
  const permissionGroups = user?.permissions
    ? user.permissions.includes("*")
      ? null // superAdmin — show special badge instead
      : groupPermissions(user.permissions)
    : {};

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-skeleton">
          <div className="profile-skeleton-header" />
          <div className="profile-skeleton-card" />
          <div className="profile-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">

      {/* ── Feedback Messages ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div className="profile-success-msg"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}>
            <Check size={16} /> {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div className="profile-error-msg"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}>
            <X size={16} /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>


      {/* ══════════════════════════════════════════════════════
          HEADER CARD
          ══════════════════════════════════════════════════════ */}
      <motion.div className="profile-header-card"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}>

        <div className="profile-header-left">
          {/* Avatar */}
          <div className="profile-avatar">
            {getInitials(user.name)}
          </div>

          {/* Name + meta */}
          <div className="profile-header-info">
            <h1>{user.name || "Unnamed User"}</h1>
            <div className="profile-header-meta">
              <span className={`profile-role-badge ${roleBadgeClass(role)}`}>
                <Shield size={12} />
                {role}
              </span>
              <span className="profile-status-badge">
                <span className={`profile-status-dot ${user.status}`} />
                {user.status}
              </span>
              {user.isSuperAdmin && (
                <span className="profile-role-badge role-admin" style={{ gap: 4 }}>
                  <Crown size={11} /> Super Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit / Save+Cancel */}
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button className="profile-cancel-btn" onClick={handleCancel} disabled={saving}>
                <X size={16} /> Cancel
              </button>
              <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          ) : (
            <button className="profile-edit-btn" onClick={handleEdit}>
              <Edit3 size={16} /> Edit Profile
            </button>
          )}
        </div>
      </motion.div>


      {/* ══════════════════════════════════════════════════════
          PERSONAL INFORMATION
          ══════════════════════════════════════════════════════ */}
      <motion.div className="profile-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}>

        <div className="profile-section-header">
          <h2><UserIcon size={18} /> Personal Information</h2>
        </div>

        <div className="profile-info-grid">
          {/* Username — editable */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <AtSign size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              Username
            </div>
            {isEditing ? (
              <input
                className="profile-form-input"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                placeholder="Enter username"
              />
            ) : (
              <div className="profile-info-value">
                {user.username || <span className="muted">Not set</span>}
              </div>
            )}
          </div>

          {/* Name — editable */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <UserIcon size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              Full Name
            </div>
            {isEditing ? (
              <input
                className="profile-form-input"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter your name"
              />
            ) : (
              <div className="profile-info-value">
                {user.name || <span className="muted">Not set</span>}
              </div>
            )}
          </div>

          {/* Email — read-only */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <Mail size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              Email
            </div>
            <div className="profile-info-value">{user.email}</div>
          </div>

          {/* Phone — editable */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <Phone size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              Phone
            </div>
            {isEditing ? (
              <input
                className="profile-form-input"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="e.g. 9876543210"
              />
            ) : (
              <div className={`profile-info-value ${!user.phone ? "muted" : ""}`}>
                {user.phone || "Not provided"}
              </div>
            )}
          </div>

          {/* Address — editable */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <MapPin size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              Address
            </div>
            {isEditing ? (
              <input
                className="profile-form-input"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Enter address"
              />
            ) : (
              <div className={`profile-info-value ${!user.address ? "muted" : ""}`}>
                {user.address || "Not provided"}
              </div>
            )}
          </div>

          {/* Profile Image URL — editable */}
          <div className="profile-info-item">
            <div className="profile-info-label">
              <Image size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              Profile Image URL
            </div>
            {isEditing ? (
              <input
                className="profile-form-input"
                value={formData.profile_image}
                onChange={(e) => handleChange("profile_image", e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            ) : (
              <div className={`profile-info-value ${!user.profile_image ? "muted" : ""}`}>
                {user.profile_image || "Not set"}
              </div>
            )}
          </div>
        </div>
      </motion.div>


      {/* ══════════════════════════════════════════════════════
          ROLE & PERMISSIONS
          ══════════════════════════════════════════════════════ */}
      <motion.div className="profile-section-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}>

        <div className="profile-section-header">
          <h2><KeyRound size={18} /> Role & Permissions</h2>
        </div>

        {/* SuperAdmin gets a special badge */}
        {permissionGroups === null ? (
          <div className="profile-perm-all">
            <Crown size={16} />
            Full Access — All permissions granted (Super Admin)
          </div>
        ) : Object.keys(permissionGroups).length === 0 ? (
          <div style={{ padding: "20px 24px", color: "var(--dash-text-muted)", fontSize: "0.875rem" }}>
            No permissions assigned.
          </div>
        ) : (
          <div className="profile-perm-groups">
            {Object.entries(permissionGroups).map(([module, perms]) => (
              <div className="profile-perm-group" key={module}>
                <div className="profile-perm-group-title">
                  {module}
                  <span className="perm-count">{perms.length}</span>
                </div>
                <div className="profile-perm-chips">
                  {perms.map((p) => {
                    const action = p.split(":")[1];
                    return (
                      <span className="profile-perm-chip" key={p}>
                        <Check size={10} />
                        {action}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}
