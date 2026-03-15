"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  CalendarDays,
  Users,
  CircleDollarSign,
  RefreshCw,
  Download,
  Package,
  Boxes,
} from "lucide-react";
import { colors } from "../../colors";
import Pagination from "../common/Pagination";

type StudentPaymentRow = {
  assessment_id: number;
  student_number: string;
  student_name: string;
  course_program: string | null;
  academic_year: string;
  semester: number;
  payment_mode: string;
  total_due: number;
  total_paid: number;
  remaining_balance: number;
  payment_status: "Unpaid" | "Partial" | "Fully Paid";
};

type EarningsByYear = {
  year: number;
  total: number;
};

type EarningsByMonth = {
  month: number;
  total: number;
};

type DashboardResponse = {
  success: boolean;
  filters: {
    selectedYear: number;
    selectedAcademicYear: string | null;
    selectedSemester: number | null;
    availableAcademicYears: string[];
  };
  summaries: {
    total_assessments: number;
    total_payments: number;
    total_collected: number;
    daily_income: number;
    daily_income_assessment: number;
    daily_income_pos: number;
    total_due: number;
    total_outstanding: number;
    fully_paid_students: number;
    unpaid_students: number;
    partial_students: number;
    unpaid_installment_students: number;
    unpaid_fullpay_students: number;
  };
  earnings: {
    yearly: EarningsByYear[];
    monthly: EarningsByMonth[];
  };
  students: {
    unpaid: StudentPaymentRow[];
    fully_paid: StudentPaymentRow[];
  };
  product_analytics: {
    most_bought: {
      daily: MostBoughtProduct | null;
      monthly: MostBoughtProduct | null;
      yearly: MostBoughtProduct | null;
    };
    stocks: {
      total_products: number;
      out_of_stock: number;
      low_stock: number;
      in_stock: number;
      items: ProductStockRow[];
    };
  };
};

type MostBoughtProduct = {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_sales: number;
  current_stock: number;
};

type ProductStockRow = {
  product_id: number;
  product_name: string;
  stock: number;
  price: number;
  stock_status: "out_of_stock" | "low_stock" | "in_stock";
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value || 0);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const PaymentsDashboard: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [unpaidSearch, setUnpaidSearch] = useState("");
  const [paidSearch, setPaidSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null,
  );
  const [unpaidCurrentPage, setUnpaidCurrentPage] = useState(1);
  const [unpaidItemsPerPage, setUnpaidItemsPerPage] = useState(10);
  const [paidCurrentPage, setPaidCurrentPage] = useState(1);
  const [paidItemsPerPage, setPaidItemsPerPage] = useState(10);

  const fetchDashboard = async (showRefreshState = false) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("year", String(selectedYear));

      if (selectedAcademicYear) {
        params.set("academicYear", selectedAcademicYear);
      }

      if (selectedSemester !== "all") {
        params.set("semester", selectedSemester);
      }

      const response = await fetch(
        `/api/auth/reports/payment-dashboard?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load payment dashboard data");
      }

      const data: DashboardResponse = await response.json();
      setDashboardData(data);

      if (
        !selectedAcademicYear &&
        data.filters.availableAcademicYears.length > 0
      ) {
        setSelectedAcademicYear(data.filters.availableAcademicYears[0]);
      }
    } catch (fetchError) {
      console.error("Error fetching payment dashboard:", fetchError);
      setError("Unable to load payment dashboard. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedAcademicYear, selectedSemester]);

  const yearOptions = useMemo(() => {
    const source = dashboardData?.earnings.yearly || [];
    const current = new Date().getFullYear();
    const years = Array.from(
      new Set([current, ...source.map((item) => item.year)]),
    );
    return years.sort((a, b) => b - a);
  }, [dashboardData]);

  const filteredUnpaidStudents = useMemo(() => {
    if (!dashboardData) return [];
    if (!unpaidSearch.trim()) return dashboardData.students.unpaid;

    const search = unpaidSearch.toLowerCase();
    return dashboardData.students.unpaid.filter(
      (student) =>
        student.student_name.toLowerCase().includes(search) ||
        student.student_number.toLowerCase().includes(search) ||
        (student.course_program || "").toLowerCase().includes(search),
    );
  }, [dashboardData, unpaidSearch]);

  const filteredPaidStudents = useMemo(() => {
    if (!dashboardData) return [];
    if (!paidSearch.trim()) return dashboardData.students.fully_paid;

    const search = paidSearch.toLowerCase();
    return dashboardData.students.fully_paid.filter(
      (student) =>
        student.student_name.toLowerCase().includes(search) ||
        student.student_number.toLowerCase().includes(search) ||
        (student.course_program || "").toLowerCase().includes(search),
    );
  }, [dashboardData, paidSearch]);

  const maxMonthly = useMemo(() => {
    const monthly = dashboardData?.earnings.monthly || [];
    const max = monthly.reduce((m, item) => Math.max(m, item.total), 0);
    return max > 0 ? max : 1;
  }, [dashboardData]);

  const unpaidTotalPages = Math.max(
    1,
    Math.ceil(filteredUnpaidStudents.length / unpaidItemsPerPage),
  );
  const paidTotalPages = Math.max(
    1,
    Math.ceil(filteredPaidStudents.length / paidItemsPerPage),
  );

  const paginatedUnpaidStudents = useMemo(() => {
    const start = (unpaidCurrentPage - 1) * unpaidItemsPerPage;
    const end = start + unpaidItemsPerPage;
    return filteredUnpaidStudents.slice(start, end);
  }, [filteredUnpaidStudents, unpaidCurrentPage, unpaidItemsPerPage]);

  const paginatedPaidStudents = useMemo(() => {
    const start = (paidCurrentPage - 1) * paidItemsPerPage;
    const end = start + paidItemsPerPage;
    return filteredPaidStudents.slice(start, end);
  }, [filteredPaidStudents, paidCurrentPage, paidItemsPerPage]);

  useEffect(() => {
    setUnpaidCurrentPage(1);
  }, [unpaidSearch, selectedAcademicYear, selectedSemester, selectedYear]);

  useEffect(() => {
    setPaidCurrentPage(1);
  }, [paidSearch, selectedAcademicYear, selectedSemester, selectedYear]);

  useEffect(() => {
    if (unpaidCurrentPage > unpaidTotalPages) {
      setUnpaidCurrentPage(unpaidTotalPages);
    }
  }, [unpaidCurrentPage, unpaidTotalPages]);

  useEffect(() => {
    if (paidCurrentPage > paidTotalPages) {
      setPaidCurrentPage(paidTotalPages);
    }
  }, [paidCurrentPage, paidTotalPages]);

  const handleExportPdf = () => {
    if (!dashboardData) return;

    const semesterLabel =
      selectedSemester === "1"
        ? "1st Semester"
        : selectedSemester === "2"
          ? "2nd Semester"
          : selectedSemester === "3"
            ? "Summer"
            : "All Semesters";

    const generatedAt = new Date().toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const unpaidRowsHtml = filteredUnpaidStudents
      .map(
        (student, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(student.student_number)}</td>
            <td>${escapeHtml(student.student_name)}</td>
            <td>${escapeHtml(student.course_program || "-")}</td>
            <td>${escapeHtml(student.payment_mode === "installment" ? "Installment" : "Full Pay")}</td>
            <td style="text-align:right;">${formatAmount(student.total_paid)}</td>
            <td style="text-align:right;">${formatAmount(student.remaining_balance)}</td>
          </tr>
        `,
      )
      .join("");

    const paidRowsHtml = filteredPaidStudents
      .map(
        (student, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(student.student_number)}</td>
            <td>${escapeHtml(student.student_name)}</td>
            <td>${escapeHtml(student.course_program || "-")}</td>
            <td style="text-align:right;">${formatAmount(student.total_paid)}</td>
          </tr>
        `,
      )
      .join("");

    const monthlyRowsHtml = dashboardData.earnings.monthly
      .map(
        (item) => `
          <tr>
            <td>${MONTH_NAMES[item.month - 1]}</td>
            <td style="text-align:right;">${formatAmount(item.total)}</td>
          </tr>
        `,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=900");

    if (!printWindow) {
      alert("Unable to open print preview. Please allow popups and try again.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Payments Dashboard Report</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          body {
            font-family: Arial, sans-serif;
            color: #1f2937;
            font-size: 12px;
            line-height: 1.35;
          }
          h1 { margin: 0 0 4px 0; font-size: 20px; color: #1f4f4a; }
          h2 { margin: 18px 0 8px 0; font-size: 14px; color: #111827; }
          p { margin: 4px 0; }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 14px;
            margin-top: 8px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 10px;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px;
          }
          .label { font-size: 11px; color: #6b7280; }
          .value { font-size: 14px; font-weight: 700; margin-top: 4px; }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 6px;
            vertical-align: top;
          }
          th {
            background: #f3f4f6;
            font-size: 11px;
            text-align: left;
          }
          .section { margin-top: 12px; }
        </style>
      </head>
      <body>
        <h1>Payments Dashboard Report</h1>
        <p>Generated: ${escapeHtml(generatedAt)}</p>
        <div class="meta">
          <p><strong>Earnings Year:</strong> ${selectedYear}</p>
          <p><strong>Academic Year:</strong> ${escapeHtml(selectedAcademicYear || "All")}</p>
          <p><strong>Semester:</strong> ${escapeHtml(semesterLabel)}</p>
          <p><strong>Total Assessments:</strong> ${dashboardData.summaries.total_assessments}</p>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Daily Income</div><div class="value">${formatAmount(dashboardData.summaries.daily_income)}</div></div>
          <div class="card"><div class="label">Total Collected</div><div class="value">${formatAmount(dashboardData.summaries.total_collected)}</div></div>
          <div class="card"><div class="label">Unpaid Balance</div><div class="value">${formatAmount(dashboardData.summaries.total_outstanding)}</div></div>
          <div class="card"><div class="label">Unpaid Students</div><div class="value">${dashboardData.summaries.unpaid_students} (Installment: ${dashboardData.summaries.unpaid_installment_students} | Full Pay: ${dashboardData.summaries.unpaid_fullpay_students})</div></div>
          <div class="card"><div class="label">Fully Paid Students</div><div class="value">${dashboardData.summaries.fully_paid_students} (Transactions: ${dashboardData.summaries.total_payments})</div></div>
        </div>

        <div class="section">
          <h2>Monthly Earnings (${selectedYear})</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Unpaid Students (${filteredUnpaidStudents.length})</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student #</th>
                <th>Name</th>
                <th>Program</th>
                <th>Payment Mode</th>
                <th style="text-align:right;">Paid</th>
                <th style="text-align:right;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${
                unpaidRowsHtml ||
                '<tr><td colspan="7" style="text-align:center;">No unpaid students found.</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Fully Paid Students (${filteredPaidStudents.length})</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student #</th>
                <th>Name</th>
                <th>Program</th>
                <th style="text-align:right;">Total Paid</th>
              </tr>
            </thead>
            <tbody>
              ${
                paidRowsHtml ||
                '<tr><td colspan="5" style="text-align:center;">No fully paid students found.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  if (isLoading) {
    return (
      <div className='bg-white rounded-2xl border border-gray-100 p-8'>
        <div className='flex items-center justify-center gap-3 text-gray-500'>
          <RefreshCw className='w-5 h-5 animate-spin' />
          Loading payments dashboard...
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className='bg-white rounded-2xl border border-red-100 p-8'>
        <p className='text-red-600 font-medium'>
          {error || "Unable to load data."}
        </p>
        <button
          onClick={() => fetchDashboard(true)}
          className='mt-4 px-4 py-2 rounded-lg text-white text-sm'
          style={{ backgroundColor: colors.primary }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-2xl border border-gray-100 p-4 md:p-5'>
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
          <div>
            <h2 className='text-xl font-bold' style={{ color: colors.primary }}>
              Payments Dashboard
            </h2>
            <p className='text-sm text-gray-500'>
              Yearly and monthly earnings, payment summaries, and unpaid vs
              fully paid students.
            </p>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto'>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className='px-3 py-2 border border-gray-300 rounded-lg text-sm'
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  Earnings Year {year}
                </option>
              ))}
            </select>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className='px-3 py-2 border border-gray-300 rounded-lg text-sm'
            >
              <option value=''>All Academic Years</option>
              {dashboardData.filters.availableAcademicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className='px-3 py-2 border border-gray-300 rounded-lg text-sm'
            >
              <option value='all'>All Semesters</option>
              <option value='1'>1st Semester</option>
              <option value='2'>2nd Semester</option>
              <option value='3'>Summer</option>
            </select>
          </div>
        </div>
        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <button
            onClick={() => fetchDashboard(true)}
            className='inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50'
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh Data
          </button>
          <button
            onClick={handleExportPdf}
            className='inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white hover:opacity-90'
            style={{ backgroundColor: colors.secondary }}
          >
            <Download className='w-4 h-4' />
            Export to PDF
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-indigo-100 text-indigo-700'>
              <Wallet className='w-5 h-5' />
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase'>Daily Income</p>
              <p className='text-lg font-bold text-gray-900'>
                {formatAmount(dashboardData.summaries.daily_income)}
              </p>
              <p className='text-xs text-gray-500'>
                Assessments:{" "}
                {formatAmount(dashboardData.summaries.daily_income_assessment)}{" "}
                | POS: {formatAmount(dashboardData.summaries.daily_income_pos)}
              </p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-green-100 text-green-700'>
              <Wallet className='w-5 h-5' />
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase'>Total Collected</p>
              <p className='text-lg font-bold text-gray-900'>
                {formatAmount(dashboardData.summaries.total_collected)}
              </p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-red-100 text-red-700'>
              <CircleDollarSign className='w-5 h-5' />
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase'>Unpaid Balance</p>
              <p className='text-lg font-bold text-gray-900'>
                {formatAmount(dashboardData.summaries.total_outstanding)}
              </p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-blue-100 text-blue-700'>
              <Users className='w-5 h-5' />
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase'>Unpaid Students</p>
              <p className='text-lg font-bold text-gray-900'>
                {dashboardData.summaries.unpaid_students}
              </p>
              <p className='text-xs text-gray-500'>
                Installment:{" "}
                {dashboardData.summaries.unpaid_installment_students} | Full
                Pay: {dashboardData.summaries.unpaid_fullpay_students}
              </p>
            </div>
          </div>
        </div>
        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-emerald-100 text-emerald-700'>
              <CalendarDays className='w-5 h-5' />
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase'>
                Fully Paid Students
              </p>
              <p className='text-lg font-bold text-gray-900'>
                {dashboardData.summaries.fully_paid_students}
              </p>
              <p className='text-xs text-gray-500'>
                Transactions: {dashboardData.summaries.total_payments}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <h3 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
            <Package className='w-4 h-4' />
            Most Bought Product (Daily)
          </h3>
          {dashboardData.product_analytics.most_bought.daily ? (
            <div className='space-y-1'>
              <p className='text-sm font-semibold text-gray-900'>
                {dashboardData.product_analytics.most_bought.daily.product_name}
              </p>
              <p className='text-xs text-gray-500'>
                Qty Sold:{" "}
                {
                  dashboardData.product_analytics.most_bought.daily
                    .total_quantity
                }
              </p>
              <p className='text-xs text-gray-500'>
                Sales:{" "}
                {formatAmount(
                  dashboardData.product_analytics.most_bought.daily.total_sales,
                )}
              </p>
              <p className='text-xs text-gray-500'>
                Current Stock:{" "}
                {
                  dashboardData.product_analytics.most_bought.daily
                    .current_stock
                }
              </p>
            </div>
          ) : (
            <p className='text-sm text-gray-500'>No daily product sales yet.</p>
          )}
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <h3 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
            <Package className='w-4 h-4' />
            Most Bought Product (Monthly)
          </h3>
          {dashboardData.product_analytics.most_bought.monthly ? (
            <div className='space-y-1'>
              <p className='text-sm font-semibold text-gray-900'>
                {
                  dashboardData.product_analytics.most_bought.monthly
                    .product_name
                }
              </p>
              <p className='text-xs text-gray-500'>
                Qty Sold:{" "}
                {
                  dashboardData.product_analytics.most_bought.monthly
                    .total_quantity
                }
              </p>
              <p className='text-xs text-gray-500'>
                Sales:{" "}
                {formatAmount(
                  dashboardData.product_analytics.most_bought.monthly
                    .total_sales,
                )}
              </p>
              <p className='text-xs text-gray-500'>
                Current Stock:{" "}
                {
                  dashboardData.product_analytics.most_bought.monthly
                    .current_stock
                }
              </p>
            </div>
          ) : (
            <p className='text-sm text-gray-500'>
              No monthly product sales yet.
            </p>
          )}
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <h3 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
            <Package className='w-4 h-4' />
            Most Bought Product (Yearly)
          </h3>
          {dashboardData.product_analytics.most_bought.yearly ? (
            <div className='space-y-1'>
              <p className='text-sm font-semibold text-gray-900'>
                {
                  dashboardData.product_analytics.most_bought.yearly
                    .product_name
                }
              </p>
              <p className='text-xs text-gray-500'>
                Qty Sold:{" "}
                {
                  dashboardData.product_analytics.most_bought.yearly
                    .total_quantity
                }
              </p>
              <p className='text-xs text-gray-500'>
                Sales:{" "}
                {formatAmount(
                  dashboardData.product_analytics.most_bought.yearly
                    .total_sales,
                )}
              </p>
              <p className='text-xs text-gray-500'>
                Current Stock:{" "}
                {
                  dashboardData.product_analytics.most_bought.yearly
                    .current_stock
                }
              </p>
            </div>
          ) : (
            <p className='text-sm text-gray-500'>
              No yearly product sales yet.
            </p>
          )}
        </div>
      </div>

      <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
        <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3'>
          <h3 className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
            <Boxes className='w-4 h-4' />
            Product Stocks
          </h3>
          <p className='text-xs text-gray-500'>
            Total: {dashboardData.product_analytics.stocks.total_products} |
            Out: {dashboardData.product_analytics.stocks.out_of_stock} | Low:{" "}
            {dashboardData.product_analytics.stocks.low_stock} | In stock:{" "}
            {dashboardData.product_analytics.stocks.in_stock}
          </p>
        </div>
        <div className='overflow-auto max-h-[360px]'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-2 text-left text-xs text-gray-500 uppercase'>
                  Product
                </th>
                <th className='px-3 py-2 text-right text-xs text-gray-500 uppercase'>
                  Price
                </th>
                <th className='px-3 py-2 text-right text-xs text-gray-500 uppercase'>
                  Stock
                </th>
                <th className='px-3 py-2 text-center text-xs text-gray-500 uppercase'>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {dashboardData.product_analytics.stocks.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className='px-3 py-6 text-center text-sm text-gray-500'
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                dashboardData.product_analytics.stocks.items.map((item) => (
                  <tr key={item.product_id}>
                    <td className='px-3 py-2 text-sm font-medium text-gray-800'>
                      {item.product_name}
                    </td>
                    <td className='px-3 py-2 text-sm text-right text-gray-700'>
                      {formatAmount(item.price)}
                    </td>
                    <td className='px-3 py-2 text-sm text-right font-semibold text-gray-800'>
                      {item.stock}
                    </td>
                    <td className='px-3 py-2 text-center'>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.stock_status === "out_of_stock"
                            ? "bg-red-100 text-red-700"
                            : item.stock_status === "low_stock"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {item.stock_status === "out_of_stock"
                          ? "Out of Stock"
                          : item.stock_status === "low_stock"
                            ? "Low Stock"
                            : "In Stock"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <h3 className='text-sm font-semibold text-gray-700 mb-3'>
            Earnings Per Year
          </h3>
          <div className='space-y-2'>
            {dashboardData.earnings.yearly.length === 0 ? (
              <p className='text-sm text-gray-500'>No payment records yet.</p>
            ) : (
              dashboardData.earnings.yearly.map((item) => (
                <div
                  key={item.year}
                  className='flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50'
                >
                  <span className='text-sm font-medium text-gray-700'>
                    {item.year}
                  </span>
                  <span className='text-sm font-bold text-gray-900'>
                    {formatAmount(item.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 p-4'>
          <h3 className='text-sm font-semibold text-gray-700 mb-3'>
            Monthly Earnings ({selectedYear})
          </h3>
          <div className='grid grid-cols-6 gap-2 items-end h-52'>
            {dashboardData.earnings.monthly.map((item) => {
              const height = Math.max(
                8,
                Math.round((item.total / maxMonthly) * 160),
              );

              return (
                <div
                  key={item.month}
                  className='flex flex-col items-center gap-1'
                >
                  <div
                    className='w-full rounded-t-md transition-all'
                    style={{
                      height: `${height}px`,
                      backgroundColor:
                        item.total > 0 ? `${colors.secondary}` : "#e5e7eb",
                    }}
                    title={`${MONTH_NAMES[item.month - 1]}: ${formatAmount(item.total)}`}
                  />
                  <span className='text-[10px] text-gray-600'>
                    {MONTH_NAMES[item.month - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
          <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3'>
            <h3 className='text-sm font-semibold text-gray-700'>
              Unpaid Students
            </h3>
            <input
              value={unpaidSearch}
              onChange={(e) => setUnpaidSearch(e.target.value)}
              className='px-3 py-1.5 border border-gray-300 rounded-md text-sm w-56'
              placeholder='Search unpaid...'
            />
          </div>
          <div className='overflow-auto max-h-[460px]'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-3 py-2 text-left text-xs text-gray-500 uppercase'>
                    Student
                  </th>
                  <th className='px-3 py-2 text-left text-xs text-gray-500 uppercase'>
                    Mode
                  </th>
                  <th className='px-3 py-2 text-right text-xs text-gray-500 uppercase'>
                    Paid
                  </th>
                  <th className='px-3 py-2 text-right text-xs text-gray-500 uppercase'>
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {paginatedUnpaidStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className='px-3 py-6 text-center text-sm text-gray-500'
                    >
                      No unpaid students found.
                    </td>
                  </tr>
                ) : (
                  paginatedUnpaidStudents.map((student) => {
                    const isInstallment =
                      student.payment_mode?.toLowerCase() === "installment";

                    return (
                      <tr key={student.assessment_id}>
                        <td className='px-3 py-2'>
                          <p className='text-sm font-medium text-gray-800'>
                            {student.student_name}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {student.student_number}
                          </p>
                        </td>
                        <td className='px-3 py-2'>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              isInstallment
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {isInstallment ? "Installment" : "Full Pay"}
                          </span>
                        </td>
                        <td className='px-3 py-2 text-sm text-right text-green-700'>
                          {formatAmount(student.total_paid)}
                        </td>
                        <td className='px-3 py-2 text-sm text-right font-semibold text-red-600'>
                          {formatAmount(student.remaining_balance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={unpaidCurrentPage}
            totalPages={unpaidTotalPages}
            itemsPerPage={unpaidItemsPerPage}
            totalItems={filteredUnpaidStudents.length}
            itemName='unpaid students'
            onPageChange={setUnpaidCurrentPage}
            onItemsPerPageChange={setUnpaidItemsPerPage}
            itemsPerPageOptions={[5, 10, 25, 50]}
          />
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
          <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3'>
            <h3 className='text-sm font-semibold text-gray-700'>
              Fully Paid Students
            </h3>
            <input
              value={paidSearch}
              onChange={(e) => setPaidSearch(e.target.value)}
              className='px-3 py-1.5 border border-gray-300 rounded-md text-sm w-56'
              placeholder='Search fully paid...'
            />
          </div>
          <div className='overflow-auto max-h-[460px]'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-3 py-2 text-left text-xs text-gray-500 uppercase'>
                    Student
                  </th>
                  <th className='px-3 py-2 text-left text-xs text-gray-500 uppercase'>
                    Program
                  </th>
                  <th className='px-3 py-2 text-right text-xs text-gray-500 uppercase'>
                    Total Paid
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {paginatedPaidStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className='px-3 py-6 text-center text-sm text-gray-500'
                    >
                      No fully paid students found.
                    </td>
                  </tr>
                ) : (
                  paginatedPaidStudents.map((student) => (
                    <tr key={student.assessment_id}>
                      <td className='px-3 py-2'>
                        <p className='text-sm font-medium text-gray-800'>
                          {student.student_name}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {student.student_number}
                        </p>
                      </td>
                      <td className='px-3 py-2 text-sm text-gray-600'>
                        {student.course_program || "-"}
                      </td>
                      <td className='px-3 py-2 text-right text-sm font-semibold text-green-700'>
                        {formatAmount(student.total_paid)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={paidCurrentPage}
            totalPages={paidTotalPages}
            itemsPerPage={paidItemsPerPage}
            totalItems={filteredPaidStudents.length}
            itemName='fully paid students'
            onPageChange={setPaidCurrentPage}
            onItemsPerPageChange={setPaidItemsPerPage}
            itemsPerPageOptions={[5, 10, 25, 50]}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentsDashboard;
