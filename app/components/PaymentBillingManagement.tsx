"use client";
import React, { useState, useEffect, useMemo } from "react";
import { colors } from "../colors";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import StudentSearchModal from "./common/StudentSearchModal";
import PaymentBillingHeader from "./paymentBilling/Header";
import { ProductsTabContent } from "./paymentBilling/ProductsTabContent";
import { TransactionsTabContent } from "./paymentBilling/TransactionsTabContent";
import { EnrollmentsTabContent } from "./paymentBilling/EnrollmentsTabContent";
import { OrderDetailsModal } from "./paymentBilling/OrderDetailsModal";
import { VoidTransactionModal } from "./paymentBilling/VoidTransactionModal";
import { ProductCheckoutModal } from "./paymentBilling/ProductCheckoutModal";
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

const PaymentBillingManagement: React.FC = () => {
  const { data: session } = useSession();

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter states
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isStudentSearchModalOpen, setIsStudentSearchModalOpen] =
    useState(false);

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

  // Fetch financial summary with error handling
  const fetchFinancialSummary = () => {
    financialSummaryHook.fetchFinancialSummary((message, details) => {
      setErrorModal({ isOpen: true, message, details });
    });
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

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto w-full'>
        <PaymentBillingHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
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

        {/* Enrollments Tab Content */}
        {activeTab === "enrollments" && (
          <EnrollmentsTabContent
            studentNumberSearch={financialSummaryHook.studentNumberSearch}
            setStudentNumberSearch={financialSummaryHook.setStudentNumberSearch}
            academicYearSearch={financialSummaryHook.academicYearSearch}
            setAcademicYearSearch={financialSummaryHook.setAcademicYearSearch}
            semesterSearch={financialSummaryHook.semesterSearch}
            setSemesterSearch={financialSummaryHook.setSemesterSearch}
            financialSummary={financialSummaryHook.financialSummary}
            isLoadingFinancialSummary={
              financialSummaryHook.isLoadingFinancialSummary
            }
            onSearch={fetchFinancialSummary}
            onBrowseClick={() => setIsStudentSearchModalOpen(true)}
            formatAmount={formatAmount}
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

      {/* Student search modal for financial summary lookup */}
      <StudentSearchModal
        isOpen={isStudentSearchModalOpen}
        onClose={() => setIsStudentSearchModalOpen(false)}
        onSelect={(studentNumber) => {
          // Set the student number - the useEffect will automatically trigger the fetch
          financialSummaryHook.setStudentNumberSearch(studentNumber);
          setIsStudentSearchModalOpen(false);

          // Show success message
          setSuccessModal({
            isOpen: true,
            message: `Student ${studentNumber} selected. Loading financial summary...`,
          });
        }}
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
