import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type CommerceProduct = { id: string; name: string; description: string; price: number; imageEmoji: string };
export type CartItem = CommerceProduct & { quantity: number };
export type Order = { id: string; items: CartItem[]; total: number; status: "Placed" | "Processing" | "Delivered"; createdAt: string };

type CommerceContextValue = {
  products: CommerceProduct[];
  cart: CartItem[];
  wishlist: CommerceProduct[];
  orders: Order[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: CommerceProduct) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  toggleWishlist: (product: CommerceProduct) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  placeOrder: () => Promise<Order | null>;
};

const PRODUCTS: CommerceProduct[] = [
  { id: "uconnect-hoodie", name: "UConnect Campus Hoodie", description: "Premium cotton fleece with embroidered campus badge.", price: 1299, imageEmoji: "🧥" },
  { id: "study-kit", name: "Smart Study Kit", description: "Planner, sticky notes, flash cards, and exam checklist.", price: 499, imageEmoji: "📚" },
  { id: "event-pass", name: "Creator Event Pass", description: "Priority access to featured college events and meetups.", price: 799, imageEmoji: "🎟️" },
  { id: "creator-pack", name: "Creator Starter Pack", description: "Tripod, mic pouch, stickers, and content prompt cards.", price: 1599, imageEmoji: "🎬" },
];

const CommerceContext = createContext<CommerceContextValue | undefined>(undefined);
const money = (value: number) => Math.round(value * 100) / 100;

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = `@uconnect_commerce_${user?.id ?? "guest"}`;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<CommerceProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!alive) return;
      if (!raw) { setCart([]); setWishlist([]); setOrders([]); return; }
      const parsed = JSON.parse(raw);
      setCart(Array.isArray(parsed.cart) ? parsed.cart : []);
      setWishlist(Array.isArray(parsed.wishlist) ? parsed.wishlist : []);
      setOrders(Array.isArray(parsed.orders) ? parsed.orders : []);
    }).catch(() => { setCart([]); setWishlist([]); setOrders([]); });
    return () => { alive = false; };
  }, [storageKey]);

  const persist = async (next: { cart?: CartItem[]; wishlist?: CommerceProduct[]; orders?: Order[] }) => {
    const payload = { cart, wishlist, orders, ...next };
    await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
  };

  const addToCart = async (product: CommerceProduct) => {
    const next = cart.some((item) => item.id === product.id) ? cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...cart, { ...product, quantity: 1 }];
    setCart(next); await persist({ cart: next });
  };
  const removeFromCart = async (productId: string) => { const next = cart.filter((item) => item.id !== productId); setCart(next); await persist({ cart: next }); };
  const updateQuantity = async (productId: string, quantity: number) => { const next = quantity <= 0 ? cart.filter((item) => item.id !== productId) : cart.map((item) => item.id === productId ? { ...item, quantity } : item); setCart(next); await persist({ cart: next }); };
  const toggleWishlist = async (product: CommerceProduct) => { const next = wishlist.some((item) => item.id === product.id) ? wishlist.filter((item) => item.id !== product.id) : [...wishlist, product]; setWishlist(next); await persist({ wishlist: next }); };
  const isWishlisted = (productId: string) => wishlist.some((item) => item.id === productId);
  const cartTotal = useMemo(() => money(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const placeOrder = async () => { if (!cart.length) return null; const order: Order = { id: `ORD-${Date.now()}`, items: cart, total: cartTotal, status: "Placed", createdAt: new Date().toISOString() }; const nextOrders = [order, ...orders]; setOrders(nextOrders); setCart([]); await persist({ cart: [], orders: nextOrders }); return order; };

  return <CommerceContext.Provider value={{ products: PRODUCTS, cart, wishlist, orders, cartCount, cartTotal, addToCart, removeFromCart, updateQuantity, toggleWishlist, isWishlisted, placeOrder }}>{children}</CommerceContext.Provider>;
}

export function useCommerce() {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used within CommerceProvider");
  return ctx;
}
