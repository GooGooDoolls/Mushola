export default function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">MUSHOLA FINANCIAL</p>
        <h1>Dashboard Keuangan Mushola</h1>
        <p className="muted">
          Fondasi aplikasi sudah terpasang. Tahap berikutnya adalah menghubungkan
          Google Sheets sebagai database transaksi.
        </p>
        <a className="button" href="/api/transactions">
          Test API Transactions
        </a>
      </section>
    </main>
  );
}
