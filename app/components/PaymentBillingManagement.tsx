"use client";
import React, { useState, useEffect, useMemo } from "react";
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
  getBillings,
  getUnbilledEnrollees,
  getProducts,
  getCategories,
  createBilling,
  createOrder,
  deleteBilling,
} from "../utils/billingUtils";
import { insertIntoReports } from "../utils/reportsUtils";
import { useSession } from "next-auth/react";

type PaymentType = "cash" | "gcash" | "bank_transfer";
type ActiveTab = "products" | "enrollments";

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

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

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
      });

      setSuccessModal({
        isOpen: true,
        message: `Order completed successfully! ${paymentType === "cash" ? `Change: ₱${changeAmount.toFixed(2)}` : ""}`,
      });

      insertIntoReports({
        action: `User ${session?.user?.name} completed POS order of ₱${cartTotal.toFixed(2)} (${paymentType})`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      clearCart();
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
          <>
            {/* Stats Cards */}
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-gray-500'>Total Payments</p>
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
                    <p className='text-sm text-gray-500'>Cash Payments</p>
                    <p className='text-2xl font-bold text-green-600'>
                      {billings.filter((b) => b.payment_type === "cash").length}
                    </p>
                  </div>
                  <div className='p-3 rounded-lg bg-green-100'>
                    <Wallet className='w-6 h-6 text-green-600' />
                  </div>
                </div>
              </div>

              <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-gray-500'>GCash Payments</p>
                    <p className='text-2xl font-bold text-blue-600'>
                      {
                        billings.filter((b) => b.payment_type === "gcash")
                          .length
                      }
                    </p>
                  </div>
                  <div className='p-3 rounded-lg bg-blue-100'>
                    <Smartphone className='w-6 h-6 text-blue-600' />
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
              <div className='flex flex-col md:flex-row gap-4'>
                <div className='flex-1 relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    type='text'
                    placeholder='Search by student name or number...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value='all'>All Payment Types</option>
                  <option value='cash'>Cash</option>
                  <option value='gcash'>GCash</option>
                  <option value='bank_transfer'>Bank Transfer</option>
                </select>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className='flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors'
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Plus className='w-5 h-5' />
                  Add Payment
                </button>
              </div>
            </div>

            {/* Payments Table */}
            <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
              {isLoading ? (
                <div className='p-8 text-center'>
                  <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto'></div>
                  <p className='mt-4 text-gray-600'>
                    Loading payment records...
                  </p>
                </div>
              ) : filteredBillings.length === 0 ? (
                <div className='p-8 text-center'>
                  <CreditCard className='mx-auto h-16 w-16 text-gray-400 mb-4' />
                  <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                    No Payment Records
                  </h3>
                  <p className='text-gray-600'>
                    {searchTerm || paymentTypeFilter !== "all"
                      ? "No payments match your search criteria."
                      : "Start by adding a new payment."}
                  </p>
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gray-50 border-b border-gray-200'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Student
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Amount
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Payment Type
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Reference No.
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Date Paid
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Term
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200'>
                        {paginatedBillings.map((billing) => (
                          <tr key={billing.id} className='hover:bg-gray-50'>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <div>
                                <div className='text-sm font-medium text-gray-900'>
                                  {`${billing.family_name || ""}, ${billing.first_name || ""} ${billing.middle_name || ""}`.trim() ||
                                    "N/A"}
                                </div>
                                <div className='text-sm text-gray-500'>
                                  {billing.student_number || "No Student #"}
                                </div>
                              </div>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <span className='text-sm font-semibold text-gray-900'>
                                {formatAmount(billing.amount)}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              {getPaymentTypeBadge(billing.payment_type)}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {billing.reference_no || "-"}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {formatDate(billing.date_paid)}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                              {billing.term || billing.enrollment_term || "-"}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-right'>
                              <button
                                onClick={() =>
                                  setDeleteConfirmation({
                                    isOpen: true,
                                    billingId: billing.id,
                                    studentName: `${billing.family_name || ""}, ${billing.first_name || ""}`,
                                  })
                                }
                                className='text-red-600 hover:text-red-800 text-sm font-medium'
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className='border-t border-gray-200'>
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredBillings.length}
                        onItemsPerPageChange={setItemsPerPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

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
    </div>
  );
};

export default PaymentBillingManagement;
