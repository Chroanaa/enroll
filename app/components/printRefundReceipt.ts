export interface RefundReceiptDetail {
  subjectDropHistoryId: number;
  studentNumber: string;
  studentName: string;
  academicYear: string;
  semester: number;
  courseCode: string | null;
  descriptiveTitle: string | null;
  refundAmount: number;
  payoutAmount: number;
  adjustmentAmount: number;
  totalDueBefore: number | null;
  totalDueAfter: number | null;
  totalPaidBefore: number | null;
  totalPaidAfter: number | null;
  paymentMode: string | null;
  dropReason: string | null;
  processedByName: string;
  processedAt: string;
  referenceNo: string;
}

function fmt(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount || 0));
}

function escapeHtml(value: string | null | undefined): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printRefundReceipt(detail: RefundReceiptDetail) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const payoutAmount = Number(detail.payoutAmount || 0);
  const adjustmentAmount = Number(detail.adjustmentAmount || 0);
  const disposition =
    payoutAmount > 0 && adjustmentAmount > 0
      ? "Assessment Adjustment and Cash Refund"
      : payoutAmount > 0
        ? "Cash Refund"
        : "Assessment Adjustment";

  const processedDate = new Date(detail.processedAt);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Refund Receipt - ${escapeHtml(detail.studentNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #f5efe7;
      color: #2e1f13;
      padding: 24px;
    }
    .receipt {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #eadfce;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(58, 35, 19, 0.10);
    }
    .header {
      display: flex;
      gap: 18px;
      align-items: center;
      padding: 24px 28px 18px;
      border-bottom: 3px solid #3A2313;
    }
    .logo {
      width: 74px;
      height: 74px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .school h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.03em;
      color: #3A2313;
    }
    .school p {
      margin: 3px 0 0;
      font-size: 13px;
      color: #7b5d46;
    }
    .title-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      padding: 20px 28px 10px;
    }
    .title-bar h2 {
      margin: 0;
      font-size: 24px;
      color: #955A27;
    }
    .title-bar .meta {
      text-align: right;
      font-size: 12px;
      color: #6b5a4d;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      padding: 14px 28px 0;
    }
    .card {
      border: 1px solid #eadfce;
      border-radius: 14px;
      padding: 12px 14px;
      background: #fffdf9;
    }
    .label {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #9a7b62;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .value {
      font-size: 14px;
      line-height: 1.45;
      font-weight: 700;
      color: #2e1f13;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      padding: 18px 28px 0;
    }
    .summary-box {
      border-radius: 14px;
      padding: 16px;
      border: 1px solid #eadfce;
      background: #fff;
    }
    .summary-box .amount {
      margin-top: 8px;
      font-size: 28px;
      font-weight: 800;
      color: #955A27;
    }
    .summary-box.cash .amount { color: #15803d; }
    .summary-box.adjustment .amount { color: #b45309; }
    .section {
      padding: 18px 28px 0;
    }
    .section h3 {
      margin: 0 0 10px;
      font-size: 16px;
      color: #3A2313;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #eadfce;
      border-radius: 12px;
      overflow: hidden;
    }
    th {
      background: #3A2313;
      color: #fff;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    td {
      padding: 11px 12px;
      border-top: 1px solid #f0e6d8;
      font-size: 13px;
      color: #3f3126;
      vertical-align: top;
    }
    .right { text-align: right; }
    .note {
      margin: 18px 28px 28px;
      padding: 14px 16px;
      border-radius: 14px;
      background: #fff7ed;
      border: 1px solid #fdba74;
      color: #9a3412;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer {
      padding: 0 28px 28px;
      font-size: 11px;
      color: #8b7665;
      text-align: right;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .receipt {
        box-shadow: none;
        border: none;
        border-radius: 0;
        max-width: none;
      }
      @page {
        size: A4;
        margin: 12mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <img class="logo" src="/logo.png" alt="School Logo" />
      <div class="school">
        <h1>COLEGIO DE STA. TERESA DE AVILA</h1>
        <p>1177 Quirino Highway, Brgy. Kaligayahan, Novaliches, Quezon City</p>
        <p>(02) 8275-3916 / officialcstaregistrar@gmail.com</p>
      </div>
    </div>

    <div class="title-bar">
      <div>
        <h2>Refund Receipt</h2>
        <div class="label">Disposition</div>
        <div class="value">${escapeHtml(disposition)}</div>
      </div>
      <div class="meta">
        <div><strong>Reference No.:</strong> ${escapeHtml(detail.referenceNo)}</div>
        <div><strong>Processed:</strong> ${processedDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
        <div><strong>Time:</strong> ${processedDate.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="label">Student Number</div>
        <div class="value">${escapeHtml(detail.studentNumber)}</div>
      </div>
      <div class="card">
        <div class="label">Student Name</div>
        <div class="value">${escapeHtml(detail.studentName)}</div>
      </div>
      <div class="card">
        <div class="label">Academic Term</div>
        <div class="value">${escapeHtml(detail.academicYear)} / Sem ${escapeHtml(String(detail.semester))}</div>
      </div>
      <div class="card">
        <div class="label">Processed By</div>
        <div class="value">${escapeHtml(detail.processedByName)}</div>
      </div>
    </div>

    <div class="summary">
      <div class="summary-box">
        <div class="label">Total Subject Refund</div>
        <div class="amount">${fmt(detail.refundAmount)}</div>
      </div>
      <div class="summary-box adjustment">
        <div class="label">Applied To Assessment</div>
        <div class="amount">${fmt(detail.adjustmentAmount)}</div>
      </div>
      <div class="summary-box cash">
        <div class="label">Cash Payout</div>
        <div class="amount">${fmt(detail.payoutAmount)}</div>
      </div>
    </div>

    <div class="section">
      <h3>Refunded Subject</h3>
      <table>
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Description</th>
            <th>Drop Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(detail.courseCode || "N/A")}</td>
            <td>${escapeHtml(detail.descriptiveTitle || "N/A")}</td>
            <td>${escapeHtml(detail.dropReason || "No reason provided")}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>Financial Effect</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="right">Before</th>
            <th class="right">After</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Due${detail.paymentMode ? ` (${escapeHtml(detail.paymentMode)})` : ""}</td>
            <td class="right">${fmt(detail.totalDueBefore)}</td>
            <td class="right">${fmt(detail.totalDueAfter)}</td>
          </tr>
          <tr>
            <td>Total Paid</td>
            <td class="right">${fmt(detail.totalPaidBefore)}</td>
            <td class="right">${fmt(detail.totalPaidAfter)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="note">
      ${
        payoutAmount > 0
          ? `This refund generated a cash payout of <strong>${fmt(payoutAmount)}</strong>. The remaining <strong>${fmt(adjustmentAmount)}</strong> was applied against the student's assessment balance.`
          : `This refund did not require a cash payout. The refundable amount was applied by reducing the student's assessment total due by <strong>${fmt(adjustmentAmount || detail.refundAmount)}</strong>.`
      }
    </div>

    <div class="footer">
      System-generated refund receipt
    </div>
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
