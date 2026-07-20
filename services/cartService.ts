/**
 * services/cartService.ts
 * Shopping cart - localStorage based
 * Imports from: types/schema.ts
 */

import type { CartItem } from '@/types/schema';

const CART_STORAGE_KEY = 'resora-cart';

export interface Cart {
  items: CartItem[];
}

function getCart(): Cart {
  if (typeof window === 'undefined') return { items: [] };
  
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { items: [] };
  } catch (error) {
    console.error('Error reading cart:', error);
    return { items: [] };
  }
}

function saveCart(cart: Cart) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

export function getCartItems(): CartItem[] {
  return getCart().items;
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.items.find((i) => i.productId === item.productId);
  
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.items.push(item);
  }
  
  saveCart(cart);
}

export function removeFromCart(productId: string) {
  const cart = getCart();
  cart.items = cart.items.filter((i) => i.productId !== productId);
  saveCart(cart);
}

export function clearCart() {
  saveCart({ items: [] });
}

export function getCartTotal(): number {
  const items = getCartItems();
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function getCartItemCount(): number {
  return getCartItems().reduce((sum, item) => sum + item.quantity, 0);
}
