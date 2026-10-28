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
export interface ItemMediaDto {
  imageId: string | null;
  url: string;
  type: "image" | "video";
  mimeType: string | null;
  durationMs: number | null;
  alt: string | null;
}
export interface ItemDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotion: number | null;
  isAvailable: boolean;
  image: string | null;
  media: ItemMediaDto[];
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
  mediaType: "image" | "video";
  mimeType: string | null;
  durationMs: number | null;
}
export type OfferStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "SOLD_OUT" | "PAUSED" | "ARCHIVED";
export interface OfferLineDto {
  itemId: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
}
export interface FeaturedOfferDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  originalPrice: number;
  savings: number;
  stock: number;
  startAt: string | null;
  endAt: string | null;
  status: OfferStatus;
  lines: OfferLineDto[];
}
export interface AdminOfferDto extends FeaturedOfferDto {
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface OfferLineBody {
  itemId: string;
  quantity: number;
}
export interface CreateOfferBody {
  name: string;
  description?: string;
  price: number;
  stock: number;
  lines: OfferLineBody[];
  image?: string;
  startAt?: string | null;
  endAt?: string | null;
  isActive?: boolean;
}
export interface UpdateOfferBody extends Partial<Omit<CreateOfferBody, "image">> {
  image?: string | null;
  archived?: boolean;
}
export interface CreateCoffeeBody {
  name: string;
  slug: string;
  logo?: string;
  cover?: string;
}
export interface UpdateCoffeeBody {
  name?: string;
  logo?: string;
  cover?: string;
  slug?: string;
}
/** Coffee admins can edit their own coffee but never its slug. */
export type UpdateMyCoffeeBody = Omit<UpdateCoffeeBody, "slug">;
export interface ItemMediaBody {
  url: string;
  alt?: string;
}
export interface CreateItemBody {
  name: string;
  description?: string;
  price: number;
  promotion?: number | null;
  isAvailable?: boolean;
  image?: string;
  media?: ItemMediaBody[];
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
export interface OrderOfferLineDto {
  name: string;
  quantity: number;
}
export interface OrderOfferDto {
  offerId: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  lines: OrderOfferLineDto[];
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
  offers: OrderOfferDto[];
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
  offers?: Array<{ offerId: string; quantity: number }>;
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
  /** Server-side bill of the session (list responses). */
  totals?: TableSessionTotals;
}
export interface TableSessionTotals {
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  confirmedRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
  pendingRevenue: number;
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

/**
 * Table-centric view of the coffee.
 *
 * The backoffice settles tables: a table can host several client sessions
 * and every order it holds is billed to the table.
 */
export interface AdminTableTotals {
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  confirmedRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
  pendingRevenue: number;
}
export interface AdminTableOrderDto {
  id: string;
  /** Table the order belongs to. */
  tableNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  /** ISO date of the order. */
  createdAt: string;
  paidAt: string | null;
  items: Array<{ name: string; quantity: number }>;
}
export interface AdminTableDto {
  tableNumber: number;
  /** Client sessions currently running on the table. */
  sessions: number;
  openedAt: string;
  lastOrderAt: string;
  totals: AdminTableTotals;
  /** Every order of the table, newest first. */
  orders: AdminTableOrderDto[];
}
export interface AdminTableListDto {
  tables: AdminTableDto[];
  total: number;
}
export interface AdminTableCloseDto {
  tableNumber: number;
  closedSessions: number;
  totals: AdminTableTotals;
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
    /** Average number of items per confirmed order — the basket size. */
    averageItemsPerOrder: InsightComparison;
    /** Share of the orders that were refused, in percent. */
    rejectionRate: InsightComparison;
  };
  revenueTrend: Array<{ bucket: string; revenue: number; orders: number }>;
  orderTrend: Array<{ bucket: string; revenue: number; orders: number }>;
  topItems: Array<{ itemId: string; name: string; quantitySold: number; revenue: number }>;
  itemEngagement?: Array<{
    itemId: string;
    name: string;
    views: number;
    confirmedOrders: number;
    unitsSold: number;
    viewsSharePercent: number;
    ordersSharePercent: number | null;
    interestGapPoints: number | null;
    ordersPer100Views: number | null;
  }>;
  itemEngagementSummary?: {
    views: number;
    itemOrders: number;
    unitsSold: number;
    ordersPer100Views: number | null;
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    quantitySold: number;
    revenue: number;
    percentageOfRevenue: number;
  }>;
  peakHours: Array<{ hour: number; orders: number }>;
  /** The same hourly breakdown as `peakHours`, enriched with the revenue. */
  hourly: Array<{ hour: number; orders: number; revenue: number }>;
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
  /** Menu items of the coffee that were never sold during the period. */
  deadStock: {
    unsoldItems: number;
    items: Array<{ itemId: string; name: string; categoryName: string; price: number }>;
  };
  tables: Array<{ tableNumber: number; orders: number; revenue: number }>;
  insights: Array<{ id: string; message: string; kind: "positive" | "warning" | "neutral" }>;
  limitations: string[];
  platform?: { totalCoffees: number; activeCoffees: number };
}
