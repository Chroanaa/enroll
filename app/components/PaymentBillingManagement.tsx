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
import Pagination from "./common/Pagination";
import {
  Billing,
  UnbilledEnrollee,
  Product,
  Category,
  CartItem,
  OrderHeader,
  OrderWithDetails,
  EnrolledStudent,
  getBillings,
  getUnbilledEnrollees,
  getProducts,
  getCategories,
  createBilling,
  createOrder,
  createEnrollmentOrder,
  deleteBilling,
  getOrders,
  getOrderDetails,
  voidOrder,
  getEnrolledStudent,
  searchEnrolledStudents,
} from "../utils/billingUtils";
import { insertIntoReports } from "../utils/reportsUtils";
import { useSession } from "next-auth/react";

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

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");

  // Data states
  const [billings, setBillings] = useState<Billing[]>([]);
  const [unbilledEnrollees, setUnbilledEnrollees] = useState<
    UnbilledEnrollee[]
  >([]);
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

  // Enrollment cart states
  const [enrollmentCart, setEnrollmentCart] = useState<UnbilledEnrollee[]>([]);
  const [enrollmentPaymentType, setEnrollmentPaymentType] =
    useState<PaymentType>("cash");
  const [enrollmentTenderedAmount, setEnrollmentTenderedAmount] = useState("");
  const [enrollmentReferenceNo, setEnrollmentReferenceNo] = useState("");
  const [isEnrollmentCheckoutModalOpen, setIsEnrollmentCheckoutModalOpen] =
    useState(false);
  const [isEnrolleeConfirmModalOpen, setIsEnrolleeConfirmModalOpen] =
    useState(false);
  const [selectedEnrollee, setSelectedEnrollee] =
    useState<UnbilledEnrollee | null>(null);
  const [enrolleeAmount, setEnrolleeAmount] = useState("");
  const [enrolleeSearchTerm, setEnrolleeSearchTerm] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

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
      const [billingsData, unbilledData, productsData, categoriesData] =
        await Promise.all([
          getBillings(),
          getUnbilledEnrollees(),
          getProducts(),
          getCategories(),
        ]);
      setBillings(billingsData);
      setUnbilledEnrollees(unbilledData);
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

  // Enrollment cart functions
  const handleEnrolleeDoubleClick = (enrollee: UnbilledEnrollee) => {
    // Check if already in cart
    if (enrollmentCart.find((e) => e.id === enrollee.id)) {
      setErrorModal({
        isOpen: true,
        message: "Already in Cart",
        details: `${enrollee.family_name}, ${enrollee.first_name} is already in your cart.`,
      });
      return;
    }
    setSelectedEnrollee(enrollee);
    setEnrolleeAmount("");
    setIsEnrolleeConfirmModalOpen(true);
  };

  const handleConfirmAddEnrolleeToCart = () => {
    if (
      !selectedEnrollee ||
      !enrolleeAmount ||
      parseFloat(enrolleeAmount) <= 0
    ) {
      setErrorModal({
        isOpen: true,
        message: "Invalid Amount",
        details: "Please enter a valid payment amount.",
      });
      return;
    }

    // Add enrollee to cart with amount
    const enrolleeWithAmount = {
      ...selectedEnrollee,
      paymentAmount: parseFloat(enrolleeAmount),
    };
    setEnrollmentCart((prev) => [...prev, enrolleeWithAmount as any]);
    setIsEnrolleeConfirmModalOpen(false);
    setSelectedEnrollee(null);
    setEnrolleeAmount("");
  };

  const removeFromEnrollmentCart = (enrolleeId: number) => {
    setEnrollmentCart((prev) => prev.filter((e) => e.id !== enrolleeId));
  };

  const clearEnrollmentCart = () => {
    setEnrollmentCart([]);
    setEnrollmentTenderedAmount("");
    setEnrollmentReferenceNo("");
    setEnrollmentPaymentType("cash");
  };

  const enrollmentCartTotal = useMemo(() => {
    return enrollmentCart.reduce((total, item: any) => {
      return total + (item.paymentAmount || 0);
    }, 0);
  }, [enrollmentCart]);

  const enrollmentChangeAmount = useMemo(() => {
    const tendered = parseFloat(enrollmentTenderedAmount) || 0;
    return tendered - enrollmentCartTotal;
  }, [enrollmentTenderedAmount, enrollmentCartTotal]);

  // Filter unbilled enrollees for search
  const filteredUnbilledEnrollees = useMemo(() => {
    if (!enrolleeSearchTerm) return unbilledEnrollees;
    const searchLower = enrolleeSearchTerm.toLowerCase();
    return unbilledEnrollees.filter((enrollee) => {
      const fullName =
        `${enrollee.family_name || ""} ${enrollee.first_name || ""} ${enrollee.middle_name || ""}`.toLowerCase();
      const studentNum = (enrollee.student_number || "").toLowerCase();
      return fullName.includes(searchLower) || studentNum.includes(searchLower);
    });
  }, [unbilledEnrollees, enrolleeSearchTerm]);

  // Handle enrollment cart checkout
  const handleEnrollmentCheckout = async () => {
    if (enrollmentCart.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "Empty Cart",
        details: "Please add enrollees to cart before checkout.",
      });
      return;
    }

    if (
      enrollmentPaymentType === "cash" &&
      (!enrollmentTenderedAmount ||
        parseFloat(enrollmentTenderedAmount) < enrollmentCartTotal)
    ) {
      setErrorModal({
        isOpen: true,
        message: "Insufficient Amount",
        details: "Tendered amount must be equal to or greater than the total.",
      });
      return;
    }

    if (
      (enrollmentPaymentType === "gcash" ||
        enrollmentPaymentType === "bank_transfer") &&
      !enrollmentReferenceNo
    ) {
      setErrorModal({
        isOpen: true,
        message: "Reference Required",
        details: "Please enter the reference number for electronic payments.",
      });
      return;
    }

    try {
      // Prepare order items for enrollment order
      const orderItems = (enrollmentCart as any[]).map((enrollee) => ({
        enrollee_id: enrollee.id,
        enrollee_name:
          `${enrollee.family_name || ""}, ${enrollee.first_name || ""}`.trim(),
        student_number: enrollee.student_number || undefined,
        amount: enrollee.paymentAmount,
      }));

      // Get the first student number for AR number generation
      const firstStudentNumber =
        (enrollmentCart as any[]).length > 0
          ? (enrollmentCart as any[])[0].student_number
          : undefined;

      // Create enrollment order (order_header, order_details, payment_details)
      await createEnrollmentOrder({
        order_amount: enrollmentCartTotal,
        items: orderItems,
        payment_type: enrollmentPaymentType,
        tendered_amount:
          enrollmentPaymentType === "cash"
            ? parseFloat(enrollmentTenderedAmount)
            : enrollmentCartTotal,
        change_amount:
          enrollmentPaymentType === "cash" ? enrollmentChangeAmount : 0,
        transaction_ref: enrollmentReferenceNo || undefined,
        student_number: firstStudentNumber,
      });

      // Process each enrollee payment (create billing records)
      for (const enrollee of enrollmentCart as any[]) {
        await createBilling({
          enrollee_id: enrollee.id,
          term: enrollee.term || undefined,
          payment_type: enrollmentPaymentType,
          amount: enrollee.paymentAmount,
          reference_no: enrollmentReferenceNo || undefined,
          user_id: session?.user?.id ? Number(session.user.id) : undefined,
        });

        insertIntoReports({
          action: `User ${session?.user?.name} processed payment of ₱${enrollee.paymentAmount} (${enrollmentPaymentType}) for ${enrollee.family_name}, ${enrollee.first_name}`,
          user_id: Number(session?.user?.id),
          created_at: new Date(),
        });
      }

      setSuccessModal({
        isOpen: true,
        message: `Successfully processed ${enrollmentCart.length} payment(s)! ${enrollmentPaymentType === "cash" ? `Change: ₱${enrollmentChangeAmount.toFixed(2)}` : ""}`,
      });

      clearEnrollmentCart();
      setIsEnrollmentCheckoutModalOpen(false);
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Checkout Failed",
        details: error.response?.data?.error || "Please try again.",
      });
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
    return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-7xl mx-auto w-full'>
        {/* Header */}
        <div className='mb-6'>
          <h1
            className='text-2xl font-bold mb-2'
            style={{ color: colors.primary }}
          >
            Point of Sale System
          </h1>
          <p style={{ color: colors.primary }}>
            Process product sales and enrollment payments
          </p>
        </div>

        {/* Tab Navigation */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 mb-6'>
          <div className='flex border-b border-gray-200'>
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "products"
                  ? "border-b-2 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              style={
                activeTab === "products"
                  ? {
                      borderColor: colors.secondary,
                      backgroundColor: colors.secondary,
                    }
                  : {}
              }
            >
              <Package className='w-5 h-5' />
              Products POS
            </button>
            <button
              onClick={() => setActiveTab("enrollments")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "enrollments"
                  ? "border-b-2 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              style={
                activeTab === "enrollments"
                  ? {
                      borderColor: colors.secondary,
                      backgroundColor: colors.secondary,
                    }
                  : {}
              }
            >
              <Users className='w-5 h-5' />
              Enrollment Payments
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "transactions"
                  ? "border-b-2 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              style={
                activeTab === "transactions"
                  ? {
                      borderColor: colors.secondary,
                      backgroundColor: colors.secondary,
                    }
                  : {}
              }
            >
              <FileText className='w-5 h-5' />
              Transactions
            </button>
          </div>
        </div>

        {/* Products Tab Content */}
        {activeTab === "products" && (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Products Grid */}
            <div className='lg:col-span-2'>
              {/* Search and Filter */}
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4'>
                <div className='flex flex-col md:flex-row gap-4'>
                  <div className='flex-1 relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                    <input
                      type='text'
                      placeholder='Search products...'
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    <option value='all'>All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Grid */}
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
                {isLoading ? (
                  <div className='p-8 text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto'></div>
                    <p className='mt-4 text-gray-600'>Loading products...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className='p-8 text-center'>
                    <Package className='mx-auto h-16 w-16 text-gray-400 mb-4' />
                    <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                      No Products Found
                    </h3>
                    <p className='text-gray-600'>
                      {productSearchTerm || selectedCategory !== "all"
                        ? "No products match your search criteria."
                        : "No products available."}
                    </p>
                  </div>
                ) : (
                  <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                          product.quantity && product.quantity > 0
                            ? "border-gray-200 hover:border-blue-300 bg-white"
                            : "border-gray-200 bg-gray-100 cursor-not-allowed opacity-60"
                        }`}
                        disabled={!product.quantity || product.quantity <= 0}
                      >
                        <div className='flex items-start justify-between mb-2'>
                          <Package className='w-8 h-8 text-gray-400' />
                          {product.category?.name && (
                            <span className='text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600'>
                              {product.category.name}
                            </span>
                          )}
                        </div>
                        <h3 className='font-medium text-gray-900 mb-1 line-clamp-2'>
                          {product.name}
                        </h3>
                        <p
                          className='text-lg font-bold'
                          style={{ color: colors.secondary }}
                        >
                          {formatAmount(Number(product.price))}
                        </p>
                        <p
                          className={`text-sm mt-1 ${product.quantity && product.quantity > 0 ? "text-gray-500" : "text-red-500"}`}
                        >
                          {product.quantity && product.quantity > 0
                            ? `Stock: ${product.quantity}`
                            : "Out of Stock"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            <div className='lg:col-span-1'>
              {/* Student Search */}
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 mb-4'>
                <div
                  className='p-4 border-b border-gray-200'
                  style={{ backgroundColor: `${colors.primary}08` }}
                >
                  <div className='flex items-center gap-2'>
                    <User
                      className='w-5 h-5'
                      style={{ color: colors.secondary }}
                    />
                    <h2 className='font-bold' style={{ color: colors.primary }}>
                      Student
                    </h2>
                  </div>
                </div>
                <div className='p-4'>
                  {selectedStudent ? (
                    <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
                      <div className='flex items-start justify-between'>
                        <div>
                          <p className='font-medium text-green-800'>
                            {selectedStudent.family_name},{" "}
                            {selectedStudent.first_name}{" "}
                            {selectedStudent.middle_name || ""}
                          </p>
                          <p className='text-sm text-green-600'>
                            {selectedStudent.student_number}
                          </p>
                          <p className='text-xs text-green-600'>
                            {selectedStudent.course_program}
                          </p>
                        </div>
                        <button
                          onClick={clearSelectedStudent}
                          className='text-green-600 hover:text-green-800'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-2' ref={studentSearchRef}>
                      <div className='relative'>
                        <div className='flex gap-2'>
                          <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                            <input
                              type='text'
                              placeholder='Search by name or student number...'
                              value={studentNumberInput}
                              onChange={(e) =>
                                handleStudentInputChange(e.target.value)
                              }
                              onFocus={() => {
                                if (studentSearchResults.length > 0) {
                                  setShowStudentDropdown(true);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleStudentSearch();
                                }
                                if (e.key === "Escape") {
                                  setShowStudentDropdown(false);
                                }
                              }}
                              className='w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            />
                            {studentSearchLoading && (
                              <Loader2 className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin' />
                            )}
                          </div>
                          <button
                            onClick={handleStudentSearch}
                            disabled={studentSearchLoading}
                            className='px-3 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50'
                            style={{ backgroundColor: colors.secondary }}
                          >
                            {studentSearchLoading ? "..." : "Search"}
                          </button>
                        </div>

                        {/* Autocomplete Dropdown */}
                        {showStudentDropdown &&
                          studentSearchResults.length > 0 && (
                            <div className='absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto'>
                              {studentSearchResults.map((student) => (
                                <button
                                  key={student.id}
                                  onClick={() => handleStudentSelect(student)}
                                  className='w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors'
                                >
                                  <div className='flex items-center gap-3'>
                                    <div
                                      className='w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium'
                                      style={{
                                        backgroundColor: colors.secondary,
                                      }}
                                    >
                                      {(
                                        student.first_name?.[0] || ""
                                      ).toUpperCase()}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                      <p className='font-medium text-gray-900 truncate'>
                                        {student.family_name},{" "}
                                        {student.first_name}{" "}
                                        {student.middle_name || ""}
                                      </p>
                                      <div className='flex items-center gap-2 text-xs text-gray-500'>
                                        <span className='font-mono'>
                                          {student.student_number}
                                        </span>
                                        <span>•</span>
                                        <span className='truncate'>
                                          {student.course_program || "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                      {studentSearchError && (
                        <p className='text-sm text-red-600'>
                          {studentSearchError}
                        </p>
                      )}
                      <p className='text-xs text-gray-500'>
                        Search by student number or name. Only enrolled students
                        can be selected.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className='bg-white rounded-lg shadow-sm border border-gray-100 sticky top-4'>
                {/* Cart Header */}
                <div
                  className='p-4 border-b border-gray-200'
                  style={{ backgroundColor: `${colors.primary}08` }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <ShoppingCart
                        className='w-5 h-5'
                        style={{ color: colors.secondary }}
                      />
                      <h2
                        className='font-bold'
                        style={{ color: colors.primary }}
                      >
                        Cart ({cart.length})
                      </h2>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className='text-sm text-red-600 hover:text-red-800'
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Cart Items */}
                <div className='p-4 max-h-[400px] overflow-y-auto'>
                  {cart.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <ShoppingCart className='w-12 h-12 mx-auto mb-2 text-gray-300' />
                      <p>Cart is empty</p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'
                        >
                          <div className='flex-1'>
                            <p className='font-medium text-gray-900 text-sm line-clamp-1'>
                              {item.product.name}
                            </p>
                            <p
                              className='text-sm'
                              style={{ color: colors.secondary }}
                            >
                              {formatAmount(Number(item.product.price))}
                            </p>
                          </div>
                          <div className='flex items-center gap-2'>
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                )
                              }
                              className='p-1 rounded-full bg-gray-200 hover:bg-gray-300'
                            >
                              <Minus className='w-4 h-4' />
                            </button>
                            <span className='w-8 text-center font-medium'>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  item.product.id,
                                  item.quantity + 1,
                                )
                              }
                              className='p-1 rounded-full bg-gray-200 hover:bg-gray-300'
                            >
                              <Plus className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className='p-1 rounded-full text-red-500 hover:bg-red-100 ml-2'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Total & Checkout */}
                {cart.length > 0 && (
                  <div className='p-4 border-t border-gray-200'>
                    <div className='flex items-center justify-between mb-4'>
                      <span
                        className='text-lg font-bold'
                        style={{ color: colors.primary }}
                      >
                        Total:
                      </span>
                      <span
                        className='text-2xl font-bold'
                        style={{ color: colors.secondary }}
                      >
                        {formatAmount(cartTotal)}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsCheckoutModalOpen(true)}
                      className='w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-colors hover:opacity-90'
                      style={{ backgroundColor: colors.secondary }}
                    >
                      <Receipt className='w-5 h-5' />
                      Checkout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enrollments Tab Content */}
        {activeTab === "enrollments" && (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Unpaid Enrollees Table */}
            <div className='lg:col-span-2'>
              {/* Stats Cards */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm text-gray-500'>Total Paid</p>
                      <p
                        className='text-2xl font-bold'
                        style={{ color: colors.primary }}
                      >
                        {billings.length}
                      </p>
                    </div>
                    <div
                      className='p-3 rounded-lg'
                      style={{ backgroundColor: `${colors.secondary}20` }}
                    >
                      <CreditCard
                        className='w-6 h-6'
                        style={{ color: colors.secondary }}
                      />
                    </div>
                  </div>
                </div>

                <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm text-gray-500'>Pending Payments</p>
                      <p className='text-2xl font-bold text-orange-600'>
                        {unbilledEnrollees.length}
                      </p>
                    </div>
                    <div className='p-3 rounded-lg bg-orange-100'>
                      <Users className='w-6 h-6 text-orange-600' />
                    </div>
                  </div>
                </div>

                <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm text-gray-500'>In Cart</p>
                      <p className='text-2xl font-bold text-blue-600'>
                        {enrollmentCart.length}
                      </p>
                    </div>
                    <div className='p-3 rounded-lg bg-blue-100'>
                      <ShoppingCart className='w-6 h-6 text-blue-600' />
                    </div>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    type='text'
                    placeholder='Search unpaid enrollees by name or student number...'
                    value={enrolleeSearchTerm}
                    onChange={(e) => setEnrolleeSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              </div>

              {/* Unpaid Enrollees Table */}
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
                {isLoading ? (
                  <div className='p-8 text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto'></div>
                    <p className='mt-4 text-gray-600'>Loading enrollees...</p>
                  </div>
                ) : filteredUnbilledEnrollees.length === 0 ? (
                  <div className='p-8 text-center'>
                    <Users className='mx-auto h-16 w-16 text-gray-400 mb-4' />
                    <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                      No Unpaid Enrollees
                    </h3>
                    <p className='text-gray-600'>
                      {enrolleeSearchTerm
                        ? "No enrollees match your search criteria."
                        : "All enrollees have been paid."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className='px-4 py-3 bg-orange-50 border-b border-orange-100'>
                      <p className='text-sm text-orange-700 flex items-center gap-2'>
                        <Users className='w-4 h-4' />
                        Double-click a row to add the enrollee to your payment
                        cart
                      </p>
                    </div>
                    <div className='overflow-x-auto max-h-[500px] overflow-y-auto'>
                      <table className='w-full'>
                        <thead className='bg-gray-50 border-b border-gray-200 sticky top-0'>
                          <tr>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Student
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Student Number
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Program
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Term
                            </th>
                            <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-200'>
                          {filteredUnbilledEnrollees.map((enrollee) => {
                            const isInCart = enrollmentCart.find(
                              (e) => e.id === enrollee.id,
                            );
                            return (
                              <tr
                                key={enrollee.id}
                                onDoubleClick={() =>
                                  handleEnrolleeDoubleClick(enrollee)
                                }
                                className={`transition-colors cursor-pointer ${
                                  isInCart
                                    ? "bg-green-50 opacity-60"
                                    : "hover:bg-orange-50"
                                }`}
                                title={
                                  isInCart
                                    ? "Already in cart"
                                    : "Double-click to add to cart"
                                }
                              >
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  <div className='flex items-center gap-3'>
                                    <div
                                      className='p-2 rounded-lg'
                                      style={{
                                        backgroundColor: isInCart
                                          ? "#dcfce7"
                                          : `${colors.secondary}15`,
                                      }}
                                    >
                                      <User
                                        className='w-5 h-5'
                                        style={{
                                          color: isInCart
                                            ? "#16a34a"
                                            : colors.secondary,
                                        }}
                                      />
                                    </div>
                                    <span className='text-sm font-medium text-gray-900'>
                                      {`${enrollee.family_name || ""}, ${enrollee.first_name || ""} ${enrollee.middle_name || ""}`.trim()}
                                    </span>
                                  </div>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  <span className='text-sm text-gray-600'>
                                    {enrollee.student_number || "N/A"}
                                  </span>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  <span className='text-sm text-gray-600'>
                                    {enrollee.course_program || "N/A"}
                                  </span>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  <span className='text-sm text-gray-600'>
                                    {enrollee.term || "N/A"}
                                  </span>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap'>
                                  {isInCart ? (
                                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                      In Cart
                                    </span>
                                  ) : (
                                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
                                      Unpaid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Enrollment Cart */}
            <div className='lg:col-span-1'>
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 sticky top-4'>
                {/* Cart Header */}
                <div
                  className='p-4 border-b border-gray-200'
                  style={{ backgroundColor: `${colors.primary}08` }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <ShoppingCart
                        className='w-5 h-5'
                        style={{ color: colors.secondary }}
                      />
                      <h2
                        className='font-bold'
                        style={{ color: colors.primary }}
                      >
                        Payment Cart ({enrollmentCart.length})
                      </h2>
                    </div>
                    {enrollmentCart.length > 0 && (
                      <button
                        onClick={clearEnrollmentCart}
                        className='text-sm text-red-600 hover:text-red-800'
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Cart Items */}
                <div className='p-4 max-h-[400px] overflow-y-auto'>
                  {enrollmentCart.length === 0 ? (
                    <div className='text-center py-8 text-gray-500'>
                      <ShoppingCart className='w-12 h-12 mx-auto mb-2 text-gray-300' />
                      <p>Cart is empty</p>
                      <p className='text-sm mt-1'>
                        Double-click an enrollee to add
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {(enrollmentCart as any[]).map((enrollee) => (
                        <div
                          key={enrollee.id}
                          className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'
                        >
                          <div className='flex-1'>
                            <p className='font-medium text-gray-900 text-sm line-clamp-1'>
                              {`${enrollee.family_name || ""}, ${enrollee.first_name || ""}`}
                            </p>
                            <p className='text-xs text-gray-500'>
                              {enrollee.student_number || "N/A"} •{" "}
                              {enrollee.term || "N/A"}
                            </p>
                            <p
                              className='text-sm font-semibold mt-1'
                              style={{ color: colors.secondary }}
                            >
                              {formatAmount(enrollee.paymentAmount)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              removeFromEnrollmentCart(enrollee.id)
                            }
                            className='p-1 rounded-full text-red-500 hover:bg-red-100'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Total & Checkout */}
                {enrollmentCart.length > 0 && (
                  <div className='p-4 border-t border-gray-200'>
                    <div className='flex items-center justify-between mb-4'>
                      <span
                        className='text-lg font-bold'
                        style={{ color: colors.primary }}
                      >
                        Total:
                      </span>
                      <span
                        className='text-2xl font-bold'
                        style={{ color: colors.secondary }}
                      >
                        {formatAmount(enrollmentCartTotal)}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsEnrollmentCheckoutModalOpen(true)}
                      className='w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-colors hover:opacity-90'
                      style={{ backgroundColor: colors.secondary }}
                    >
                      <Receipt className='w-5 h-5' />
                      Process Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
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
      {isOrderDetailsModalOpen && selectedOrder && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setIsOrderDetailsModalOpen(false)}
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
                backgroundColor: selectedOrder.isvoided
                  ? "#FEF2F2"
                  : `${colors.primary}08`,
                borderColor: selectedOrder.isvoided
                  ? "#FECACA"
                  : `${colors.primary}15`,
              }}
            >
              <div className='flex items-center gap-3'>
                <div
                  className='p-2 rounded-lg'
                  style={{
                    backgroundColor: selectedOrder.isvoided
                      ? "#FEE2E2"
                      : `${colors.secondary}20`,
                  }}
                >
                  <FileText
                    className='w-5 h-5'
                    style={{
                      color: selectedOrder.isvoided
                        ? "#DC2626"
                        : colors.secondary,
                    }}
                  />
                </div>
                <div>
                  <h2
                    className='text-xl font-bold'
                    style={{
                      color: selectedOrder.isvoided
                        ? "#DC2626"
                        : colors.primary,
                    }}
                  >
                    {selectedOrder.ar_number ||
                      `Order #${selectedOrder.id.toString().padStart(6, "0")}`}
                  </h2>
                  <p className='text-sm text-gray-500'>
                    {selectedOrder.ar_number && (
                      <span className='mr-2'>ID: {selectedOrder.id}</span>
                    )}
                    {new Date(selectedOrder.order_date).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                {selectedOrder.isvoided && (
                  <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800'>
                    VOIDED
                  </span>
                )}
                <button
                  onClick={() => setIsOrderDetailsModalOpen(false)}
                  className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className='p-6 overflow-y-auto space-y-6'>
              {/* Student Info */}
              {selectedOrder.student_name && (
                <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 rounded-lg bg-blue-100'>
                      <User className='w-5 h-5 text-blue-600' />
                    </div>
                    <div>
                      <p className='font-medium text-blue-900'>
                        {selectedOrder.student_name}
                      </p>
                      <p className='text-sm text-blue-700'>
                        {selectedOrder.student_number}
                      </p>
                      {selectedOrder.student_program && (
                        <p className='text-xs text-blue-600'>
                          {selectedOrder.student_program}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className='font-medium text-gray-900 mb-3'>Order Items</h3>
                <div className='bg-gray-50 rounded-lg overflow-hidden'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-gray-200'>
                        <th className='px-4 py-2 text-left text-sm font-medium text-gray-600'>
                          Item
                        </th>
                        <th className='px-4 py-2 text-center text-sm font-medium text-gray-600'>
                          Qty
                        </th>
                        <th className='px-4 py-2 text-right text-sm font-medium text-gray-600'>
                          Price
                        </th>
                        <th className='px-4 py-2 text-right text-sm font-medium text-gray-600'>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {selectedOrder.order_details?.map((detail, index) => (
                        <tr key={index}>
                          <td className='px-4 py-3 text-sm text-gray-900'>
                            {detail.product_name || "Item"}
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-600 text-center'>
                            {detail.quantity || 0}
                          </td>
                          <td className='px-4 py-3 text-sm text-gray-600 text-right'>
                            {formatAmount(detail.selling_price || 0)}
                          </td>
                          <td
                            className='px-4 py-3 text-sm font-medium text-right'
                            style={{ color: colors.secondary }}
                          >
                            {formatAmount(detail.total || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Details */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-500 mb-1'>Payment Method</p>
                  <p className='font-medium text-gray-900'>
                    {selectedOrder.payment_type || "N/A"}
                  </p>
                </div>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-500 mb-1'>Total Amount</p>
                  <p
                    className='font-medium text-xl'
                    style={{ color: colors.secondary }}
                  >
                    {formatAmount(selectedOrder.order_amount || 0)}
                  </p>
                </div>
              </div>

              {/* Payment Details */}
              {selectedOrder.payment_details && (
                <div>
                  <h3 className='font-medium text-gray-900 mb-3'>
                    Payment Details
                  </h3>
                  <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-600'>Payment Method</span>
                      <span className='font-medium text-gray-900'>
                        {selectedOrder.payment_details.payment_type_name ||
                          "N/A"}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-600'>Amount Paid</span>
                      <span
                        className='font-medium'
                        style={{ color: colors.secondary }}
                      >
                        {formatAmount(
                          selectedOrder.payment_details.amount || 0,
                        )}
                      </span>
                    </div>
                    {selectedOrder.payment_details.tendered_amount && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-gray-600'>Tendered Amount</span>
                        <span className='font-medium text-gray-900'>
                          {formatAmount(
                            selectedOrder.payment_details.tendered_amount,
                          )}
                        </span>
                      </div>
                    )}
                    {selectedOrder.payment_details.change_amount && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-gray-600'>Change</span>
                        <span className='font-medium text-gray-900'>
                          {formatAmount(
                            selectedOrder.payment_details.change_amount,
                          )}
                        </span>
                      </div>
                    )}
                    {selectedOrder.payment_details.transaction_ref && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-gray-600'>Reference No.</span>
                        <span className='font-medium text-gray-900'>
                          {selectedOrder.payment_details.transaction_ref}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!selectedOrder.isvoided && (
              <div className='px-6 py-4 border-t border-gray-200 flex justify-end'>
                <button
                  onClick={() => {
                    setIsOrderDetailsModalOpen(false);
                    setIsVoidConfirmModalOpen(true);
                  }}
                  className='px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors'
                >
                  <Ban className='w-4 h-4' />
                  Void Transaction
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {isVoidConfirmModalOpen && selectedOrder && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setIsVoidConfirmModalOpen(false)}
        >
          <div
            className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200'
            style={{ backgroundColor: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='p-6'>
              <div className='w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4'>
                <Ban className='w-6 h-6 text-red-600' />
              </div>
              <h3 className='text-lg font-bold text-gray-900 text-center mb-2'>
                Void Transaction?
              </h3>
              <p className='text-sm text-gray-600 text-center mb-6'>
                Are you sure you want to void Order #
                {selectedOrder.id.toString().padStart(6, "0")}? This action will
                mark the transaction as voided and cannot be undone.
              </p>
              <p
                className='text-center font-bold text-xl mb-6'
                style={{ color: colors.secondary }}
              >
                Amount: {formatAmount(selectedOrder.order_amount || 0)}
              </p>
              <div className='flex gap-3'>
                <button
                  onClick={() => setIsVoidConfirmModalOpen(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
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
                  }}
                  className='flex-1 px-4 py-2 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 transition-colors'
                >
                  Void Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Checkout Modal */}
      {isCheckoutModalOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setIsCheckoutModalOpen(false)}
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
                    Checkout
                  </h2>
                  <p className='text-sm text-gray-500'>
                    Complete your purchase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
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
                  Order Summary
                </h3>
                <div className='space-y-2 max-h-32 overflow-y-auto'>
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className='flex justify-between text-sm'
                    >
                      <span className='text-gray-600'>
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className='font-medium'>
                        {formatAmount(
                          (Number(item.product.price) || 0) * item.quantity,
                        )}
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
                    {formatAmount(cartTotal)}
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
                      onClick={() => setPaymentType(value as PaymentType)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        paymentType === value
                          ? `border-${color}-500 bg-${color}-50`
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={
                        paymentType === value
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
                            paymentType === value
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
                          paymentType === value
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
              {paymentType === "cash" && (
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
                      min={cartTotal}
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      placeholder='0.00'
                      className='w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                  </div>
                  {parseFloat(tenderedAmount) >= cartTotal && (
                    <p className='mt-2 text-green-600 font-medium'>
                      Change: {formatAmount(changeAmount)}
                    </p>
                  )}
                </div>
              )}

              {/* Electronic Payment - Reference Number */}
              {(paymentType === "gcash" || paymentType === "bank_transfer") && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    <Hash className='w-4 h-4 inline mr-1' />
                    Reference Number
                  </label>
                  <input
                    type='text'
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder='Enter reference number'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className='flex gap-3 pt-4 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleProductCheckout}
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

      {/* Add Enrollment Payment Modal */}
      {isAddModalOpen && (
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

      {/* Enrollee Confirmation Modal */}
      {isEnrolleeConfirmModalOpen && selectedEnrollee && (
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

      {/* Enrollment Checkout Modal */}
      {isEnrollmentCheckoutModalOpen && (
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
