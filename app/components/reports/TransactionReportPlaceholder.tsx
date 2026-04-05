"use client";

import React from "react";
import { FileBarChart, Wrench } from "lucide-react";
import { colors } from "../../colors";

interface TransactionReportPlaceholderProps {
  title: string;
  description: string;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 14px 32px ${colors.neutralBorder}55`,
};

const TransactionReportPlaceholder: React.FC<
  TransactionReportPlaceholderProps
> = ({ title, description }) => {
  return (
    <div className='min-h-screen p-6' style={{ backgroundColor: colors.paper }}>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
        <section
          className='overflow-hidden rounded-3xl px-6 py-8'
          style={cardStyle}
        >
          <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
            <div className='flex items-start gap-4'>
              <div
                className='flex h-14 w-14 items-center justify-center rounded-2xl'
                style={{
                  backgroundColor: `${colors.secondary}12`,
                  color: colors.secondary,
                }}
              >
                <FileBarChart className='h-7 w-7' />
              </div>
              <div>
                <h1
                  className='text-3xl font-bold tracking-tight'
                  style={{ color: colors.primary }}
                >
                  {title}
                </h1>
                <p className='mt-2 text-sm leading-6' style={{ color: colors.tertiary }}>
                  {description}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className='overflow-hidden rounded-3xl px-6 py-10'
          style={cardStyle}
        >
          <div className='flex flex-col items-center justify-center gap-4 py-12 text-center'>
            <div
              className='flex h-16 w-16 items-center justify-center rounded-2xl'
              style={{
                backgroundColor: `${colors.secondary}10`,
                color: colors.secondary,
              }}
            >
              <Wrench className='h-8 w-8' />
            </div>
            <div>
              <h2
                className='text-xl font-semibold'
                style={{ color: colors.primary }}
              >
                Report Screen Ready For Build
              </h2>
              <p
                className='mx-auto mt-2 max-w-2xl text-sm leading-6'
                style={{ color: colors.tertiary }}
              >
                The navigation structure is already in place. This page is a
                placeholder so the new Transaction Reports group is complete and
                ready for the next full report implementation.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TransactionReportPlaceholder;
