export type Role = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL';

export interface ProductMedia {
  id: string;
  productId: string;
  imageUrl: string;
  instagramMediaId?: string | null;
  type: MediaType;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  priceOverride?: number | null;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  allowCod?: boolean;
  allowPrepayment?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
  media?: ProductMedia[];
  totalStock?: number;
}

export type InstagramAccountStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED';

export interface InstagramAccount {
  id: string;
  businessId: string;
  instagramUserId: string;
  username: string;
  status: InstagramAccountStatus;
  tokenExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConversationStatus = 'AI_ACTIVE' | 'HUMAN_ACTIVE' | 'CLOSED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type SenderType = 'CUSTOMER' | 'AI' | 'HUMAN' | 'SYSTEM';

export interface Message {
  id: string;
  conversationId: string;
  instagramMessageId?: string | null;
  direction: MessageDirection;
  senderType: SenderType;
  content: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  instagramAccountId: string;
  instagramAccount?: {
    username?: string;
    instagramUserId?: string;
  } | null;
  instagramUserId: string;
  username?: string | null;
  name?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customer: Customer;
  selectedProductId?: string | null;
  selectedProduct?: Product | null;
  selectedVariantId?: string | null;
  selectedVariant?: ProductVariant | null;
  status: ConversationStatus;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export type OrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type PaymentMethod = 'COD' | 'PREPAYMENT';

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  product?: Product | null;
  variantId?: string | null;
  variant?: ProductVariant | null;
  name: string;
  quantity: number;
  price: number;
  createdAt: string;
}

export interface Order {
  id: string;
  conversationId?: string | null;
  conversation?: Conversation | null;
  customerId: string;
  customer?: Customer;
  customerName: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  statusCode?: number;
  message?: string;
  error?: string;
}

export interface DashboardMetrics {
  instagramConnected: boolean;
  instagramAccount?: InstagramAccount | null;
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  activeConversations: number;
  totalConversations: number;
  aiRepliesToday: number;
}
