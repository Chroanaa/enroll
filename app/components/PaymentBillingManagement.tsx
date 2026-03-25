"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { colors } from "../colors";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import PaymentBillingHeader from "./paymentBilling/Header";
import { ProductsTabContent } from "./paymentBilling/ProductsTabContent";
import { TransactionsTabContent } from "./paymentBilling/TransactionsTabContent";
import {
  EnrollmentsTabContent,
  StudentSummary,
} from "./paymentBilling/EnrollmentsTabContent";
// EnrollmentPaymentsTabContent removed - payment is now handled through Student Payments tab
import { OrderDetailsModal } from "./paymentBilling/OrderDetailsModal";
import { VoidTransactionModal } from "./paymentBilling/VoidTransactionModal";
import { ProductCheckoutModal } from "./paymentBilling/ProductCheckoutModal";
import { CartStudent } from "./paymentBilling/StudentPaymentCheckoutModal";
import {
  Product,
  Category,
  OrderWithDetails,
  EnrolledStudent,
  getProducts,
  getCategories,
  createOrder,
  voidOrder,
} from "../utils/billingUtils";
import { insertIntoReports } from "../utils/reportsUtils";
import { useSession } from "next-auth/react";
import { useCart } from "./paymentBilling/hooks/useCart";
import { useStudentSearch } from "./paymentBilling/hooks/useStudentSearch";
import { useFinancialSummary } from "./paymentBilling/hooks/useFinancialSummary";
import { useTransactions } from "./paymentBilling/hooks/useTransactions";
import { formatAmount } from "./paymentBilling/utils";
type ActiveTab = "products" | "enrollments" | "transactions";
const STUDENT_PAYMENT_CART_KEY = "student-payment-cart";
const STUDENT_PAYMENT_UPDATED_KEY = "student-payment-updated";

const PaymentBillingManagement: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  // Tab state — read sessionStorage synchronously so there's no flash to "products"
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== "undefined") {
      const pending = sessionStorage.getItem(
        "payment-billing-tab",
      ) as ActiveTab | null;
      if (pending) return pending;
    }

    return "products";
  });

  useEffect(() => {
    sessionStorage.removeItem("payment-billing-tab");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter states
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Student Payment Cart (for Student Payments tab)
  const [studentPaymentCart, setStudentPaymentCart] = useState<CartStudent[]>(
    [],
  );
  const [studentPaymentRefreshSignal, setStudentPaymentRefreshSignal] =
    useState(0);

  // Custom hooks
  const cartHook = useCart(products);
  const studentSearchHook = useStudentSearch();
  const financialSummaryHook = useFinancialSummary();
  const transactionsHook = useTransactions();

  // Set up student selection callback for Products tab
  useEffect(() => {
    if (studentSearchHook?.setOnStudentSelectCallback) {
      studentSearchHook.setOnStudentSelectCallback(
        (student: EnrolledStudent) => {
          if (
            !student ||
            !student.student_number ||
            typeof student.student_number !== "string"
          ) {
            console.warn(
              "Student selection callback called with invalid student data:",
              student,
            );
            return;
          }

          const studentName =
            [student.first_name, student.middle_name, student.family_name]
              .filter(Boolean)
              .join(" ") || student.student_number;

          setSuccessModal({
            isOpen: true,
            message: `Student ${studentName} selected.`,
          });
        },
      );
    }
  }, [studentSearchHook]);

  // Error and success modals
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    message: "",
    details: "",
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "transactions") {
      transactionsHook.fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STUDENT_PAYMENT_UPDATED_KEY) {
        setStudentPaymentRefreshSignal(Date.now());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const [isRefreshingCurrentTab, setIsRefreshingCurrentTab] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to load data",
        details: "Please try refreshing the page.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCurrentTab = async () => {
    setIsRefreshingCurrentTab(true);
    try {
      if (activeTab === "products") {
        await fetchData();
        return;
      }

      if (activeTab === "enrollments") {
        setStudentPaymentRefreshSignal(Date.now());
        return;
      }

      await transactionsHook.fetchOrders();
    } finally {
      setIsRefreshingCurrentTab(false);
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        ?.toLowerCase()
        .includes(productSearchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        product.category_id === Number(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearchTerm, selectedCategory]);

  // Cart functions with error handling
  const addToCart = (product: Product) => {
    cartHook.addToCart(product, (message, details) => {
      setErrorModal({ isOpen: true, message, details });
    });
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    cartHook.updateCartQuantity(productId, quantity, (message, details) => {
      setErrorModal({ isOpen: true, message, details });
    });
  };

  // ============================
  // Student Payment Cart Functions
  // ============================
  const addStudentToPaymentCart = (student: StudentSummary) => {
    if (
      studentPaymentCart.some((s) => s.assessment_id === student.assessment_id)
    )
      return;
    setStudentPaymentCart((prev) => [
      ...prev,
      {
        assessment_id: student.assessment_id,
        student_number: student.student_number,
        student_name: student.student_name,
        course_program: student.course_program,
        remaining_balance: student.remaining_balance,
        amount_to_pay: student.remaining_balance,
      },
    ]);
  };

  const removeStudentFromPaymentCart = (assessmentId: number) => {
    setStudentPaymentCart((prev) =>
      prev.filter((s) => s.assessment_id !== assessmentId),
    );
  };

  const clearStudentPaymentCart = () => {
    setStudentPaymentCart([]);
  };

  const updateStudentPaymentAmount = (assessmentId: number, amount: number) => {
    setStudentPaymentCart((prev) =>
      prev.map((s) =>
        s.assessment_id === assessmentId
          ? { ...s, amount_to_pay: Math.min(amount, s.remaining_balance) }
          : s,
      ),
    );
  };

  const openStudentPaymentCheckoutPage = () => {
    if (studentPaymentCart.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "Empty Cart",
        details: "Please add student assessments before processing payment.",
      });
      return;
    }

    sessionStorage.setItem(
      STUDENT_PAYMENT_CART_KEY,
      JSON.stringify(studentPaymentCart),
    );
    router.push("/dashboard?view=student-payment-checkout");
  };

  const openStudentFinancialDetailTab = (assessmentId: number) => {
    window.open(
      `/dashboard?view=student-financial-detail&assessmentId=${assessmentId}`,
      "_blank",
    );
  };

  // Handle void transaction
  const handleVoidTransactionConfirm = async () => {
    if (!transactionsHook.selectedOrder) return;

    try {
      setIsLoading(true);
      await voidOrder(transactionsHook.selectedOrder.id);
      transactionsHook.setIsVoidConfirmModalOpen(false);
      transactionsHook.setSelectedOrder(null);
      await transactionsHook.fetchOrders();
      setSuccessModal({
        isOpen: true,
        message: `Order #${transactionsHook.selectedOrder.id.toString().padStart(6, "0")} has been successfully voided.`,
      });
    } catch (error) {
      console.error("Error voiding order:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to void transaction",
        details: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Checkout products
  const handleProductCheckout = async () => {
    if (cartHook.cart.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "Empty Cart",
        details: "Please add items to cart before checkout.",
      });
      return;
    }

    // Validate student number is selected
    if (!studentSearchHook.selectedStudent?.student_number) {
      setErrorModal({
        isOpen: true,
        message: "Student Number Required",
        details: "Please select a student before completing the transaction.",
      });
      return;
    }

    if (
      cartHook.paymentType === "cash" &&
      (!cartHook.tenderedAmount ||
        parseFloat(cartHook.tenderedAmount) < cartHook.cartTotal)
    ) {
      setErrorModal({
        isOpen: true,
        message: "Insufficient Amount",
        details: "Tendered amount must be equal to or greater than the total.",
      });
      return;
    }

    if (
      (cartHook.paymentType === "gcash" ||
        cartHook.paymentType === "bank_transfer") &&
      !cartHook.referenceNo
    ) {
      setErrorModal({
        isOpen: true,
        message: "Reference Required",
        details: "Please enter the reference number for electronic payments.",
      });
      return;
    }

    try {
      const orderItems = cartHook.cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        selling_price: Number(item.product.price) || 0,
        total: (Number(item.product.price) || 0) * item.quantity,
      }));

      await createOrder({
        order_amount: cartHook.cartTotal,
        items: orderItems,
        payment_type: cartHook.paymentType,
        tendered_amount:
          cartHook.paymentType === "cash"
            ? parseFloat(cartHook.tenderedAmount)
            : cartHook.cartTotal,
        change_amount:
          cartHook.paymentType === "cash" ? cartHook.changeAmount : 0,
        transaction_ref: cartHook.referenceNo || undefined,
        student_number:
          studentSearchHook.selectedStudent?.student_number || undefined,
        user_id: session?.user?.id ? Number(session.user.id) : undefined,
      });

      setSuccessModal({
        isOpen: true,
        message: `Order completed successfully! ${cartHook.paymentType === "cash" ? `Change: ${formatAmount(cartHook.changeAmount)}` : ""}`,
      });

      insertIntoReports({
        action: `User ${session?.user?.name} completed POS order of ${formatAmount(cartHook.cartTotal)} (${cartHook.paymentType})${studentSearchHook.selectedStudent ? ` for ${studentSearchHook.selectedStudent.student_number}` : ""}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      cartHook.clearCart();
      studentSearchHook.clearSelectedStudent();
      setIsCheckoutModalOpen(false);
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Checkout Failed",
        details: error.response?.data?.error || "Please try again.",
      });
    }
  };

  // Build cart students for the enrollment payment checkout modal

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto w-full'>
        <PaymentBillingHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={handleRefreshCurrentTab}
          isRefreshing={isRefreshingCurrentTab}
        />

        {/* Products Tab Content */}
        {activeTab === "products" && (
          <ProductsTabContent
            categories={categories}
            filteredProducts={filteredProducts}
            isLoading={isLoading}
            productSearchTerm={productSearchTerm}
            setProductSearchTerm={setProductSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            addToCart={addToCart}
            studentSearchRef={studentSearchHook.studentSearchRef}
            selectedStudent={studentSearchHook.selectedStudent}
            clearSelectedStudent={studentSearchHook.clearSelectedStudent}
            studentNumberInput={studentSearchHook.studentNumberInput}
            handleStudentInputChange={
              studentSearchHook.handleStudentInputChange
            }
            handleStudentSearch={studentSearchHook.handleStudentSearch}
            studentSearchResults={studentSearchHook.studentSearchResults}
            showStudentDropdown={studentSearchHook.showStudentDropdown}
            setShowStudentDropdown={studentSearchHook.setShowStudentDropdown}
            studentSearchLoading={studentSearchHook.studentSearchLoading}
            studentSearchError={studentSearchHook.studentSearchError}
            handleStudentSelect={studentSearchHook.handleStudentSelect}
            cart={cartHook.cart}
            clearCart={cartHook.clearCart}
            updateCartQuantity={updateCartQuantity}
            removeFromCart={cartHook.removeFromCart}
            cartTotal={cartHook.cartTotal}
            setIsCheckoutModalOpen={setIsCheckoutModalOpen}
            formatAmount={formatAmount}
          />
        )}

        {/* Enrollments / Student Payments Tab Content */}
        {activeTab === "enrollments" && (
          <EnrollmentsTabContent
            academicYearSearch={financialSummaryHook.academicYearSearch}
            setAcademicYearSearch={financialSummaryHook.setAcademicYearSearch}
            semesterSearch={financialSummaryHook.semesterSearch}
            setSemesterSearch={financialSummaryHook.setSemesterSearch}
            refreshSignal={studentPaymentRefreshSignal}
            formatAmount={formatAmount}
            cartStudents={studentPaymentCart}
            onAddToCart={addStudentToPaymentCart}
            onRemoveFromCart={removeStudentFromPaymentCart}
            onClearCart={clearStudentPaymentCart}
            onCheckout={openStudentPaymentCheckoutPage}
            onUpdateCartAmount={updateStudentPaymentAmount}
            onViewDetail={openStudentFinancialDetailTab}
          />
        )}

        {/* Transactions Tab Content */}
        {activeTab === "transactions" && (
          <TransactionsTabContent
            filteredOrders={transactionsHook.filteredOrders}
            paginatedOrders={transactionsHook.paginatedOrders}
            transactionSearchTerm={transactionsHook.transactionSearchTerm}
            setTransactionSearchTerm={transactionsHook.setTransactionSearchTerm}
            showOnlyVoided={transactionsHook.showOnlyVoided}
            setShowOnlyVoided={transactionsHook.setShowOnlyVoided}
            transactionsPage={transactionsHook.transactionsPage}
            setTransactionsPage={transactionsHook.setTransactionsPage}
            onRefresh={transactionsHook.fetchOrders}
            onOrderDoubleClick={(order) =>
              transactionsHook.handleOrderDoubleClick(
                order,
                (message, details) => {
                  setErrorModal({ isOpen: true, message, details });
                },
              )
            }
            formatAmount={formatAmount}
          />
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={transactionsHook.isOrderDetailsModalOpen}
        order={transactionsHook.selectedOrder}
        onClose={() => transactionsHook.setIsOrderDetailsModalOpen(false)}
        onRequestVoid={() => {
          transactionsHook.setIsOrderDetailsModalOpen(false);
          transactionsHook.setIsVoidConfirmModalOpen(true);
        }}
        formatAmount={formatAmount}
      />

      {/* Void Confirmation Modal */}
      <VoidTransactionModal
        isOpen={transactionsHook.isVoidConfirmModalOpen}
        order={transactionsHook.selectedOrder}
        onCancel={() => transactionsHook.setIsVoidConfirmModalOpen(false)}
        onConfirm={handleVoidTransactionConfirm}
        isLoading={isLoading}
        formatAmount={formatAmount}
      />

      {/* Product Checkout Modal */}
      <ProductCheckoutModal
        isOpen={isCheckoutModalOpen}
        cart={cartHook.cart}
        cartTotal={cartHook.cartTotal}
        paymentType={cartHook.paymentType}
        setPaymentType={cartHook.setPaymentType}
        tenderedAmount={cartHook.tenderedAmount}
        setTenderedAmount={cartHook.setTenderedAmount}
        referenceNo={cartHook.referenceNo}
        setReferenceNo={cartHook.setReferenceNo}
        changeAmount={cartHook.changeAmount}
        onClose={() => setIsCheckoutModalOpen(false)}
        onCheckout={handleProductCheckout}
        formatAmount={formatAmount}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose
        autoCloseDelay={3000}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() =>
          setErrorModal({ isOpen: false, message: "", details: "" })
        }
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
};

export default PaymentBillingManagement;
