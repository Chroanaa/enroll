interface PrintSubject {
  course_code: string;
  descriptive_title: string;
  units_lec: number;
  units_lab: number;
  units_total: number;
  fixed_amount: number | null;
  status: string | null;
}

interface PrintPayment {
  amount_paid: number;
  payment_type: string;
  payment_date: string;
  reference_no: string | null;
}

interface PrintSchedule {
  label: string;
  due_date: string;
  amount: number;
  is_paid: boolean;
}

interface PrintDetail {
  student_number: string;
  student_name: string;
  course_program: string | null;
  year_level: number | null;
  academic_year: string;
  semester: number;
  payment_mode: string;
  payment_status: string;
  tuition: {
    gross_tuition: number;
    discount_name: string | null;
    discount_percent: number | null;
    discount_amount: number;
    net_tuition: number;
  };
  fees: Record<string, { fee_name: string; amount: number }[]>;
  total_fees: number;
  fixed_amount_total: number;
  total_due: number;
  subjects: PrintSubject[];
  total_units: number;
  payment_schedule: PrintSchedule[];
  payments: PrintPayment[];
  total_paid: number;
  remaining_balance: number;
  insurance_amount: number | null;
}

function fmt(amount: number | null | undefined): string {
  if (amount == null) return "₱0.00";
  return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function printStudentPaymentPDF(detail: PrintDetail) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const subjectsRows = detail.subjects
    .map(
      (s) => `
      <tr>
        <td>${s.course_code}</td>
        <td>${s.descriptive_title}</td>
        <td class="center">${s.units_lec}</td>
        <td class="center">${s.units_lab}</td>
        <td class="center bold">${s.units_total}</td>
        <td class="right">${s.fixed_amount ? fmt(s.fixed_amount) : "-"}</td>
      </tr>`,
    )
    .join("");

  const feeSections = Object.entries(detail.fees)
    .map(([category, items]) => {
      const catTotal = items.reduce((sum, f) => sum + f.amount, 0);
      const rows = items
        .map(
          (f) => `
        <tr>
          <td style="padding-left:24px">${f.fee_name}</td>
          <td class="right">${fmt(f.amount)}</td>
        </tr>`,
        )
        .join("");
      return `
        <tr class="cat-header">
          <td>${category}</td>
          <td class="right bold">${fmt(catTotal)}</td>
        </tr>
        ${rows}`;
    })
    .join("");

  const paymentRows = detail.payments
    .map(
      (p) => `
      <tr>
        <td>${new Date(p.payment_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</td>
        <td class="capitalize">${p.payment_type.replace("_", " ")}</td>
        <td>${p.reference_no || "-"}</td>
        <td class="right green bold">${fmt(p.amount_paid)}</td>
      </tr>`,
    )
    .join("");

  const scheduleRows = detail.payment_schedule
    .map(
      (s) => `
      <tr>
        <td>${s.label}</td>
        <td>${new Date(s.due_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</td>
        <td class="right">${fmt(s.amount)}</td>
        <td class="center">${s.is_paid ? '<span class="badge-paid">Paid</span>' : '<span class="badge-unpaid">Unpaid</span>'}</td>
      </tr>`,
    )
    .join("");

  const statusClass =
    detail.payment_status === "Fully Paid"
      ? "badge-paid"
      : detail.payment_status === "Partial"
        ? "badge-partial"
        : "badge-unpaid";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Payment - ${detail.student_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
    h1 { font-size: 16px; color: #3A2313; margin-bottom: 2px; }
    h2 { font-size: 13px; color: #3A2313; margin: 16px 0 6px 0; padding-bottom: 3px; border-bottom: 2px solid #3A2313; }
    .header { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #ddd; }
    .header .subtitle { font-size: 11px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; padding: 10px; background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 4px; }
    .info-grid .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-grid .value { font-size: 11px; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .summary-box { text-align: center; padding: 8px; border: 1px solid #e5e5e5; border-radius: 4px; }
    .summary-box .label { font-size: 9px; color: #888; text-transform: uppercase; }
    .summary-box .value { font-size: 14px; font-weight: 700; }
    .summary-box .value.due { color: #955A27; }
    .summary-box .value.paid { color: #16a34a; }
    .summary-box .value.balance { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #3A2313; color: white; padding: 5px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:nth-child(even) { background: #fafafa; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 600; }
    .green { color: #16a34a; }
    .capitalize { text-transform: capitalize; }
    .cat-header td { background: #f3f3f3; font-weight: 600; font-size: 11px; }
    tfoot td { background: #f0f0f0; font-weight: 600; border-top: 2px solid #ccc; }
    .badge-paid { display: inline-block; padding: 1px 8px; border-radius: 9px; font-size: 10px; font-weight: 600; background: #dcfce7; color: #166534; }
    .badge-unpaid { display: inline-block; padding: 1px 8px; border-radius: 9px; font-size: 10px; font-weight: 600; background: #fee2e2; color: #991b1b; }
    .badge-partial { display: inline-block; padding: 1px 8px; border-radius: 9px; font-size: 10px; font-weight: 600; background: #ffedd5; color: #9a3412; }
    .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Student Financial Summary</h1>
    <div class="subtitle">Academic Year ${detail.academic_year} &mdash; Semester ${detail.semester}</div>
  </div>

  <div class="info-grid">
    <div><div class="label">Student Number</div><div class="value">${detail.student_number}</div></div>
    <div><div class="label">Student Name</div><div class="value">${detail.student_name}</div></div>
    <div><div class="label">Program / Year</div><div class="value">${detail.course_program || "-"} &mdash; Year ${detail.year_level || "-"}</div></div>
    <div><div class="label">Payment Mode / Status</div><div class="value capitalize">${detail.payment_mode} &mdash; <span class="${statusClass}">${detail.payment_status}</span></div></div>
  </div>

  <div class="summary-grid">
    <div class="summary-box"><div class="label">Total Due</div><div class="value due">${fmt(detail.total_due)}</div></div>
    <div class="summary-box"><div class="label">Total Paid</div><div class="value paid">${fmt(detail.total_paid)}</div></div>
    <div class="summary-box"><div class="label">Remaining Balance</div><div class="value balance">${fmt(detail.remaining_balance)}</div></div>
  </div>

  <h2>Enrolled Subjects</h2>
  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Description</th>
        <th class="center">Lec</th>
        <th class="center">Lab</th>
        <th class="center">Units</th>
        <th class="right">Fixed Amt</th>
      </tr>
    </thead>
    <tbody>${subjectsRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total</td>
        <td class="center">${detail.total_units}</td>
        <td class="right">${fmt(detail.fixed_amount_total)}</td>
      </tr>
    </tfoot>
  </table>

  <h2>Tuition &amp; Fees Breakdown</h2>
  <table>
    <thead>
      <tr><th>Item</th><th class="right">Amount</th></tr>
    </thead>
    <tbody>
      <tr class="cat-header"><td>Tuition</td><td class="right bold">${fmt(detail.tuition.net_tuition)}</td></tr>
      <tr><td style="padding-left:24px">Gross Tuition</td><td class="right">${fmt(detail.tuition.gross_tuition)}</td></tr>
      ${detail.tuition.discount_amount > 0 ? `<tr><td style="padding-left:24px;color:#16a34a">Discount${detail.tuition.discount_name ? ` (${detail.tuition.discount_name})` : ""}${detail.tuition.discount_percent ? ` ${detail.tuition.discount_percent}%` : ""}</td><td class="right green">-${fmt(detail.tuition.discount_amount)}</td></tr>` : ""}
      ${feeSections}
      ${detail.insurance_amount ? `<tr class="cat-header"><td>Insurance</td><td class="right bold">${fmt(detail.insurance_amount)}</td></tr>` : ""}
    </tbody>
    <tfoot>
      <tr><td>Total Due</td><td class="right">${fmt(detail.total_due)}</td></tr>
    </tfoot>
  </table>

  ${
    detail.payments.length > 0
      ? `
  <h2>Payment History</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Type</th><th>Reference</th><th class="right">Amount</th></tr>
    </thead>
    <tbody>${paymentRows}</tbody>
    <tfoot>
      <tr><td colspan="3">Total Paid</td><td class="right green">${fmt(detail.total_paid)}</td></tr>
    </tfoot>
  </table>`
      : ""
  }

  ${
    detail.payment_schedule.length > 0
      ? `
  <h2>Payment Schedule</h2>
  <table>
    <thead>
      <tr><th>Label</th><th>Due Date</th><th class="right">Amount</th><th class="center">Status</th></tr>
    </thead>
    <tbody>${scheduleRows}</tbody>
  </table>`
      : ""
  }

  <div class="footer">
    Printed on ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
