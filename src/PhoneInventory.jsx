
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const emptyForm = {
  brand: "", model: "", storage: "", ram: "", color: "",
  condition: "New", imei_1: "", imei_2: "", cost: "",
  selling_price: "", supplier: "", purchase_date: "", warranty: ""
};

export default function PhoneInventory() {
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  async function loadPhones() {
    setLoading(true);
    const { data, error } = await supabase
      .from("phone_units")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setMessage(error.message);
    setPhones(data || []);
    setLoading(false);
  }

  useEffect(() => { loadPhones(); }, []);

  async function addPhone(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      ...form,
      imei_1: form.imei_1.trim(),
      imei_2: form.imei_2.trim() || null,
      cost: Number(form.cost || 0),
      selling_price: Number(form.selling_price || 0),
      purchase_date: form.purchase_date || null
    };

    const { error } = await supabase.from("phone_units").insert(payload);

    if (error) {
      setMessage(error.code === "23505"
        ? "That IMEI is already registered. Each IMEI must be unique."
        : error.message);
    } else {
      setMessage("Phone unit added successfully.");
      setForm(emptyForm);
      await loadPhones();
    }
    setSaving(false);
  }

  const filtered = useMemo(() => phones.filter(p => {
    const q = search.toLowerCase();
    const text = [p.brand, p.model, p.imei_1, p.imei_2, p.color, p.storage]
      .filter(Boolean).join(" ").toLowerCase();
    return (!q || text.includes(q)) && (status === "All" || p.status === status);
  }), [phones, search, status]);

  const money = n => `₵${Number(n || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2
  })}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Phone Inventory & IMEI</h2>
        <p className="text-sm opacity-70">
          Track every individual phone unit and prevent an IMEI from being sold twice.
        </p>
      </div>

      <form onSubmit={addPhone} className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Add Phone Unit</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[
            ["brand","Brand *"], ["model","Model *"], ["storage","Storage"], ["ram","RAM"],
            ["color","Colour"], ["imei_1","IMEI 1 *"], ["imei_2","IMEI 2"],
            ["cost","Cost Price"], ["selling_price","Selling Price"], ["supplier","Supplier"],
            ["purchase_date","Purchase Date"], ["warranty","Warranty"]
          ].map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="mb-1 block font-medium">{label}</span>
              <input
                required={key === "brand" || key === "model" || key === "imei_1"}
                type={key === "purchase_date" ? "date" :
                      (key === "cost" || key === "selling_price" ? "number" : "text")}
                step="0.01"
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              />
            </label>
          ))}

          <label className="text-sm">
            <span className="mb-1 block font-medium">Condition</span>
            <select
              value={form.condition}
              onChange={e => setForm({ ...form, condition: e.target.value })}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option>New</option>
              <option>Used</option>
              <option>Refurbished</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={saving}
            className="rounded-xl bg-black px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Phone"}
          </button>
          {message && <span className="text-sm">{message}</span>}
        </div>
      </form>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search model, brand or IMEI..."
            className="flex-1 rounded-xl border px-3 py-2"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option>All</option>
            <option>In Stock</option>
            <option>Reserved</option>
            <option>Sold</option>
            <option>Returned</option>
          </select>
          <button onClick={loadPhones} className="rounded-xl border px-4 py-2">
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Phone</th>
                <th className="p-2">IMEI 1</th>
                <th className="p-2">IMEI 2</th>
                <th className="p-2">Condition</th>
                <th className="p-2">Cost</th>
                <th className="p-2">Selling</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-6 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center opacity-60">No phone units found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">
                    {p.brand} {p.model}
                    <div className="text-xs opacity-60">
                      {[p.storage, p.ram, p.color].filter(Boolean).join(" • ")}
                    </div>
                  </td>
                  <td className="p-2 font-mono">{p.imei_1}</td>
                  <td className="p-2 font-mono">{p.imei_2 || "—"}</td>
                  <td className="p-2">{p.condition}</td>
                  <td className="p-2">{money(p.cost)}</td>
                  <td className="p-2">{money(p.selling_price)}</td>
                  <td className="p-2">
                    <span className="rounded-full border px-2 py-1">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
