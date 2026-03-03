"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus, Package, Tag, Edit, Trash2, X } from "lucide-react";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import TableSkeleton from "../../common/TableSkeleton";
import {
  Product,
  Category,
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/utils/billingUtils";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";

const ProductsManagement: React.FC = () => {
  const { data: session } = useSession();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab state (products or categories)
  const [activeTab, setActiveTab] = useState<"products" | "categories">(
    "products",
  );

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Product form states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: "",
    category_id: "",
    quantity: "",
    price: "",
  });

  // Category form states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: "" });

  // Delete confirmation states
  const [deleteProductConfirmation, setDeleteProductConfirmation] = useState<{
    isOpen: boolean;
    productId: number | null;
    productName: string;
  }>({
    isOpen: false,
    productId: null,
    productName: "",
  });

  const [deleteCategoryConfirmation, setDeleteCategoryConfirmation] = useState<{
    isOpen: boolean;
    categoryId: number | null;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });

  // Modal states
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

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
    if (!searchTerm) return products;
    const searchLower = searchTerm.toLowerCase();
    return products.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.category?.name?.toLowerCase().includes(searchLower),
    );
  }, [products, searchTerm]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const searchLower = searchTerm.toLowerCase();
    return categories.filter((category) =>
      category.name?.toLowerCase().includes(searchLower),
    );
  }, [categories, searchTerm]);

  // Pagination calculations
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const totalPages =
    activeTab === "products"
      ? Math.ceil(filteredProducts.length / itemsPerPage)
      : Math.ceil(filteredCategories.length / itemsPerPage);

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Format amount helper
  const formatAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "₱0.00";
    return `₱${Number(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Product CRUD handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        name: product.name || "",
        category_id: product.category_id?.toString() || "",
        quantity: product.quantity?.toString() || "",
        price: product.price?.toString() || "",
      });
    } else {
      setEditingProduct(null);
      setProductFormData({
        name: "",
        category_id: "",
        quantity: "",
        price: "",
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productFormData.name.trim()) {
      setErrorModal({
        isOpen: true,
        message: "Product name is required",
        details: "Please enter a product name.",
      });
      return;
    }

    try {
      const data = {
        name: productFormData.name.trim(),
        category_id: productFormData.category_id
          ? Number(productFormData.category_id)
          : undefined,
        quantity: productFormData.quantity
          ? Number(productFormData.quantity)
          : 0,
        price: productFormData.price ? Number(productFormData.price) : 0,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        setSuccessModal({
          isOpen: true,
          message: `Product "${productFormData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user?.name} updated product: ${productFormData.name}`,
          user_id: Number(session?.user?.id),
          created_at: new Date(),
        });
      } else {
        await createProduct(data);
        setSuccessModal({
          isOpen: true,
          message: `Product "${productFormData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user?.name} created product: ${productFormData.name}`,
          user_id: Number(session?.user?.id),
          created_at: new Date(),
        });
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductFormData({
        name: "",
        category_id: "",
        quantity: "",
        price: "",
      });
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: editingProduct
          ? "Failed to update product"
          : "Failed to create product",
        details: error.response?.data?.error || "Please try again.",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductConfirmation.productId) return;

    try {
      await deleteProduct(deleteProductConfirmation.productId);
      setSuccessModal({
        isOpen: true,
        message: `Product "${deleteProductConfirmation.productName}" has been deleted.`,
      });
      insertIntoReports({
        action: `User ${session?.user?.name} deleted product: ${deleteProductConfirmation.productName}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });
      setDeleteProductConfirmation({
        isOpen: false,
        productId: null,
        productName: "",
      });
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Failed to delete product",
        details: error.response?.data?.error || "Please try again.",
      });
    }
  };

  // Category CRUD handlers
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({ name: category.name || "" });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: "" });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setErrorModal({
        isOpen: true,
        message: "Category name is required",
        details: "Please enter a category name.",
      });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryFormData.name.trim(),
        });
        setSuccessModal({
          isOpen: true,
          message: `Category "${categoryFormData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user?.name} updated category: ${categoryFormData.name}`,
          user_id: Number(session?.user?.id),
          created_at: new Date(),
        });
      } else {
        await createCategory({ name: categoryFormData.name.trim() });
        setSuccessModal({
          isOpen: true,
          message: `Category "${categoryFormData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user?.name} created category: ${categoryFormData.name}`,
          user_id: Number(session?.user?.id),
          created_at: new Date(),
        });
      }

      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: "" });
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: editingCategory
          ? "Failed to update category"
          : "Failed to create category",
        details: error.response?.data?.error || "Please try again.",
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryConfirmation.categoryId) return;

    try {
      await deleteCategory(deleteCategoryConfirmation.categoryId);
      setSuccessModal({
        isOpen: true,
        message: `Category "${deleteCategoryConfirmation.categoryName}" has been deleted.`,
      });
      insertIntoReports({
        action: `User ${session?.user?.name} deleted category: ${deleteCategoryConfirmation.categoryName}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });
      setDeleteCategoryConfirmation({
        isOpen: false,
        categoryId: null,
        categoryName: "",
      });
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Failed to delete category",
        details:
          error.response?.data?.error ||
          "This category may have products assigned to it.",
      });
    }
  };

  return (
    <div
      className='min-h-screen p-6 font-sans'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto w-full space-y-6'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1
              className='text-3xl font-bold tracking-tight'
              style={{ color: colors.primary }}
            >
              Products & Categories
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage products and categories for the Point of Sale system.
            </p>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === "products"
                  ? "text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                activeTab === "products"
                  ? { backgroundColor: colors.secondary }
                  : {}
              }
            >
              <Package className='w-4 h-4' />
              Products
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === "categories"
                  ? "text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                activeTab === "categories"
                  ? { backgroundColor: colors.secondary }
                  : {}
              }
            >
              <Tag className='w-4 h-4' />
              Categories
            </button>
            <button
              onClick={() =>
                activeTab === "products"
                  ? openProductModal()
                  : openCategoryModal()
              }
              disabled={isLoading}
              className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
              style={{ backgroundColor: colors.secondary }}
            >
              <Plus className='w-5 h-5' />
              <span className='font-medium'>
                Add {activeTab === "products" ? "Product" : "Category"}
              </span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={`Search ${activeTab}...`}
          filters={[]}
        />

        {/* Products Table */}
        {activeTab === "products" && (
          <div>
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[800px]'>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: `${colors.primary}05`,
                        borderBottom: `1px solid ${colors.primary}10`,
                      }}
                    >
                      <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Product Name
                      </th>
                      <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Category
                      </th>
                      <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Price
                      </th>
                      <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Stock
                      </th>
                      <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {isLoading ? (
                      <TableSkeleton
                        rows={5}
                        columns={5}
                        columnConfigs={[
                          { type: "avatar-text" }, // Product Name
                          { type: "badge" }, // Category
                          { type: "text" }, // Price
                          { type: "text" }, // Stock
                          { type: "actions" }, // Actions
                        ]}
                      />
                    ) : paginatedProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className='px-6 py-12 text-center text-gray-500'
                        >
                          <div className='flex flex-col items-center justify-center gap-3'>
                            <div
                              className='p-3 rounded-full'
                              style={{ backgroundColor: `${colors.primary}05` }}
                            >
                              <Package
                                className='w-6 h-6'
                                style={{ color: colors.primary }}
                              />
                            </div>
                            <p className='font-medium'>No products found</p>
                            <p className='text-sm text-gray-400'>
                              Try adjusting your search or filters
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((product) => (
                        <tr
                          key={product.id}
                          className='group hover:bg-gray-50/50 transition-colors'
                        >
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              <div className='flex-shrink-0 h-10 w-10'>
                                <div
                                  className='h-10 w-10 rounded-xl flex items-center justify-center shadow-sm'
                                  style={{
                                    backgroundColor: "white",
                                    border: `1px solid ${colors.primary}10`,
                                  }}
                                >
                                  <Package
                                    className='h-5 w-5'
                                    style={{ color: colors.primary }}
                                  />
                                </div>
                              </div>
                              <div className='ml-4'>
                                <div
                                  className='text-sm font-semibold'
                                  style={{ color: colors.primary }}
                                >
                                  {product.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            {product.category?.name ? (
                              <span
                                className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                                style={{
                                  backgroundColor: `${colors.primary}10`,
                                  color: colors.primary,
                                  borderColor: `${colors.primary}20`,
                                }}
                              >
                                {product.category.name}
                              </span>
                            ) : (
                              <span className='text-sm text-gray-400'>-</span>
                            )}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right'>
                            <span className='text-sm font-medium text-gray-700'>
                              {formatAmount(Number(product.price))}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right'>
                            <span
                              className={`text-sm font-medium ${
                                (product.quantity || 0) > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {product.quantity || 0}
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                            <div className='flex justify-end gap-2'>
                              <button
                                onClick={() => openProductModal(product)}
                                className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                                title='Edit'
                              >
                                <Edit className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteProductConfirmation({
                                    isOpen: true,
                                    productId: product.id,
                                    productName: product.name || "",
                                  })
                                }
                                className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                                title='Delete'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProducts.length}
              itemName='products'
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}

        {/* Categories Table */}
        {activeTab === "categories" && (
          <div>
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[800px]'>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: `${colors.primary}05`,
                        borderBottom: `1px solid ${colors.primary}10`,
                      }}
                    >
                      <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Category Name
                      </th>
                      <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Products Count
                      </th>
                      <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {isLoading ? (
                      <TableSkeleton
                        rows={5}
                        columns={3}
                        columnConfigs={[
                          { type: "avatar-text" }, // Category Name
                          { type: "badge" }, // Products Count
                          { type: "actions" }, // Actions
                        ]}
                      />
                    ) : paginatedCategories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className='px-6 py-12 text-center text-gray-500'
                        >
                          <div className='flex flex-col items-center justify-center gap-3'>
                            <div
                              className='p-3 rounded-full'
                              style={{ backgroundColor: `${colors.primary}05` }}
                            >
                              <Tag
                                className='w-6 h-6'
                                style={{ color: colors.primary }}
                              />
                            </div>
                            <p className='font-medium'>No categories found</p>
                            <p className='text-sm text-gray-400'>
                              Try adjusting your search or filters
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedCategories.map((category) => (
                        <tr
                          key={category.id}
                          className='group hover:bg-gray-50/50 transition-colors'
                        >
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              <div className='flex-shrink-0 h-10 w-10'>
                                <div
                                  className='h-10 w-10 rounded-xl flex items-center justify-center shadow-sm'
                                  style={{
                                    backgroundColor: "white",
                                    border: `1px solid ${colors.primary}10`,
                                  }}
                                >
                                  <Tag
                                    className='h-5 w-5'
                                    style={{ color: colors.primary }}
                                  />
                                </div>
                              </div>
                              <div className='ml-4'>
                                <div
                                  className='text-sm font-semibold'
                                  style={{ color: colors.primary }}
                                >
                                  {category.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right'>
                            <span
                              className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                              style={{
                                backgroundColor: `${colors.primary}10`,
                                color: colors.primary,
                                borderColor: `${colors.primary}20`,
                              }}
                            >
                              {
                                products.filter(
                                  (p) => p.category_id === category.id,
                                ).length
                              }{" "}
                              products
                            </span>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                            <div className='flex justify-end gap-2'>
                              <button
                                onClick={() => openCategoryModal(category)}
                                className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                                title='Edit'
                              >
                                <Edit className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteCategoryConfirmation({
                                    isOpen: true,
                                    categoryId: category.id,
                                    categoryName: category.name || "",
                                  })
                                }
                                className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                                title='Delete'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCategories.length}
              itemName='categories'
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setIsProductModalOpen(false)}
        >
          <div
            className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
            style={{ backgroundColor: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
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
                  <Package
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                </div>
                <h2
                  className='text-xl font-bold'
                  style={{ color: colors.primary }}
                >
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Product Name *
                </label>
                <input
                  type='text'
                  value={productFormData.name}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder='Enter product name'
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Category
                </label>
                <select
                  value={productFormData.category_id}
                  onChange={(e) =>
                    setProductFormData({
                      ...productFormData,
                      category_id: e.target.value,
                    })
                  }
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value=''>Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Price
                  </label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
                      ₱
                    </span>
                    <input
                      type='number'
                      step='0.01'
                      min='0'
                      value={productFormData.price}
                      onChange={(e) =>
                        setProductFormData({
                          ...productFormData,
                          price: e.target.value,
                        })
                      }
                      placeholder='0.00'
                      className='w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Stock Quantity
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={productFormData.quantity}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        quantity: e.target.value,
                      })
                    }
                    placeholder='0'
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  />
                </div>
              </div>
              <div className='flex gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setIsProductModalOpen(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleSaveProduct}
                  className='flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors'
                  style={{ backgroundColor: colors.secondary }}
                >
                  {editingProduct ? "Update" : "Create"} Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
            style={{ backgroundColor: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
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
                  <Tag
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                </div>
                <h2
                  className='text-xl font-bold'
                  style={{ color: colors.primary }}
                >
                  {editingCategory ? "Edit Category" : "Add Category"}
                </h2>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Category Name *
                </label>
                <input
                  type='text'
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder='Enter category name'
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <div className='flex gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setIsCategoryModalOpen(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleSaveCategory}
                  className='flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors'
                  style={{ backgroundColor: colors.secondary }}
                >
                  {editingCategory ? "Update" : "Create"} Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteProductConfirmation.isOpen}
        title='Delete Product'
        message={`Are you sure you want to delete "${deleteProductConfirmation.productName}"? This action cannot be undone.`}
        confirmText='Delete'
        onConfirm={handleDeleteProduct}
        onClose={() =>
          setDeleteProductConfirmation({
            isOpen: false,
            productId: null,
            productName: "",
          })
        }
      />

      {/* Delete Category Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteCategoryConfirmation.isOpen}
        title='Delete Category'
        message={`Are you sure you want to delete "${deleteCategoryConfirmation.categoryName}"? Products in this category will no longer have a category assigned.`}
        confirmText='Delete'
        onConfirm={handleDeleteCategory}
        onClose={() =>
          setDeleteCategoryConfirmation({
            isOpen: false,
            categoryId: null,
            categoryName: "",
          })
        }
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        message={successModal.message}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        details={errorModal.details}
        onClose={() =>
          setErrorModal({ isOpen: false, message: "", details: "" })
        }
      />
    </div>
  );
};

export default ProductsManagement;
