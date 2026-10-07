"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Tx = {
  id: string;
  tanggal: string;
  jenis: string;
  kategori: string;
  deskripsi: string;
  nominal: number;
  sumberDana: string;
  tujuanDana: string;
  metode: string;
  pihakTerkait: string;
  pic: string;
};

const emptyForm = {
  tanggal: new Date().toISOString().slice(0, 10),
  jenis: "PEMASUKAN",
  kategori: "",
  deskripsi: "",
  nominal: "",
  sumberDana: "",
  tujuanDana: "",
  metode: "CASH",
  pihakTerkait: "",
  pic: "",
  noRef: "",
  catatan: ""
};

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function parseNominal(value: unknown) {
  if (typeof value === "number") return value;
  return Number(String(value ?? "").replace(/[^0-9-]/g, "")) || 0;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function loadTransactions() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", { cache: "no-store" });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Gagal mengambil transaksi");

      const rows = data.rows || [];
      const header = rows[0] || [];
      const index = (name: string) => header.indexOf(name);
      const mapped = rows.slice(1).filter((r: string[]) => r.length).map((r: string[]) => ({
        id: r[index("ID_TRANSAKSI")] || r[0] || "-",
        tanggal: r[index("TANGGAL")] || r[1] || "",
        jenis: r[index("JENIS_TRANSAKSI")] || r[2] || "",
        kategori: r[index("KATEGORI")] || r[3] || "",
        deskripsi: r[index("DESKRIPSI")] || r[4] || "",
        nominal: parseNominal(r[index("NOMINAL")] || r[5]),
        sumberDana: r[index("SUMBER_DANA")] || r[6] || "",
        tujuanDana: r[index("TUJUAN_DANA")] || r[7] || "",
        metode: r[index("METODE_PEMBAYARAN")] || r[8] || "",
        pihakTerkait: r[index("PIHAK_TERKAIT")] || r[9] || "",
        pic: r[index("PIC_PENCATAT")] || r[10] || ""
      }));
      setTransactions(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTransactions(); }, []);

  const stats = useMemo(() => {
    let income = 0, expense = 0, opening = 0;
    for (const t of transactions) {
      if (t.jenis === "PEMASUKAN") income += t.nominal;
      else if (t.jenis === "PENGELUARAN") expense += t.nominal;
      else if (t.jenis === "SALDO_AWAL") opening += t.nominal;
    }
    return { income, expense, opening, balance: opening + income - expense };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter(t =>
      (filterJenis === "ALL" || t.jenis === filterJenis) &&
      (!q || [t.id, t.deskripsi, t.kategori, t.sumberDana, t.pihakTerkait].join(" ").toLowerCase().includes(q))
    );
  }, [transactions, search, filterJenis]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Gagal menyimpan transaksi");
      setForm(emptyForm);
      setShowForm(false);
      await loadTransactions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MUSHOLA FINANCIAL</p>
          <h1>Dashboard Keuangan</h1>
          <p className="subtitle">Pencatatan kas dan transaksi mushola.</p>
        </div>
        <button className="primary" onClick={() => setShowForm(true)}>+ Tambah Transaksi</button>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="stats">
        <div className="card"><span>Saldo</span><strong>{money(stats.balance)}</strong><small>Saldo awal + pemasukan − pengeluaran</small></div>
        <div className="card income"><span>Total Pemasukan</span><strong>{money(stats.income)}</strong><small>{transactions.filter(t => t.jenis === "PEMASUKAN").length} transaksi</small></div>
        <div className="card expense"><span>Total Pengeluaran</span><strong>{money(stats.expense)}</strong><small>{transactions.filter(t => t.jenis === "PENGELUARAN").length} transaksi</small></div>
        <div className="card"><span>Transaksi</span><strong>{transactions.length}</strong><small>Semua transaksi tercatat</small></div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Transaksi Terbaru</h2>
            <p>Data langsung dari 01_TRANSAKSI_UANG.</p>
          </div>
          <div className="filters">
            <input placeholder="Cari transaksi..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
              <option value="ALL">Semua jenis</option>
              <option value="PEMASUKAN">Pemasukan</option>
              <option value="PENGELUARAN">Pengeluaran</option>
              <option value="TRANSFER">Transfer</option>
              <option value="SALDO_AWAL">Saldo awal</option>
            </select>
            <button className="secondary" onClick={loadTransactions}>Refresh</button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? <div className="empty">Memuat data...</div> : filtered.length === 0 ? <div className="empty">Belum ada transaksi yang cocok.</div> : (
            <table>
              <thead><tr><th>ID</th><th>Tanggal</th><th>Jenis</th><th>Deskripsi</th><th>Kategori</th><th>Sumber Dana</th><th>Nominal</th></tr></thead>
              <tbody>
                {filtered.slice().reverse().map(t => (
                  <tr key={t.id + t.tanggal}>
                    <td className="mono">{t.id}</td>
                    <td>{t.tanggal}</td>
                    <td><span className={"badge " + t.jenis.toLowerCase()}>{t.jenis.replace("_", " ")}</span></td>
                    <td>{t.deskripsi || "-"}</td>
                    <td>{t.kategori || "-"}</td>
                    <td>{t.sumberDana || "-"}</td>
                    <td className="amount">{money(t.nominal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowForm(false)}>
          <form className="modal" onSubmit={submit}>
            <div className="modal-head"><div><h2>Tambah Transaksi</h2><p>Data akan masuk ke Google Sheets.</p></div><button type="button" className="icon" onClick={() => setShowForm(false)}>×</button></div>
            <div className="form-grid">
              <label>Tanggal<input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal:e.target.value})} required /></label>
              <label>Jenis<select value={form.jenis} onChange={e => setForm({...form, jenis:e.target.value})}><option>PEMASUKAN</option><option>PENGELUARAN</option><option>TRANSFER</option></select></label>
              <label>Kategori<input value={form.kategori} onChange={e => setForm({...form, kategori:e.target.value})} required /></label>
              <label>Nominal (Rp)<input type="number" min="0" value={form.nominal} onChange={e => setForm({...form, nominal:e.target.value})} required /></label>
              <label className="full">Deskripsi<input value={form.deskripsi} onChange={e => setForm({...form, deskripsi:e.target.value})} required /></label>
              <label>Sumber Dana<input value={form.sumberDana} onChange={e => setForm({...form, sumberDana:e.target.value})} required /></label>
              <label>Tujuan Dana<input value={form.tujuanDana} onChange={e => setForm({...form, tujuanDana:e.target.value})} /></label>
              <label>Metode Pembayaran<select value={form.metode} onChange={e => setForm({...form, metode:e.target.value})}><option>CASH</option><option>TRANSFER</option><option>QRIS</option><option>LAINNYA</option></select></label>
              <label>Pihak Terkait<input value={form.pihakTerkait} onChange={e => setForm({...form, pihakTerkait:e.target.value})} /></label>
              <label>PIC Pencatat<input value={form.pic} onChange={e => setForm({...form, pic:e.target.value})} /></label>
              <label>No. Ref<input value={form.noRef} onChange={e => setForm({...form, noRef:e.target.value})} /></label>
              <label className="full">Catatan<textarea rows={3} value={form.catatan} onChange={e => setForm({...form, catatan:e.target.value})} /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Batal</button><button className="primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Transaksi"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
