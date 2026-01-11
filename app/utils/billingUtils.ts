import axios from "axios";

export interface Billing {
  id: number;
  enrollee_id: number | null;
  term: string | null;
  is_paid: number | null;
  date_paid: string | null;
  user_id: number | null;
  payment_type: string | null;
  amount: number | null;
  reference_no: string | null;
  // Joined fields from enrollment
  first_name?: string;
  family_name?: string;
  middle_name?: string;
  student_number?: string;
  course_program?: string;
  enrollment_term?: string;
}

export interface UnbilledEnrollee {
  id: number;
  student_number: string | null;
  first_name: string | null;
  family_name: string | null;
  middle_name: string | null;
  course_program: string | null;
  term: string | null;
  status: number | null;
}

export async function getBillings(): Promise<Billing[]> {
  try {
    const response = await axios.get("/api/auth/billing");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching billing data:", error);
    throw error;
  }
}

export async function getUnbilledEnrollees(): Promise<UnbilledEnrollee[]> {
  try {
    const response = await axios.get("/api/auth/billing?unbilled=true");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching unbilled enrollees:", error);
    throw error;
  }
}

export async function createBilling(data: {
  enrollee_id: number;
  term?: string;
  payment_type: string;
  amount: number;
  reference_no?: string;
  user_id?: number;
}): Promise<Billing> {
  try {
    const response = await axios.post("/api/auth/billing", data);
    return response.data;
  } catch (error) {
    console.error("Error creating billing:", error);
    throw error;
  }
}

export async function updateBilling(id: number, data: Partial<Billing>): Promise<Billing> {
  try {
    const response = await axios.patch("/api/auth/billing", { id, ...data });
    return response.data;
  } catch (error) {
    console.error("Error updating billing:", error);
    throw error;
  }
}

export async function deleteBilling(id: number): Promise<void> {
  try {
    await axios.delete("/api/auth/billing", { data: id });
  } catch (error) {
    console.error("Error deleting billing:", error);
    throw error;
  }
}
