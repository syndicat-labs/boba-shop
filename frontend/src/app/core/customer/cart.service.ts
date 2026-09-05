import { Injectable, computed, signal } from '@angular/core';
import { CustomerProduct } from './customer.service';

export interface CartLine {
  product: CustomerProduct;
  qty: number;
}

/** Parity with core/orders/service.create_from_cart constants. */
export const MIN_ORDER_GHS = 8;
export const MAX_ITEM_QTY = 99;

const FAVORITES_KEY = 'boba:favorites';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private cart = signal<Record<string, CartLine>>({});
  private favorites = signal<Set<string>>(loadFavorites());

  lines = computed(() => Object.values(this.cart()));
  count = computed(() => this.lines().reduce((n, l) => n + l.qty, 0));
  total = computed(() => this.lines().reduce((s, l) => s + parseFloat(l.product.price) * l.qty, 0));
  empty = computed(() => this.count() === 0);
  belowMinimum = computed(() => !this.empty() && this.total() < MIN_ORDER_GHS);
  favSkus = computed(() => this.favorites());

  qty(sku: string): number {
    return this.cart()[sku]?.qty ?? 0;
  }

  add(product: CustomerProduct, delta = 1): void {
    this.cart.update(c => {
      const cur = c[product.sku]?.qty ?? 0;
      const qty = Math.min(cur + delta, MAX_ITEM_QTY);
      const next = { ...c };
      if (qty <= 0) {
        delete next[product.sku];
      } else {
        next[product.sku] = { product, qty };
      }
      return next;
    });
  }

  dec(product: CustomerProduct): void {
    this.add(product, -1);
  }

  clear(): void {
    this.cart.set({});
  }

  toggleFavorite(sku: string): void {
    this.favorites.update(f => {
      const next = new Set(f);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  isFavorite(sku: string): boolean {
    return this.favorites().has(sku);
  }
}