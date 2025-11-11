import React from "react";
import { EnrollmentPageProps } from "./types";
import AdmissionInformation from "./AdmissionInformation";
import AdmissionRequirements from "./AdmissionRequirements";
import StudentInformation from "./StudentInformation";
import EmergencyInformation from "./EmergencyInformation";
import EducationalBackground from "./EducationalBackground";

export const PAGE_COMPONENTS: Record<number, React.ComponentType<EnrollmentPageProps>> = {
  1: AdmissionInformation,
  2: AdmissionRequirements,
  3: StudentInformation,
  4: EmergencyInformation,
  5: EducationalBackground,
};

export const PAGE_TITLES = [
  "Admission Information",
  "Admission Requirements",
  "Student Information",
  "Emergency Information",
  "Educational Background",
] as const;

