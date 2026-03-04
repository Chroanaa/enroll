"use client";
import React, { useState, useEffect } from "react";
import { colors } from "../colors";
import { DollarSign, Edit2, Eye, Plus, Trash2, ArrowLeft, Calendar } from "lucide-react";
import SearchFilters from "./common/SearchFilters";
import Pagination from "./common/Pagination";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import ConfirmationModal from "./common/ConfirmationModal";

interface FeeCategory {
  id: number;
  title: string;
  description: string | null;
  academic_year: string;
  category_type: string;
  status: string;
  _count: {
    miscellaneous_fees: number;
  };
}

interface MiscellaneousFee {
  id: number;
  category_id: number;
  item: string;
  amount: number;
  status: string;
  category: {
    title: string;
    academic_year: string;
    description: string | null;
  };
}

const MiscellaneousFees: React.FC = () => {
  // View state: 'categories' or 'fees'
  const [currentView, setCurrentView] = useState<'categories' | 'fees'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory | null>(null);
  
  // Categories data
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<FeeCategory[]>([]);
  
  // Fees data
  const [fees, setFees] = useState<MiscellaneousFee[]>([]);
  const [filteredFees, setFilteredFees] = useState<MiscellaneousFee[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<MiscellaneousFee | null>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<FeeCategory | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    item: "",
    amount: "" as string | number,
    status: "active",
  });
  
  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    title: "",
    description: "",
    academic_year: new Date().getFullYear().toString(),
  });
  
  // Multiple fees for category creation
  const [categoryFees, setCategoryFees] = useState<Array<{ item: string; amount: string }>>([
    { item: "", amount: "" },
  ]);
  
  // Success/Error modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "", details: "" });
  
  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Fetch categories on mount
  useEffect(() => {
    if (currentView === 'categories') {
      fetchCategories();
    }
  }, [currentView]);

  // Filter categories when search term or status filter changes
  useEffect(() => {
    if (currentView === 'categories') {
      filterCategories();
    }
  }, [categories, searchTerm, statusFilter]);

  // Filter fees when search term or status filter changes
  useEffect(() => {
    if (currentView === 'fees') {
      filterFees();
    }
  }, [fees, searchTerm, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, currentView]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/fee-categories?category_type=miscellaneous');
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to load fee categories",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFees = async (categoryId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/auth/miscellaneous-fees`);
      if (!response.ok) throw new Error("Failed to fetch fees");
      const data = await response.json();
      // Filter fees by category_id
      const categoryFees = data.filter((fee: MiscellaneousFee) => fee.category_id === categoryId);
      setFees(categoryFees);
    } catch (error) {
      console.error("Error fetching fees:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to load fees",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCategories = () => {
    let filtered = [...categories];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.title.toLowerCase().includes(searchLower) ||
        cat.academic_year.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(cat => cat.status === statusFilter);
    }

    setFilteredCategories(filtered);
  };

  const filterFees = () => {
    let filtered = [...fees];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(fee => 
        fee.item.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(fee => fee.status === statusFilter);
    }

    setFilteredFees(filtered);
  };

  // Calculate pagination
  const dataToDisplay = currentView === 'categories' ? filteredCategories : filteredFees;
  const totalPages = Math.ceil(dataToDisplay.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = dataToDisplay.slice(startIndex, endIndex);

  const handleViewCategory = (category: FeeCategory) => {
    setSelectedCategory(category);
    setCurrentView('fees');
    setSearchTerm("");
    setStatusFilter("all");
    fetchFees(category.id);
  };

  const handleBackToCategories = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
    setSearchTerm("");
    setStatusFilter("all");
  };

  const handleAdd = () => {
    setFormData({ item: "", amount: "", status: "active" });
    setIsAddModalOpen(true);
  };

  const handleAddCategory = () => {
    setCategoryFormData({
      title: "",
      description: "",
      academic_year: new Date().getFullYear().toString(),
    });
    setCategoryFees([{ item: "", amount: "" }]);
    setIsAddCategoryModalOpen(true);
  };

  const handleAddFeeRow = () => {
    setCategoryFees([...categoryFees, { item: "", amount: "" }]);
  };

  const handleRemoveFeeRow = (index: number) => {
    if (categoryFees.length > 1) {
      setCategoryFees(categoryFees.filter((_, i) => i !== index));
    }
  };

  const handleFeeRowChange = (index: number, field: 'item' | 'amount', value: string) => {
    const updated = [...categoryFees];
    updated[index][field] = value;
    setCategoryFees(updated);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.title.trim() || !categoryFormData.academic_year.trim()) return;
    
    const validFees = categoryFees.filter(fee => fee.item.trim() && fee.amount);
    
    if (validFees.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "Please add at least one fee item",
        details: "",
      });
      return;
    }
    
    try {
      const categoryResponse = await fetch("/api/auth/fee-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: categoryFormData.title.trim(),
          description: categoryFormData.description.trim() || null,
          academic_year: categoryFormData.academic_year.trim(),
          category_type: "miscellaneous",
          status: "active",
        }),
      });
      
      if (!categoryResponse.ok) throw new Error("Failed to create category");
      
      const newCategory = await categoryResponse.json();
      
      const feePromises = validFees.map(fee =>
        fetch("/api/auth/miscellaneous-fees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item: fee.item.trim(),
            amount: parseFloat(fee.amount) || 0,
            status: "active",
            category_id: newCategory.id,
          }),
        })
      );
      
      await Promise.all(feePromises);
      
      await fetchCategories();
      setIsAddCategoryModalOpen(false);
      setSuccessModal({
        isOpen: true,
        message: `Category "${categoryFormData.title}" created with ${validFees.length} fees`,
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: "Failed to create category",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleEditCategory = (category: FeeCategory) => {
    setSelectedCategoryForEdit(category);
    setIsEditCategoryModalOpen(true);
  };

  const handleToggleCategoryStatus = async () => {
    if (!selectedCategoryForEdit) return;
    
    const newStatus = selectedCategoryForEdit.status === "active" ? "inactive" : "active";
    
    try {
      const response = await fetch("/api/auth/fee-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCategoryForEdit.id,
          status: newStatus,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to update category status");
      
      await fetchCategories();
      setIsEditCategoryModalOpen(false);
      setSuccessModal({
        isOpen: true,
        message: `Category status updated to ${newStatus}`,
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: "Failed to update category status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleEdit = (fee: MiscellaneousFee) => {
    setSelectedFee(fee);
    setFormData({
      item: fee.item,
      amount: fee.amount > 0 ? String(fee.amount) : "",
      status: fee.status,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (fee: MiscellaneousFee) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Fee",
      message: `Are you sure you want to delete "${fee.item}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch("/api/auth/miscellaneous-fees", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fee.id),
          });
          
          if (!response.ok) throw new Error("Failed to delete fee");
          
          setFees(fees.filter(f => f.id !== fee.id));
          setSuccessModal({
            isOpen: true,
            message: "Fee deleted successfully",
          });
        } catch (error) {
          setErrorModal({
            isOpen: true,
            message: "Failed to delete fee",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      },
    });
  };

  const handleSaveAdd = async () => {
    if (!selectedCategory || !formData.item.trim() || formData.amount === "") return;
    
    try {
      const response = await fetch("/api/auth/miscellaneous-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: formData.item.trim(),
          amount: parseFloat(String(formData.amount)) || 0,
          status: "active",
          category_id: selectedCategory.id,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to add fee");
      
      await fetchFees(selectedCategory.id);
      setIsAddModalOpen(false);
      setSuccessModal({
        isOpen: true,
        message: "Fee added successfully",
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: "Failed to add fee",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedFee || !selectedCategory || !formData.item.trim() || formData.amount === "") return;
    
    try {
      const response = await fetch("/api/auth/miscellaneous-fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedFee.id,
          item: formData.item.trim(),
          amount: parseFloat(String(formData.amount)) || 0,
          status: formData.status,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to update fee");
      
      await fetchFees(selectedCategory.id);
      setIsEditModalOpen(false);
      setSuccessModal({
        isOpen: true,
        message: "Fee updated successfully",
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: "Failed to update fee",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" }
      : { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" };
  };

  return (
    <div className="w-full min-h-screen p-6 font-sans" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {currentView === 'fees' && (
              <button
                onClick={handleBackToCategories}
                className="flex items-center gap-2 text-sm mb-2 hover:underline"
                style={{ color: colors.secondary }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Categories
              </button>
            )}
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              {currentView === 'categories' 
                ? 'Miscellaneous Fee Categories' 
                : selectedCategory?.title || 'Miscellaneous Fees'}
            </h1>
            <p className="text-gray-500 mt-1">
              {currentView === 'categories'
                ? 'Select a category to view and manage fees'
                : selectedCategory?.description || 'Manage miscellaneous fees for this category'}
            </p>
          </div>
          {currentView === 'categories' ? (
            <button
              onClick={handleAddCategory}
              className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium text-sm transition-colors hover:shadow-md"
              style={{ backgroundColor: colors.secondary }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          ) : (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium text-sm transition-colors hover:shadow-md"
              style={{ backgroundColor: colors.secondary }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
            >
              <Plus className="w-4 h-4" />
              Add Miscellaneous Fee
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={currentView === 'categories' ? "Search categories..." : "Search fees..."}
          filters={[
            {
              value: statusFilter,
              onChange: (value) => setStatusFilter(value as "all" | "active" | "inactive"),
              options: [
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
              placeholder: "All Status",
            },
          ]}
        />

        {/* Categories Table */}
        {currentView === 'categories' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.neutralBorder }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr
                    style={{
                      backgroundColor: `${colors.primary}05`,
                      borderBottom: `1px solid ${colors.primary}10`,
                    }}
                  >
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Academic Year
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Total Fees
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.secondary }}></div>
                          <p className="text-sm" style={{ color: colors.neutral }}>Loading categories...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div
                            className="p-3 rounded-full"
                            style={{ backgroundColor: `${colors.primary}05` }}
                          >
                            <Calendar className="w-6 h-6" style={{ color: colors.primary }} />
                          </div>
                          <p className="font-medium">
                            {searchTerm || statusFilter !== "all" ? "No categories match your filters" : "No categories found"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (paginatedData as FeeCategory[]).map((category) => {
                    const statusStyles = getStatusColor(category.status);
                    return (
                      <tr
                        key={category.id}
                        className="group hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-7 w-7">
                              <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm"
                                style={{
                                  backgroundColor: "white",
                                  border: `1px solid ${colors.primary}10`,
                                }}
                              >
                                <Calendar
                                  className="h-3.5 w-3.5"
                                  style={{ color: colors.primary }}
                                />
                              </div>
                            </div>
                            <div className="ml-2">
                              <div
                                className="text-xs font-semibold"
                                style={{ color: colors.primary }}
                              >
                                {category.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-700">
                            {category.academic_year}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-700">
                            {category._count.miscellaneous_fees} fees
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                            style={{
                              backgroundColor: statusStyles.bg,
                              color: statusStyles.text,
                              borderColor: statusStyles.border,
                            }}
                          >
                            <span
                              className="w-1 h-1 rounded-full mr-1"
                              style={{ backgroundColor: statusStyles.text }}
                            />
                            {category.status.charAt(0).toUpperCase() + category.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewCategory(category)}
                              className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                              style={{
                                backgroundColor: "#E0E7FF",
                                color: "#4F46E5",
                              }}
                              title="View Fees"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Fees</span>
                            </button>
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                              style={{
                                backgroundColor: "#FED7AA",
                                color: "#C2410C",
                              }}
                              title="Edit Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredCategories.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredCategories.length}
                itemName="categories"
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        )}

        {/* Fees Table */}
        {currentView === 'fees' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: colors.neutralBorder }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr
                    style={{
                      backgroundColor: `${colors.primary}05`,
                      borderBottom: `1px solid ${colors.primary}10`,
                    }}
                  >
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.secondary }}></div>
                          <p className="text-sm" style={{ color: colors.neutral }}>Loading fees...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div
                            className="p-3 rounded-full"
                            style={{ backgroundColor: `${colors.primary}05` }}
                          >
                            <DollarSign className="w-6 h-6" style={{ color: colors.primary }} />
                          </div>
                          <p className="font-medium">
                            {searchTerm || statusFilter !== "all" ? "No fees match your filters" : "No fees found"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {searchTerm || statusFilter !== "all" 
                              ? "Try adjusting your search or filters" 
                              : "Add a new fee to get started"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (paginatedData as MiscellaneousFee[]).map((fee) => {
                    const statusStyles = getStatusColor(fee.status);
                    return (
                      <tr
                        key={fee.id}
                        className="group hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-7 w-7">
                              <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm"
                                style={{
                                  backgroundColor: "white",
                                  border: `1px solid ${colors.primary}10`,
                                }}
                              >
                                <DollarSign
                                  className="h-3.5 w-3.5"
                                  style={{ color: colors.primary }}
                                />
                              </div>
                            </div>
                            <div className="ml-2">
                              <div
                                className="text-xs font-semibold"
                                style={{ color: colors.primary }}
                              >
                                {fee.item}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-700">
                            {formatCurrency(fee.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                            style={{
                              backgroundColor: statusStyles.bg,
                              color: statusStyles.text,
                              borderColor: statusStyles.border,
                            }}
                          >
                            <span
                              className="w-1 h-1 rounded-full mr-1"
                              style={{ backgroundColor: statusStyles.text }}
                            />
                            {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(fee)}
                              className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                              style={{
                                backgroundColor: "#FED7AA",
                                color: "#C2410C",
                              }}
                              title="Edit Fee"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(fee)}
                              className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                              style={{
                                backgroundColor: "#FEE2E2",
                                color: "#991B1B",
                              }}
                              title="Delete Fee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredFees.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredFees.length}
                itemName="fees"
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl" style={{ border: `1px solid ${colors.accent}30` }}>
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: `${colors.accent}15` }}>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                {isAddModalOpen ? "Add Miscellaneous Fee" : "Edit Miscellaneous Fee"}
              </h2>
              <p className="text-sm mt-1" style={{ color: colors.neutral }}>
                {isAddModalOpen ? "Create a new fee item" : "Update fee details"}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.primary }}>
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                  placeholder="Enter item name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.primary }}>
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: `${colors.accent}15` }}>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.neutralBorder, color: colors.neutral }}
              >
                Cancel
              </button>
              <button
                onClick={isAddModalOpen ? handleSaveAdd : handleSaveEdit}
                disabled={!formData.item.trim() || formData.amount === ""}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = colors.primary; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = colors.secondary; }}
              >
                {isAddModalOpen ? "Add Fee" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isEditCategoryModalOpen && selectedCategoryForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl" style={{ border: `1px solid ${colors.accent}30` }}>
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: `${colors.accent}15` }}>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                Edit Category Status
              </h2>
              <p className="text-sm mt-1" style={{ color: colors.neutral }}>
                Change the status of this category
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: `${colors.primary}05`, border: `1px solid ${colors.primary}10` }}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: colors.neutral }}>
                      Category Title
                    </label>
                    <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                      {selectedCategoryForEdit.title}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: colors.neutral }}>
                      Academic Year
                    </label>
                    <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                      {selectedCategoryForEdit.academic_year}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: colors.neutral }}>
                  Current Status
                </label>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: getStatusColor(selectedCategoryForEdit.status).bg,
                      color: getStatusColor(selectedCategoryForEdit.status).text,
                      borderColor: getStatusColor(selectedCategoryForEdit.status).border,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mr-2"
                      style={{ backgroundColor: getStatusColor(selectedCategoryForEdit.status).text }}
                    />
                    {selectedCategoryForEdit.status.charAt(0).toUpperCase() + selectedCategoryForEdit.status.slice(1)}
                  </span>
                  <span style={{ color: colors.neutral }}>→</span>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: getStatusColor(selectedCategoryForEdit.status === "active" ? "inactive" : "active").bg,
                      color: getStatusColor(selectedCategoryForEdit.status === "active" ? "inactive" : "active").text,
                      borderColor: getStatusColor(selectedCategoryForEdit.status === "active" ? "inactive" : "active").border,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mr-2"
                      style={{ backgroundColor: getStatusColor(selectedCategoryForEdit.status === "active" ? "inactive" : "active").text }}
                    />
                    {selectedCategoryForEdit.status === "active" ? "Inactive" : "Active"}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 px-4 py-3 rounded-xl" style={{ backgroundColor: `${colors.warning}10`, border: `1px solid ${colors.warning}30` }}>
                <p className="text-xs" style={{ color: colors.primary }}>
                  <span className="font-semibold">Note:</span> Changing the status will affect how this category appears in the system.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: `${colors.accent}15` }}>
              <button
                onClick={() => setIsEditCategoryModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.neutralBorder, color: colors.neutral }}
              >
                Cancel
              </button>
              <button
                onClick={handleToggleCategoryStatus}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors hover:shadow-md"
                style={{ 
                  backgroundColor: selectedCategoryForEdit.status === "active" ? colors.danger : colors.success 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {selectedCategoryForEdit.status === "active" ? "Set Inactive" : "Set Active"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${colors.accent}30` }}>
            <div className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white" style={{ borderColor: `${colors.accent}15` }}>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                Add Fee Category
              </h2>
              <p className="text-sm mt-1" style={{ color: colors.neutral }}>
                Create a new category with multiple fee items
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Category Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: colors.primary }}>
                  Category Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.primary }}>
                    Category Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.title}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, title: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                    placeholder="e.g., Miscellaneous 2026"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.primary }}>
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryFormData.academic_year}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, academic_year: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                    required
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <option key={year} value={year.toString()}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: colors.primary }}>
                    Description
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
                    style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
              </div>
              
              {/* Fee Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: colors.primary }}>
                    Fee Items
                  </h3>
                  <button
                    onClick={handleAddFeeRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{ backgroundColor: `${colors.secondary}15`, color: colors.secondary }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Fee
                  </button>
                </div>
                
                <div className="space-y-3">
                  {categoryFees.map((fee, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={fee.item}
                          onChange={(e) => handleFeeRowChange(index, 'item', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                          style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                          placeholder="Fee item name"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          value={fee.amount}
                          onChange={(e) => handleFeeRowChange(index, 'amount', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all"
                          style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      {categoryFees.length > 1 && (
                        <button
                          onClick={() => handleRemoveFeeRow(index)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white" style={{ borderColor: `${colors.accent}15` }}>
              <button
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border hover:bg-gray-50 transition-colors"
                style={{ borderColor: colors.neutralBorder, color: colors.neutral }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryFormData.title.trim() || !categoryFormData.academic_year.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = colors.primary; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = colors.secondary; }}
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiscellaneousFees;
