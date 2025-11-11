import React from "react";
import { GraduationCap } from "lucide-react";
import { colors } from "../../colors";

export const FormHeader: React.FC = () => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <div 
          className="p-3 rounded-xl shadow-md"
          style={{ 
            background: `linear-gradient(135deg, ${colors.secondary}, ${colors.tertiary})`
          }}
        >
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>
            Enrollment Form
          </h1>
          <p className="text-base" style={{ color: colors.tertiary }}>
            Complete the enrollment form to register new students
          </p>
        </div>
      </div>
    </div>
  );
};

