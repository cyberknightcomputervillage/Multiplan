export interface FloorLocation {
  floor: string;
  shop_number: string;
}

export interface Shop {
  id: string;
  name: string;
  shop_number: string;
  floor: string;
  floor_locations?: FloorLocation[];
  phone?: string;
  logo?: string;
  notes?: string;
  tags?: string[]; // Product tags, categories, remarks (e.g. CPU, Motherboard, GPU, RAM, Laptop, Monitor)
  created_at: number;
  updated_at: number;
}

export type TransactionType = 'Purchase' | 'Sale';

export interface TransactionItem {
  id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ShopTransaction {
  id: string;
  shop_id: string;
  user_id: string;
  user_email: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  items?: TransactionItem[];
  // Summary / backwards compatibility fields
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  notes?: string;
  created_at: number;
}

export const MULTIPLAN_FLOORS = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  '6th Floor',
  '7th Floor',
  '8th Floor',
  '9th Floor',
  '10th Floor',
  '11th Floor',
  '12th Floor',
  '13th Floor',
] as const;

export type FloorType = typeof MULTIPLAN_FLOORS[number] | string;

export type UserAccessStatus = 'approved' | 'pending' | 'banned';

export interface AppUser {
  id: string; // usually normalized email or uid
  uid?: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  status: UserAccessStatus;
  can_edit?: boolean;
  request_note?: string;
  requested_at: number;
  updated_at: number;
  approved_by?: string;
  edit_permitted_at?: number;
}


