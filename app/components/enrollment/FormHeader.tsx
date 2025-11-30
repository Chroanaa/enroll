import React from "react";
import { colors } from "../../colors";

export const FormHeader: React.FC = () => {
  return (
    <div className='mb-10 animate-in fade-in slide-in-from-top-8 duration-700'>
      <div>
        <h1
          className='text-3xl font-bold mb-2 tracking-tight'
          style={{ color: colors.primary }}
        >
          Student Enrollment
        </h1>
        <p
          className='text-base font-medium max-w-2xl leading-relaxed'
          style={{ color: colors.tertiary }}
        >
          Complete the form below to process your enrollment application
        </p>
      </div>
    </div>
  );
};
