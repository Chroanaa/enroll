import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Remove id field if it exists - it should be auto-generated
    const { id, ...facultyData } = data;
    
    const newFaculty = await prisma.faculty.create({
      data: facultyData,
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
      orderBy: {
        last_name: 'asc',
      },
    });

    // Fetch all departments
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // Create a map for quick lookup
    const departmentMap = new Map(
      departments.map((dept) => [dept.id, dept.name])
    );

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
      "position",
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
      data: cleanData,
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
