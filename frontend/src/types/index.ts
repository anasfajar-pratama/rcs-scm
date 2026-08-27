export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    pagination: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
    };
  };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
}

export interface Unit {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export interface Brand {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

export interface BomLine {
  id?: number;
  component_id: number;
  component_name?: string;
  quantity: number;
  note?: string;
  is_active?: boolean;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  type: 'raw_material' | 'finished_good';
  category_id?: number;
  brand_id?: number;
  unit_id?: number;
  category_name?: string;
  brand_name?: string;
  unit_name?: string;
  cost: number;
  sale_price: number;
  is_active: boolean;
  track_batch: boolean;
  expiry_required: boolean;
  shelf_life_days?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  safety_stock?: number;
  description?: string;
  ingredients?: string[];
  bom?: BomLine[];
}

export interface PriceListLine {
  id?: number;
  product_id: number;
  product_name?: string;
  price: number;
}

export interface PriceList {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  lines?: PriceListLine[];
}

export interface Contact {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  is_primary?: boolean;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  type: string;
  default_price_list_id?: number;
  default_price_list?: string;
  email?: string;
  phone?: string;
  tax_id?: string;
  credit_limit: number;
  billing_address?: string;
  shipping_address?: string;
  is_active: boolean;
  contacts?: Contact[];
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  currency?: string;
  is_active: boolean;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string;
  is_active: boolean;
  locations?: Location[];
}

export interface Location {
  id?: number;
  warehouse_id?: number;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface SettingItem {
  key: string;
  value: string;
  group: string;
  is_public?: boolean;
}

export interface Batch {
  id: number;
  product_id: number;
  lot_no: string;
  mfg_date?: string;
  expiry_date?: string;
  shelf_life_days?: number;
  status: string;
  source_type: string;
}

export interface Stock {
  id: number;
  warehouse_id: number;
  warehouse_name?: string;
  product_id: number;
  product?: Product;
  batch_id?: number;
  lot_no?: string;
  expiry_date?: string;
  batch_status?: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
}

export interface StockMovement {
  id: number;
  warehouse_id: number;
  warehouse_name?: string;
  product_id: number;
  product_name?: string;
  sku?: string;
  lot_no?: string;
  type: string;
  quantity: number;
  qty_before: number;
  qty_after: number;
  reference_no?: string;
  notes?: string;
  created_at?: string;
}

export interface TransferLine {
  id?: number;
  product_id: number;
  product_name?: string;
  batch_id?: number;
  lot_no?: string;
  quantity: number;
}

export interface Transfer {
  id: number;
  transfer_no: string;
  from_warehouse_id: number;
  from_warehouse?: string;
  to_warehouse_id: number;
  to_warehouse?: string;
  transfer_date?: string;
  status: string;
  notes?: string;
  lines?: TransferLine[];
  created_at?: string;
}

export interface AdjustmentLine {
  id?: number;
  product_id: number;
  product_name?: string;
  batch_id?: number;
  lot_no?: string;
  qty_diff: number;
  reason?: string;
}

export interface Adjustment {
  id: number;
  adjustment_no: string;
  type: string;
  warehouse_id: number;
  warehouse_name?: string;
  adjustment_date?: string;
  status: string;
  notes?: string;
  lines?: AdjustmentLine[];
  created_at?: string;
}

export interface OpnameLine {
  id?: number;
  product_id: number;
  product_name?: string;
  batch_id?: number;
  lot_no?: string;
  qty_system: number;
  qty_count: number;
  qty_diff: number;
}

export interface StockOpname {
  id: number;
  opname_no: string;
  warehouse_id: number;
  warehouse_name?: string;
  opname_date?: string;
  status: string;
  lines?: OpnameLine[];
  created_at?: string;
}

export interface StockAlert {
  expiring: { product: string; sku: string; lot_no: string; expiry_date: string; status: string; qty: number }[];
  reorder: { product: string; sku: string; reorder_point: number; reorder_quantity: number; current: number; below: boolean }[];
}
