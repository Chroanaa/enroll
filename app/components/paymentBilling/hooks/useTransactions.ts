import { useState, useMemo } from "react";
import { OrderHeader, getOrders, getOrderDetails } from "../../../utils/billingUtils";

export const useTransactions = () => {
  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isVoidConfirmModalOpen, setIsVoidConfirmModalOpen] = useState(false);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState("");
  const [showOnlyVoided, setShowOnlyVoided] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleOrderDoubleClick = async (order: OrderHeader, onError: (message: string, details: string) => void) => {
    try {
      const orderDetails = await getOrderDetails(order.id);
      setSelectedOrder(orderDetails);
      setIsOrderDetailsModalOpen(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      onError("Failed to load order details", "Please try again.");
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter by voided status if showOnlyVoided is checked
      if (showOnlyVoided && !order.isvoided) {
        return false;
      }
      const searchLower = transactionSearchTerm.toLowerCase();
      return (
        order.id.toString().includes(searchLower) ||
        (order.ar_number?.toLowerCase() || "").includes(searchLower) ||
        (order.payment_type?.toLowerCase() || "").includes(searchLower) ||
        (order.student_name?.toLowerCase() || "").includes(searchLower) ||
        (order.student_number?.toLowerCase() || "").includes(searchLower)
      );
    });
  }, [orders, showOnlyVoided, transactionSearchTerm]);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(
      (transactionsPage - 1) * 10,
      transactionsPage * 10
    );
  }, [filteredOrders, transactionsPage]);

  return {
    allOrders: orders,
    filteredOrders,
    paginatedOrders,
    selectedOrder,
    setSelectedOrder,
    isOrderDetailsModalOpen,
    setIsOrderDetailsModalOpen,
    isVoidConfirmModalOpen,
    setIsVoidConfirmModalOpen,
    transactionSearchTerm,
    setTransactionSearchTerm,
    showOnlyVoided,
    setShowOnlyVoided,
    transactionsPage,
    setTransactionsPage,
    isLoading,
    fetchOrders,
    handleOrderDoubleClick,
  };
};

