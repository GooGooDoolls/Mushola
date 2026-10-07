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
  noRef?: string;
  catatan?: string;
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
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [kategoriOptions, setKategoriOptions] = useState<string[]>([]);
  const [sumberDanaOptions, setSumberDanaOptions] = useState<string[]>([]);

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
        pic: r[index("PIC_PENCATAT")] || r[10] || "",
        noRef: r[index("NO_REF")] || r[11] || "",
        catatan: r[index("CATATAN")] || r[12] || ""
      }));
      setTransactions(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  async function loadMasters() {
    try {
      const response = await fetch("/api/masters", { cache: "no-store" });
      const data = await response.json();
      if (data.success) {
        setKategoriOptions(data.kategori || []);
        setSumberDanaOptions(data.sumberDana || []);
      }
    } catch {}
  }

  useEffect(() => {
    loadTransactions();
    loadMasters();
  }, []);

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
      (!q || [t.id, t.deskripsi, t.kategori, t.sumberDana, t.tujuanDana, t.pihakTerkait]
        .join(" ").toLowerCase().includes(q))
    );
  }, [transactions, search, filterJenis]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(tx: Tx) {
    setEditingId(tx.id);
    setForm({
      tanggal: tx.tanggal,
      jenis: tx.jenis === "SALDO_AWAL" ? "PEMASUKAN" : tx.jenis,
      kategori: tx.kategori,
      deskripsi: tx.deskripsi,
      nominal: String(tx.nominal),
      sumberDana: tx.sumberDana,
      tujuanDana: tx.tujuanDana,
      metode: tx.metode || "CASH",
      pihakTerkait: tx.pihakTerkait,
      pic: tx.pic,
      noRef: tx.noRef || "",
      catatan: tx.catatan || ""
    });
    setError("");
    setShowForm(true);
  }

  async function removeTransaction(id: string) {
    if (!window.confirm("Hapus transaksi " + id + "? Data akan dihapus dari Google Sheets.")) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Gagal menghapus transaksi");
      await loadTransactions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus transaksi");
    } finally {
      setDeleting(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (Number(form.nominal) <= 0) {
      setError("Nominal harus lebih besar dari 0.");
      setSaving(false);
      return;
    }

    if (form.jenis === "TRANSFER") {
      if (!form.tujuanDana.trim()) {
        setError("Tujuan dana wajib diisi untuk transfer.");
        setSaving(false);
        return;
      }
      if (form.sumberDana.trim().toLowerCase() === form.tujuanDana.trim().toLowerCase()) {
        setError("Sumber dan tujuan dana tidak boleh sama.");
        setSaving(false);
        return;
      }
    } else if (form.tujuanDana.trim()) {
      setError("Tujuan dana hanya boleh diisi untuk transaksi transfer.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/transactions", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Gagal menyimpan transaksi");
      setForm(emptyForm);
      setEditingId(null);
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
        <button className="primary" onClick={openAdd}>+ Tambah Transaksi</button>
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
              <thead><tr><th>ID</th><th>Tanggal</th><th>Jenis</th><th>Deskripsi</th><th>Kategori</th><th>Sumber Dana</th><th>Nominal</th><th>Aksi</th></tr></thead>
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
                    <td>
                      <div className="row-actions">
                        <button className="secondary small" onClick={() => openEdit(t)}>Edit</button>
                        <button className="danger small" disabled={deleting} onClick={() => removeTransaction(t.id)}>Hapus</button>
                      </div>
                    </td>
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
            <div className="modal-head">
              <div><h2>{editingId ? "Edit Transaksi" : "Tambah Transaksi"}</h2><p>Data tersimpan langsung ke Google Sheets.</p></div>
              <button type="button" className="icon" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="form-grid">
              <label>Tanggal<input type="date" value={form.tanggal} onChange={e => setForm({...form, tanggal:e.target.value})} required /></label>
              <label>Jenis<select value={form.jenis} onChange={e => setForm({...form, jenis:e.target.value, tujuanDana: e.target.value === "TRANSFER" ? form.tujuanDana : ""})}><option>PEMASUKAN</option><option>PENGELUARAN</option><option>TRANSFER</option></select></label>
              <label>Kategori<select value={form.kategori} onChange={e => setForm({...form, kategori:e.target.value})} required><option value="">Pilih kategori</option>{kategoriOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
              <label>Nominal (Rp)<input type="number" min="1" step="1" value={form.nominal} onChange={e => setForm({...form, nominal:e.target.value})} required /></label>
              <label className="full">Deskripsi<input value={form.deskripsi} onChange={e => setForm({...form, deskripsi:e.target.value})} required /></label>
              <label>Sumber Dana<select value={form.sumberDana} onChange={e => setForm({...form, sumberDana:e.target.value})} required><option value="">Pilih sumber dana</option>{sumberDanaOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
              <label>Tujuan Dana<select value={form.tujuanDana} onChange={e => setForm({...form, tujuanDana:e.target.value})} disabled={form.jenis !== "TRANSFER"} required={form.jenis === "TRANSFER"}><option value="">{form.jenis === "TRANSFER" ? "Pilih tujuan dana" : "Khusus transfer"}</option>{sumberDanaOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
              <label>Metode Pembayaran<select value={form.metode} onChange={e => setForm({...form, metode:e.target.value})}><option>CASH</option><option>TRANSFER</option><option>QRIS</option><option>LAINNYA</option></select></label>
              <label>Pihak Terkait<input value={form.pihakTerkait} onChange={e => setForm({...form, pihakTerkait:e.target.value})} /></label>
              <label>PIC Pencatat<input value={form.pic} onChange={e => setForm({...form, pic:e.target.value})} /></label>
              <label>No. Ref<input value={form.noRef} onChange={e => setForm({...form, noRef:e.target.value})} /></label>
              <label className="full">Catatan<textarea rows={3} value={form.catatan} onChange={e => setForm({...form, catatan:e.target.value})} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button className="primary" disabled={saving}>{saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Transaksi"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
