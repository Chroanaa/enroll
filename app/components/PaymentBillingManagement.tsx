"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  CreditCard,
  Plus,
  Search,
  Wallet,
  Building2,
  Smartphone,
  DollarSign,
  X,
  ShoppingCart,
  Package,
  Users,
  Minus,
  Trash2,
  Receipt,
  Hash,
  User,
  FileText,
  Eye,
  Ban,
  Calendar,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { colors } from "../colors";
import ConfirmationModal from "./common/ConfirmationModal";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import StudentSearchModal from "./common/StudentSearchModal";
import PaymentBillingHeader from "./paymentBilling/Header";
import { ProductsTabContent } from "./paymentBilling/ProductsTabContent";
import { OrderDetailsModal } from "./paymentBilling/OrderDetailsModal";
import { VoidTransactionModal } from "./paymentBilling/VoidTransactionModal";
import { ProductCheckoutModal } from "./paymentBilling/ProductCheckoutModal";
import Pagination from "./common/Pagination";
import {
  Billing,
  Product,
  Category,
  CartItem,
  OrderHeader,
  OrderWithDetails,
  EnrolledStudent,
  getBillings,
  getProducts,
  getCategories,
  createOrder,
  deleteBilling,
  getOrders,
  getOrderDetails,
  voidOrder,
  getEnrolledStudent,
  searchEnrolledStudents,
} from "../utils/billingUtils";
import { insertIntoReports } from "../utils/reportsUtils";
import { useSession } from "next-auth/react";
import { useAcademicTermContext } from "../contexts/AcademicTermContext";

type PaymentType = "cash" | "gcash" | "bank_transfer";
type ActiveTab = "products" | "enrollments" | "transactions";

interface PaymentFormData {
  enrollee_id: number;
  enrollee_name: string;
  term: string;
  payment_type: PaymentType;
  amount: string;
  reference_no: string;
  tendered_amount: string;
}

const PaymentBillingManagement: React.FC = () => {
  const { data: session } = useSession();
  const { currentTerm } = useAcademicTermContext();
  const hasInitializedTermDefaults = useRef(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");

  // Data states
  const [billings, setBillings] = useState<Billing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [tenderedAmount, setTenderedAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [studentNumberInput, setStudentNumberInput] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<EnrolledStudent | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<
    EnrolledStudent[]
  >([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Student Financial Summary states
  const [studentNumberSearch, setStudentNumberSearch] = useState("");
  const [academicYearSearch, setAcademicYearSearch] = useState("");
  const [semesterSearch, setSemesterSearch] = useState<1 | 2>(1);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [isLoadingFinancialSummary, setIsLoadingFinancialSummary] = useState(false);

  // Modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isStudentSearchModalOpen, setIsStudentSearchModalOpen] =
    useState(false);

  // Transactions states
  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(
    null,
  );
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isVoidConfirmModalOpen, setIsVoidConfirmModalOpen] = useState(false);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState("");
  const [showOnlyVoided, setShowOnlyVoided] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState<PaymentFormData>({
    enrollee_id: 0,
    enrollee_name: "",
    term: "",
    payment_type: "cash",
    amount: "",
    reference_no: "",
    tendered_amount: "",
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    billingId: number | null;
    studentName: string;
  }>({
    isOpen: false,
    billingId: null,
    studentName: "",
  });

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

  // Default search values based on the current academic term
  useEffect(() => {
    if (!currentTerm || hasInitializedTermDefaults.current) return;

    const semesterValue = currentTerm.semester === "First" ? 1 : 2;
    setAcademicYearSearch((prev) =>
      prev.trim() ? prev : currentTerm.academicYear,
    );
    setSemesterSearch(semesterValue);
    hasInitializedTermDefaults.current = true;
  }, [currentTerm]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [billingsData, productsData, categoriesData] =
        await Promise.all([
          getBillings(),
          getProducts(),
          getCategories(),
        ]);
      setBillings(billingsData);
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

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const ordersData = await getOrders(true); // Always fetch all orders including voided
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
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

  // Filter billings
  const filteredBillings = useMemo(() => {
    return billings.filter((billing) => {
      const fullName =
        `${billing.family_name || ""} ${billing.first_name || ""} ${billing.middle_name || ""}`.toLowerCase();
      const studentNumber = billing.student_number?.toLowerCase() || "";
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        studentNumber.includes(searchTerm.toLowerCase());
      const matchesPaymentType =
        paymentTypeFilter === "all" ||
        billing.payment_type === paymentTypeFilter;
      return matchesSearch && matchesPaymentType;
    });
  }, [billings, searchTerm, paymentTypeFilter]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + (Number(item.product.price) || 0) * item.quantity;
    }, 0);
  }, [cart]);

  const changeAmount = useMemo(() => {
    const tendered = parseFloat(tenderedAmount) || 0;
    return tendered - cartTotal;
  }, [tenderedAmount, cartTotal]);

  const handleVoidTransactionConfirm = async () => {
    if (!selectedOrder) return;

    try {
      setIsLoading(true);
      await voidOrder(selectedOrder.id);
      setIsVoidConfirmModalOpen(false);
      setSelectedOrder(null);
      await fetchOrders();
      setSuccessModal({
        isOpen: true,
        message: `Order #${selectedOrder.id.toString().padStart(6, "0")} has been successfully voided.`,
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredBillings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBillings = filteredBillings.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentTypeFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Debounced student search for autocomplete
  const handleStudentInputChange = useCallback((value: string) => {
    setStudentNumberInput(value);
    setStudentSearchError("");

    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!value.trim()) {
      setStudentSearchResults([]);
      setShowStudentDropdown(false);
      return;
    }

    // Debounce the search
    searchDebounceRef.current = setTimeout(async () => {
      setStudentSearchLoading(true);
      try {
        const results = await searchEnrolledStudents(value);
        setStudentSearchResults(results);
        setShowStudentDropdown(results.length > 0);
      } catch (error) {
        console.error("Error searching students:", error);
        setStudentSearchResults([]);
      } finally {
        setStudentSearchLoading(false);
      }
    }, 300);
  }, []);

  // Handle student selection from dropdown
  const handleStudentSelect = (student: EnrolledStudent) => {
    setSelectedStudent(student);
    setStudentNumberInput("");
    setStudentSearchResults([]);
    setShowStudentDropdown(false);
    setStudentSearchError("");
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentSearchRef.current &&
        !studentSearchRef.current.contains(event.target as Node)
      ) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Search enrolled student by student number (fallback for Enter key)
  const handleStudentSearch = async () => {
    if (!studentNumberInput.trim()) {
      setStudentSearchError("Please enter a student number or name");
      return;
    }

    setStudentSearchLoading(true);
    setStudentSearchError("");
    setShowStudentDropdown(false);

    try {
      // First try exact match
      const student = await getEnrolledStudent(studentNumberInput.trim());
      if (student) {
        setSelectedStudent(student);
        setStudentNumberInput("");
        setStudentSearchResults([]);
        setStudentSearchError("");
      } else {
        // If no exact match, search and show dropdown
        const results = await searchEnrolledStudents(studentNumberInput.trim());
        if (results.length === 1) {
          // If only one result, auto-select it
          setSelectedStudent(results[0]);
          setStudentNumberInput("");
          setStudentSearchResults([]);
        } else if (results.length > 1) {
          setStudentSearchResults(results);
          setShowStudentDropdown(true);
        } else {
          setStudentSearchError("No students found");
        }
      }
    } catch (error) {
      setStudentSearchError("Error searching for student");
      console.error(error);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  const clearSelectedStudent = () => {
    setSelectedStudent(null);
    setStudentNumberInput("");
    setStudentSearchError("");
    setStudentSearchResults([]);
    setShowStudentDropdown(false);
  };

  // Cart functions
  const addToCart = (product: Product) => {
    if (!product.quantity || product.quantity <= 0) {
      setErrorModal({
        isOpen: true,
        message: "Out of Stock",
        details: `${product.name} is currently out of stock.`,
      });
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id,
      );
      if (existingItem) {
        if (existingItem.quantity >= (product.quantity || 0)) {
          setErrorModal({
            isOpen: true,
            message: "Insufficient Stock",
            details: `Only ${product.quantity} units available for ${product.name}.`,
          });
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQuantity > (product.quantity || 0)) {
      setErrorModal({
        isOpen: true,
        message: "Insufficient Stock",
        details: `Only ${product.quantity} units available for ${product.name}.`,
      });
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId),
    );
  };

  const clearCart = () => {
    setCart([]);
    setTenderedAmount("");
    setReferenceNo("");
    setPaymentType("cash");
  };

  // Fetch student financial summary
  const fetchFinancialSummary = async () => {
    if (!studentNumberSearch || !academicYearSearch) {
      setErrorModal({
        isOpen: true,
        message: "Missing Information",
        details: "Please enter student number and academic year.",
      });
      return;
    }

    setIsLoadingFinancialSummary(true);
    setFinancialSummary(null);

    try {
      const response = await fetch(
        `/api/auth/assessment/financial-summary?student_number=${encodeURIComponent(studentNumberSearch)}&academic_year=${encodeURIComponent(academicYearSearch)}&semester=${semesterSearch}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to fetch financial summary");
      }

      const data = await response.json();
      setFinancialSummary(data.data);
    } catch (error: any) {
      console.error("Error fetching financial summary:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to Load Financial Summary",
        details: error.message || "Please check the student number, academic year, and semester.",
      });
    } finally {
      setIsLoadingFinancialSummary(false);
    }
  };

  // Checkout products
  const handleProductCheckout = async () => {
    if (cart.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "Empty Cart",
        details: "Please add items to cart before checkout.",
      });
      return;
    }

    if (
      paymentType === "cash" &&
      (!tenderedAmount || parseFloat(tenderedAmount) < cartTotal)
    ) {
      setErrorModal({
        isOpen: true,
        message: "Insufficient Amount",
        details: "Tendered amount must be equal to or greater than the total.",
      });
      return;
    }

    if (
      (paymentType === "gcash" || paymentType === "bank_transfer") &&
      !referenceNo
    ) {
      setErrorModal({
        isOpen: true,
        message: "Reference Required",
        details: "Please enter the reference number for electronic payments.",
      });
      return;
    }

    try {
      const orderItems = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        selling_price: Number(item.product.price) || 0,
        total: (Number(item.product.price) || 0) * item.quantity,
      }));

      await createOrder({
        order_amount: cartTotal,
        items: orderItems,
        payment_type: paymentType,
        tendered_amount:
          paymentType === "cash" ? parseFloat(tenderedAmount) : cartTotal,
        change_amount: paymentType === "cash" ? changeAmount : 0,
        transaction_ref: referenceNo || undefined,
        student_number: selectedStudent?.student_number || undefined,
      });

      setSuccessModal({
        isOpen: true,
        message: `Order completed successfully! ${paymentType === "cash" ? `Change: ₱${changeAmount.toFixed(2)}` : ""}`,
      });

      insertIntoReports({
        action: `User ${session?.user?.name} completed POS order of ₱${cartTotal.toFixed(2)} (${paymentType})${selectedStudent ? ` for ${selectedStudent.student_number}` : ""}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      clearCart();
      clearSelectedStudent();
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

  // Enrollment payment functions
  const handleEnrolleeSelect = (enrollee: UnbilledEnrollee) => {
    setFormData({
      ...formData,
      enrollee_id: enrollee.id,
      enrollee_name:
        `${enrollee.family_name || ""}, ${enrollee.first_name || ""} ${enrollee.middle_name || ""}`.trim(),
      term: enrollee.term || "",
    });
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.enrollee_id) {
      setErrorModal({
        isOpen: true,
        message: "Please select a student",
        details: "You must select a student from the list to process payment.",
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrorModal({
        isOpen: true,
        message: "Invalid amount",
        details: "Please enter a valid payment amount.",
      });
      return;
    }

    if (
      (formData.payment_type === "gcash" ||
        formData.payment_type === "bank_transfer") &&
      !formData.reference_no
    ) {
      setErrorModal({
        isOpen: true,
        message: "Reference number required",
        details:
          "Please enter the reference number for GCash or Bank Transfer payments.",
      });
      return;
    }

    try {
      await createBilling({
        enrollee_id: formData.enrollee_id,
        term: formData.term || undefined,
        payment_type: formData.payment_type,
        amount: parseFloat(formData.amount),
        reference_no: formData.reference_no || undefined,
        user_id: session?.user?.id ? Number(session.user.id) : undefined,
      });

      setSuccessModal({
        isOpen: true,
        message: `Payment for ${formData.enrollee_name} has been processed successfully.`,
      });

      insertIntoReports({
        action: `User ${session?.user?.name} processed payment of ₱${formData.amount} (${formData.payment_type}) for ${formData.enrollee_name}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      setFormData({
        enrollee_id: 0,
        enrollee_name: "",
        term: "",
        payment_type: "cash",
        amount: "",
        reference_no: "",
        tendered_amount: "",
      });
      setIsAddModalOpen(false);
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.response?.data?.error || "Failed to process payment",
        details: "Please try again.",
      });
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteConfirmation.billingId) return;

    try {
      await deleteBilling(deleteConfirmation.billingId);
      setSuccessModal({
        isOpen: true,
        message: `Payment record for ${deleteConfirmation.studentName} has been deleted.`,
      });

      insertIntoReports({
        action: `User ${session?.user?.name} deleted payment record for ${deleteConfirmation.studentName}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      setDeleteConfirmation({
        isOpen: false,
        billingId: null,
        studentName: "",
      });
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Failed to delete payment record",
        details: error.response?.data?.error || "Please try again.",
      });
    }
  };

  const getPaymentTypeIcon = (type: string | null) => {
    switch (type) {
      case "cash":
        return <Wallet className='w-4 h-4' />;
      case "gcash":
        return <Smartphone className='w-4 h-4' />;
      case "bank_transfer":
        return <Building2 className='w-4 h-4' />;
      default:
        return <CreditCard className='w-4 h-4' />;
    }
  };

  const getPaymentTypeBadge = (type: string | null) => {
    const styles = {
      cash: "bg-green-100 text-green-800",
      gcash: "bg-blue-100 text-blue-800",
      bank_transfer: "bg-purple-100 text-purple-800",
    };
    const labels = {
      cash: "Cash",
      gcash: "GCash",
      bank_transfer: "Bank Transfer",
    };
    const style =
      styles[type as keyof typeof styles] || "bg-gray-100 text-gray-800";
    const label = labels[type as keyof typeof labels] || type || "Unknown";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style}`}
      >
        {getPaymentTypeIcon(type)}
        {label}
      </span>
    );
  };

  const formatAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "₱0.00";
    return `₱${Number(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto w-full'>
        <PaymentBillingHeader activeTab={activeTab} onTabChange={setActiveTab} />

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
            studentSearchRef={studentSearchRef}
            selectedStudent={selectedStudent}
            clearSelectedStudent={clearSelectedStudent}
            studentNumberInput={studentNumberInput}
            handleStudentInputChange={handleStudentInputChange}
            handleStudentSearch={handleStudentSearch}
            studentSearchResults={studentSearchResults}
            showStudentDropdown={showStudentDropdown}
            setShowStudentDropdown={setShowStudentDropdown}
            studentSearchLoading={studentSearchLoading}
            studentSearchError={studentSearchError}
            handleStudentSelect={handleStudentSelect}
            cart={cart}
            clearCart={clearCart}
            updateCartQuantity={updateCartQuantity}
            removeFromCart={removeFromCart}
            cartTotal={cartTotal}
            setIsCheckoutModalOpen={setIsCheckoutModalOpen}
            formatAmount={formatAmount}
          />
        )}

        {/* Student Payments Tab Content */}
        {activeTab === "enrollments" && (
          <div className='space-y-6'>
            {/* Search Section */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
              <h2 className='text-lg font-bold mb-4' style={{ color: colors.primary }}>
                Search Student Financial Summary
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Student Number
                  </label>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={studentNumberSearch}
                      onChange={(e) => setStudentNumberSearch(e.target.value)}
                      placeholder='Enter student number'
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          fetchFinancialSummary();
                        }
                      }}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                    <button
                      type='button'
                      onClick={() => setIsStudentSearchModalOpen(true)}
                      className='px-3 py-2 rounded-lg text-white font-medium flex items-center gap-2 hover:opacity-90 transition-colors'
                      style={{ backgroundColor: colors.secondary }}
                    >
                      <Search className='w-4 h-4' />
                      Browse
                    </button>
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>
                    Use the browse option to search by name with major/program filters.
                  </p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Academic Year
                  </label>
                  <input
                    type='text'
                    value={academicYearSearch}
                    onChange={(e) => setAcademicYearSearch(e.target.value)}
                    placeholder='e.g., 2024-2025'
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        fetchFinancialSummary();
                      }
                    }}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Press Enter to search.
                  </p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Semester
                  </label>
                  <select
                    value={semesterSearch}
                    onChange={(e) => setSemesterSearch(parseInt(e.target.value) as 1 | 2)}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    <option value={1}>First Semester</option>
                    <option value={2}>Second Semester</option>
                  </select>
                  {isLoadingFinancialSummary && (
                    <p className='text-xs text-gray-500 mt-1 flex items-center gap-2'>
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      Loading...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary Display */}
            {financialSummary && (
              <div className='space-y-6'>
                {/* Assessment Summary */}
                <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
                  <h3 className='text-lg font-bold mb-4' style={{ color: colors.primary }}>
                    Assessment Summary
                  </h3>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Gross Tuition</p>
                      <p className='text-lg font-semibold' style={{ color: colors.secondary }}>
                        {formatAmount(financialSummary.assessment_summary?.gross_tuition || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Discount</p>
                      <p className='text-lg font-semibold text-green-600'>
                        -{formatAmount(financialSummary.assessment_summary?.discount_amount || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Net Tuition</p>
                      <p className='text-lg font-semibold' style={{ color: colors.secondary }}>
                        {formatAmount(financialSummary.assessment_summary?.net_tuition || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Total Fees</p>
                      <p className='text-lg font-semibold' style={{ color: colors.secondary }}>
                        {formatAmount(financialSummary.assessment_summary?.total_fees || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Fixed Amount</p>
                      <p className='text-lg font-semibold' style={{ color: colors.secondary }}>
                        {formatAmount(financialSummary.assessment_summary?.fixed_amount_total || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Base Total</p>
                      <p className='text-lg font-semibold' style={{ color: colors.secondary }}>
                        {formatAmount(financialSummary.assessment_summary?.base_total || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Payment Mode</p>
                      <p className='text-lg font-semibold capitalize'>
                        {financialSummary.assessment_summary?.payment_mode || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Total Due</p>
                      <p className='text-lg font-semibold text-orange-600'>
                        {formatAmount(financialSummary.assessment_summary?.total_due || 0)}
                      </p>
                    </div>
                  </div>
                  {financialSummary.assessment_summary?.payment_mode === "installment" && (
                    <div className='mt-4 pt-4 border-t border-gray-200'>
                      <p className='text-sm text-gray-500 mb-1'>Down Payment</p>
                      <p className='text-lg font-semibold' style={{ color: colors.secondary }}>
                        {formatAmount(financialSummary.assessment_summary?.down_payment || 0)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Installment Schedule */}
                {financialSummary.assessment_summary?.payment_mode === "installment" && financialSummary.installment_schedule && financialSummary.installment_schedule.length > 0 && (
                  <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
                    <h3 className='text-lg font-bold mb-4' style={{ color: colors.primary }}>
                      Installment Schedule
                    </h3>
                    <div className='overflow-x-auto'>
                      <table className='w-full'>
                        <thead>
                          <tr className='bg-gray-50 border-b border-gray-200'>
                            <th className='px-4 py-3 text-left text-sm font-medium text-gray-700'>Label</th>
                            <th className='px-4 py-3 text-left text-sm font-medium text-gray-700'>Due Date</th>
                            <th className='px-4 py-3 text-right text-sm font-medium text-gray-700'>Amount</th>
                            <th className='px-4 py-3 text-center text-sm font-medium text-gray-700'>Status</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200'>
                          {financialSummary.installment_schedule.map((schedule: any, index: number) => (
                            <tr key={index} className='hover:bg-gray-50'>
                              <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                                {schedule.label}
                              </td>
                              <td className='px-4 py-3 text-sm text-gray-600'>
                                {new Date(schedule.due_date).toLocaleDateString()}
                              </td>
                              <td className='px-4 py-3 text-sm text-right font-semibold' style={{ color: colors.secondary }}>
                                {formatAmount(schedule.amount || 0)}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                {schedule.is_paid ? (
                                  <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                    Paid
                                  </span>
                                ) : (
                                  <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
                                    Unpaid
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment Summary */}
                <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
                  <h3 className='text-lg font-bold mb-4' style={{ color: colors.primary }}>
                    Payment Summary
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Total Paid</p>
                      <p className='text-2xl font-bold text-green-600'>
                        {formatAmount(financialSummary.payment_summary?.total_paid || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Remaining Balance</p>
                      <p className='text-2xl font-bold text-red-600'>
                        {formatAmount(financialSummary.payment_summary?.remaining_balance || 0)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500 mb-1'>Payment Status</p>
                      <p className={`text-2xl font-bold ${
                        financialSummary.payment_summary?.payment_status === "Fully Paid" ? "text-green-600" :
                        financialSummary.payment_summary?.payment_status === "Partial" ? "text-orange-600" :
                        "text-red-600"
                      }`}>
                        {financialSummary.payment_summary?.payment_status || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No Results Message */}
            {!financialSummary && !isLoadingFinancialSummary && (
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center'>
                <FileText className='w-16 h-16 mx-auto mb-4 text-gray-400' />
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  No Financial Summary
                </h3>
                <p className='text-gray-600'>
                  Enter student number, academic year, and semester to view financial summary.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab Content */}
        {activeTab === "transactions" && (
          <div className='space-y-4'>
            {/* Stats and Filters */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
              <div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
                <div className='flex-1 relative w-full md:w-auto'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    type='text'
                    placeholder='Search by AR number, ID, or student...'
                    value={transactionSearchTerm}
                    onChange={(e) => setTransactionSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
                <div className='flex items-center gap-4'>
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={showOnlyVoided}
                      onChange={(e) => setShowOnlyVoided(e.target.checked)}
                      className='w-4 h-4 rounded border-gray-300'
                    />
                    <span className='text-sm text-gray-600'>
                      Show Only Voided
                    </span>
                  </label>
                  <button
                    onClick={fetchOrders}
                    className='px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity'
                    style={{ backgroundColor: colors.secondary }}
                  >
                    <RefreshCw className='w-4 h-4' />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr
                      className='text-white'
                      style={{ backgroundColor: colors.primary }}
                    >
                      <th className='px-4 py-3 text-left text-sm font-medium'>
                        AR Number
                      </th>
                      <th className='px-4 py-3 text-left text-sm font-medium'>
                        Student
                      </th>
                      <th className='px-4 py-3 text-left text-sm font-medium'>
                        Date
                      </th>
                      <th className='px-4 py-3 text-left text-sm font-medium'>
                        Payment Type
                      </th>
                      <th className='px-4 py-3 text-right text-sm font-medium'>
                        Total Amount
                      </th>
                      <th className='px-4 py-3 text-center text-sm font-medium'>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200'>
                    {orders
                      .filter((order) => {
                        // Filter by voided status if showOnlyVoided is checked
                        if (showOnlyVoided && !order.isvoided) {
                          return false;
                        }
                        const searchLower = transactionSearchTerm.toLowerCase();
                        return (
                          order.id.toString().includes(searchLower) ||
                          (order.ar_number?.toLowerCase() || "").includes(
                            searchLower,
                          ) ||
                          (order.payment_type?.toLowerCase() || "").includes(
                            searchLower,
                          ) ||
                          (order.student_name?.toLowerCase() || "").includes(
                            searchLower,
                          ) ||
                          (order.student_number?.toLowerCase() || "").includes(
                            searchLower,
                          )
                        );
                      })
                      .slice((transactionsPage - 1) * 10, transactionsPage * 10)
                      .map((order) => (
                        <tr
                          key={order.id}
                          onDoubleClick={async () => {
                            try {
                              const orderDetails = await getOrderDetails(
                                order.id,
                              );
                              setSelectedOrder(orderDetails);
                              setIsOrderDetailsModalOpen(true);
                            } catch (error) {
                              console.error(
                                "Error fetching order details:",
                                error,
                              );
                              setErrorModal({
                                isOpen: true,
                                message: "Failed to load order details",
                                details: "Please try again.",
                              });
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            order.isvoided
                              ? "bg-red-50 hover:bg-red-100"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className='px-4 py-3 text-sm'>
                            <div>
                              <p className='font-medium text-gray-900'>
                                {order.ar_number ||
                                  `#${order.id.toString().padStart(6, "0")}`}
                              </p>
                              {order.ar_number && (
                                <p className='text-xs text-gray-500'>
                                  ID: {order.id}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-600'>
                            {order.student_name ? (
                              <div>
                                <p className='font-medium text-gray-900'>
                                  {order.student_name}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  {order.student_number}
                                </p>
                              </div>
                            ) : (
                              <span className='text-gray-400'>-</span>
                            )}
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-600'>
                            <div className='flex items-center gap-2'>
                              <Calendar className='w-4 h-4 text-gray-400' />
                              {new Date(order.order_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-600'>
                            {order.payment_type || "N/A"}
                          </td>
                          <td
                            className='px-4 py-3 text-sm font-medium text-right'
                            style={{ color: colors.secondary }}
                          >
                            {formatAmount(order.order_amount || 0)}
                          </td>
                          <td className='px-4 py-3 text-center'>
                            {order.isvoided ? (
                              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                                Voided
                              </span>
                            ) : (
                              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {orders.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className='px-4 py-12 text-center text-gray-500'
                        >
                          <FileText className='w-12 h-12 mx-auto mb-3 text-gray-300' />
                          <p className='text-lg font-medium'>
                            No transactions found
                          </p>
                          <p className='text-sm'>
                            Transactions will appear here after processing
                            payments.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {orders.length > 10 && (
                <div className='px-4 py-3 border-t border-gray-200 flex items-center justify-between'>
                  <p className='text-sm text-gray-500'>
                    Showing {(transactionsPage - 1) * 10 + 1} to{" "}
                    {Math.min(transactionsPage * 10, orders.length)} of{" "}
                    {orders.length} transactions
                  </p>
                  <div className='flex gap-2'>
                    <button
                      onClick={() =>
                        setTransactionsPage((p) => Math.max(1, p - 1))
                      }
                      disabled={transactionsPage === 1}
                      className='px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setTransactionsPage((p) =>
                          Math.min(Math.ceil(orders.length / 10), p + 1),
                        )
                      }
                      disabled={
                        transactionsPage >= Math.ceil(orders.length / 10)
                      }
                      className='px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex gap-3'>
                <Eye className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' />
                <div>
                  <p className='text-sm font-medium text-blue-800'>
                    View Transaction Details
                  </p>
                  <p className='text-sm text-blue-600'>
                    Double-click on any transaction to view its details and void
                    if needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        order={selectedOrder}
        onClose={() => setIsOrderDetailsModalOpen(false)}
        onRequestVoid={() => {
          setIsOrderDetailsModalOpen(false);
          setIsVoidConfirmModalOpen(true);
        }}
        formatAmount={formatAmount}
      />

      {/* Void Confirmation Modal */}
      <VoidTransactionModal
        isOpen={isVoidConfirmModalOpen}
        order={selectedOrder}
        onCancel={() => setIsVoidConfirmModalOpen(false)}
        onConfirm={handleVoidTransactionConfirm}
        isLoading={isLoading}
        formatAmount={formatAmount}
      />

      {/* Product Checkout Modal */}
      <ProductCheckoutModal
        isOpen={isCheckoutModalOpen}
        cart={cart}
        cartTotal={cartTotal}
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        tenderedAmount={tenderedAmount}
        setTenderedAmount={setTenderedAmount}
        referenceNo={referenceNo}
        setReferenceNo={setReferenceNo}
        changeAmount={changeAmount}
        onClose={() => setIsCheckoutModalOpen(false)}
        onCheckout={handleProductCheckout}
        formatAmount={formatAmount}
      />

      {/* Enrollment modals removed - using financial summary API instead */}
      {false && isAddModalOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className='rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
            style={{ backgroundColor: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className='px-6 py-4 flex items-center justify-between border-b'
              style={{
                backgroundColor: `${colors.primary}08`,
                borderColor: `${colors.primary}15`,
              }}
            >
              <div className='flex items-center gap-3'>
                <div
                  className='p-2 rounded-lg'
                  style={{ backgroundColor: `${colors.secondary}20` }}
                >
                  <DollarSign
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                </div>
                <div>
                  <h2
                    className='text-xl font-bold'
                    style={{ color: colors.primary }}
                  >
                    Add Enrollment Payment
                  </h2>
                  <p className='text-sm text-gray-500'>
                    Process a payment for an enrolled student
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmitPayment}
              className='p-6 overflow-y-auto space-y-6'
            >
              {/* Student Selection */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <User className='w-4 h-4 inline mr-1' />
                  Select Student (Unpaid Enrollments)
                </label>
                {formData.enrollee_id ? (
                  <div className='flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg'>
                    <div>
                      <p className='font-medium text-green-800'>
                        {formData.enrollee_name}
                      </p>
                      <p className='text-sm text-green-600'>
                        Term: {formData.term || "N/A"}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() =>
                        setFormData({
                          ...formData,
                          enrollee_id: 0,
                          enrollee_name: "",
                          term: "",
                        })
                      }
                      className='text-green-600 hover:text-green-800'
                    >
                      <X className='w-5 h-5' />
                    </button>
                  </div>
                ) : (
                  <div className='border border-gray-300 rounded-lg max-h-48 overflow-y-auto'>
                    {unbilledEnrollees.length === 0 ? (
                      <div className='p-4 text-center text-gray-500'>
                        No unpaid enrollments available
                      </div>
                    ) : (
                      unbilledEnrollees.map((enrollee) => (
                        <button
                          key={enrollee.id}
                          type='button'
                          onClick={() => handleEnrolleeSelect(enrollee)}
                          className='w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0'
                        >
                          <div className='font-medium text-gray-900'>
                            {`${enrollee.family_name || ""}, ${enrollee.first_name || ""} ${enrollee.middle_name || ""}`.trim()}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {enrollee.student_number || "No Student #"} •{" "}
                            {enrollee.course_program || "N/A"}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Payment Type */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <CreditCard className='w-4 h-4 inline mr-1' />
                  Payment Type
                </label>
                <div className='grid grid-cols-3 gap-3'>
                  {[
                    {
                      value: "cash",
                      label: "Cash",
                      icon: Wallet,
                      color: "green",
                    },
                    {
                      value: "gcash",
                      label: "GCash",
                      icon: Smartphone,
                      color: "blue",
                    },
                    {
                      value: "bank_transfer",
                      label: "Bank Transfer",
                      icon: Building2,
                      color: "purple",
                    },
                  ].map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      type='button'
                      onClick={() =>
                        setFormData({
                          ...formData,
                          payment_type: value as PaymentType,
                        })
                      }
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.payment_type === value
                          ? `border-${color}-500 bg-${color}-50`
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={
                        formData.payment_type === value
                          ? {
                              borderColor:
                                color === "green"
                                  ? "#22c55e"
                                  : color === "blue"
                                    ? "#3b82f6"
                                    : "#a855f7",
                              backgroundColor:
                                color === "green"
                                  ? "#f0fdf4"
                                  : color === "blue"
                                    ? "#eff6ff"
                                    : "#faf5ff",
                            }
                          : {}
                      }
                    >
                      <Icon
                        className='w-6 h-6 mx-auto mb-2'
                        style={{
                          color:
                            formData.payment_type === value
                              ? color === "green"
                                ? "#22c55e"
                                : color === "blue"
                                  ? "#3b82f6"
                                  : "#a855f7"
                              : "#9ca3af",
                        }}
                      />
                      <span
                        className={`text-sm font-medium ${formData.payment_type === value ? `text-${color}-700` : "text-gray-600"}`}
                        style={
                          formData.payment_type === value
                            ? {
                                color:
                                  color === "green"
                                    ? "#15803d"
                                    : color === "blue"
                                      ? "#1d4ed8"
                                      : "#7e22ce",
                              }
                            : {}
                        }
                      >
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <DollarSign className='w-4 h-4 inline mr-1' />
                  Amount
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
                    ₱
                  </span>
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder='0.00'
                    className='w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    required
                  />
                </div>
              </div>

              {/* Reference Number (for GCash and Bank Transfer) */}
              {(formData.payment_type === "gcash" ||
                formData.payment_type === "bank_transfer") && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    <Hash className='w-4 h-4 inline mr-1' />
                    Reference Number
                  </label>
                  <input
                    type='text'
                    value={formData.reference_no}
                    onChange={(e) =>
                      setFormData({ ...formData, reference_no: e.target.value })
                    }
                    placeholder='Enter reference number'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    required
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className='flex gap-3 pt-4 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={() => setIsAddModalOpen(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors'
                  style={{ backgroundColor: colors.secondary }}
                >
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student search modal for financial summary lookup */}
      <StudentSearchModal
        isOpen={isStudentSearchModalOpen}
        onClose={() => setIsStudentSearchModalOpen(false)}
        onSelect={(studentNumber) => {
          setStudentNumberSearch(studentNumber);
          setIsStudentSearchModalOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({
            isOpen: false,
            billingId: null,
            studentName: "",
          })
        }
        onConfirm={handleDeletePayment}
        title='Delete Payment Record'
        message={`Are you sure you want to delete the payment record for ${deleteConfirmation.studentName}?`}
        description='This action cannot be undone.'
        confirmText='Delete'
        variant='danger'
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

      {/* Enrollment modals removed - using financial summary API instead */}
      {false && isEnrolleeConfirmModalOpen && selectedEnrollee && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => {
            setIsEnrolleeConfirmModalOpen(false);
            setSelectedEnrollee(null);
            setEnrolleeAmount("");
          }}
        >
          <div
            className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
            style={{ backgroundColor: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className='px-6 py-4 flex items-center justify-between border-b'
              style={{
                backgroundColor: `${colors.primary}08`,
                borderColor: `${colors.primary}15`,
              }}
            >
              <div className='flex items-center gap-3'>
                <div
                  className='p-2 rounded-lg'
                  style={{ backgroundColor: `${colors.secondary}20` }}
                >
                  <User
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                </div>
                <div>
                  <h2
                    className='text-xl font-bold'
                    style={{ color: colors.primary }}
                  >
                    Add to Payment Cart
                  </h2>
                  <p className='text-sm text-gray-500'>
                    Enter payment amount for this enrollee
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEnrolleeConfirmModalOpen(false);
                  setSelectedEnrollee(null);
                  setEnrolleeAmount("");
                }}
                className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Body */}
            <div className='p-6 space-y-6'>
              {/* Enrollee Info */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <div className='flex items-center gap-4'>
                  <div
                    className='p-3 rounded-lg'
                    style={{ backgroundColor: `${colors.secondary}15` }}
                  >
                    <User
                      className='w-8 h-8'
                      style={{ color: colors.secondary }}
                    />
                  </div>
                  <div className='flex-1'>
                    <h3 className='font-semibold text-gray-900'>
                      {`${selectedEnrollee.family_name || ""}, ${selectedEnrollee.first_name || ""} ${selectedEnrollee.middle_name || ""}`.trim()}
                    </h3>
                    <p className='text-sm text-gray-500'>
                      {selectedEnrollee.student_number || "No Student #"}
                    </p>
                  </div>
                </div>
                <div className='mt-4 grid grid-cols-2 gap-4'>
                  <div>
                    <span className='text-xs text-gray-500'>Program</span>
                    <p className='text-sm font-medium text-gray-700'>
                      {selectedEnrollee.course_program || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs text-gray-500'>Term</span>
                    <p className='text-sm font-medium text-gray-700'>
                      {selectedEnrollee.term || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <DollarSign className='w-4 h-4 inline mr-1' />
                  Payment Amount
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
                    ₱
                  </span>
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    value={enrolleeAmount}
                    onChange={(e) => setEnrolleeAmount(e.target.value)}
                    placeholder='0.00'
                    className='w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    autoFocus
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-3 pt-4 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={() => {
                    setIsEnrolleeConfirmModalOpen(false);
                    setSelectedEnrollee(null);
                    setEnrolleeAmount("");
                  }}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleConfirmAddEnrolleeToCart}
                  className='flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2'
                  style={{ backgroundColor: colors.secondary }}
                >
                  <ShoppingCart className='w-4 h-4' />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment modals removed - using financial summary API instead */}
      {false && isEnrollmentCheckoutModalOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setIsEnrollmentCheckoutModalOpen(false)}
        >
          <div
            className='rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
            style={{ backgroundColor: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className='px-6 py-4 flex items-center justify-between border-b'
              style={{
                backgroundColor: `${colors.primary}08`,
                borderColor: `${colors.primary}15`,
              }}
            >
              <div className='flex items-center gap-3'>
                <div
                  className='p-2 rounded-lg'
                  style={{ backgroundColor: `${colors.secondary}20` }}
                >
                  <Receipt
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                </div>
                <div>
                  <h2
                    className='text-xl font-bold'
                    style={{ color: colors.primary }}
                  >
                    Process Enrollment Payments
                  </h2>
                  <p className='text-sm text-gray-500'>
                    Complete payment for {enrollmentCart.length} enrollee(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrollmentCheckoutModalOpen(false)}
                className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Body */}
            <div className='p-6 overflow-y-auto space-y-6'>
              {/* Order Summary */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <h3 className='font-medium text-gray-900 mb-3'>
                  Payment Summary
                </h3>
                <div className='space-y-2 max-h-32 overflow-y-auto'>
                  {(enrollmentCart as any[]).map((enrollee) => (
                    <div
                      key={enrollee.id}
                      className='flex justify-between text-sm'
                    >
                      <span className='text-gray-600'>
                        {enrollee.family_name}, {enrollee.first_name}
                      </span>
                      <span className='font-medium'>
                        {formatAmount(enrollee.paymentAmount)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className='border-t border-gray-200 mt-3 pt-3 flex justify-between'>
                  <span className='font-bold' style={{ color: colors.primary }}>
                    Total
                  </span>
                  <span
                    className='font-bold text-lg'
                    style={{ color: colors.secondary }}
                  >
                    {formatAmount(enrollmentCartTotal)}
                  </span>
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <CreditCard className='w-4 h-4 inline mr-1' />
                  Payment Type
                </label>
                <div className='grid grid-cols-3 gap-3'>
                  {[
                    {
                      value: "cash",
                      label: "Cash",
                      icon: Wallet,
                      color: "green",
                    },
                    {
                      value: "gcash",
                      label: "GCash",
                      icon: Smartphone,
                      color: "blue",
                    },
                    {
                      value: "bank_transfer",
                      label: "Bank",
                      icon: Building2,
                      color: "purple",
                    },
                  ].map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      type='button'
                      onClick={() =>
                        setEnrollmentPaymentType(value as PaymentType)
                      }
                      className={`p-3 rounded-lg border-2 transition-all ${
                        enrollmentPaymentType === value
                          ? `border-${color}-500 bg-${color}-50`
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={
                        enrollmentPaymentType === value
                          ? {
                              borderColor:
                                color === "green"
                                  ? "#22c55e"
                                  : color === "blue"
                                    ? "#3b82f6"
                                    : "#a855f7",
                              backgroundColor:
                                color === "green"
                                  ? "#f0fdf4"
                                  : color === "blue"
                                    ? "#eff6ff"
                                    : "#faf5ff",
                            }
                          : {}
                      }
                    >
                      <Icon
                        className='w-5 h-5 mx-auto mb-1'
                        style={{
                          color:
                            enrollmentPaymentType === value
                              ? color === "green"
                                ? "#22c55e"
                                : color === "blue"
                                  ? "#3b82f6"
                                  : "#a855f7"
                              : "#9ca3af",
                        }}
                      />
                      <span
                        className='text-xs font-medium block'
                        style={
                          enrollmentPaymentType === value
                            ? {
                                color:
                                  color === "green"
                                    ? "#15803d"
                                    : color === "blue"
                                      ? "#1d4ed8"
                                      : "#7e22ce",
                              }
                            : { color: "#6b7280" }
                        }
                      >
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Payment - Tendered Amount */}
              {enrollmentPaymentType === "cash" && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    <DollarSign className='w-4 h-4 inline mr-1' />
                    Tendered Amount
                  </label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
                      ₱
                    </span>
                    <input
                      type='number'
                      step='0.01'
                      min={enrollmentCartTotal}
                      value={enrollmentTenderedAmount}
                      onChange={(e) =>
                        setEnrollmentTenderedAmount(e.target.value)
                      }
                      placeholder='0.00'
                      className='w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                  </div>
                  {parseFloat(enrollmentTenderedAmount) >=
                    enrollmentCartTotal && (
                    <p className='mt-2 text-green-600 font-medium'>
                      Change: {formatAmount(enrollmentChangeAmount)}
                    </p>
                  )}
                </div>
              )}

              {/* Electronic Payment - Reference Number */}
              {(enrollmentPaymentType === "gcash" ||
                enrollmentPaymentType === "bank_transfer") && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    <Hash className='w-4 h-4 inline mr-1' />
                    Reference Number
                  </label>
                  <input
                    type='text'
                    value={enrollmentReferenceNo}
                    onChange={(e) => setEnrollmentReferenceNo(e.target.value)}
                    placeholder='Enter reference number'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className='flex gap-3 pt-4 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={() => setIsEnrollmentCheckoutModalOpen(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleEnrollmentCheckout}
                  className='flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors'
                  style={{ backgroundColor: colors.secondary }}
                >
                  Complete Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default PaymentBillingManagement;
