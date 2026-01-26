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

export interface Category {
  id: number;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Product {
  id: number;
  name: string | null;
  category_id: number | null;
  quantity: number | null;
  price: number | null;
  created_at: string | null;
  updated_at: string | null;
  category?: Category | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  product_id: number;
  quantity: number;
  selling_price: number;
  total: number;
}

export interface EnrolledStudent {
  id: number;
  student_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  family_name: string | null;
  course_program: string | null;
  term: string | null;
  academic_year: string | null;
}

export async function getEnrolledStudent(
  studentNumber: string,
): Promise<EnrolledStudent | null> {
  try {
    const response = await axios.get(
      `/api/auth/students/enrolled?studentNumber=${studentNumber}`,
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error("Error fetching enrolled student:", error);
    throw error;
  }
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

export async function updateBilling(
  id: number,
  data: Partial<Billing>,
): Promise<Billing> {
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

// Product functions
export async function getProducts(): Promise<Product[]> {
  try {
    const response = await axios.get("/api/auth/products");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const response = await axios.get("/api/auth/categories");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

export async function createOrder(data: {
  order_date?: Date;
  order_amount: number;
  billing_id?: number;
  ar_number?: string;
  items: OrderItem[];
  payment_type: string;
  tendered_amount?: number;
  change_amount?: number;
  transaction_ref?: string;
  student_number?: string;
}): Promise<any> {
  try {
    const response = await axios.post("/api/auth/orders", data);
    return response.data;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
}

export interface EnrollmentOrderItem {
  enrollee_id: number;
  enrollee_name: string;
  amount: number;
}

export async function createEnrollmentOrder(data: {
  order_date?: Date;
  order_amount: number;
  billing_id?: number;
  items: EnrollmentOrderItem[];
  payment_type: string;
  tendered_amount?: number;
  change_amount?: number;
  transaction_ref?: string;
}): Promise<any> {
  try {
    const response = await axios.post("/api/auth/orders/enrollment", data);
    return response.data;
  } catch (error) {
    console.error("Error creating enrollment order:", error);
    throw error;
  }
}

// Order/Transaction interfaces
export interface OrderHeader {
  id: number;
  order_date: string;
  order_amount: number | null;
  billing_id: number | null;
  ar_number: string | null;
  isvoided: number | null;
  voided_header_id: number | null;
  student_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  payment_type?: string;
  transaction_ref?: string | null;
  // Joined student info
  student_name?: string;
  student_program?: string;
}

export interface OrderDetail {
  id: number;
  order_header_id: number | null;
  product_id: number;
  quantity: number | null;
  selling_price: number | null;
  total: number | null;
  product_name?: string;
}

export interface PaymentDetail {
  id: number;
  order_header_id: number | null;
  payment_id: number | null;
  amount: number | null;
  tendered_amount: number | null;
  change_amount: number | null;
  transaction_ref: string | null;
  payment_type_name?: string;
}

export interface OrderWithDetails extends OrderHeader {
  order_details: OrderDetail[];
  payment_details: PaymentDetail;
}

export async function getOrders(includeVoided = false): Promise<OrderHeader[]> {
  try {
    const response = await axios.get(
      `/api/auth/orders${includeVoided ? "?includeVoided=true" : ""}`,
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
}

export async function getOrderDetails(
  orderId: number,
): Promise<OrderWithDetails> {
  try {
    const response = await axios.get(`/api/auth/orders?id=${orderId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching order details:", error);
    throw error;
  }
}

export async function voidOrder(orderId: number): Promise<any> {
  try {
    const response = await axios.patch("/api/auth/orders", { id: orderId });
    return response.data;
  } catch (error) {
    console.error("Error voiding order:", error);
    throw error;
  }
}
