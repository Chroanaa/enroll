import { useState, useMemo } from "react";
import { Product, CartItem } from "../../../utils/billingUtils";

export const useCart = (products: Product[]) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<"cash" | "gcash" | "bank_transfer">("cash");
  const [tenderedAmount, setTenderedAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + (Number(item.product.price) || 0) * item.quantity;
    }, 0);
  }, [cart]);

  const changeAmount = useMemo(() => {
    const tendered = parseFloat(tenderedAmount) || 0;
    return tendered - cartTotal;
  }, [tenderedAmount, cartTotal]);

  const addToCart = (product: Product, onError: (message: string, details: string) => void) => {
    if (!product.quantity || product.quantity <= 0) {
      onError("Out of Stock", `${product.name} is currently out of stock.`);
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id,
      );
      if (existingItem) {
        if (existingItem.quantity >= (product.quantity || 0)) {
          onError("Insufficient Stock", `Only ${product.quantity} units available for ${product.name}.`);
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

  const updateCartQuantity = (productId: number, newQuantity: number, onError: (message: string, details: string) => void) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQuantity > (product.quantity || 0)) {
      onError("Insufficient Stock", `Only ${product.quantity} units available for ${product.name}.`);
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

  return {
    cart,
    paymentType,
    setPaymentType,
    tenderedAmount,
    setTenderedAmount,
    referenceNo,
    setReferenceNo,
    cartTotal,
    changeAmount,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  };
};

