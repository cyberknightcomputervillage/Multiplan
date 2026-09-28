export interface Shop {
  id: string;
  name: string;
  shop_number: string;
  floor: string;
  phone?: string;
  logo?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export type TransactionType = 'Purchase' | 'Sale';

export interface ShopTransaction {
  id: string;
  shop_id: string;
  user_id: string;
  user_email: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
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
  '14th Floor',
  '15th Floor',
  '16th Floor',
] as const;

export type FloorType = typeof MULTIPLAN_FLOORS[number] | string;
