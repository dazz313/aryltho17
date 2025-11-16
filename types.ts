export enum UserRole {
  ADMINISTRATOR = 'administrator',
  ADMIN = 'admin',
  TECHNICIAN = 'technisi'
}

export enum TechnicianStatus {
    AVAILABLE = 'Available',
    ON_JOB = 'On Job',
    ON_BREAK = 'On Break',
    OFFLINE = 'Offline'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  password?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  skills?: string[];
  status?: TechnicianStatus;
  // Technician Profile Fields
  employeeId?: string;
  joinDate?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  category?: 'Residential' | 'Commercial' | 'Industrial' | 'VIP';
  tags?: string[];
}

export enum WorkOrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Selesai',
  CANCELLED = 'Cancelled'
}

export interface SparePart {
  id: string;
  itemCode: string;
  name: string;
  purchasePrice?: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  location: string;
}

export interface WorkOrder {
  id: string;
  customer: Customer;
  description: string;
  status: WorkOrderStatus;
  technicianId: string | null;
  createdAt: string;
  completedAt?: string;
  spareParts: SparePart[];
  totalCost: number;
}

export interface Invoice {
  id: string;
  workOrderId: string;
  customerId: string;
  amount: number;
  issuedDate: string;
  paidDate?: string;
  status: 'Paid' | 'Unpaid';
}

export enum TransactionCategory {
  SERVICE_INCOME = 'Pendapatan Servis',
  SALARY = 'Gaji',
  PART_PURCHASE = 'Pembelian Sparepart',
  OTHER_INCOME = 'Pendapatan Lain-lain',
  OTHER_EXPENSE = 'Biaya Lain-lain',
}

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Transfer Bank',
  CREDIT_CARD = 'Kartu Kredit',
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  attachment?: {
    name: string;
    type: string;
    data: string; // Base64 encoded data URL
  };
  invoiceId?: string; // To link with an invoice
}

export enum ContractStatus {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  CANCELLED = 'Cancelled',
}

export interface ServiceContract {
  id: string;
  customerId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  terms: string;
  renewalDate?: string;
}


export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  link: string;
  workOrderId?: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface CompanyProfile {
  name: string;
  address: string;
  email: string;
  phone: string;
  logo?: string; // Base64 encoded image
}