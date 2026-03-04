import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/auth/fees/summarized
 * Returns fees with Miscellaneous category summarized into one total
 */
export async function GET() {
  try {
    // Fetch all active fees
    const fees = await prisma.fee.findMany({
      where: {
        status: "active",
      },
    });

    // Find the Miscellaneous category from fee_category table
    const miscellaneousCategory = await prisma.fee_category.findFirst({
      where: {
        title: {
          contains: "Miscellaneous",
          mode: "insensitive",
        },
        status: "active",
      },
    });

    // Get all miscellaneous fees from miscellaneous_fees table if category exists
    let miscellaneousTotal = 0;
    if (miscellaneousCategory) {
      const miscFees = await prisma.miscellaneous_fee.findMany({
        where: {
          category_id: miscellaneousCategory.id,
          status: "active",
        },
      });

      miscellaneousTotal = miscFees.reduce(
        (sum, fee) => sum + Number(fee.amount),
        0
      );
    }

    // Filter out fees with category "miscellaneous" from the old fee table
    const nonMiscellaneousFees = fees.filter(
      (fee) => fee.category?.toLowerCase() !== "miscellaneous"
    );

    // Convert fees to plain objects for JSON serialization
    const serializedFees = nonMiscellaneousFees.map(fee => ({
      id: fee.id,
      code: fee.code,
      name: fee.name,
      description: fee.description,
      amount: fee.amount.toString(), // Convert Decimal to string for JSON
      category: fee.category,
      academic_year: fee.academic_year,
      semester: fee.semester,
      status: fee.status,
    }));

    // Add the summarized miscellaneous fee if there's a total
    if (miscellaneousTotal > 0) {
      serializedFees.push({
        id: -1, // Special ID to indicate this is a summarized entry
        code: "MISC-TOTAL",
        name: "Miscellaneous",
        description: "Total of all miscellaneous fees",
        amount: miscellaneousTotal.toString(), // Convert to string for JSON
        category: "miscellaneous",
        academic_year: miscellaneousCategory?.academic_year || new Date().getFullYear().toString(),
        semester: null,
        status: "active",
      });
    }

    return NextResponse.json(serializedFees);
  } catch (error: any) {
    console.error("Error fetching summarized fees:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch summarized fees",
        details: error?.code || error,
      },
      { status: 500 }
    );
  }
}
