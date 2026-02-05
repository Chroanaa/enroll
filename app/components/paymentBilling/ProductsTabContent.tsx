import React from "react";
import {
  Search,
  Package,
  User,
  X,
  Loader2,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Receipt,
} from "lucide-react";
import { colors } from "../../colors";
import {
  Category,
  Product,
  CartItem,
  EnrolledStudent,
} from "../../utils/billingUtils";

export interface ProductsTabContentProps {
  categories: Category[];
  filteredProducts: Product[];
  isLoading: boolean;
  productSearchTerm: string;
  setProductSearchTerm: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  addToCart: (product: Product) => void;
  // Student selection
  studentSearchRef: React.RefObject<HTMLDivElement>;
  selectedStudent: EnrolledStudent | null;
  clearSelectedStudent: () => void;
  studentNumberInput: string;
  handleStudentInputChange: (value: string) => void;
  handleStudentSearch: () => void;
  studentSearchResults: EnrolledStudent[];
  showStudentDropdown: boolean;
  setShowStudentDropdown: (value: boolean) => void;
  studentSearchLoading: boolean;
  studentSearchError: string;
  handleStudentSelect: (student: EnrolledStudent) => void;
  // Cart
  cart: CartItem[];
  clearCart: () => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  cartTotal: number;
  setIsCheckoutModalOpen: (open: boolean) => void;
  formatAmount: (amount: number | null | undefined) => string;
}

export const ProductsTabContent: React.FC<ProductsTabContentProps> = ({
  categories,
  filteredProducts,
  isLoading,
  productSearchTerm,
  setProductSearchTerm,
  selectedCategory,
  setSelectedCategory,
  addToCart,
  studentSearchRef,
  selectedStudent,
  clearSelectedStudent,
  studentNumberInput,
  handleStudentInputChange,
  handleStudentSearch,
  studentSearchResults,
  showStudentDropdown,
  setShowStudentDropdown,
  studentSearchLoading,
  studentSearchError,
  handleStudentSelect,
  cart,
  clearCart,
  updateCartQuantity,
  removeFromCart,
  cartTotal,
  setIsCheckoutModalOpen,
  formatAmount,
}) => {
  return (
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
                    className={`text-sm mt-1 ${
                      product.quantity && product.quantity > 0
                        ? "text-gray-500"
                        : "text-red-500"
                    }`}
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
                  {showStudentDropdown && studentSearchResults.length > 0 && (
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
                              {(student.first_name?.[0] || "").toUpperCase()}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <p className='font-medium text-gray-900 truncate'>
                                {student.family_name}, {student.first_name}{" "}
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
                  <p className='text-sm text-red-600'>{studentSearchError}</p>
                )}
                <p className='text-xs text-gray-500'>
                  Search by student number or name. Only enrolled students can
                  be selected.
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
                <h2 className='font-bold' style={{ color: colors.primary }}>
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
  );
};



