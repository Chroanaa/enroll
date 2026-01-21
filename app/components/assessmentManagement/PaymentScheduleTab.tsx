import React from "react";
import { Calendar, FileText, Receipt } from "lucide-react";
import { colors } from "../../colors";

interface PaymentScheduleTabProps {
  prelimDate: string;
  setPrelimDate: (value: string) => void;
  prelimAmount: number;
  setPrelimAmount: (value: number) => void;
  midtermDate: string;
  setMidtermDate: (value: string) => void;
  midtermAmount: number;
  setMidtermAmount: (value: number) => void;
  finalsDate: string;
  setFinalsDate: (value: string) => void;
  finalsAmount: number;
  setFinalsAmount: (value: number) => void;
}

export const PaymentScheduleTab: React.FC<PaymentScheduleTabProps> = ({
  prelimDate,
  setPrelimDate,
  prelimAmount,
  setPrelimAmount,
  midtermDate,
  setMidtermDate,
  midtermAmount,
  setMidtermAmount,
  finalsDate,
  setFinalsDate,
  finalsAmount,
  setFinalsAmount,
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mb-6">
        <h3
          className="text-xl font-bold tracking-tight mb-1"
          style={{ color: colors.primary }}
        >
          Payment Schedule
        </h3>
        <p
          className="text-sm font-medium"
          style={{ color: colors.tertiary }}
        >
          Manage payment details and installment schedule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Details */}
        <div
          className="p-5 rounded-xl border shadow-sm"
          style={{
            borderColor: colors.accent + "20",
            backgroundColor: "white",
          }}
        >
          <div
            className="flex items-center gap-3 mb-5 pb-3 border-b"
            style={{ borderColor: colors.accent + "10" }}
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.accent + "15" }}
            >
              <Receipt
                className="w-4 h-4"
                style={{ color: colors.secondary }}
              />
            </div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Payment Details
            </h3>
          </div>
          <div
            className="border rounded-xl overflow-hidden"
            style={{ borderColor: colors.accent + "20" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: colors.accent + "08" }}>
                  <th
                    className="px-4 py-3 text-left border-r font-semibold"
                    style={{
                      borderColor: colors.accent + "20",
                      color: colors.primary,
                    }}
                  >
                    Payment Date
                  </th>
                  <th
                    className="px-4 py-3 text-left border-r font-semibold"
                    style={{
                      borderColor: colors.accent + "20",
                      color: colors.primary,
                    }}
                  >
                    O.R. Number
                  </th>
                  <th
                    className="px-4 py-3 text-left border-r font-semibold"
                    style={{
                      borderColor: colors.accent + "20",
                      color: colors.primary,
                    }}
                  >
                    Amount Paid
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold"
                    style={{ color: colors.primary }}
                  >
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr
                    key={row}
                    className="border-b hover:bg-white/50 transition-colors"
                    style={{ borderColor: colors.accent + "10" }}
                  >
                    <td
                      className="px-4 py-3 border-r"
                      style={{ borderColor: colors.accent + "20" }}
                    >
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
                          e.currentTarget.style.backgroundColor =
                            "transparent";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </td>
                    <td
                      className="px-4 py-3 border-r"
                      style={{ borderColor: colors.accent + "20" }}
                    >
                      <input
                        type="text"
                        className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                        style={{ color: colors.primary }}
                        onFocus={(e) => {
                          e.currentTarget.style.backgroundColor = "white";
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "transparent";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        placeholder="O.R. #"
                      />
                    </td>
                    <td
                      className="px-4 py-3 border-r"
                      style={{ borderColor: colors.accent + "20" }}
                    >
                      <input
                        type="number"
                        className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                        style={{ color: colors.primary }}
                        onFocus={(e) => {
                          e.currentTarget.style.backgroundColor = "white";
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "transparent";
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
                          e.currentTarget.style.backgroundColor =
                            "transparent";
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
          className="p-5 rounded-xl border shadow-sm"
          style={{
            borderColor: colors.accent + "20",
            backgroundColor: "white",
          }}
        >
          <div
            className="flex items-center gap-3 mb-5 pb-3 border-b"
            style={{ borderColor: colors.accent + "10" }}
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.accent + "15" }}
            >
              <Calendar
                className="w-4 h-4"
                style={{ color: colors.secondary }}
              />
            </div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Mode of Payment
            </h3>
          </div>
          <div
            className="border rounded-xl overflow-hidden"
            style={{ borderColor: colors.accent + "20" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: colors.accent + "08" }}>
                  <th
                    className="px-4 py-3 text-left border-r font-semibold"
                    style={{
                      borderColor: colors.accent + "20",
                      color: colors.primary,
                    }}
                  >
                    Term
                  </th>
                  <th
                    className="px-4 py-3 text-left border-r font-semibold"
                    style={{
                      borderColor: colors.accent + "20",
                      color: colors.primary,
                    }}
                  >
                    Date
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold"
                    style={{ color: colors.primary }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    term: "PRELIM",
                    date: prelimDate,
                    setDate: setPrelimDate,
                    amount: prelimAmount,
                    setAmount: setPrelimAmount,
                  },
                  {
                    term: "MIDTERM",
                    date: midtermDate,
                    setDate: setMidtermDate,
                    amount: midtermAmount,
                    setAmount: setMidtermAmount,
                  },
                  {
                    term: "FINALS",
                    date: finalsDate,
                    setDate: setFinalsDate,
                    amount: finalsAmount,
                    setAmount: setFinalsAmount,
                  },
                ].map((item) => (
                  <tr
                    key={item.term}
                    className="border-b hover:bg-white/50 transition-colors"
                    style={{ borderColor: colors.accent + "10" }}
                  >
                    <td
                      className="px-4 py-3 border-r font-semibold"
                      style={{
                        borderColor: colors.accent + "20",
                        color: colors.secondary,
                      }}
                    >
                      {item.term}
                    </td>
                    <td
                      className="px-4 py-3 border-r"
                      style={{ borderColor: colors.accent + "20" }}
                    >
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
                          e.currentTarget.style.backgroundColor =
                            "transparent";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.amount || ""}
                        onChange={(e) =>
                          item.setAmount(parseFloat(e.target.value) || 0)
                        }
                        className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                        style={{ color: colors.primary }}
                        onFocus={(e) => {
                          e.currentTarget.style.backgroundColor = "white";
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "transparent";
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
    </div>
  );
};


