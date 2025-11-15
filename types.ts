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
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export enum WorkOrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Selesai',
  CANCELLED = 'Cancelled'
}

export interface SparePart {
  id: string;
  name: string;
  price: number;
  stock: number;
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

export interface FinancialRecord {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  attachment?: {
    name: string;
    type: string;
    data: string; // Base64 encoded data URL
  };
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