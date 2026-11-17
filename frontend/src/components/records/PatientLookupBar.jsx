import React, { useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Phone,
  Search,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function PatientLookupBar({ token, activePatient, onSelectPatient }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [saving, setSaving] = useState(false);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setFeedback("");
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/patients/search?q=${encodeURIComponent(query.trim())}`,
        { headers: authHeaders }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");
      const list = data.results || [];
      setSearchResults(list);
      if (list.length === 1) {
        onSelectPatient(list[0]);
        setSearchResults([]);
        setShowHistory(true);
      } else if (list.length === 0) {
        setFeedback(`No patient found matching "${query}". Register a new chart below.`);
        setShowNewForm(true);
        if (/^\+?\d[\d\s-]{5,}$/.test(query.trim())) setPhone(query.trim());
      }
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/patients`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          full_name: fullName,
          phone,
          age: age ? Number(age) : null,
          sex: sex || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not save patient.");
      onSelectPatient(data);
      setShowNewForm(false);
      setFullName("");
      setPhone("");
      setAge("");
      setSex("");
      setQuery("");
      setSearchResults([]);
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setSaving(false);
    }
  };

  const consultations = activePatient?.consultations || [];

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Patient Chart &amp; Follow-Up Registry
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          {activePatient
            ? "Active chart linked — all evaluations auto-save to visit history"
            : "Search an existing patient or register a new intake to save consultation records"}
        </span>
      </div>

      {/* Full-Width Search & Action Row */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Patient ID (e.g. PT-2026-0001), Contact Number, or Full Name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-600/15"
          />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="submit"
            disabled={searching}
            className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-[#0B183B] to-blue-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:from-[#060B19] hover:to-blue-700 transition"
          >
            {searching ? "Searching..." : "Find Patient"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewForm((v) => !v);
              setFeedback("");
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            New Patient Intake
          </button>
        </div>
      </form>

      {/* Active Patient Banner */}
      {activePatient && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="font-extrabold text-slate-900 text-sm">{activePatient.full_name}</span>
            <span className="font-mono font-bold text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded-md">
              {activePatient.patient_uid}
            </span>
            <span className="text-slate-600 font-medium">
              • Contact: {activePatient.phone}
              {activePatient.age ? ` • ${activePatient.age} yrs` : ""}
              {activePatient.sex ? ` • ${activePatient.sex}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Follow-Up History ({consultations.length})
              {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onSelectPatient(null)}
              title="Close patient chart"
              className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2">
          {feedback}
        </div>
      )}

      {/* Multiple Search Matches */}
      {searchResults.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Matching Patient Records ({searchResults.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {searchResults.map((p) => (
              <button
                key={p.patient_uid}
                type="button"
                onClick={() => {
                  onSelectPatient(p);
                  setSearchResults([]);
                  setShowHistory(true);
                }}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs hover:border-blue-500 hover:bg-blue-50/40"
              >
                <div>
                  <div className="font-bold text-slate-900">{p.full_name}</div>
                  <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {p.phone}
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                  {p.patient_uid}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Patient Registration Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreatePatient}
          className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Patient Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Age (yrs)</label>
            <input
              type="number"
              min="0"
              max="120"
              placeholder="54"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            >
              <option value="">--</option>
              <option value="Male">M</option>
              <option value="Female">F</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800"
            >
              {saving ? "Saving..." : "Create Chart"}
            </button>
          </div>
        </form>
      )}

      {/* Longitudinal Follow-Up Consultation History Drawer */}
      {activePatient && showHistory && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Longitudinal Consultation History — {activePatient.patient_uid}
            </span>
            <span className="text-[11px] text-slate-500">
              {consultations.length} recorded evaluation(s)
            </span>
          </div>

          {consultations.length === 0 ? (
            <p className="text-xs text-slate-500">
              No prior consultations recorded for this patient yet. Run any diagnostic module below to log the first visit.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {consultations.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-blue-900">{c.module_name}</span>
                    {c.risk_level && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                        {c.risk_level}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {c.prediction || "Completed"}
                    {typeof c.risk_score === "number" ? ` (${Math.round(c.risk_score * 100)}%)` : ""}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(c.created_at).toLocaleString()} • {c.doctor_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}