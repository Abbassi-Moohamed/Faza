export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}
export interface ApiErrorEnvelope {
  success: false;
  message: string;
  details?: unknown;
}
export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
export type AdminRole = "APP_ADMIN" | "COFFEE_ADMIN";
export interface AdminAuthDto {
  token: string;
  role: AdminRole;
  coffeeId?: string;
  expiresIn: string;
}
export interface CategoryDto {
  id: string;
  name: string;
  image: string | null;
  itemCount: number;
}
export interface CoffeeDto {
  id: string;
  name: string;
  logo: string;
  cover: string | null;
  slug: string;
  categories: CategoryDto[];
}
export interface ItemDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotion: number | null;
  isAvailable: boolean;
  image: string | null;
}
export interface AdminCoffeeDto {
  id: string;
  name: string;
  logo: string;
  cover: string | null;
  slug: string;
  categoryCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface AdminCategoryDto {
  id: string;
  name: string;
  image: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface AdminItemDto extends ItemDto {
  itemCategoryId: string;
  createdAt: string;
  updatedAt: string;
}
export interface AdminImageDto {
  imageId: string;
  url: string;
}
export interface CreateCoffeeBody {
  name: string;
  logo: string;
  cover?: string;
  slug?: string;
}
export interface UpdateCoffeeBody {
  name?: string;
  logo?: string;
  cover?: string;
  slug?: string;
}
export interface CreateItemBody {
  name: string;
  description?: string;
  price: number;
  promotion?: number | null;
  isAvailable?: boolean;
  image?: string;
}
export type UpdateItemBody = Partial<CreateItemBody>;
export interface CategoryBody {
  name: string;
  image?: string;
}
export type OrderStatus = "PENDING" | "CONFIRMED" | "REJECTED";
export type PaymentStatus = "UNPAID" | "PAID";
export interface OrderLineDto {
  itemId: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
export interface OrderDto {
  id: string;
  coffeeId: string;
  tableNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  paidBy: string | null;
  items: OrderLineDto[];
  total: number;
  tableSessionId: string | null;
  serviceShiftId: string | null;
  sessionToken?: string;
  createdAt: string;
  updatedAt: string;
}
export interface CreateOrderBody {
  coffeeSlug: string;
  tableNumber: number;
  items: Array<{ itemId: string; quantity: number }>;
  sessionToken?: string;
}
/** Summary of the table session a visitor belongs to. */
export interface SessionSummaryDto {
  tableNumber: number;
  status: "ACTIVE" | "CLOSED";
  orderCount: number;
  openedAt: string;
  closedAt: string | null;
}
/** Every order of one table session, newest first. */
export interface SessionOrdersDto {
  orders: OrderDto[];
  total: number;
  session: SessionSummaryDto;
}
export interface PaginatedOrdersDto {
  orders: OrderDto[];
  total: number;
  page: number;
  limit: number;
}
export type ServiceShiftStatus = "OPEN" | "CLOSED";
export type ServiceShiftType = "MORNING" | "AFTERNOON" | "CUSTOM";
export interface ServiceShiftSummary {
  totalOrders: number;
  paidOrders: number;
  paidRevenue: number;
  itemsSold: number;
  tablesServed: number;
}
export interface ServiceShiftDto {
  id: string;
  coffeeId: string;
  status: ServiceShiftStatus;
  name: string | null;
  type: ServiceShiftType;
  label: string | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  summary?: ServiceShiftSummary;
}
export interface TableSessionDto {
  id: string;
  coffeeId: string;
  tableNumber: number;
  serviceShiftId: string | null;
  status: "ACTIVE" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  lastOrderAt: string;
  orderCount: number;
  summary?: TableSessionSummary;
}
export interface TableSessionSummary {
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  pendingRevenue: number;
  confirmedRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
  itemsSold: number;
  orders: TablePaymentOrderDto[];
}
export interface TablePaymentOrderDto {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
}
export interface ServiceShiftListDto {
  shifts: ServiceShiftDto[];
  total: number;
  page: number;
  limit: number;
}
export interface TableSessionListDto {
  sessions: TableSessionDto[];
  total: number;
  page: number;
  limit: number;
}
export type AnalyticsRange = "today" | "yesterday" | "7d" | "30d" | "this-month" | "previous-month" | "custom";
export interface AnalyticsQuery {
  from?: string;
  to?: string;
  serviceShiftId?: string;
}
export interface InsightComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number | null;
  trend: "up" | "down" | "flat";
}
export interface AnalyticsDto {
  scope: "coffee" | "platform";
  timezone: "UTC";
  period: { from: string; to: string; granularity: "hour" | "day" | "week" | "month" };
  comparisonPeriod: { from: string; to: string };
  kpis: {
    confirmedRevenue: InsightComparison;
    paidRevenue: InsightComparison;
    outstandingRevenue: InsightComparison;
    paymentRate: InsightComparison;
    totalOrders: InsightComparison;
    confirmedOrders: InsightComparison;
    pendingOrders: number;
    rejectedOrders: number;
    averageConfirmedOrderValue: InsightComparison;
    itemsSold: InsightComparison;
  };
  revenueTrend: Array<{ bucket: string; revenue: number; orders: number }>;
  orderTrend: Array<{ bucket: string; revenue: number; orders: number }>;
  topItems: Array<{ itemId: string; name: string; quantitySold: number; revenue: number }>;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    quantitySold: number;
    revenue: number;
    percentageOfRevenue: number;
  }>;
  peakHours: Array<{ hour: number; orders: number }>;
  busiestDays: Array<{ dayOfWeek: number; orders: number; revenue: number }>;
  statuses: Array<{ status: OrderStatus; count: number; percentage: number }>;
  promotions: {
    unitsSoldAtPromotionalPrice: number;
    promotedSalesRevenue: number;
    promotedItemsSold: number;
    discountAmount: number | null;
    historicalRegularPriceAvailable: false;
  };
  availability: {
    availableItems: number;
    unavailableItems: number;
    availabilityPercentage: number;
    historicalRateAvailable: false;
  };
  tables: Array<{ tableNumber: number; orders: number; revenue: number }>;
  insights: Array<{ id: string; message: string; kind: "positive" | "warning" | "neutral" }>;
  limitations: string[];
  platform?: { totalCoffees: number; activeCoffees: number };
}
