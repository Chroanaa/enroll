"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, Package, Edit, Trash2, Tag, X } from "lucide-react";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import Pagination from "../../common/Pagination";
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
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        {/* Header */}
        <div className='mb-6'>
          <h1
            className='text-2xl font-bold mb-2'
            style={{ color: colors.primary }}
          >
            Products & Categories
          </h1>
          <p style={{ color: colors.primary }}>
            Manage products and categories for the Point of Sale system.
          </p>
        </div>

        {/* Tabs and Actions */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4'>
          <div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
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
            </div>
            <div className='flex gap-3 w-full md:w-auto'>
              <div className='flex-1 md:flex-none relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <button
                onClick={() =>
                  activeTab === "products"
                    ? openProductModal()
                    : openCategoryModal()
                }
                className='px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity'
                style={{ backgroundColor: colors.secondary }}
              >
                <Plus className='w-4 h-4' />
                Add {activeTab === "products" ? "Product" : "Category"}
              </button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        {activeTab === "products" && (
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr
                    className='text-white'
                    style={{ backgroundColor: colors.primary }}
                  >
                    <th className='px-4 py-3 text-left text-sm font-medium'>
                      Product Name
                    </th>
                    <th className='px-4 py-3 text-left text-sm font-medium'>
                      Category
                    </th>
                    <th className='px-4 py-3 text-right text-sm font-medium'>
                      Price
                    </th>
                    <th className='px-4 py-3 text-right text-sm font-medium'>
                      Stock
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-medium'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className='px-4 py-8 text-center'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
                        <p className='mt-2 text-gray-600'>
                          Loading products...
                        </p>
                      </td>
                    </tr>
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className='px-4 py-8 text-center text-gray-500'
                      >
                        <Package className='w-12 h-12 mx-auto text-gray-400 mb-2' />
                        <p className='text-lg font-medium'>No products found</p>
                        <p className='text-sm'>
                          Click "Add Product" to create a new product.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => (
                      <tr key={product.id} className='hover:bg-gray-50'>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-3'>
                            <Package className='w-5 h-5 text-gray-400' />
                            <span className='font-medium text-gray-900'>
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          {product.category?.name ? (
                            <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                              {product.category.name}
                            </span>
                          ) : (
                            <span className='text-gray-400'>-</span>
                          )}
                        </td>
                        <td className='px-4 py-3 text-right font-medium'>
                          {formatAmount(Number(product.price))}
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <span
                            className={`font-medium ${
                              (product.quantity || 0) > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {product.quantity || 0}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center gap-2'>
                            <button
                              onClick={() => openProductModal(product)}
                              className='p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors'
                              title='Edit Product'
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
                              className='p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors'
                              title='Delete Product'
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
            {filteredProducts.length > itemsPerPage && (
              <div className='px-4 py-3 border-t border-gray-200'>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  totalItems={filteredProducts.length}
                />
              </div>
            )}
          </div>
        )}

        {/* Categories Table */}
        {activeTab === "categories" && (
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr
                    className='text-white'
                    style={{ backgroundColor: colors.primary }}
                  >
                    <th className='px-4 py-3 text-left text-sm font-medium'>
                      Category Name
                    </th>
                    <th className='px-4 py-3 text-right text-sm font-medium'>
                      Products Count
                    </th>
                    <th className='px-4 py-3 text-center text-sm font-medium'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className='px-4 py-8 text-center'>
                        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
                        <p className='mt-2 text-gray-600'>
                          Loading categories...
                        </p>
                      </td>
                    </tr>
                  ) : paginatedCategories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className='px-4 py-8 text-center text-gray-500'
                      >
                        <Tag className='w-12 h-12 mx-auto text-gray-400 mb-2' />
                        <p className='text-lg font-medium'>
                          No categories found
                        </p>
                        <p className='text-sm'>
                          Click "Add Category" to create a new category.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCategories.map((category) => (
                      <tr key={category.id} className='hover:bg-gray-50'>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-3'>
                            <Tag className='w-5 h-5 text-gray-400' />
                            <span className='font-medium text-gray-900'>
                              {category.name}
                            </span>
                          </div>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                            {
                              products.filter(
                                (p) => p.category_id === category.id,
                              ).length
                            }{" "}
                            products
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center gap-2'>
                            <button
                              onClick={() => openCategoryModal(category)}
                              className='p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors'
                              title='Edit Category'
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
                              className='p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors'
                              title='Delete Category'
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
            {filteredCategories.length > itemsPerPage && (
              <div className='px-4 py-3 border-t border-gray-200'>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  totalItems={filteredCategories.length}
                />
              </div>
            )}
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
