import React, { useEffect, useState } from "react";
import { Activity, Shield, UserPlus, Users } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdminDashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("doctor");
  const [department, setDepartment] = useState("Internal Medicine");

  const loadOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load admin overview.");
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [token]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName, email, password, role, department }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not create user.");
      setFullName("");
      setEmail("");
      setPassword("");
      loadOverview();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {error || "Loading administration metrics..."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
            <span>Registered Staff</span>
            <Shield className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total_users}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
            <span>Registered Patients</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total_patients}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
            <span>Saved Evaluations</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total_consultations}</div>
        </div>
      </div>

      {/* Provision New Doctor / Admin Account */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-base font-bold text-slate-900">
          <UserPlus className="h-4 w-4 text-blue-700" />
          <span>Provision Clinician or Administrator Account</span>
        </div>
        {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            required
            placeholder="Full Name (e.g. Dr. Ridhima)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          <input
            type="password"
            required
            placeholder="Temporary Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
          >
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-[#0B183B] px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
          >
            Create Account
          </button>
        </form>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 font-semibold text-slate-900">{u.full_name}</td>
                  <td className="py-2 text-slate-600">{u.email}</td>
                  <td className="py-2 uppercase font-bold text-blue-800">{u.role}</td>
                  <td className="py-2 text-slate-600">{u.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}