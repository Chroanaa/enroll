"use client";
import React from "react";
import { BookOpen } from "lucide-react";
import { Subject } from "../../../types";
import BulkAddForm, { BulkAddFormConfig } from "../../common/BulkAddForm";

interface MultipleSubjectFormProps {
  onSave: (subjects: Omit<Subject, 'id'>[]) => void;
  onCancel: () => void;
}

const MultipleSubjectForm: React.FC<MultipleSubjectFormProps> = ({
  onSave,
  onCancel,
}) => {
  const config: BulkAddFormConfig = {
    title: "Add Multiple Subjects",
    description: "Add new subject records in bulk",
    icon: BookOpen,
    itemName: "subject",
    fields: [
      {
        key: "code",
        label: "Code",
        type: "text",
        placeholder: "e.g. MATH101",
        required: true,
        transform: (value: string) => value.toUpperCase(),
      },
      {
        key: "name",
        label: "Name",
        type: "text",
        placeholder: "e.g. Calculus I",
        required: true,
      },
      {
        key: "description",
        label: "Description",
        type: "text",
        placeholder: "Optional",
        required: false,
      },
      {
        key: "units_lec",
        label: "Lecture Credits",
        type: "number",
        placeholder: "0",
        min: 0,
        max: 6,
        required: false,
      },
      {
        key: "units_lab",
        label: "Lab Credits",
        type: "number",
        placeholder: "0",
        min: 0,
        max: 6,
        required: false,
      },
      {
        key: "lecture_hour",
        label: "Lecture Hours",
        type: "number",
        placeholder: "0",
        min: 0,
        required: false,
      },
      {
        key: "lab_hour",
        label: "Lab Hours",
        type: "number",
        placeholder: "0",
        min: 0,
        required: false,
      },
      {
        key: "fixedAmount",
        label: "Fixed Amount",
        type: "number",
        placeholder: "0.00",
        min: 0,
        step: 0.01,
        required: false,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: false,
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    initialRow: {
      code: "",
      name: "",
      description: "",
      units_lec: "",
      units_lab: "",
      lecture_hour: "",
      lab_hour: "",
      fixedAmount: "",
      status: "active",
    },
    validateRow: (row: Record<string, any>, index: number): string[] => {
      const errors: string[] = [];
      const rowNum = index >= 0 ? index + 1 : "this";

      // Check if row has any data
      const hasData =
        row.code?.trim() ||
        row.name?.trim() ||
        row.units_lec ||
        row.units_lab;

      if (!hasData) {
        return errors;
      }

      if (!row.code?.trim()) {
        errors.push(`Row ${rowNum}: Subject Code is required`);
      }
      if (!row.name?.trim()) {
        errors.push(`Row ${rowNum}: Subject Name is required`);
      }
      if (
        row.code?.trim() &&
        row.name?.trim() &&
        !row.units_lec &&
        !row.units_lab
      ) {
        errors.push(
          `Row ${rowNum}: At least one unit (Lecture or Lab) is required`
        );
      }
      
      // Validate fixedAmount if provided
      if (row.fixedAmount !== undefined && row.fixedAmount !== null && row.fixedAmount !== "") {
        const amount = Number(row.fixedAmount);
        if (isNaN(amount) || amount < 0) {
          errors.push(`Row ${rowNum}: Fixed Amount must be a valid non-negative decimal number`);
        }
      }

      return errors;
    },
    transformRow: (row: Record<string, any>): Omit<Subject, 'id'> => {
      return {
        code: row.code.trim().toUpperCase(),
        name: row.name.trim(),
        description: row.description?.trim() || undefined,
        units_lec: row.units_lec ? Number(row.units_lec) : undefined,
        units_lab: row.units_lab ? Number(row.units_lab) : undefined,
        lecture_hour: row.lecture_hour ? Number(row.lecture_hour) : undefined,
        lab_hour: row.lab_hour ? Number(row.lab_hour) : undefined,
        fixedAmount: row.fixedAmount && row.fixedAmount !== "" ? Number(row.fixedAmount) : undefined,
        status: row.status || "active",
      };
    },
    hasData: (row: Record<string, any>): boolean => {
      return !!(
        row.code?.trim() ||
        row.name?.trim() ||
        row.units_lec ||
        row.units_lab ||
        row.fixedAmount
      );
    },
  };

  return <BulkAddForm config={config} onSave={onSave} onCancel={onCancel} />;
};

export default MultipleSubjectForm;
