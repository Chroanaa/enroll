import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

const generateFacultyEmployeeId = async (): Promise<string> => {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 25; attempt++) {
    const random6 = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0");
    const candidate = `FAC${year}-${random6}`;

    const exists = await prisma.faculty.findFirst({
      where: { employee_id: candidate },
      select: { id: true },
    });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Unable to generate unique Faculty ID. Please try again.");
};

const isValidFacultyEmployeeId = (value: string): boolean => {
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^FAC${year}-\\d{6}$`);
  return pattern.test(value);
};

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, employee_id, ...facultyData } = data;
    let employeeIdToUse: string;

    if (typeof employee_id === "string" && isValidFacultyEmployeeId(employee_id)) {
      const exists = await prisma.faculty.findFirst({
        where: { employee_id },
        select: { id: true },
      });

      employeeIdToUse = exists ? await generateFacultyEmployeeId() : employee_id;
    } else {
      employeeIdToUse = await generateFacultyEmployeeId();
    }
    
    const newFaculty = await prisma.faculty.create({
      data: {
        ...(facultyData as any),
        employee_id: employeeIdToUse,
      },
    });
    return NextResponse.json(newFaculty);
  } catch (error) {
    console.error("Error creating faculty:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const faculties = await prisma.faculty.findMany({
      where: {
        OR: [{ status: "active" }, { status: "1" }],
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        department_id: true,
        status: true,
      },
      orderBy: {
        last_name: 'asc',
      },
    });

    const departmentIds = [...new Set(faculties.map((f) => f.department_id).filter(Boolean))] as number[];
    const departments = departmentIds.length
      ? await prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true },
        })
      : [];
    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

    // Add department name to each faculty
    const facultiesWithDepartment = faculties.map((faculty) => ({
      ...faculty,
      departmentName: faculty.department_id
        ? departmentMap.get(faculty.department_id) || 'N/A'
        : 'N/A',
    }));

    return NextResponse.json(facultiesWithDepartment);
  } catch (error) {
    console.error("Error fetching faculties:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculties" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Faculty ID is required" },
        { status: 400 }
      );
    }
    
    const deletedFaculty = await prisma.faculty.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json(deletedFaculty);
  } catch (error) {
    console.error("Error deleting faculty:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete faculty" },
      { status: 500 }
    );
  }
}
export async function PATCH(nextRequest: NextRequest) {
  try {
    const data = await nextRequest.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: "Faculty ID is required" },
        { status: 400 }
      );
    }
    
    // Define valid fields for faculty update
    const validFields = [
      "employee_id",
      "first_name",
      "last_name",
      "middle_name",
      "email",
      "phone",
      "department_id",
      "employment_status",
      "mother_unit",
      "position",
      "degree",
      "specialization",
      "status"
    ];
    
    const cleanData = Object.keys(updateData)
      .filter((key) => validFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = (updateData as any)[key];
        return obj;
      }, {});
    
    const updatedFaculty = await prisma.faculty.update({
      where: { id: Number(id) },
      data: cleanData as any,
    });
    
    return NextResponse.json(updatedFaculty);
  } catch (error) {
    console.error("Error updating faculty:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update faculty" },
      { status: 500 }
    );
  }
}
