import React from "react";
import { EnrollmentPageProps } from "./types";
import AdmissionInformation from "./AdmissionInformation";
import AdmissionRequirements from "./AdmissionRequirements";
import StudentInformation from "./StudentInformation";
import EmergencyInformation from "./EmergencyInformation";
import EducationalBackground from "./EducationalBackground";

export const PAGE_COMPONENTS: Record<number, React.ComponentType<EnrollmentPageProps>> = {
  1: StudentInformation,
  2: EmergencyInformation,
  3: EducationalBackground,
  4: AdmissionInformation,
  5: AdmissionRequirements,
};

export const PAGE_TITLES = [
  "Student Information",
  "Emergency Information",
  "Educational Background",
  "Admission Information",
  "Admission Requirements",
] as const;

