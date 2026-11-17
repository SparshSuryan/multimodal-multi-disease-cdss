import React, { useState } from "react";
import { AlertCircle, Lock, Mail, ShieldCheck, Stethoscope } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("doctor@cdss.org");
  const [password, setPassword] = useState("Doctor@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fillDemo = (role) => {
    setError("");
    if (role === "admin") {
      setEmail("admin@cdss.org");
      setPassword("Admin@123");
    } else {
      setEmail("doctor@cdss.org");
      setPassword("Doctor@123");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Sign-in failed.");
      localStorage.setItem("cdss_token", data.access_token);
      localStorage.setItem("cdss_user", JSON.stringify(data.user));
      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      setError(err.message || "Unable to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#060B19] via-[#0B183B] to-[#132A63] flex items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-blue-400/20 bg-white shadow-2xl">
        {/* Top Navy Banner */}
        <div className="bg-gradient-to-r from-[#060B19] via-[#0D1E4A] to-[#163172] px-7 py-6 text-white">
          <span className="inline-block rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-300">
            Clinical Access Portal
          </span>
          <h1
            className="mt-2 text-xl font-extrabold tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Multimodal Multi-Disease CDSS
          </h1>
          <p className="mt-1 text-xs text-blue-100/80">
            Sign in with your clinician or administrator credentials to access patient charts and diagnostic screening.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {/* Quick Role Switcher for Demo */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
              Quick Credential Fill
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("doctor")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold border transition ${
                  email === "doctor@cdss.org"
                    ? "bg-[#0B183B] text-white border-[#0B183B]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Doctor Login
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold border transition ${
                  email === "admin@cdss.org"
                    ? "bg-[#0B183B] text-white border-[#0B183B]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Login
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Institutional Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-600/15"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-600/15"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#0B183B] via-blue-800 to-blue-600 py-2.5 text-sm font-bold text-white shadow-md hover:from-[#060B19] hover:to-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In to Clinical Workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}