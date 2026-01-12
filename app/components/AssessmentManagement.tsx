"use client";
import React, { useState, useEffect } from "react";
import { Calculator, User, GraduationCap, FileText, DollarSign, CreditCard, Calendar, Receipt } from "lucide-react";
import { colors } from "../colors";
import { defaultFormStyles } from "../utils/formStyles";

interface Fee {
  id: number;
  code: string;
  name: string;
  amount: number;
  category: string;
}

interface PaymentDetail {
  paymentDate: string;
  orNumber: string;
  amountPaid: number;
  balance: number;
}

const AssessmentManagement: React.FC = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  // Form data
  const [studentName, setStudentName] = useState("");
  const [program, setProgram] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [tuitionPerUnit, setTuitionPerUnit] = useState("570");
  const [totalUnits, setTotalUnits] = useState(0);
  const [isFetchingStudent, setIsFetchingStudent] = useState(false);
  const [studentFetchError, setStudentFetchError] = useState("");

  // Cash Basis
  const [tuition, setTuition] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [netTuition, setNetTuition] = useState(0);
  const [lab, setLab] = useState(0);
  const [ojt, setOjt] = useState(0);
  const [nstp, setNstp] = useState(0);
  const [pe, setPe] = useState(0);
  const [misc, setMisc] = useState(0);
  const [other, setOther] = useState(0);
  const [totalFees, setTotalFees] = useState(0);

  // Installment Basis
  const [downPayment, setDownPayment] = useState(0);
  const [net, setNet] = useState(0);
  const [insuranceCharge, setInsuranceCharge] = useState(0);
  const [totalInstallment, setTotalInstallment] = useState(0);

  // Payment Details
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);

  // Mode of Payment
  const [prelimDate, setPrelimDate] = useState("");
  const [prelimAmount, setPrelimAmount] = useState(0);
  const [midtermDate, setMidtermDate] = useState("");
  const [midtermAmount, setMidtermAmount] = useState(0);
  const [finalsDate, setFinalsDate] = useState("");
  const [finalsAmount, setFinalsAmount] = useState(0);

  useEffect(() => {
    fetchFees();
  }, []);

  // Function to fetch student information by student number
  const fetchStudentByNumber = async (studentNum: string) => {
    if (!studentNum.trim()) {
      setStudentFetchError("");
      return;
    }

    setIsFetchingStudent(true);
    setStudentFetchError("");

    try {
      const response = await fetch(`/api/students/${studentNum.trim()}`);
      if (response.ok) {
        const data = await response.json();
        
        // Construct student name from available fields
        let fullName = "";
        if (data.first_name || data.last_name) {
          const parts = [
            data.first_name || "",
            data.middle_name || "",
            data.last_name || "",
            data.suffix || ""
          ].filter(Boolean);
          fullName = parts.join(" ");
        }
        
        // Set student name if available
        if (fullName) {
          setStudentName(fullName);
        }
        
        // Set program from course_program or department
        if (data.course_program) {
          setProgram(data.course_program);
        } else if (data.department) {
          setProgram(data.department);
        }
      } else {
        const errorData = await response.json();
        setStudentFetchError(errorData.error || "Student not found");
        // Clear fields if student not found
        setStudentName("");
        setProgram("");
      }
    } catch (error) {
      console.error("Error fetching student:", error);
      setStudentFetchError("Failed to fetch student information");
      setStudentName("");
      setProgram("");
    } finally {
      setIsFetchingStudent(false);
    }
  };

  // Handle student number change with debounce
  useEffect(() => {
    if (studentNumber.trim()) {
      const timeoutId = setTimeout(() => {
        fetchStudentByNumber(studentNumber);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      // Clear fields if student number is empty
      setStudentName("");
      setProgram("");
      setStudentFetchError("");
    }
  }, [studentNumber]);

  useEffect(() => {
    // Calculate net tuition
    const net = tuition - discount;
    setNetTuition(net);

    // Calculate total fees (cash basis)
    const total = net + lab + ojt + nstp + pe + misc + other;
    setTotalFees(total);

    // Calculate installment basis
    const installmentNet = total - downPayment;
    setNet(installmentNet);
    const insurance = installmentNet * 0.05;
    setInsuranceCharge(insurance);
    setTotalInstallment(installmentNet + insurance);
  }, [tuition, discount, lab, ojt, nstp, pe, misc, other, downPayment]);

  const fetchFees = async () => {
    try {
      const response = await fetch("/api/auth/fees");
      const data = await response.json();
      setFees(data || []);
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 min-h-screen" style={{ background: colors.paper }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-3 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";

  return (
    <div className="p-4 sm:p-6 min-h-screen" style={{ background: colors.paper }}>
      <style>{defaultFormStyles}</style>
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-10 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300"
              style={{
                backgroundColor: "white",
                border: `1px solid ${colors.accent}20`
              }}
            >
              <Calculator
                className="w-6 h-6"
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: colors.primary }}>
                Assessment Management
              </h1>
              <p className="text-base font-medium max-w-2xl leading-relaxed" style={{ color: colors.tertiary }}>
                Record and handle student tuition details based on enrolled courses, unit costs, and applicable miscellaneous fees
              </p>
            </div>
          </div>
        </div>

        {/* Summary of Payment Form */}
        <div
          className="rounded-2xl shadow-2xl p-8 mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-100"
          style={{
            backgroundColor: "white",
            border: `1px solid ${colors.accent}30`,
            background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`
          }}
        >
          {/* Header Section */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b" style={{ borderColor: colors.accent + "10" }}>
            <div
              className="p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300"
              style={{
                backgroundColor: "white",
                border: `1px solid ${colors.accent}20`
              }}
            >
              <User
                className="w-6 h-6"
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.primary }}>
                Student Information
              </h2>
              <p className="text-sm mt-1 font-medium" style={{ color: colors.tertiary }}>
                Enter student details for assessment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <FileText className="w-4 h-4" style={{ color: colors.secondary }} />
                Student Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className={inputClasses}
                  style={{
                    borderColor: studentFetchError ? "#ef4444" : colors.tertiary + "30",
                    color: colors.primary
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = studentFetchError ? "#ef4444" : colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="Enter student number"
                />
                {isFetchingStudent && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                  </div>
                )}
              </div>
              {studentFetchError && (
                <p className="text-xs text-red-500 mt-1 ml-1">{studentFetchError}</p>
              )}
            </div>
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <User className="w-4 h-4" style={{ color: colors.secondary }} />
                Student Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className={inputClasses}
                style={{
                  borderColor: colors.tertiary + "30",
                  color: colors.primary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                  e.currentTarget.style.boxShadow = "none";
                }}
                placeholder="Enter student name"
              />
            </div>
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <GraduationCap className="w-4 h-4" style={{ color: colors.secondary }} />
                Program
              </label>
              <input
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className={inputClasses}
                style={{
                  borderColor: colors.tertiary + "30",
                  color: colors.primary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                  e.currentTarget.style.boxShadow = "none";
                }}
                placeholder="Enter program"
              />
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b" style={{ borderColor: colors.accent + "10" }}>
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300"
                style={{
                  backgroundColor: "white",
                  border: `1px solid ${colors.accent}20`
                }}
              >
                <DollarSign
                  className="w-6 h-6"
                  style={{ color: colors.secondary }}
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.primary }}>
                  Summary of Payment
                </h2>
                <p className="text-sm mt-1 font-medium" style={{ color: colors.tertiary }}>
                  Calculate and manage student fees
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{
              backgroundColor: colors.accent + "05",
              borderColor: colors.accent + "10"
            }}>
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                Tuition Fee Per Unit:
              </span>
              <input
                type="text"
                value={tuitionPerUnit}
                onChange={(e) => setTuitionPerUnit(e.target.value)}
                className="px-3 py-1 rounded-lg border text-center w-24 bg-white"
                style={{
                  borderColor: colors.tertiary + "30",
                  color: colors.primary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Payment Breakdown - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Cash Basis */}
            <div
              className="p-6 rounded-2xl border shadow-lg shadow-gray-100/50"
              style={{
                borderColor: colors.accent + "20",
                background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`
              }}
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: colors.accent + "10" }}>
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: colors.accent + "15" }}
                >
                  <DollarSign className="w-5 h-5" style={{ color: colors.secondary }} />
                </div>
                <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                  Cash Basis
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Tuition", value: tuition, setValue: setTuition, key: "tuition" },
                  { label: "Discount", value: discount, setValue: setDiscount, key: "discount" },
                  { label: "Net Tuition", value: netTuition, setValue: () => { }, key: "netTuition", readonly: true },
                  { label: "Lab", value: lab, setValue: setLab, key: "lab" },
                  { label: "OJT", value: ojt, setValue: setOjt, key: "ojt" },
                  { label: "NSTP", value: nstp, setValue: setNstp, key: "nstp" },
                  { label: "PE", value: pe, setValue: setPe, key: "pe" },
                  { label: "Misc.", value: misc, setValue: setMisc, key: "misc" },
                  { label: "Other/s", value: other, setValue: setOther, key: "other" },
                  { label: "Total Fees", value: totalFees, setValue: () => { }, key: "totalFees", readonly: true, highlight: true },
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center py-2 px-3 rounded-lg border" style={{ 
                    borderColor: item.highlight ? colors.secondary + "30" : colors.accent + "10",
                    backgroundColor: item.highlight ? colors.accent + "08" : "transparent"
                  }}>
                    <span className="text-sm font-medium" style={{ color: item.highlight ? colors.secondary : colors.primary }}>
                      {item.label}
                    </span>
                    <input
                      type="number"
                      value={item.value || ""}
                      onChange={(e) => !item.readonly && item.setValue(parseFloat(e.target.value) || 0)}
                      readOnly={item.readonly}
                      className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                      style={{
                        borderColor: item.highlight ? colors.secondary + "30" : colors.tertiary + "30",
                        color: item.highlight ? colors.secondary : colors.primary,
                        fontWeight: item.highlight ? "bold" : "normal"
                      }}
                      onFocus={(e) => {
                        if (!item.readonly) {
                          e.currentTarget.style.borderColor = colors.secondary;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                        }
                      }}
                      onBlur={(e) => {
                        if (!item.readonly) {
                          e.currentTarget.style.borderColor = colors.tertiary + "30";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Installment Basis */}
            <div
              className="p-6 rounded-2xl border shadow-lg shadow-gray-100/50"
              style={{
                borderColor: colors.accent + "20",
                background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`
              }}
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: colors.accent + "10" }}>
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: colors.accent + "15" }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: colors.secondary }} />
                </div>
                <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                  Installment Basis
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Total Fees", value: totalFees, setValue: () => { }, key: "totalFeesInst", readonly: true },
                  { label: "D. Payment", value: downPayment, setValue: setDownPayment, key: "downPayment" },
                  { label: "Net", value: net, setValue: () => { }, key: "net", readonly: true },
                  { label: "5% Ins. C.", value: insuranceCharge, setValue: () => { }, key: "insurance", readonly: true },
                  { label: "Total Ins.", value: totalInstallment, setValue: () => { }, key: "totalInstallment", readonly: true, highlight: true },
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center py-2 px-3 rounded-lg border" style={{ 
                    borderColor: item.highlight ? colors.secondary + "30" : colors.accent + "10",
                    backgroundColor: item.highlight ? colors.accent + "08" : "transparent"
                  }}>
                    <span className="text-sm font-medium" style={{ color: item.highlight ? colors.secondary : colors.primary }}>
                      {item.label}
                    </span>
                    <input
                      type="number"
                      value={item.value || ""}
                      onChange={(e) => !item.readonly && item.setValue(parseFloat(e.target.value) || 0)}
                      readOnly={item.readonly}
                      className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                      style={{
                        borderColor: item.highlight ? colors.secondary + "30" : colors.tertiary + "30",
                        color: item.highlight ? colors.secondary : colors.primary,
                        fontWeight: item.highlight ? "bold" : "normal"
                      }}
                      onFocus={(e) => {
                        if (!item.readonly) {
                          e.currentTarget.style.borderColor = colors.secondary;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                        }
                      }}
                      onBlur={(e) => {
                        if (!item.readonly) {
                          e.currentTarget.style.borderColor = colors.tertiary + "30";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Details and Mode of Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Payment Details */}
            <div
              className="p-6 rounded-2xl border shadow-lg shadow-gray-100/50"
              style={{
                borderColor: colors.accent + "20",
                background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`
              }}
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: colors.accent + "10" }}>
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: colors.accent + "15" }}
                >
                  <Receipt className="w-5 h-5" style={{ color: colors.secondary }} />
                </div>
                <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                  Payment Details
                </h3>
              </div>
              <div className="border rounded-xl overflow-hidden" style={{ borderColor: colors.accent + "20" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: colors.accent + "08" }}>
                      <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                        Payment Date
                      </th>
                      <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                        O.R. Number
                      </th>
                      <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                        Amount Paid
                      </th>
                      <th className="px-4 py-3 text-left font-semibold" style={{ color: colors.primary }}>
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((row) => (
                      <tr key={row} className="border-b hover:bg-white/50 transition-colors" style={{ borderColor: colors.accent + "10" }}>
                        <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                          <input
                            type="date"
                            className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                            style={{ 
                              color: colors.primary,
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.backgroundColor = "white";
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                          <input
                            type="text"
                            className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                            style={{ color: colors.primary }}
                            onFocus={(e) => {
                              e.currentTarget.style.backgroundColor = "white";
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            placeholder="O.R. #"
                          />
                        </td>
                        <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                          <input
                            type="number"
                            className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                            style={{ color: colors.primary }}
                            onFocus={(e) => {
                              e.currentTarget.style.backgroundColor = "white";
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                            style={{ color: colors.primary }}
                            onFocus={(e) => {
                              e.currentTarget.style.backgroundColor = "white";
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            placeholder="0.00"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mode of Payment */}
            <div
              className="p-6 rounded-2xl border shadow-lg shadow-gray-100/50"
              style={{
                borderColor: colors.accent + "20",
                background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`
              }}
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: colors.accent + "10" }}>
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: colors.accent + "15" }}
                >
                  <Calendar className="w-5 h-5" style={{ color: colors.secondary }} />
                </div>
                <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                  Mode of Payment
                </h3>
              </div>
              <div className="border rounded-xl overflow-hidden" style={{ borderColor: colors.accent + "20" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: colors.accent + "08" }}>
                      <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                        Term
                      </th>
                      <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold" style={{ color: colors.primary }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { term: "PRELIM", date: prelimDate, setDate: setPrelimDate, amount: prelimAmount, setAmount: setPrelimAmount },
                      { term: "MIDTERM", date: midtermDate, setDate: setMidtermDate, amount: midtermAmount, setAmount: setMidtermAmount },
                      { term: "FINALS", date: finalsDate, setDate: setFinalsDate, amount: finalsAmount, setAmount: setFinalsAmount },
                    ].map((item) => (
                      <tr key={item.term} className="border-b hover:bg-white/50 transition-colors" style={{ borderColor: colors.accent + "10" }}>
                        <td className="px-4 py-3 border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.secondary }}>
                          {item.term}
                        </td>
                        <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => item.setDate(e.target.value)}
                            className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                            style={{ color: colors.primary }}
                            onFocus={(e) => {
                              e.currentTarget.style.backgroundColor = "white";
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.amount || ""}
                            onChange={(e) => item.setAmount(parseFloat(e.target.value) || 0)}
                            className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                            style={{ color: colors.primary }}
                            onFocus={(e) => {
                              e.currentTarget.style.backgroundColor = "white";
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            placeholder="0.00"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t" style={{ borderColor: colors.accent + "10" }}>
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <FileText className="w-4 h-4" style={{ color: colors.secondary }} />
                Accounting Signature
              </label>
              <div className="h-12 border-b-2 rounded-lg px-3 flex items-end" style={{ 
                borderColor: colors.tertiary + "30",
                backgroundColor: colors.paper
              }}></div>
            </div>
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <Calendar className="w-4 h-4" style={{ color: colors.secondary }} />
                Date
              </label>
              <div className="h-12 border-b-2 rounded-lg px-3 flex items-end" style={{ 
                borderColor: colors.tertiary + "30",
                backgroundColor: colors.paper
              }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentManagement;
