export interface Fee {
  id: number;
  code: string;
  name: string;
  amount: number;
  category: string;
  status?: string;
}

export interface PaymentDetail {
  paymentDate: string;
  orNumber: string;
  amountPaid: number;
  balance: number;
}

export interface EnrolledSubject {
  id: number;
  curriculum_id: number;
  subject_id?: number;
  course_code: string;
  descriptive_title: string;
  units_lec?: number;
  units_lab?: number;
  units_total: number;
  lecture_hour?: number;
  lab_hour?: number;
  prerequisite?: string;
  year_level: number;
  semester: number;
  fixedAmount?: number;
  subject?: {
    id: number;
    code: string;
    name: string;
  };
}




