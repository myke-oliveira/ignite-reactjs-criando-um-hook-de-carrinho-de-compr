import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem("@RocketShoes:cart");

    return storageCart ? JSON.parse(storageCart) : [];
  });

  const cartUseRef = useRef<Product[]>();

  useEffect(() => {
    cartUseRef.current = cart;
  });

  const previousCart = cartUseRef.current ?? cart;

  useEffect(() => {
    if (previousCart !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, previousCart]);

  const addProduct = async (productId: number) => {
    try {
      let product = cart.find(product => product.id === productId);
      const amountNeeded = (product?.amount || 0) + 1;

      let response = await api.get(`stock/${productId}`);
      const stock = response.data as Stock;

      if (stock.amount < amountNeeded) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if(product) {
        product.amount = amountNeeded;
        setCart([...cart]);
        return;
      }

      response = await api.get(`products/${productId}`);
      product = response.data as Product;

      if (!product) {
        throw new Error("Product not found");
      }

      product.amount = amountNeeded;
      setCart([...cart, product]);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if (!product) {
        throw new Error("Product not found in the cart");
      }
      setCart(cart.filter(product => product.id !== productId));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error("Amount less than one")
      }
      const product = cart.find(product => product.id === productId);
      if (!product) {
        throw new Error("Product not found in the cart");
      }

      const response = await api.get(`stock/${productId}`);
      const stock = response.data as Stock;

      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      product.amount = amount;
      setCart([...cart]);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
