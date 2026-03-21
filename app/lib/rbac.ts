export const ROLES = {
  ADMIN: 1,
  CASHIER: 2,
  FACULTY: 3,
  REGISTRAR: 4,
  DEAN: 5,
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];
export type BillingTab = "products" | "enrollments" | "transactions";

const PAYMENT_BILLING_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.CASHIER,
  ROLES.DEAN,
];

const BILLING_TABS: BillingTab[] = ["products", "enrollments", "transactions"];

export const VIEW_ROLES: Record<string, number[]> = {
  home: [
    ROLES.ADMIN,
    ROLES.CASHIER,
    ROLES.FACULTY,
    ROLES.REGISTRAR,
    ROLES.DEAN,
  ],
  dashboard: [
    ROLES.ADMIN,
    ROLES.CASHIER,
    ROLES.FACULTY,
    ROLES.REGISTRAR,
    ROLES.DEAN,
  ],
  students: [ROLES.FACULTY, ROLES.DEAN],
  courses: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  enrollments: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "enrollment-form": [ROLES.ADMIN, ROLES.REGISTRAR],
  "resident-enrollment": [ROLES.ADMIN, ROLES.REGISTRAR],
  forecast: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "forecast-billing": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  assessment: [ROLES.ADMIN, ROLES.CASHIER, ROLES.DEAN],
  "subject-dropping": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "student-dropping": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "cross-enrollee": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  shifting: [ROLES.ADMIN, ROLES.REGISTRAR],
  "program-shifting": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  reports: [ROLES.ADMIN, ROLES.REGISTRAR],
  "reports-payments-dashboard": [ROLES.ADMIN, ROLES.CASHIER, ROLES.DEAN],
  "reports-registration-forms": [ROLES.ADMIN, ROLES.REGISTRAR],
  scheduling: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY, ROLES.DEAN],
  "section-management": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "faculty-subject-management": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "payment-billing": PAYMENT_BILLING_ALLOWED_ROLES,
  "student-payment-checkout": PAYMENT_BILLING_ALLOWED_ROLES,
  "student-financial-detail": PAYMENT_BILLING_ALLOWED_ROLES,
  refund: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.CASHIER],
  curriculum: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY, ROLES.DEAN],
  "curriculum-program": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-building": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-approval": [ROLES.ADMIN, ROLES.DEAN],
  "file-maintenance-section": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-room": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-department": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-major": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-faculty": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-fees": [ROLES.ADMIN],
  "file-maintenance-discount": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "file-maintenance-products": [ROLES.ADMIN, ROLES.CASHIER, ROLES.DEAN],
  "file-maintenance-schools-programs": [
    ROLES.ADMIN,
    ROLES.REGISTRAR,
    ROLES.DEAN,
  ],
  "file-maintenance-subject": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
  "miscellaneous-fees": [ROLES.ADMIN, ROLES.DEAN],
  "account-management": [ROLES.ADMIN],
  backups: [ROLES.ADMIN],
  settings: [ROLES.ADMIN],
};

export const BILLING_TAB_ROLES: Record<BillingTab, number[]> = {
  products: [ROLES.ADMIN, ROLES.CASHIER],
  enrollments: PAYMENT_BILLING_ALLOWED_ROLES,
  transactions: PAYMENT_BILLING_ALLOWED_ROLES,
};

export function isViewAllowed(view: string, role: number): boolean {
  const allowed = VIEW_ROLES[view];
  if (!allowed) {
    return false;
  }

  return allowed.includes(role);
}

export function isBillingTabAllowed(tab: BillingTab, role: number): boolean {
  const allowed = BILLING_TAB_ROLES[tab];
  return allowed.includes(role);
}

export function getAllowedBillingTabs(role: number): BillingTab[] {
  return BILLING_TABS.filter((tab) => isBillingTabAllowed(tab, role));
}

export function getDefaultBillingTab(role: number): BillingTab | null {
  return getAllowedBillingTabs(role)[0] ?? null;
}
