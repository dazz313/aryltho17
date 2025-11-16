import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, Transaction, Notification, ChatMessage, CompanyProfile, TechnicianStatus, TransactionCategory, PaymentMethod, ServiceContract, ContractStatus, Supplier, Client } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, ReceiptIcon, MapPinIcon, MoreVerticalIcon, TruckIcon, BriefcaseIcon } from './components/icons';
import { generateAiSummary, getChatbotResponse } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- INITIAL MOCK DATA ---
const INITIAL_USERS: User[] = [
  { id: 'user-1', name: 'Alice (Administrator)', role: UserRole.ADMINISTRATOR, password: 'password123', age: 35, gender: 'Female', skills: ['Management', 'Finance', 'System Administration'] },
  { id: 'user-2', name: 'Bob (Admin)', role: UserRole.ADMIN, password: 'password123', age: 28, gender: 'Male', skills: ['Data Entry', 'Customer Support'] },
  { id: 'user-3', name: 'Budi Santoso (Technician)', role: UserRole.TECHNICIAN, email: 'budi.s@example.com', password: 'password123', age: 32, gender: 'Male', skills: ['AC Repair', 'Refrigeration', 'Compressor Specialist'], status: TechnicianStatus.ON_JOB, employeeId: 'TEK-001', joinDate: '2021-03-15', placeOfBirth: 'Jakarta', dateOfBirth: '1991-08-20', address: 'Jl. Mawar No. 10, Jakarta' },
  { id: 'user-4', name: 'Charlie (Technician)', role: UserRole.TECHNICIAN, phone: '081234567891', password: 'password123', age: 25, gender: 'Male', skills: ['Electrical Wiring', 'Plumbing', 'Water Heater'], status: TechnicianStatus.ON_JOB, employeeId: 'TEK-002', joinDate: '2022-07-01', placeOfBirth: 'Bandung', dateOfBirth: '1998-05-12', address: 'Jl. Anggrek No. 5, Bandung' },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'PT Sejahtera Abadi', email: 'contact@sejahtera.co.id', phone: '081234567890', address: 'Jl. Merdeka No. 1, Jakarta', category: 'Commercial', tags: ['High Value', 'Regular Maintenance'], coordinates: { lat: -6.1751, lng: 106.8272 } },
  { id: 'cust-2', name: 'Toko Roti Enak', email: 'order@rotienak.com', phone: '081298765432', address: 'Jl. Sudirman No. 22, Jakarta', category: 'Commercial', tags: ['New'], coordinates: { lat: -6.2088, lng: 106.8456 } },
  { id: 'cust-3', name: 'Ibu Susanti', email: 'susanti@gmail.com', phone: '085611223344', address: 'Jl. Gatot Subroto No. 5, Bandung', category: 'Residential', tags: ['Repeat Customer'], coordinates: { lat: -6.9175, lng: 107.6191 } },
];

const INITIAL_SUPPLIERS: Supplier[] = [
    { id: 'sup-1', name: 'PT Suku Cadang Jaya', contactPerson: 'Andi', phone: '021-555-1234', email: 'andi@scj.com' },
    { id: 'sup-2', name: 'CV Mitra Teknik', contactPerson: 'Citra', phone: '022-777-5678', email: 'citra@mitrateknik.id' },
];

const INITIAL_SPARE_PARTS: SparePart[] = [
  { id: 'sp-1', itemCode: 'CMP-XYZ-001', name: 'Compressor XYZ', purchasePrice: 600000, sellingPrice: 750000, stock: 10, unit: 'pcs', location: 'Rak A1', supplierId: 'sup-1' },
  { id: 'sp-2', itemCode: 'FRN-R32-001', name: 'Freon R32', purchasePrice: 100000, sellingPrice: 150000, stock: 25, unit: 'kg', location: 'Rak B2', supplierId: 'sup-2' },
  { id: 'sp-3', itemCode: 'CAP-25-UF', name: 'Capacitor 25uF', sellingPrice: 85000, stock: 5, unit: 'pcs', location: 'Rak A2' },
  { id: 'sp-4', itemCode: 'MTR-FAN-001', name: 'Fan Motor', purchasePrice: 280000, sellingPrice: 350000, stock: 0, unit: 'pcs', location: 'Rak C1', supplierId: 'sup-1' },
];

const INITIAL_CLIENTS: Client[] = [
  { id: 'client-1', name: 'Authorized Service Center A' },
  { id: 'client-2', name: 'Corporate Partner B' },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
    { id: 'wo-1', customer: INITIAL_CUSTOMERS[0], description: 'AC not cooling in meeting room', status: WorkOrderStatus.COMPLETED, technicianId: 'user-3', createdAt: '2023-10-01', completedAt: '2023-10-02', spareParts: [INITIAL_SPARE_PARTS[0]], totalCost: 850000, coordinates: INITIAL_CUSTOMERS[0].coordinates, clientId: 'client-1' },
    { id: 'wo-2', customer: INITIAL_CUSTOMERS[1], description: 'Refrigerator making strange noises', status: WorkOrderStatus.IN_PROGRESS, technicianId: 'user-4', createdAt: '2023-10-03', spareParts: [], totalCost: 100000, coordinates: INITIAL_CUSTOMERS[1].coordinates },
    { id: 'wo-3', customer: INITIAL_CUSTOMERS[2], description: 'Annual AC maintenance', status: WorkOrderStatus.PENDING, technicianId: null, createdAt: '2023-10-05', spareParts: [], totalCost: 250000, coordinates: INITIAL_CUSTOMERS[2].coordinates },
    { id: 'wo-4', customer: INITIAL_CUSTOMERS[0], description: 'Fix leaking indoor AC unit', status: WorkOrderStatus.IN_PROGRESS, technicianId: 'user-3', createdAt: '2023-10-06', spareParts: [], totalCost: 150000, coordinates: INITIAL_CUSTOMERS[0].coordinates, clientId: 'client-2' },
];

const INITIAL_INVOICES: Invoice[] = INITIAL_WORK_ORDERS
    .filter(wo => wo.status === WorkOrderStatus.COMPLETED || wo.status === WorkOrderStatus.IN_PROGRESS)
    .map(wo => ({
        id: `INV-${wo.id}`,
        workOrderId: wo.id,
        customerId: wo.customer.id,
        amount: wo.totalCost,
        issuedDate: wo.completedAt || new Date().toISOString().split('T')[0],
        status: 'Unpaid',
        paidDate: undefined,
    }));

const INITIAL_TRANSACTIONS: Transaction[] = [
    ...INITIAL_INVOICES.filter(inv => inv.status === 'Paid').map(inv => ({
        id: `trn-${inv.id}`,
        invoiceId: inv.workOrderId,
        date: inv.paidDate!,
        description: `Payment for Invoice ${inv.id}`,
        type: 'income' as 'income',
        amount: inv.amount,
        category: TransactionCategory.SERVICE_INCOME,
        paymentMethod: PaymentMethod.BANK_TRANSFER
    })),
    { id: 'exp-1', date: '2023-10-01', description: 'Gaji Teknisi', type: 'expense', amount: 5000000, category: TransactionCategory.SALARY, paymentMethod: PaymentMethod.BANK_TRANSFER, approved: true },
    { id: 'exp-2', date: '2023-10-02', description: 'Pembelian Sparepart', type: 'expense', amount: 1500000, category: TransactionCategory.PART_PURCHASE, paymentMethod: PaymentMethod.CASH, approved: true },
];

const INITIAL_CONTRACTS: ServiceContract[] = [
    { id: 'con-1', customerId: 'cust-1', title: 'Annual AC Maintenance Package', startDate: '2023-01-01', endDate: '2023-12-31', status: ContractStatus.ACTIVE, terms: 'Quarterly general check-up and cleaning for 10 AC units.', renewalDate: '2023-12-01' },
    { id: 'con-2', customerId: 'cust-3', title: 'Home Appliance Service Contract', startDate: '2022-06-15', endDate: '2023-06-14', status: ContractStatus.EXPIRED, terms: 'On-call repair service for Refrigerator and Washing Machine.' },
];

// --- UTILITY FUNCTIONS ---
const formatIDR = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const formatUserName = (name?: string | null): string => {
    if (!name || typeof name !== 'string') {
        return '';
    }
    return name.split(' (')[0];
};

const getStatusColor = (status: WorkOrderStatus | 'Paid' | 'Unpaid') => {
  switch (status) {
    case WorkOrderStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
    case WorkOrderStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
    case WorkOrderStatus.COMPLETED: return 'bg-green-100 text-green-800';
    case WorkOrderStatus.CANCELLED: return 'bg-red-100 text-red-800';
    case 'Paid': return 'bg-green-100 text-green-800';
    case 'Unpaid': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getContractStatusColor = (status: ContractStatus) => {
    switch(status) {
        case ContractStatus.ACTIVE: return 'bg-green-100 text-green-800';
        case ContractStatus.EXPIRED: return 'bg-yellow-100 text-yellow-800';
        case ContractStatus.CANCELLED: return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const getTechnicianStatusColor = (status?: TechnicianStatus) => {
    switch(status) {
        case TechnicianStatus.AVAILABLE: return 'bg-green-100 text-green-800';
        case TechnicianStatus.ON_JOB: return 'bg-blue-100 text-blue-800';
        case TechnicianStatus.ON_BREAK: return 'bg-yellow-100 text-yellow-800';
        case TechnicianStatus.OFFLINE: return 'bg-gray-100 text-gray-600';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

const calculateTenure = (joinDate: string): string => {
    const start = new Date(joinDate);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    return `${years} tahun, ${months} bulan`;
};

const generatePdfHeader = (doc: jsPDF, profile: CompanyProfile) => {
    if (profile.logo) {
        try {
            doc.addImage(profile.logo, 'PNG', 14, 15, 30, 30);
        } catch(e) {
            console.error("Error adding logo to PDF", e);
        }
    }
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.name, 50, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(profile.address, 50, 32);
    doc.text(`Email: ${profile.email} | Phone: ${profile.phone}`, 50, 39);
    doc.setLineWidth(0.5);
    doc.line(14, 50, 196, 50); // Horizontal line separator
};


// --- HELPER & MODAL COMPONENTS ---
interface CardProps {
  title: string;
  value: string;
  // FIX: Changed icon prop type to be more specific for React.cloneElement to fix a TypeScript error.
  icon: React.ReactElement<{ className?: string }>;
  color: 'blue' | 'yellow' | 'green' | 'indigo';
}
const StatCard: React.FC<CardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
        green: { bg: 'bg-green-100', text: 'text-green-600' },
        indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    };
    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4 transition-transform transform hover:-translate-y-1 hover:shadow-lg">
            <div className={`${selectedColor.bg} p-3 rounded-full`}>
                {React.cloneElement(icon, { className: `h-6 w-6 ${selectedColor.text}` })}
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl' }> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    }
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className={`bg-white rounded-lg shadow-xl p-6 w-full ${sizeClasses[size]}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};


// --- AUTHENTICATION SCREENS ---
const LoginScreen: React.FC<{ onLogin: (user: User) => void; onSwitchToSignUp: () => void, users: User[] }> = ({ onLogin, onSwitchToSignUp, users }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">ServisPro CRM</h1>
        <p className="text-gray-600 mb-8">Please select a role to sign in</p>
        <div className="space-y-4">
          {users.map(user => (
            <button key={user.id} onClick={() => onLogin(user)} className="w-full text-left p-4 bg-gray-50 hover:bg-primary-100 border border-gray-200 rounded-lg transition-colors">
              <p className="font-semibold text-gray-800">{user.name}</p>
              <p className="text-sm text-primary-600 capitalize">{user.role}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 text-sm">
          <span className="text-gray-600">Don't have an account? </span>
          <button onClick={onSwitchToSignUp} className="font-semibold text-primary-600 hover:underline">Sign Up</button>
        </div>
      </div>
    </div>
  );
};

const SignUpScreen: React.FC<{ onSignUp: (user: User) => void; onSwitchToLogin: () => void }> = ({ onSignUp, onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN);
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [skills, setSkills] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !password || (!email && !phone)) {
            alert("Please fill in your name, password, and either an email or a phone number.");
            return;
        }
        const newUser: User = {
            id: `user-${Date.now()}`,
            name: `${name} (${role.charAt(0).toUpperCase() + role.slice(1)})`,
            role,
            email: email || undefined,
            phone: phone || undefined,
            password: password,
            age: age ? parseInt(age, 10) : undefined,
            gender: gender,
            skills: skills.split(',').map(s => s.trim()).filter(Boolean),
            status: role === UserRole.TECHNICIAN ? TechnicianStatus.AVAILABLE : undefined
        };
        onSignUp(newUser);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-3xl font-bold text-primary-700 mb-2 text-center">Create Account</h1>
                <p className="text-gray-600 mb-8 text-center">Join the ServisPro team</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">OR</span>
                      </div>
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                            <input type="number" id="age" value={age} onChange={e => setAge(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                        </div>
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                            <select id="gender" value={gender} onChange={e => setGender(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills (comma-separated)</label>
                        <input type="text" id="skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. AC Repair, Plumbing" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                    </div>
                     <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                        <select id="role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                            <option value={UserRole.TECHNICIAN}>Technician</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                            <option value={UserRole.ADMINISTRATOR}>Administrator</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        Sign Up
                    </button>
                </form>
                 <div className="mt-6 text-sm text-center">
                    <span className="text-gray-600">Already have an account? </span>
                    <button onClick={onSwitchToLogin} className="font-semibold text-primary-600 hover:underline">Log In</button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL COMPONENTS ---
const AddEditCustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
    customer: Customer | null;
}> = ({ isOpen, onClose, onSave, customer }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', category: 'Residential' as Customer['category'], tags: '' });

    useEffect(() => {
        if (customer) {
            setFormData({ 
                name: customer.name, 
                email: customer.email, 
                phone: customer.phone, 
                address: customer.address,
                category: customer.category || 'Residential',
                tags: customer.tags?.join(', ') || ''
             });
        } else {
            setFormData({ name: '', email: '', phone: '', address: '', category: 'Residential', tags: '' });
        }
    }, [customer, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            ...customer, 
            ...formData,
            id: customer?.id || `cust-${Date.now()}`,
            category: formData.category,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? 'Edit Customer' : 'Add New Customer'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                     <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option>Residential</option>
                        <option>Commercial</option>
                        <option>Industrial</option>
                        <option>VIP</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                    <input type="text" name="tags" value={formData.tags} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Customer</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditClientModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Client) => void;
    client: Client | null;
}> = ({ isOpen, onClose, onSave, client }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (client) {
            setName(client.name);
        } else {
            setName('');
        }
    }, [client, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...client,
            id: client?.id || `client-${Date.now()}`,
            name,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Edit Client' : 'Add New Client'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client Name</label>
                    <input type="text" name="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Client</button>
                </div>
            </form>
        </Modal>
    );
};

const CreateWorkOrderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { customerId: string; description: string; totalCost: number; clientId?: string }) => void;
    customers: Customer[];
    clients: Client[];
    preselectedCustomerId?: string;
}> = ({ isOpen, onClose, onSave, customers, clients, preselectedCustomerId }) => {
    const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
    const [description, setDescription] = useState('');
    const [totalCost, setTotalCost] = useState('');
    const [clientId, setClientId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCustomerId(preselectedCustomerId || (customers.length > 0 ? customers[0].id : ''));
            setDescription('');
            setTotalCost('');
            setClientId('');
        }
    }, [isOpen, customers, preselectedCustomerId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId || !description) return;
        onSave({ customerId, description, totalCost: Number(totalCost) || 0, clientId: clientId || undefined });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Work Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} required disabled={!!preselectedCustomerId} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100">
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client (Optional)</label>
                    <select value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value="">-- No Client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Cost (e.g., Service Fee)</label>
                    <input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Create Order</button>
                </div>
            </form>
        </Modal>
    );
};

const AssignTechnicianModal: React.FC<{
    workOrder: WorkOrder;
    technicians: User[];
    onClose: () => void;
    onSave: (workOrderId: string, technicianId: string) => void;
}> = ({ workOrder, technicians, onClose, onSave }) => {
    const [selectedTech, setSelectedTech] = useState(workOrder.technicianId || '');

     const handleSave = () => {
        if (!selectedTech) return;
        onSave(workOrder.id, selectedTech);
        onClose();
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Assign Technician to WO-${workOrder.id.substring(0,4)}`}>
            <div>
                <label className="block text-sm font-medium text-gray-700">Select Technician</label>
                <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                    <option value="">-- Choose a technician --</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
                 <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={!selectedTech} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300">Assign Technician</button>
            </div>
        </Modal>
    )
}

const AddSparePartModal: React.FC<{
    workOrder: WorkOrder;
    onClose: () => void;
    onSave: (workOrderId: string, parts: SparePart[]) => void;
    availableParts: SparePart[];
}> = ({ workOrder, onClose, onSave, availableParts }) => {
    const [selectedParts, setSelectedParts] = useState<SparePart[]>(workOrder.spareParts);

    const handleTogglePart = (part: SparePart) => {
        setSelectedParts(prev => {
            if (prev.find(p => p.id === part.id)) {
                return prev.filter(p => p.id !== part.id);
            } else {
                return [...prev, part];
            }
        });
    };
    
    const handleSave = () => {
        onSave(workOrder.id, selectedParts);
        onClose();
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Add Parts to WO-${workOrder.id.substring(0,4)}`}>
           <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableParts.map(part => (
                    <div key={part.id} className={`flex items-center justify-between p-2 border rounded-md ${part.stock === 0 ? 'bg-gray-100 opacity-60' : ''}`}>
                        <div>
                            <p className="font-semibold">{part.name}</p>
                            <p className="text-sm text-gray-500">{formatIDR(part.sellingPrice)} - <span className={`font-bold ${part.stock <= 5 ? 'text-red-600' : 'text-gray-700'}`}>Stock: {part.stock}</span></p>
                        </div>
                        <input
                            type="checkbox"
                            checked={!!selectedParts.find(p => p.id === part.id)}
                            onChange={() => handleTogglePart(part)}
                            disabled={part.stock === 0 && !selectedParts.find(p => p.id === part.id)}
                            className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                        />
                    </div>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={handleSave} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Save Changes</button>
            </div>
        </Modal>
    );
};

const AddEditInvoiceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (invoice: Invoice) => void;
    invoice: Invoice | null;
    workOrders: WorkOrder[];
}> = ({ isOpen, onClose, onSave, invoice, workOrders }) => {
    const [formData, setFormData] = useState({ workOrderId: '', amount: '', issuedDate: new Date().toISOString().split('T')[0], status: 'Unpaid' as 'Paid' | 'Unpaid' });

    const completedWorkOrders = useMemo(() => workOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED), [workOrders]);

    useEffect(() => {
        if (invoice) {
            setFormData({
                workOrderId: invoice.workOrderId,
                amount: String(invoice.amount),
                issuedDate: invoice.issuedDate,
                status: invoice.status,
            });
        } else {
            setFormData({ workOrderId: '', amount: '', issuedDate: new Date().toISOString().split('T')[0], status: 'Unpaid' });
        }
    }, [invoice, isOpen]);

    const handleWorkOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const woId = e.target.value;
        const selectedWO = completedWorkOrders.find(wo => wo.id === woId);
        setFormData({
            ...formData,
            workOrderId: woId,
            amount: selectedWO ? String(selectedWO.totalCost) : ''
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedWO = workOrders.find(wo => wo.id === formData.workOrderId);
        if (!selectedWO) return;
        
        onSave({
            ...invoice,
            id: invoice?.id || `INV-${formData.workOrderId}`,
            workOrderId: formData.workOrderId,
            customerId: selectedWO.customer.id,
            amount: Number(formData.amount),
            issuedDate: formData.issuedDate,
            status: formData.status,
            paidDate: formData.status === 'Paid' ? new Date().toISOString().split('T')[0] : undefined,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'Edit Invoice' : 'Add New Invoice'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Completed Work Order</label>
                    <select name="workOrderId" value={formData.workOrderId} onChange={handleWorkOrderChange} required disabled={!!invoice} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100">
                        <option value="">Select a Work Order</option>
                        {completedWorkOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.id} - {wo.customer.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input type="number" name="amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Issued Date</label>
                    <input type="date" name="issuedDate" value={formData.issuedDate} onChange={e => setFormData({...formData, issuedDate: e.target.value})} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select name="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'Paid' | 'Unpaid'})} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid</option>
                    </select>
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Invoice</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditSparePartModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (part: SparePart) => void;
    part: SparePart | null;
    suppliers: Supplier[];
}> = ({ isOpen, onClose, onSave, part, suppliers }) => {
    const [formData, setFormData] = useState({ itemCode: '', name: '', purchasePrice: '', sellingPrice: '', stock: '', unit: '', location: '', supplierId: '' });

    useEffect(() => {
        if (part) {
            setFormData({ 
                itemCode: part.itemCode, 
                name: part.name, 
                purchasePrice: String(part.purchasePrice || ''),
                sellingPrice: String(part.sellingPrice), 
                stock: String(part.stock), 
                unit: part.unit,
                location: part.location,
                supplierId: part.supplierId || ''
            });
        } else {
            setFormData({ itemCode: '', name: '', purchasePrice: '', sellingPrice: '', stock: '0', unit: '', location: '', supplierId: '' });
        }
    }, [part, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...part,
            id: part?.id || `sp-${Date.now()}`,
            itemCode: formData.itemCode,
            name: formData.name,
            purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
            sellingPrice: Number(formData.sellingPrice),
            stock: Number(formData.stock),
            unit: formData.unit,
            location: formData.location,
            supplierId: formData.supplierId || undefined,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={part ? 'Edit Spare Part' : 'Add New Spare Part'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Kode Item</label>
                    <input type="text" name="itemCode" value={formData.itemCode} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Part Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Harga Beli (IDR)</label>
                        <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder="Optional" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Harga Jual (IDR)</label>
                        <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                        <input type="number" name="stock" value={formData.stock} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Satuan (e.g. pcs, kg)</label>
                        <input type="text" name="unit" value={formData.unit} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Location (e.g. Rack A1)</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <select name="supplierId" value={formData.supplierId} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value="">-- No Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Part</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditSupplierModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplier: Supplier) => void;
    supplier: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplier }) => {
    const [formData, setFormData] = useState({ name: '', contactPerson: '', phone: '', email: '' });

    useEffect(() => {
        if (supplier) {
            setFormData({ 
                name: supplier.name, 
                contactPerson: supplier.contactPerson,
                phone: supplier.phone, 
                email: supplier.email
            });
        } else {
            setFormData({ name: '', contactPerson: '', phone: '', email: '' });
        }
    }, [supplier, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...supplier,
            id: supplier?.id || `sup-${Date.now()}`,
            name: formData.name,
            contactPerson: formData.contactPerson,
            phone: formData.phone,
            email: formData.email,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'Edit Supplier' : 'Add New Supplier'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                    <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Supplier</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditTransactionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Transaction) => void;
    transaction: Transaction | null;
}> = ({ isOpen, onClose, onSave, transaction }) => {
    const getInitialState = () => ({
        type: 'expense' as 'income' | 'expense',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: TransactionCategory.OTHER_EXPENSE,
        paymentMethod: PaymentMethod.CASH,
    });

    const [formData, setFormData] = useState(getInitialState());
    const [attachment, setAttachment] = useState<{ name: string; type: string; data: string; } | null>(null);


    useEffect(() => {
        if (transaction) {
            setFormData({ 
                type: transaction.type,
                description: transaction.description, 
                amount: String(transaction.amount), 
                date: transaction.date,
                category: transaction.category,
                paymentMethod: transaction.paymentMethod
            });
            setAttachment(transaction.attachment || null);
        } else {
            setFormData(getInitialState());
            setAttachment(null);
        }
    }, [transaction, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'type') {
            const newType = value as 'income' | 'expense';
            setFormData({
                ...formData,
                // FIX: Use the correctly typed `newType` instead of the generic `string` `value`.
                [name]: newType,
                category: newType === 'income' ? TransactionCategory.OTHER_INCOME : TransactionCategory.OTHER_EXPENSE
            });
        } else {
            setFormData({ ...formData, [name]: value as any });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment({
                    name: file.name,
                    type: file.type,
                    data: reader.result as string,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...transaction,
            id: transaction?.id || `trn-${Date.now()}`,
            type: formData.type,
            description: formData.description,
            amount: Number(formData.amount),
            date: formData.date,
            category: formData.category,
            paymentMethod: formData.paymentMethod,
            attachment: attachment || undefined,
            approved: transaction?.approved
        });
    };
    
    const incomeCategories = Object.values(TransactionCategory).filter(c => c.includes('Pendapatan'));
    const expenseCategories = Object.values(TransactionCategory).filter(c => !c.includes('Pendapatan') && c !== TransactionCategory.REIMBURSEMENT);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transaction ? 'Edit Transaction' : 'Add New Transaction'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input type="text" name="description" value={formData.description} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Amount (IDR)</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                            {(formData.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                        <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                            {Object.values(PaymentMethod).map(method => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Attachment (Nota/Receipt)</label>
                    <input type="file" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                    {attachment && (
                        <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded-md">
                            <div className="flex items-center space-x-2 truncate">
                                {attachment.type.startsWith('image/') && <img src={attachment.data} alt="preview" className="h-10 w-10 object-cover rounded" />}
                                <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                            </div>
                            <button type="button" onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Transaction</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditEmployeeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: User) => void;
    user: User | null;
}> = ({ isOpen, onClose, onSave, user }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', age: '', gender: 'Male' as 'Male' | 'Female' | 'Other', skills: '', role: UserRole.TECHNICIAN });

    useEffect(() => {
        if (user) {
            setFormData({
                name: formatUserName(user.name),
                email: user.email || '',
                phone: user.phone || '',
                age: user.age ? String(user.age) : '',
                gender: user.gender || 'Male',
                skills: user.skills?.join(', ') || '',
                role: user.role,
            });
        }
    }, [user, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        onSave({
            ...user,
            name: `${formData.name} (${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)})`,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            age: Number(formData.age) || undefined,
            gender: formData.gender,
            skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
            role: formData.role as UserRole,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Employee: ${formatUserName(user?.name)}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Age</label>
                        <input type="number" name="age" value={formData.age} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <select name="gender" value={formData.gender} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Skills (comma-separated)</label>
                    <input type="text" name="skills" value={formData.skills} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value={UserRole.TECHNICIAN}>Technician</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                        <option value={UserRole.ADMINISTRATOR}>Administrator</option>
                    </select>
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditContractModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (contract: ServiceContract) => void;
    contract: ServiceContract | null;
    customerId: string | null;
}> = ({ isOpen, onClose, onSave, contract, customerId }) => {
    const getInitialState = () => ({
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: ContractStatus.ACTIVE,
        terms: '',
    });

    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if (contract) {
            setFormData({
                title: contract.title,
                startDate: contract.startDate,
                endDate: contract.endDate,
                status: contract.status,
                terms: contract.terms,
            });
        } else {
            setFormData(getInitialState());
        }
    }, [contract, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId) return;
        
        onSave({
            ...contract,
            id: contract?.id || `con-${Date.now()}`,
            customerId,
            title: formData.title,
            startDate: formData.startDate,
            endDate: formData.endDate,
            status: formData.status,
            terms: formData.terms,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contract ? 'Edit Contract' : 'Add New Service Contract'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Contract Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Annual AC Maintenance" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        {Object.values(ContractStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                    <textarea name="terms" value={formData.terms} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Contract</button>
                </div>
            </form>
        </Modal>
    )
};

const MarkAsPaidModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (workOrderId: string, paymentMethod: PaymentMethod, attachment?: { name: string; type: string; data: string; }) => void;
    workOrder: WorkOrder | null;
}> = ({ isOpen, onClose, onConfirm, workOrder }) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [attachment, setAttachment] = useState<{ name: string; type: string; data: string; } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPaymentMethod(PaymentMethod.CASH);
            setAttachment(null);
        }
    }, [isOpen]);

    if (!isOpen || !workOrder) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment({
                    name: file.name,
                    type: file.type,
                    data: reader.result as string,
                });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleConfirm = () => {
        onConfirm(workOrder.id, paymentMethod, attachment || undefined);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Confirm Payment for WO-${workOrder.id.substring(0,4)}`}>
            <div className="space-y-4">
                <p>Please confirm that you have received payment for this work order from <strong>{workOrder.customer.name}</strong>.</p>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                    <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                        <option value={PaymentMethod.CASH}>Cash</option>
                        <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                    </select>
                </div>
                 {paymentMethod === PaymentMethod.BANK_TRANSFER && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Upload Bukti Transfer (Optional)</label>
                        <input type="file" onChange={handleFileChange} accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                        {attachment && (
                            <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded-md">
                                <div className="flex items-center space-x-2 truncate">
                                    {attachment.type.startsWith('image/') && <img src={attachment.data} alt="preview" className="h-10 w-10 object-cover rounded" />}
                                    <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                                </div>
                                <button type="button" onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700">
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Confirm Payment</button>
                </div>
            </div>
        </Modal>
    );
};

const ReimbursementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (workOrderId: string, amount: number, description: string, attachment: { name: string; type: string; data: string; }) => void;
    workOrder: WorkOrder | null;
}> = ({ isOpen, onClose, onConfirm, workOrder }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState<{ name: string; type: string; data: string; } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setAttachment(null);
        }
    }, [isOpen]);

    if (!isOpen || !workOrder) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment({
                    name: file.name,
                    type: file.type,
                    data: reader.result as string,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = () => {
        if (!amount || !description || !attachment) {
            alert('Please fill all fields and upload a receipt.');
            return;
        }
        onConfirm(workOrder.id, Number(amount), description, attachment);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Request Reimbursement for WO-${workOrder.id.substring(0,4)}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Amount (IDR)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g. Beli paku dan sekrup" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Upload Nota/Struk</label>
                    <input type="file" onChange={handleFileChange} accept="image/*" required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                    {attachment && (
                        <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded-md">
                            <div className="flex items-center space-x-2 truncate">
                                {attachment.type.startsWith('image/') && <img src={attachment.data} alt="preview" className="h-10 w-10 object-cover rounded" />}
                                <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                            </div>
                            <button type="button" onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
                 <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Submit Request</button>
                </div>
            </div>
        </Modal>
    );
};

const AttachmentViewerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    attachment: { name: string; type: string; data: string; } | null;
}> = ({ isOpen, onClose, attachment }) => {
    if (!isOpen || !attachment) return null;

    const isImage = attachment.type.startsWith('image/');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Attachment: ${attachment.name}`} size="lg">
            <div className="my-4 bg-gray-100 p-4 rounded-lg flex justify-center items-center">
                {isImage ? (
                    <img src={attachment.data} alt={attachment.name} className="max-w-full max-h-[70vh] mx-auto rounded-md object-contain" />
                ) : (
                    <div className="text-center p-8">
                        <p className="text-gray-700">This file cannot be previewed directly.</p>
                        <p className="font-mono text-sm text-gray-500 my-2">{attachment.name}</p>
                    </div>
                )}
            </div>
            <div className="flex justify-end pt-4 space-x-2 border-t mt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
                <a href={attachment.data} download={attachment.name} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 no-underline">
                    Download File
                </a>
            </div>
        </Modal>
    );
};


// --- PAGE COMPONENTS ---

const NotificationsPage: React.FC<{ notifications: Notification[], onMarkAllRead: () => void }> = ({ notifications, onMarkAllRead }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
                {notifications.some(n => !n.read) && (
                    <button onClick={onMarkAllRead} className="text-sm font-medium text-primary-600 hover:underline">
                        Mark all as read
                    </button>
                )}
            </div>
            <div className="bg-white rounded-lg shadow-md">
                {notifications.length === 0 ? (
                    <p className="text-gray-500 text-center py-16">You have no notifications.</p>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {notifications.slice().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(n => (
                            <Link to={n.link} key={n.id} className={`block p-4 ${!n.read ? 'bg-primary-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                                <div className="flex items-start space-x-4">
                                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${!n.read ? 'bg-primary-500' : 'bg-transparent'}`}></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-800">{n.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{timeAgo(n.timestamp)}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ReimbursementPage: React.FC<{
    transactions: Transaction[],
    users: User[],
    onApprove: (transactionId: string) => void,
    onViewAttachment: (attachment: NonNullable<Transaction['attachment']>) => void,
}> = ({ transactions, users, onApprove, onViewAttachment }) => {
    const reimbursementRequests = transactions.filter(t => t.category === TransactionCategory.REIMBURSEMENT)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Reimbursement Requests</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Requested By</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">Amount</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Attachment</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reimbursementRequests.map(req => {
                                const user = users.find(u => u.id === req.requestedByUserId);
                                return (
                                    <tr key={req.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">{req.date}</td>
                                        <td className="px-6 py-4 font-medium">{user ? formatUserName(user.name) : 'Unknown'}</td>
                                        <td className="px-6 py-4">{req.description}</td>
                                        <td className="px-6 py-4 font-semibold">{formatIDR(req.amount)}</td>
                                        <td className="px-6 py-4">
                                            {req.approved ? (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending Approval</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {req.attachment ? (
                                                <button onClick={() => onViewAttachment(req.attachment!)} className="font-medium text-blue-600 hover:underline">View</button>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {!req.approved && (
                                                <button onClick={() => onApprove(req.id)} className="font-medium text-green-600 hover:underline">Approve</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {reimbursementRequests.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No reimbursement requests found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MyReimbursementsPage: React.FC<{
    transactions: Transaction[],
    currentUser: User,
    onViewAttachment: (attachment: NonNullable<Transaction['attachment']>) => void,
}> = ({ transactions, currentUser, onViewAttachment }) => {
    const myReimbursements = transactions
        .filter(t => t.category === TransactionCategory.REIMBURSEMENT && t.requestedByUserId === currentUser.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">My Reimbursement History</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Work Order ID</th>
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">Amount</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Attachment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myReimbursements.map(req => (
                                <tr key={req.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{req.date}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{req.workOrderId ? `...${req.workOrderId.slice(-7)}` : '-'}</td>
                                    <td className="px-6 py-4">{req.description}</td>
                                    <td className="px-6 py-4 font-semibold">{formatIDR(req.amount)}</td>
                                    <td className="px-6 py-4">
                                        {req.approved ? (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.attachment ? (
                                            <button onClick={() => onViewAttachment(req.attachment!)} className="font-medium text-blue-600 hover:underline">View Receipt</button>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {myReimbursements.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">You have not requested any reimbursements.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<{workOrders: WorkOrder[], customers: Customer[], users: User[], currentUser: User}> = ({ workOrders, customers, users, currentUser }) => {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const woStatusData = useMemo(() => {
    const counts = workOrders.reduce((acc, wo) => {
      acc[wo.status] = (acc[wo.status] || 0) + 1;
      return acc;
    }, {} as Record<WorkOrderStatus, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [workOrders]);
  
  const technicians = users.filter(u => u.role === UserRole.TECHNICIAN);

  const technicianPerformanceData = useMemo(() => {
    return technicians.map(tech => ({
        name: formatUserName(tech.name),
        completed: workOrders.filter(wo => wo.technicianId === tech.id && wo.status === WorkOrderStatus.COMPLETED).length
    }));
  }, [workOrders, users]);


  const monthlyRevenueData = useMemo(() => [
    { name: 'Jul', revenue: 1500000 },
    { name: 'Aug', revenue: 2200000 },
    { name: 'Sep', revenue: 1800000 },
    { name: 'Oct', revenue: workOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED).reduce((sum, wo) => sum + wo.totalCost, 0) },
  ], [workOrders]);
  
  const PIE_COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6']; // sky, amber, emerald, rose

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    const dataToAnalyze = {
        workOrders: workOrders,
        technicians: technicians,
        financials: workOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED).map(wo => ({ type: 'income', amount: wo.totalCost, date: wo.completedAt }))
    }
    const result = await generateAiSummary(dataToAnalyze);
    setSummary(result);
    setIsLoading(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800">Welcome back, {formatUserName(currentUser.name)}!</h1>
      <p className="text-gray-500 mb-6">Here's a summary of your business activities today.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Total Customers" value={customers.length.toString()} icon={<CustomerIcon />} color="blue" />
        <StatCard title="Pending Work Orders" value={workOrders.filter(wo => wo.status === WorkOrderStatus.PENDING).length.toString()} icon={<WorkOrderIcon />} color="yellow" />
        
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4 transition-transform transform hover:-translate-y-1 hover:shadow-lg">
            <div className="bg-indigo-100 p-3 rounded-full"><TechnicianIcon className="h-6 w-6 text-indigo-600" /></div>
            <div>
                <p className="text-sm text-gray-500">Technician Status</p>
                <div className="h-20 overflow-y-auto pr-2 mt-1">
                    {technicians.map(tech => (
                        <div key={tech.id} className="flex items-center justify-between text-sm py-0.5">
                            <span className="font-semibold text-gray-700">{formatUserName(tech.name)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getTechnicianStatusColor(tech.status)}`}>{tech.status || 'N/A'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <StatCard title="Monthly Revenue" value={formatIDR(monthlyRevenueData[3].revenue)} icon={<FinanceIcon />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
           <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Revenue</h2>
           <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(tick) => formatIDR(tick as number)}/>
              <Tooltip formatter={(value) => formatIDR(value as number)} />
              <Legend />
              <Bar dataKey="revenue" fill="url(#colorRevenue)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Work Order Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={woStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {woStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
       <div className="grid grid-cols-1 gap-6 mb-6">
         <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
           <h2 className="text-lg font-semibold text-gray-700 mb-4">Completed Work Orders by Technician</h2>
           <ResponsiveContainer width="100%" height={300}>
            <BarChart data={technicianPerformanceData}>
               <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false}/>
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="Completed WOs" fill="url(#colorCompleted)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-center p-6 bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
           <h2 className="text-lg font-semibold">AI-Powered Business Summary</h2>
           <button onClick={handleGenerateSummary} disabled={isLoading} className="flex items-center space-x-2 bg-white text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 transition disabled:bg-gray-300 disabled:text-gray-500 font-semibold">
             {isLoading ? <SpinnerIcon className="h-5 w-5"/> : <AiIcon className="h-5 w-5"/>}
             <span>{isLoading ? 'Generating...' : 'Generate Summary'}</span>
           </button>
        </div>
        <div className="p-6">
            <div className="prose max-w-none bg-gray-50 p-4 rounded-md min-h-[150px]">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">Generating insights...</p>
                </div>
            ) : (
                summary ? <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }} /> : <p className="text-gray-500">Click "Generate Summary" to get AI-powered insights for your business.</p>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

const CustomersAndClientsPage: React.FC<{ 
    customers: Customer[],
    clients: Client[],
    onAddCustomer: () => void, 
    onEditCustomer: (c: Customer) => void,
    onAddClient: () => void,
    onEditClient: (c: Client) => void,
}> = ({ customers, clients, onAddCustomer, onEditCustomer, onAddClient, onEditClient }) => {
    const [activeTab, setActiveTab] = useState<'customers' | 'clients'>('customers');
    
    const renderCustomers = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Customer List</h2>
                <button onClick={onAddCustomer} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add Customer</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Category</th>
                            <th scope="col" className="px-6 py-3">Tags</th>
                            <th scope="col" className="px-6 py-3">Contact</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <Link to={`/customers/${customer.id}`} className="text-primary-600 hover:underline">{customer.name}</Link>
                                </td>
                                    <td className="px-6 py-4">{customer.category || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    {customer.tags?.map(tag => (
                                        <span key={tag} className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs mr-1 mb-1">{tag}</span>
                                    ))}
                                </td>
                                <td className="px-6 py-4">
                                    <div>{customer.email}</div>
                                    <div>{customer.phone}</div>
                                </td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => onEditCustomer(customer)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    const renderClients = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Client List</h2>
                <button onClick={onAddClient} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add Client</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Client Name</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{client.name}</td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => onEditClient(client)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Customers & Clients</h1>
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('customers')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'customers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <CustomerIcon className={`mr-2 h-5 w-5 ${activeTab === 'customers' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>Customers</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'clients' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <BriefcaseIcon className={`mr-2 h-5 w-5 ${activeTab === 'clients' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>Clients</span>
                    </button>
                </nav>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                {activeTab === 'customers' ? renderCustomers() : renderClients()}
            </div>
        </div>
    );
};

const CustomerDetail: React.FC<{
    customers: Customer[],
    workOrders: WorkOrder[],
    contracts: ServiceContract[],
    users: User[],
    onEditCustomer: (c: Customer) => void,
    onAddContract: (customerId: string) => void,
    onEditContract: (c: ServiceContract) => void,
    onCreateWorkOrder: (customerId: string) => void,
    onChat: (c: Customer) => void,
    onNotify: (c: Customer) => void,
}> = ({ customers, workOrders, contracts, users, onEditCustomer, onAddContract, onEditContract, onCreateWorkOrder, onChat, onNotify }) => {
    const { customerId } = useParams();
    const customer = customers.find(c => c.id === customerId);
    
    const customerWorkOrders = useMemo(() => 
        workOrders.filter(wo => wo.customer.id === customerId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
    [workOrders, customerId]);

    const customerContracts = useMemo(() => 
        contracts.filter(c => c.customerId === customerId).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [contracts, customerId]);

    if (!customer) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-700">Customer Not Found</h2>
                <Link to="/customers" className="mt-4 inline-block text-primary-600 hover:underline">← Back to Customer List</Link>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                 <Link to="/customers" className="text-sm font-medium text-primary-600 hover:underline flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Back to all customers
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">{customer.name}</h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
                        <div className="space-y-3 text-sm">
                            <p><strong>Email:</strong> <a href={`mailto:${customer.email}`} className="text-primary-600">{customer.email}</a></p>
                            <p><strong>Phone:</strong> <a href={`tel:${customer.phone}`} className="text-primary-600">{customer.phone}</a></p>
                            <p><strong>Address:</strong> {customer.address}</p>
                            <p><strong>Category:</strong> <span className="font-semibold">{customer.category || 'N/A'}</span></p>
                            <div>
                                <strong>Tags:</strong>
                                <div className="mt-1">
                                    {customer.tags?.map(tag => (
                                        <span key={tag} className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs mr-1 mb-1">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4 flex space-x-2">
                            <button onClick={() => onEditCustomer(customer)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">Edit Customer</button>
                            <button onClick={() => onChat(customer)} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm">Chat</button>
                            <button onClick={() => onNotify(customer)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">Notify</button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Service Contracts</h2>
                            <button onClick={() => onAddContract(customer.id)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">Add Contract</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2">Title</th>
                                        <th className="px-4 py-2">Period</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerContracts.map(contract => (
                                        <tr key={contract.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium">{contract.title}</td>
                                            <td className="px-4 py-2">{contract.startDate} to {contract.endDate}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getContractStatusColor(contract.status)}`}>{contract.status}</span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <button onClick={() => onEditContract(contract)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customerContracts.length === 0 && (
                                        <tr><td colSpan={4} className="text-center py-4 text-gray-500">No contracts found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Service History</h2>
                            <button onClick={() => onCreateWorkOrder(customer.id)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">Create Work Order</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Description</th>
                                        <th className="px-4 py-2">Technician</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerWorkOrders.map(wo => (
                                        <tr key={wo.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{wo.createdAt}</td>
                                            <td className="px-4 py-2 max-w-xs truncate">{wo.description}</td>
                                            <td className="px-4 py-2">{formatUserName(users.find(u => u.id === wo.technicianId)?.name) || 'N/A'}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>{wo.status}</span>
                                            </td>
                                            <td className="px-4 py-2 font-semibold">{formatIDR(wo.totalCost)}</td>
                                        </tr>
                                    ))}
                                    {customerWorkOrders.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-4 text-gray-500">No service history found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DropdownMenu: React.FC<{ trigger: React.ReactNode; children: React.ReactNode }> = ({ trigger, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const childrenWithClickHandler = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            // FIX: By casting `child` to `React.ReactElement`, we provide TypeScript with enough
            // information to know that it can accept an `onClick` prop, resolving the overload error.
            const castedChild = child as React.ReactElement<any>;
            const originalOnClick = castedChild.props.onClick;
            return React.cloneElement(castedChild, {
                onClick: (...args: any[]) => {
                    if (originalOnClick) {
                        originalOnClick(...args);
                    }
                    setIsOpen(false);
                },
            });
        }
        return child;
    });


    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button onClick={() => setIsOpen(o => !o)} className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                {trigger}
            </button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {childrenWithClickHandler}
                    </div>
                </div>
            )}
        </div>
    );
};

const WorkOrders: React.FC<{
    user: User;
    workOrders: WorkOrder[];
    invoices: Invoice[];
    users: User[];
    transactions: Transaction[];
    companyProfile: CompanyProfile;
    clients: Client[];
    onAddPart: (wo: WorkOrder) => void;
    onCreate: () => void;
    onAssign: (wo: WorkOrder) => void;
    onClaim: (woId: string, techId: string) => void;
    onComplete: (woId: string) => void;
    onMarkAsPaid: (wo: WorkOrder) => void;
    onChat: (c: Customer, wo: WorkOrder) => void;
    onNotify: (c: Customer, wo: WorkOrder) => void;
    onRequestReimbursement: (wo: WorkOrder) => void;
}> = ({ user, workOrders, invoices, users, transactions, companyProfile, clients, onAddPart, onCreate, onAssign, onClaim, onComplete, onMarkAsPaid, onChat, onNotify, onRequestReimbursement }) => {
    const isTechnician = user.role === UserRole.TECHNICIAN;

    const generateSpkPdf = (order: WorkOrder) => {
        const doc = new jsPDF();
        
        generatePdfHeader(doc, companyProfile);

        doc.setFontSize(20);
        doc.text("Surat Perintah Kerja (SPK)", 105, 65, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`SPK ID: ${order.id}`, 14, 75);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 82);

        autoTable(doc, {
            startY: 90,
            head: [['Informasi Pelanggan', '']],
            body: [
                ['Nama', order.customer.name],
                ['Alamat', order.customer.address],
                ['Telepon', order.customer.phone],
            ],
            theme: 'grid'
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Deskripsi Pekerjaan', '']],
            body: [[order.description]],
            theme: 'grid'
        });

        if(order.spareParts.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['No', 'Spare Part', 'Harga']],
                body: order.spareParts.map((part, i) => [i + 1, part.name, formatIDR(part.sellingPrice)]),
                theme: 'grid'
            });
        }
        
        const finalY = (doc as any).lastAutoTable.finalY || 100;
        doc.text(`Total Biaya: ${formatIDR(order.totalCost)}`, 14, finalY + 15);
        doc.text(`Teknisi: ${users.find(u => u.id === order.technicianId)?.name || 'N/A'}`, 14, finalY + 22);

        doc.text("Tanda Tangan Pelanggan", 40, finalY + 50, { align: 'center' });
        doc.line(20, finalY + 70, 60, finalY + 70);

        doc.text("Tanda Tangan Teknisi", 165, finalY + 50, { align: 'center' });
        doc.line(145, finalY + 70, 185, finalY + 70);

        doc.save(`SPK-${order.id}.pdf`);
    };

    const renderOrderTable = (title: string, orders: WorkOrder[]) => {
        const showClientColumn = !isTechnician;
        return (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    {title === 'All Work Orders' && <button onClick={onCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Create Work Order</button>}
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">ID</th>
                                <th scope="col" className="px-6 py-3">Customer</th>
                                {showClientColumn && <th scope="col" className="px-6 py-3">Client</th>}
                                <th scope="col" className="px-6 py-3">Description</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Technician</th>
                                <th scope="col" className="px-6 py-3">Total</th>
                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const correspondingInvoice = invoices.find(inv => inv.workOrderId === order.id);
                                const isPaid = correspondingInvoice?.status === 'Paid';
                                const reimbursementHistory = transactions.filter(t => t.workOrderId === order.id && t.category === TransactionCategory.REIMBURSEMENT);
                                const clientName = clients.find(c => c.id === order.clientId)?.name || '-';

                                const actionItemClass = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100";
                                const actionItemClassPrimary = "block w-full text-left px-4 py-2 text-sm font-medium text-primary-600 hover:bg-gray-100";
                                const actionItemClassGreen = "block w-full text-left px-4 py-2 text-sm font-medium text-green-600 hover:bg-gray-100";
                                
                                const technicianActions = (
                                    <>
                                        {order.status === WorkOrderStatus.IN_PROGRESS && (
                                            <>
                                              <button onClick={() => onAddPart(order)} className={actionItemClass}>Add Part</button>
                                              <button onClick={() => onComplete(order.id)} className={actionItemClass}>Complete</button>
                                            </>
                                        )}
                                        {order.status === WorkOrderStatus.COMPLETED && !isPaid && (
                                            <button onClick={() => onMarkAsPaid(order)} className={actionItemClassGreen}>Confirm Payment</button>
                                        )}
                                        <button onClick={() => onRequestReimbursement(order)} className={actionItemClass}>Reimburse</button>
                                        <button onClick={() => generateSpkPdf(order)} className={actionItemClass}>Print SPK</button>
                                        {order.coordinates && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${order.coordinates.lat},${order.coordinates.lng}`} target="_blank" rel="noopener noreferrer" className={`${actionItemClass} inline-flex items-center`}>
                                              <MapPinIcon className="h-4 w-4 mr-2"/>Map
                                            </a>
                                        )}
                                        <button onClick={() => onChat(order.customer, order)} className={actionItemClass}>Chat</button>
                                        <button onClick={() => onNotify(order.customer, order)} className={actionItemClass}>Notify</button>
                                    </>
                                );

                                const adminActions = (
                                    <>
                                        <button onClick={() => onAssign(order)} className={actionItemClass}>{order.technicianId ? 'Re-assign' : 'Assign'}</button>
                                        {order.coordinates && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${order.coordinates.lat},${order.coordinates.lng}`} target="_blank" rel="noopener noreferrer" className={`${actionItemClass} inline-flex items-center`}>
                                              <MapPinIcon className="h-4 w-4 mr-2"/>Map
                                            </a>
                                        )}
                                        <button onClick={() => generateSpkPdf(order)} className={actionItemClass}>Print SPK</button>
                                    </>
                                );

                                return (
                                <React.Fragment key={order.id}>
                                    <tr className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                                        <td className="px-6 py-4">{order.customer.name}</td>
                                        {showClientColumn && <td className="px-6 py-4">{clientName}</td>}
                                        <td className="px-6 py-4 max-w-xs truncate">{order.description}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{formatUserName(users.find(u => u.id === order.technicianId)?.name) || 'Unassigned'}</td>
                                        <td className="px-6 py-4 font-semibold">{formatIDR(order.totalCost)}</td>
                                        <td className="px-6 py-4 text-right">
                                            {isTechnician ? (
                                                order.technicianId === user.id ? (
                                                    isPaid ? (
                                                        <span className="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Paid</span>
                                                    ) : (
                                                        <DropdownMenu trigger={<MoreVerticalIcon className="h-5 w-5 text-gray-500" />}>
                                                            {technicianActions}
                                                        </DropdownMenu>
                                                    )
                                                ) : !order.technicianId ? (
                                                    <DropdownMenu trigger={<MoreVerticalIcon className="h-5 w-5 text-gray-500" />}>
                                                        <button onClick={() => onClaim(order.id, user.id)} className={actionItemClassPrimary}>Claim Job</button>
                                                    </DropdownMenu>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )
                                            ) : (
                                                <DropdownMenu trigger={<MoreVerticalIcon className="h-5 w-5 text-gray-500" />}>
                                                    {adminActions}
                                                </DropdownMenu>
                                            )}
                                        </td>
                                    </tr>
                                    {reimbursementHistory.length > 0 && isTechnician && order.technicianId === user.id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={showClientColumn ? 8 : 7} className="px-6 py-3">
                                                <div className="pl-8">
                                                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Reimbursement History:</h4>
                                                    <ul className="space-y-1">
                                                        {reimbursementHistory.map(req => (
                                                            <li key={req.id} className="flex justify-between items-center text-xs text-gray-700">
                                                                <span>{req.description} - {formatIDR(req.amount)}</span>
                                                                {req.approved ? (
                                                                    <span className="px-2 py-0.5 font-medium rounded-full bg-green-100 text-green-800">Approved</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };
    
    const myWorkOrders = workOrders.filter(wo => wo.technicianId === user.id);
    const unassignedWorkOrders = workOrders.filter(wo => !wo.technicianId);

    return (
        <div>
            {isTechnician ? (
                <>
                    <h1 className="text-3xl font-bold text-gray-800">{formatUserName(user.name)}</h1>
                    <h2 className="text-xl text-gray-500 mb-6">Work Orders</h2>
                </>
            ) : (
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Work Order Management</h1>
            )}
             {isTechnician ? (
                <>
                    {renderOrderTable('My Assigned Work Orders', myWorkOrders)}
                    {renderOrderTable('Available Work Orders', unassignedWorkOrders)}
                </>
             ) : (
                renderOrderTable('All Work Orders', workOrders)
             )}
        </div>
    );
};

const SpareParts: React.FC<{ 
    spareParts: SparePart[], 
    suppliers: Supplier[],
    onAddPart: () => void, 
    onEditPart: (sp: SparePart) => void,
    onAddSupplier: () => void,
    onEditSupplier: (s: Supplier) => void,
}> = ({ spareParts, suppliers, onAddPart, onEditPart, onAddSupplier, onEditSupplier }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers'>('inventory');

    const renderInventory = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Spare Part Inventory</h2>
                <button onClick={onAddPart} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add Spare Part</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Kode Item</th>
                            <th scope="col" className="px-6 py-3">Part Name</th>
                            <th scope="col" className="px-6 py-3">Supplier</th>
                            <th scope="col" className="px-6 py-3">Harga Beli</th>
                            <th scope="col" className="px-6 py-3">Harga Jual</th>
                            <th scope="col" className="px-6 py-3">Stock</th>
                            <th scope="col" className="px-6 py-3">Satuan</th>
                            <th scope="col" className="px-6 py-3">Location</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {spareParts.map(part => (
                            <tr key={part.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-mono text-xs">{part.itemCode}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{part.name}</td>
                                <td className="px-6 py-4">{suppliers.find(s => s.id === part.supplierId)?.name || '-'}</td>
                                <td className="px-6 py-4">{part.purchasePrice ? formatIDR(part.purchasePrice) : '-'}</td>
                                <td className="px-6 py-4">{formatIDR(part.sellingPrice)}</td>
                                <td className={`px-6 py-4 font-semibold ${part.stock <= 5 ? 'text-red-600' : 'text-gray-900'}`}>{part.stock}</td>
                                <td className="px-6 py-4">{part.unit}</td>
                                <td className="px-6 py-4">{part.location}</td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => onEditPart(part)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    const renderSuppliers = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Supplier List</h2>
                <button onClick={onAddSupplier} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add Supplier</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Supplier Name</th>
                            <th scope="col" className="px-6 py-3">Contact Person</th>
                            <th scope="col" className="px-6 py-3">Contact Info</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.map(supplier => (
                            <tr key={supplier.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                                <td className="px-6 py-4">{supplier.contactPerson}</td>
                                <td className="px-6 py-4">
                                    <div>{supplier.phone}</div>
                                    <div>{supplier.email}</div>
                                </td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => onEditSupplier(supplier)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Spare Part Management</h1>
             <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <SparePartIcon className={`mr-2 h-5 w-5 ${activeTab === 'inventory' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>Inventory</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'suppliers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <TruckIcon className={`mr-2 h-5 w-5 ${activeTab === 'suppliers' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>Suppliers</span>
                    </button>
                </nav>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                {activeTab === 'inventory' ? renderInventory() : renderSuppliers()}
            </div>
        </div>
    );
};

const Finance: React.FC<{
    invoices: Invoice[],
    customers: Customer[],
    transactions: Transaction[],
    totalIncome: number,
    totalExpense: number,
    labaRugi: number,
    assets: number,
    liabilities: number,
    equity: number,
    onAddInvoice: () => void,
    onEditInvoice: (invoice: Invoice) => void,
    onPrintInvoice: (invoice: Invoice) => void,
    onAddTransaction: () => void,
    onEditTransaction: (record: Transaction) => void,
    onGenerateReport: () => void,
    currentUser: User,
    onApproveReimbursement: (transactionId: string) => void,
    onViewAttachment: (attachment: NonNullable<Transaction['attachment']>) => void,
}> = ({ 
    invoices, 
    customers, 
    transactions,
    totalIncome,
    totalExpense,
    labaRugi,
    assets,
    liabilities,
    equity,
    onAddInvoice, 
    onEditInvoice, 
    onPrintInvoice, 
    onAddTransaction, 
    onEditTransaction,
    onGenerateReport,
    currentUser,
    onApproveReimbursement,
    onViewAttachment
}) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Finance</h1>
                <button onClick={onGenerateReport} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Generate Financial Report
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <StatCard title="Total Income" value={formatIDR(totalIncome)} icon={<FinanceIcon className="h-6 w-6 text-green-600" />} color="green" />
                 <StatCard title="Total Expense" value={formatIDR(totalExpense)} icon={<FinanceIcon className="h-6 w-6 text-red-600" />} color="yellow" />
                 <StatCard title="Profit / Loss" value={formatIDR(labaRugi)} icon={<FinanceIcon className={`h-6 w-6 ${labaRugi >= 0 ? 'text-blue-600' : 'text-red-600'}`} />} color="blue" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Invoices</h2>
                    <button onClick={onAddInvoice} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add Invoice</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Invoice ID</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Issued Date</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                         <tbody>
                            {invoices.map(invoice => (
                                <tr key={invoice.id} className="border-b">
                                    <td className="px-6 py-4 font-medium">{invoice.id}</td>
                                    <td className="px-6 py-4">{customers.find(c => c.id === invoice.customerId)?.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{invoice.issuedDate}</td>
                                    <td className="px-6 py-4 font-semibold">{formatIDR(invoice.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                        <button onClick={() => onEditInvoice(invoice)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                        <button onClick={() => onPrintInvoice(invoice)} className="font-medium text-green-600 hover:underline">Print</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">All Transactions</h2>
                        <button onClick={onAddTransaction} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm">Add Transaction</button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(record => {
                                    const isPendingReimbursement = record.category === TransactionCategory.REIMBURSEMENT && !record.approved;
                                    return (
                                        <tr key={record.id} className={`border-b ${isPendingReimbursement ? 'bg-yellow-50' : ''}`}>
                                            <td className="px-6 py-4">{record.date}</td>
                                            <td className="px-6 py-4">
                                                {record.description}
                                                {isPendingReimbursement && <span className="text-xs font-bold text-yellow-800 ml-2">(Pending Approval)</span>}
                                            </td>
                                            <td className="px-6 py-4">{record.category}</td>
                                            <td className={`px-6 py-4 font-semibold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatIDR(record.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {record.attachment && (
                                                    <button onClick={() => onViewAttachment(record.attachment!)} className="font-medium text-blue-600 hover:underline mr-2">
                                                        View
                                                    </button>
                                                )}
                                                {!record.invoiceId && record.category !== TransactionCategory.REIMBURSEMENT && (
                                                    <button onClick={() => onEditTransaction(record)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                                )}
                                                {isPendingReimbursement && currentUser.role === UserRole.ADMINISTRATOR && (
                                                    <button onClick={() => onApproveReimbursement(record.id)} className="font-medium text-green-600 hover:underline">Approve</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-semibold mb-4">Balance Sheet (Neraca)</h2>
                     <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg text-green-700">Assets</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span>Cash</span>
                                <span className="font-bold">{formatIDR(assets)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 border-t pt-2">
                                <span className="font-bold">Total Assets</span>
                                <span className="font-bold">{formatIDR(assets)}</span>
                            </div>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-red-700">Liabilities</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span>Operational Costs</span>
                                <span className="font-bold">{formatIDR(liabilities)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 border-t pt-2">
                                <span className="font-bold">Total Liabilities</span>
                                <span className="font-bold">{formatIDR(liabilities)}</span>
                            </div>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-blue-700">Equity</h3>
                             <div className="flex justify-between items-center mt-1">
                                <span>Retained Earnings (Profit)</span>
                                <span className="font-bold">{formatIDR(equity)}</span>
                            </div>
                             <div className="flex justify-between items-center mt-2 border-t pt-2">
                                <span className="font-bold">Total Equity</span>
                                <span className="font-bold">{formatIDR(equity)}</span>
                            </div>
                        </div>
                         <div className="bg-gray-100 p-3 rounded-md mt-4 text-center">
                            <span className="font-bold text-gray-800">Total Liabilities + Equity = {formatIDR(liabilities + equity)}</span>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

const EmployeesPage: React.FC<{
    users: User[];
    workOrders: WorkOrder[];
    onEdit: (user: User) => void;
    onStatusChange: (userId: string, status: TechnicianStatus) => void;
}> = ({ users, workOrders, onEdit, onStatusChange }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            (user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const getTechnicianKpis = (technicianId: string) => {
        const completedWos = workOrders.filter(wo => wo.technicianId === technicianId && wo.status === WorkOrderStatus.COMPLETED);
        const inProgressWos = workOrders.filter(wo => wo.technicianId === technicianId && wo.status === WorkOrderStatus.IN_PROGRESS);
        const revenueGenerated = completedWos.reduce((acc, wo) => acc + wo.totalCost, 0);

        return {
            completed: completedWos.length,
            inProgress: inProgressWos.length,
            revenue: revenueGenerated
        };
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Employee Management</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">All Employees</h2>
                    <div className="w-full max-w-xs">
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Performance</th>
                                <th scope="col" className="px-6 py-3">Contact</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => {
                                const kpis = user.role === UserRole.TECHNICIAN ? getTechnicianKpis(user.id) : null;
                                return (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {user.role === UserRole.TECHNICIAN ? (
                                            <Link to={`/employees/${user.id}`} className="text-primary-600 hover:underline">{formatUserName(user.name)}</Link>
                                        ) : (
                                            formatUserName(user.name)
                                        )}
                                    </td>
                                    <td className="px-6 py-4 capitalize">{user.role}</td>
                                    <td className="px-6 py-4">
                                        {user.role === UserRole.TECHNICIAN ? (
                                            <select
                                                value={user.status}
                                                onChange={(e) => onStatusChange(user.id, e.target.value as TechnicianStatus)}
                                                className={`w-full p-1 text-xs border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${getTechnicianStatusColor(user.status)}`}
                                            >
                                                {Object.values(TechnicianStatus).map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {kpis ? (
                                            <div className="text-xs">
                                                <div>Completed: <strong>{kpis.completed}</strong></div>
                                                <div>In Progress: <strong>{kpis.inProgress}</strong></div>
                                                <div>Revenue: <strong>{formatIDR(kpis.revenue)}</strong></div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>{user.email || '-'}</div>
                                        <div>{user.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 space-x-2">
                                        <button onClick={() => onEdit(user)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TechnicianProfilePage: React.FC<{ users: User[]; workOrders: WorkOrder[] }> = ({ users, workOrders }) => {
    const { employeeId } = useParams();
    const technician = users.find(u => u.id === employeeId);

    const technicianWorkOrders = useMemo(() =>
        workOrders
            .filter(wo => wo.technicianId === employeeId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [workOrders, employeeId]
    );
    
    const kpis = useMemo(() => {
        if (!technician) return { completed: 0, inProgress: 0, revenue: 0 };
        const completedWos = technicianWorkOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED);
        return {
            completed: completedWos.length,
            inProgress: technicianWorkOrders.filter(wo => wo.status === WorkOrderStatus.IN_PROGRESS).length,
            revenue: completedWos.reduce((acc, wo) => acc + wo.totalCost, 0)
        }
    }, [technician, technicianWorkOrders]);

    if (!technician) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-700">Technician Not Found</h2>
                <Link to="/employees" className="mt-4 inline-block text-primary-600 hover:underline">← Back to Employee List</Link>
            </div>
        );
    }
    
    return (
        <div>
            <div className="mb-6">
                 <Link to="/employees" className="text-sm font-medium text-primary-600 hover:underline flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Back to all employees
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">Technician Profile</h1>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                        <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">{formatUserName(technician.name)}</h2>
                        <p className="text-gray-500 capitalize">{technician.role}</p>
                        <span className={`mt-2 inline-block px-3 py-1 text-sm font-medium rounded-full ${getTechnicianStatusColor(technician.status)}`}>
                            {technician.status}
                        </span>
                        <div className="mt-4 text-left space-y-2 text-sm border-t pt-4">
                            <p><strong>Email:</strong> <a href={`mailto:${technician.email}`} className="text-primary-600">{technician.email || '-'}</a></p>
                            <p><strong>Phone:</strong> <a href={`tel:${technician.phone}`} className="text-primary-600">{technician.phone || '-'}</a></p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">Performance</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between"><span>Completed WOs</span><span className="font-bold">{kpis.completed}</span></div>
                            <div className="flex justify-between"><span>In Progress WOs</span><span className="font-bold">{kpis.inProgress}</span></div>
                            <div className="flex justify-between"><span>Revenue Generated</span><span className="font-bold">{formatIDR(kpis.revenue)}</span></div>
                        </div>
                    </div>
                </div>
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><strong>No. Karyawan:</strong> <p>{technician.employeeId || '-'}</p></div>
                            <div><strong>Jenis Kelamin:</strong> <p>{technician.gender || '-'}</p></div>
                            <div><strong>Tempat, Tgl Lahir:</strong> <p>{technician.placeOfBirth || '-'}, {technician.dateOfBirth || '-'}</p></div>
                             <div><strong>Lama Bekerja:</strong> <p>{technician.joinDate ? calculateTenure(technician.joinDate) : '-'}</p></div>
                            <div className="md:col-span-2"><strong>Alamat:</strong> <p>{technician.address || '-'}</p></div>
                            <div className="md:col-span-2">
                                <strong>Keahlian:</strong>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {technician.skills?.map(skill => (
                                        <span key={skill} className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs">{skill}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">Recent Activity</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Customer</th>
                                        <th className="px-4 py-2">Description</th>
                                        <th className="px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {technicianWorkOrders.slice(0, 5).map(wo => (
                                        <tr key={wo.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{wo.createdAt}</td>
                                            <td className="px-4 py-2">{wo.customer.name}</td>
                                            <td className="px-4 py-2 truncate max-w-xs">{wo.description}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>{wo.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {technicianWorkOrders.length === 0 && (
                                        <tr><td colSpan={4} className="text-center py-4 text-gray-500">No work orders found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}


const Settings: React.FC<{
    customers: Customer[], 
    workOrders: WorkOrder[], 
    users: User[],
    profile: CompanyProfile,
    onProfileSave: (profile: CompanyProfile) => void
}> = ({customers, workOrders, users, profile, onProfileSave}) => {
    const [formData, setFormData] = useState<CompanyProfile>(profile);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({...prev, logo: reader.result as string}));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onProfileSave(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleExport = (format: 'json' | 'pdf' | 'excel') => {
        if (format === 'json') {
            const dataStr = JSON.stringify({ users, customers, workOrders }, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `servispro-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("ServisPro Data Backup", 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Exported on: ${new Date().toLocaleString('id-ID')}`, 14, 30);

            autoTable(doc, {
                startY: 40,
                head: [['ID', 'Name', 'Email', 'Phone', 'Address']],
                body: customers.map(c => [c.id, c.name, c.email, c.phone, c.address]),
                didDrawPage: (data: any) => {
                     doc.setFontSize(16);
                     doc.text('Customers', data.settings.margin.left, 35);
                }
            });

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 15,
                head: [['ID', 'Customer', 'Status', 'Technician', 'Total Cost']],
                body: workOrders.map(w => [w.id, w.customer.name, w.status, formatUserName(users.find(u => u.id === w.technicianId)?.name) || 'N/A', formatIDR(w.totalCost)]),
                 didDrawPage: (data: any) => {
                     doc.setFontSize(16);
                     doc.text('Work Orders', data.settings.margin.left, (doc as any).lastAutoTable.finalY + 10);
                }
            });

            doc.save(`servispro-backup-${new Date().toISOString().split('T')[0]}.pdf`);
        } else {
             alert("Excel export functionality would be implemented here.");
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings & Data</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Company Profile (KOP Surat)</h2>
                 <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Company Logo</label>
                        <div className="mt-1 flex items-center space-x-4">
                            {formData.logo && <img src={formData.logo} alt="Company Logo" className="h-16 w-16 object-contain rounded-md bg-gray-100 p-1" />}
                            <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Changes</button>
                        {saved && <span className="text-sm text-green-600">Profile saved successfully!</span>}
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Data Backup & Restore</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-gray-700">Export Data</h3>
                        <p className="text-sm text-gray-500 mb-2">Download a copy of your application data.</p>
                        <div className="flex space-x-2">
                            <button onClick={() => handleExport('json')} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Export JSON</button>
                            <button onClick={() => handleExport('pdf')} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Export PDF</button>
                            <button onClick={() => handleExport('excel')} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">Export Excel</button>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-700">Restore Data</h3>
                        <p className="text-sm text-gray-500 mb-2">Upload a JSON backup file to restore data.</p>
                        <input type="file" className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- AI CHATBOT COMPONENT ---
const Chatbot: React.FC<{
    currentUser: User;
    appData: any;
}> = ({ currentUser, appData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newMessages: ChatMessage[] = [...messages, { sender: 'user', text: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            const context = { ...appData, currentUser };
            const aiResponse = await getChatbotResponse(newMessages, context);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, something went wrong.' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <div className="fixed bottom-8 right-8 z-[100]">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
                    aria-label="Toggle Chatbot"
                >
                    {isOpen ? <XIcon className="h-8 w-8" /> : <AiIcon className="h-8 w-8" />}
                </button>
            </div>
            
            {isOpen && (
                <div className="fixed bottom-28 right-8 z-[100] w-full max-w-sm bg-white rounded-xl shadow-2xl flex flex-col h-[70vh] max-h-[600px]">
                    <div className="bg-primary-600 text-white p-4 rounded-t-xl">
                        <h3 className="font-bold text-lg">ServisAI Assistant</h3>
                        <p className="text-sm text-primary-200">Ask me about your business data.</p>
                    </div>
                    
                    <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.length === 0 && (
                             <div className="text-center text-gray-500 mt-8">
                                <AiIcon className="h-12 w-12 mx-auto text-gray-300"/>
                                <p className="mt-2">Ask "How many pending jobs?" or "Summarize Budi's performance".</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs rounded-xl px-4 py-2 ${msg.sender === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                   <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-200 text-gray-800 rounded-xl px-4 py-2 flex items-center space-x-2">
                                   <SpinnerIcon className="h-5 w-5"/>
                                   <span>Thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 border-t border-gray-200">
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                            <input 
                                type="text"
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                            <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-primary-600 text-white p-2.5 rounded-full hover:bg-primary-700 disabled:bg-gray-300 flex-shrink-0">
                                <SendIcon className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // App-wide state
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [spareParts, setSpareParts] = useState<SparePart[]>(INITIAL_SPARE_PARTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [contracts, setContracts] = useState<ServiceContract[]>(INITIAL_CONTRACTS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: 'ServisPro Inc.',
    address: '123 Service St, Tech City, 12345',
    email: 'contact@servispro.com',
    phone: '0812-3456-7890',
    logo: '',
  });

  // Modal State
  const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: null });

  const technicians = useMemo(() => users.filter(u => u.role === UserRole.TECHNICIAN), [users]);

  // --- Financial Calculations ---
  const sortedTransactions = useMemo(() => 
    transactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );
  
  const totalIncome = transactions.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = transactions.filter(r => {
      if (r.type !== 'expense') return false;
      if (r.category === TransactionCategory.REIMBURSEMENT) {
        return r.approved === true;
      }
      return true;
    }).reduce((sum, r) => sum + r.amount, 0);

  const labaRugi = totalIncome - totalExpense;
  const assets = totalIncome; // Simplified for this example
  const liabilities = totalExpense; // Simplified for this example
  const equity = labaRugi; // Simplified for this example


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthScreen('login');
  };

  const handleLogout = () => {
      setCurrentUser(null);
  }

  const handleSignUp = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    alert(`User ${newUser.name} created! Please log in.`);
    setAuthScreen('login');
  };
  
  const handleSaveCustomer = (customer: Customer) => {
    const exists = customers.some(c => c.id === customer.id);
    if(exists) {
        setCustomers(customers.map(c => c.id === customer.id ? customer : c));
    } else {
        setCustomers([...customers, customer]);
    }
    setModalState({ type: null, data: null });
  };

  const handleSaveClient = (client: Client) => {
    const exists = clients.some(c => c.id === client.id);
    if (exists) {
        setClients(clients.map(c => c.id === client.id ? client : c));
    } else {
        setClients([client, ...clients]);
    }
    setModalState({ type: null, data: null });
  };

  const handleSaveEmployee = (user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    setModalState({ type: null, data: null });
};
  
  const handleCreateWorkOrder = (data: { customerId: string; description: string; totalCost: number; clientId?: string }) => {
    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) return;
    const newWorkOrder: WorkOrder = {
        id: `wo-${Date.now()}`,
        customer,
        description: data.description,
        totalCost: data.totalCost,
        status: WorkOrderStatus.PENDING,
        technicianId: null,
        createdAt: new Date().toISOString().split('T')[0],
        spareParts: [],
        clientId: data.clientId,
        coordinates: customer.coordinates,
    };
    setWorkOrders(prev => [newWorkOrder, ...prev]);

    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      message: `New SPK created: "${newWorkOrder.description}" for ${newWorkOrder.customer.name}.`,
      timestamp: new Date().toISOString(),
      read: false,
      link: '/work-orders',
      workOrderId: newWorkOrder.id
    };
    setNotifications(prev => [newNotification, ...prev]);

    setModalState({ type: null, data: null });
  };
  
  const handleAssignTechnician = (workOrderId: string, technicianId: string) => {
      setWorkOrders(prev => prev.map(wo => wo.id === workOrderId ? {...wo, technicianId} : wo));
      setModalState({ type: null, data: null });
  };

  const handleClaimJob = (workOrderId: string, technicianId: string) => {
    setWorkOrders(prev => prev.map(wo => 
      wo.id === workOrderId 
        ? { ...wo, technicianId, status: WorkOrderStatus.IN_PROGRESS } 
        : wo
    ));
    setUsers(prev => prev.map(u => u.id === technicianId ? { ...u, status: TechnicianStatus.ON_JOB } : u));
    setNotifications(prev => prev.map(n => n.workOrderId === workOrderId ? { ...n, read: true } : n));
  };

  const handleUpdateWorkOrderParts = (workOrderId: string, newParts: SparePart[]) => {
      const originalWorkOrder = workOrders.find(wo => wo.id === workOrderId);
      if (!originalWorkOrder) return;

      const originalParts = originalWorkOrder.spareParts;
      const addedParts = newParts.filter(p => !originalParts.some(op => op.id === p.id));
      const removedParts = originalParts.filter(op => !newParts.some(p => p.id === op.id));

      setSpareParts(currentInventory => {
        let updatedInventory = [...currentInventory];
        addedParts.forEach(addedPart => {
          updatedInventory = updatedInventory.map(invPart => 
            invPart.id === addedPart.id ? { ...invPart, stock: invPart.stock - 1 } : invPart
          );
        });
        removedParts.forEach(removedPart => {
          updatedInventory = updatedInventory.map(invPart =>
            invPart.id === removedPart.id ? { ...invPart, stock: invPart.stock + 1 } : invPart
          );
        });
        return updatedInventory;
      });
      
      setWorkOrders(prev => prev.map(wo => {
          if (wo.id === workOrderId) {
              const partsCost = newParts.reduce((sum, part) => sum + part.sellingPrice, 0);
              const baseCost = wo.totalCost - wo.spareParts.reduce((sum, part) => sum + part.sellingPrice, 0);
              return { ...wo, spareParts: newParts, totalCost: baseCost + partsCost };
          }
          return wo;
      }));
  };

  const handleCompleteWorkOrder = (workOrderId: string) => {
    const workOrderToComplete = workOrders.find(wo => wo.id === workOrderId);

    if (workOrderToComplete) {
      const completionDate = new Date().toISOString().split('T')[0];
      
      const existingInvoice = invoices.find(inv => inv.workOrderId === workOrderId);
      if (!existingInvoice) {
          const newInvoice: Invoice = {
            id: `INV-${workOrderToComplete.id}`,
            workOrderId: workOrderToComplete.id,
            customerId: workOrderToComplete.customer.id,
            amount: workOrderToComplete.totalCost,
            issuedDate: completionDate,
            status: 'Unpaid',
          };
          setInvoices(prev => [...prev, newInvoice]);
      }
      
      setWorkOrders(prev => prev.map(wo => 
        wo.id === workOrderId 
          ? { 
              ...wo, 
              status: WorkOrderStatus.COMPLETED,
              completedAt: completionDate
            } 
          : wo
      ));
      
      const technicianId = workOrderToComplete.technicianId;
      const hasOtherJobs = workOrders.some(wo => wo.technicianId === technicianId && wo.status === WorkOrderStatus.IN_PROGRESS && wo.id !== workOrderId);
      if (technicianId && !hasOtherJobs) {
        setUsers(prev => prev.map(u => u.id === technicianId ? { ...u, status: TechnicianStatus.AVAILABLE } : u));
      }

    }
  };
  
  const handleMarkAsPaid = (workOrderId: string, paymentMethod: PaymentMethod, attachment?: { name: string; type: string; data: string; }) => {
    const invoiceToUpdate = invoices.find(inv => inv.workOrderId === workOrderId);
    if (!invoiceToUpdate) {
        alert("Error: Invoice not found for this work order.");
        return;
    }

    const updatedInvoice = { 
        ...invoiceToUpdate, 
        status: 'Paid' as 'Paid', 
        paidDate: new Date().toISOString().split('T')[0] 
    };
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

    const customerName = workOrders.find(wo => wo.id === workOrderId)?.customer.name || 'N/A';
    const newTransaction: Transaction = {
        id: `trn-${updatedInvoice.id}`,
        invoiceId: updatedInvoice.workOrderId,
        date: updatedInvoice.paidDate!,
        description: `Payment for WO from ${customerName}`,
        type: 'income',
        amount: updatedInvoice.amount,
        category: TransactionCategory.SERVICE_INCOME,
        paymentMethod: paymentMethod,
        attachment: attachment,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    
    const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        message: `${formatUserName(currentUser?.name)} confirmed payment of ${formatIDR(updatedInvoice.amount)} for WO-${workOrderId.substring(0,4)} via ${paymentMethod}.`,
        timestamp: new Date().toISOString(),
        read: false,
        link: '/finance',
        workOrderId: workOrderId
    };
    setNotifications(prev => [newNotification, ...prev]);

    setModalState({ type: null, data: null });
  };

  const handleSaveSparePart = (part: SparePart) => {
    const exists = spareParts.some(p => p.id === part.id);
    if (exists) {
        setSpareParts(spareParts.map(p => p.id === part.id ? part : p));
    } else {
        setSpareParts([part, ...spareParts]);
    }
    setModalState({ type: null, data: null });
  };

  const handleSaveSupplier = (supplier: Supplier) => {
    const exists = suppliers.some(s => s.id === supplier.id);
    if (exists) {
        setSuppliers(suppliers.map(s => s.id === supplier.id ? supplier : s));
    } else {
        setSuppliers([supplier, ...suppliers]);
    }
    setModalState({ type: null, data: null });
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    const originalInvoice = invoices.find(i => i.id === invoice.id);
    const wasPaid = originalInvoice?.status === 'Paid';
    const isNowPaid = invoice.status === 'Paid';

    const exists = !!originalInvoice;
    if (exists) {
        setInvoices(invoices.map(i => (i.id === invoice.id ? invoice : i)));
    } else {
        setInvoices([invoice, ...invoices]);
    }

    if (isNowPaid && !wasPaid) {
        const newTransaction: Transaction = {
            id: `trn-${invoice.id}`,
            invoiceId: invoice.workOrderId,
            date: invoice.paidDate || new Date().toISOString().split('T')[0],
            description: `Payment for Invoice ${invoice.id}`,
            type: 'income',
            amount: invoice.amount,
            category: TransactionCategory.SERVICE_INCOME,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
        };
        setTransactions(prev => [...prev, newTransaction]);
    }
    else if (!isNowPaid && wasPaid) {
        setTransactions(prev => prev.filter(t => t.invoiceId !== invoice.workOrderId));
    }

    setModalState({ type: null, data: null });
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === invoice.customerId);
    const workOrder = workOrders.find(w => w.id === invoice.workOrderId);
    if (!customer || !workOrder) return;

    generatePdfHeader(doc, companyProfile);

    // Invoice details below header
    doc.setFontSize(16);
    doc.text("INVOICE", 196, 65, { align: 'right' });
    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.id}`, 196, 72, { align: 'right' });
    doc.text(`Date Issued: ${invoice.issuedDate}`, 196, 79, { align: 'right' });

    doc.text("Bill To:", 14, 72);
    doc.text(customer.name, 14, 79);
    doc.text(customer.address, 14, 86);

    const partsDescription = workOrder.spareParts.map(p => `${p.name} (${formatIDR(p.sellingPrice)})`).join('\n');
    const tableBody = [
        ['Jasa Perbaikan', workOrder.description, formatIDR(workOrder.totalCost - workOrder.spareParts.reduce((sum, p) => sum + p.sellingPrice, 0))]
    ];
    workOrder.spareParts.forEach(p => {
        tableBody.push(['Spare Part', p.name, formatIDR(p.sellingPrice)])
    })


    autoTable(doc, {
        startY: 100,
        head: [['Item', 'Description', 'Amount']],
        body: tableBody,
        theme: 'striped',
        foot: [['', 'Total', formatIDR(invoice.amount)]],
        showFoot: 'lastPage'
    });
    
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text(`Status: ${invoice.status}`, 14, finalY + 20);
    doc.text("Thank you for your business!", 105, finalY + 40, { align: 'center'});

    doc.save(`Invoice-${invoice.id}.pdf`);
  };

  const handleSaveTransaction = (transaction: Transaction) => {
    const exists = transactions.some(r => r.id === transaction.id);
    if (exists) {
        setTransactions(transactions.map(r => r.id === transaction.id ? transaction : r));
    } else {
        setTransactions([transaction, ...transactions]);
    }
    setModalState({ type: null, data: null });
  };

   const handleSaveContract = (contract: ServiceContract) => {
    const exists = contracts.some(c => c.id === contract.id);
    if(exists) {
        setContracts(contracts.map(c => c.id === contract.id ? contract : c));
    } else {
        setContracts([contract, ...contracts]);
    }
    setModalState({ type: null, data: null });
  };
  
  const handleTechnicianStatusChange = (userId: string, status: TechnicianStatus) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
  };

  const handleWhatsAppChat = (customer: Customer, workOrder?: WorkOrder) => {
    if (!customer.phone) {
        alert('Customer phone number is not available.');
        return;
    }
    const formattedPhone = customer.phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    let text = `Hello ${customer.name}, this is from ServisPro.`;
    if (workOrder) {
        text = `Hello ${customer.name}, this is regarding your service request (ID: ${workOrder.id}).`;
    }
    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleEmailNotify = (customer: Customer, workOrder?: WorkOrder) => {
    if (!customer.email) {
        alert('Customer email is not available.');
        return;
    }
    let subject = 'Notification from ServisPro';
    let body = `Dear ${customer.name},\n\nWe are contacting you regarding your service with us.\n\nBest regards,\nServisPro Team`;
    if (workOrder) {
        subject = `Update on Work Order: ${workOrder.id}`;
        body = `Dear ${customer.name},\n\nThis is an update regarding your work order (ID: ${workOrder.id} - ${workOrder.description}).\n\n\nBest regards,\nServisPro Team`;
    }
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:${customer.email}?subject=${encodedSubject}&body=${encodedBody}`;
  };
  
  const handleRequestReimbursement = (workOrderId: string, amount: number, description: string, attachment: { name: string; type: string; data: string; }) => {
    const workOrder = workOrders.find(wo => wo.id === workOrderId);
    if (!currentUser || !workOrder) return;
    
    const newTransaction: Transaction = {
      id: `reimburse-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: `Reimbursement for WO-${workOrderId.substring(0,4)}: ${description}`,
      type: 'expense',
      amount,
      category: TransactionCategory.REIMBURSEMENT,
      paymentMethod: PaymentMethod.CASH,
      attachment,
      approved: false,
      requestedByUserId: currentUser.id,
      workOrderId: workOrderId,
    };
    
    setTransactions(prev => [newTransaction, ...prev]);

    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      message: `${formatUserName(currentUser.name)} requested a reimbursement of ${formatIDR(amount)}. Authorization required.`,
      timestamp: new Date().toISOString(),
      read: false,
      link: '/reimbursements',
    };
    setNotifications(prev => [newNotification, ...prev]);
    
    setModalState({ type: null, data: null });
  };

  const handleApproveReimbursement = (transactionId: string) => {
      setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, approved: true } : t));
  };


  const handleGenerateFinancialReport = () => {
    const doc = new jsPDF();
    generatePdfHeader(doc, companyProfile);

    doc.setFontSize(20);
    doc.text("Laporan Keuangan", 105, 65, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Periode: Sampai dengan ${new Date().toLocaleDateString('id-ID')}`, 105, 72, { align: 'center' });

    autoTable(doc, {
        startY: 85,
        head: [['Laporan Laba Rugi', '']],
        body: [
            ['Total Pendapatan (Income)', formatIDR(totalIncome)],
            ['Total Pengeluaran (Expense)', formatIDR(totalExpense)],
        ],
        foot: [['Laba / Rugi Bersih (Profit / Loss)', formatIDR(labaRugi)]],
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        footStyles: { fillColor: labaRugi >= 0 ? [46, 204, 113] : [231, 76, 60], textColor: [255,255,255] }
    });

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Tanggal', 'Deskripsi', 'Tipe', 'Jumlah']],
        body: sortedTransactions.map(record => [
            record.date,
            record.description,
            record.type,
            formatIDR(record.amount)
        ]),
        didDrawPage: (data: any) => {
            doc.setFontSize(16);
            doc.text('Rincian Arus Kas (Cash Flow)', data.settings.margin.left, (doc as any).lastAutoTable.finalY + 10);
        },
        headStyles: { fillColor: [41, 128, 185] },
        theme: 'striped'
    });
    
    const finalYAfterCashFlow = (doc as any).lastAutoTable.finalY;
    if (finalYAfterCashFlow > 200) { // Add new page if not enough space
        doc.addPage();
    }
    
    autoTable(doc, {
        startY: finalYAfterCashFlow > 200 ? 20 : finalYAfterCashFlow + 15,
        head: [['Neraca (Balance Sheet)', '']],
        body: [
            ['Aset (Assets)', formatIDR(assets)],
            ['Liabilitas (Liabilities)', formatIDR(liabilities)],
            ['Ekuitas (Equity)', formatIDR(equity)],
        ],
        foot: [['Total Liabilitas + Ekuitas', formatIDR(liabilities + equity)]],
        theme: 'grid',
        headStyles: { fillColor: [142, 68, 173] }
    });

    doc.save(`Laporan-Keuangan-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (!currentUser) {
    if (authScreen === 'signup') {
        return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthScreen('signup')} users={users} />;
  }
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: DashboardIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-blue-500' },
    { path: '/customers', label: 'Customers', icon: CustomerIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-green-500' },
    { path: '/work-orders', label: 'Work Orders', icon: WorkOrderIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-orange-500' },
    { path: '/notifications', label: 'Notifications', icon: BellIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-red-500' },
    { path: '/my-reimbursements', label: 'My Reimbursements', icon: ReceiptIcon, roles: [UserRole.TECHNICIAN], color: 'text-cyan-500' },
    { path: '/reimbursements', label: 'Reimbursement', icon: ReceiptIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-cyan-500' },
    { path: '/spare-parts', label: 'Spare Parts', icon: SparePartIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-indigo-500' },
    { path: '/finance', label: 'Finance', icon: FinanceIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-purple-500' },
    { path: '/employees', label: 'Employees', icon: UsersIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-teal-500' },
    { path: '/settings', label: 'Settings', icon: SettingsIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-gray-500' },
  ];

  const accessibleNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  const Sidebar: React.FC = () => {
    const location = useLocation();
    const unreadCount = notifications.filter(n => !n.read).length;
    
    return (
        <div className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`h-16 flex items-center border-b border-gray-200 ${isSidebarCollapsed ? 'justify-center' : 'justify-center'}`}>
                {isSidebarCollapsed ? (
                    <DashboardIcon className="h-10 w-10 text-primary-600" />
                ) : (
                    <h1 className="text-2xl font-bold text-primary-600">ServisPro</h1>
                )}
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {accessibleNavItems.map(item => (
                     <Link key={item.path} to={item.path} title={isSidebarCollapsed ? item.label : ''} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${(location.pathname.startsWith(item.path) && item.path !== '/' || location.pathname === item.path) ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <item.icon className={`${isSidebarCollapsed ? `h-9 w-9 ${item.color}` : 'h-5 w-5'}`} />
                        {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
                        {item.label === 'Notifications' && !isSidebarCollapsed && unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-200">
                 <button onClick={handleLogout} className={`flex items-center w-full space-x-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Logout' : ''}>
                    <LogoutIcon className="h-5 w-5" />
                    {!isSidebarCollapsed && <span className="font-medium">Logout</span>}
                </button>
                 <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`flex items-center w-full space-x-3 px-4 py-2 mt-2 rounded-lg text-gray-600 hover:bg-gray-100 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? 'Expand' : 'Collapse'}>
                    {isSidebarCollapsed ? <ChevronsRightIcon className="h-5 w-5" /> : <ChevronsLeftIcon className="h-5 w-5" />}
                    {!isSidebarCollapsed && <span className="font-medium">Collapse</span>}
                </button>
            </div>
        </div>
    );
  };
  
  const appDataForChatbot = {
    customers,
    workOrders,
    spareParts,
    invoices,
    technicians,
  };


  const MainLayout: React.FC = () => (
     <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
             <Routes>
                <Route path="/" element={currentUser.role === UserRole.TECHNICIAN ? <Navigate to="/work-orders" /> : <Dashboard workOrders={workOrders} customers={customers} users={users} currentUser={currentUser} />} />
                <Route path="/customers" element={<CustomersAndClientsPage customers={customers} clients={clients} onAddCustomer={() => setModalState({ type: 'ADD_EDIT_CUSTOMER', data: null })} onEditCustomer={(c) => setModalState({ type: 'ADD_EDIT_CUSTOMER', data: c })} onAddClient={() => setModalState({ type: 'ADD_EDIT_CLIENT', data: null })} onEditClient={(c) => setModalState({ type: 'ADD_EDIT_CLIENT', data: c })} />} />
                <Route path="/customers/:customerId" element={<CustomerDetail customers={customers} workOrders={workOrders} contracts={contracts} users={users} onEditCustomer={(c) => setModalState({ type: 'ADD_EDIT_CUSTOMER', data: c })} onAddContract={(customerId) => setModalState({ type: 'ADD_EDIT_CONTRACT', data: { customerId }})} onEditContract={(c) => setModalState({ type: 'ADD_EDIT_CONTRACT', data: { contract: c, customerId: c.customerId }})} onCreateWorkOrder={(customerId) => setModalState({ type: 'CREATE_WORK_ORDER', data: { customerId }})} onChat={handleWhatsAppChat} onNotify={handleEmailNotify} />} />
                <Route path="/work-orders" element={<WorkOrders user={currentUser} workOrders={workOrders} invoices={invoices} users={users} transactions={transactions} companyProfile={companyProfile} clients={clients} onAddPart={(wo) => setModalState({ type: 'ADD_SPARE_PART', data: wo})} onCreate={() => setModalState({ type: 'CREATE_WORK_ORDER', data: null })} onAssign={(wo) => setModalState({ type: 'ASSIGN_TECHNICIAN', data: wo })} onClaim={handleClaimJob} onComplete={handleCompleteWorkOrder} onMarkAsPaid={(wo) => setModalState({ type: 'MARK_AS_PAID', data: wo })} onChat={handleWhatsAppChat} onNotify={handleEmailNotify} onRequestReimbursement={(wo) => setModalState({ type: 'REQUEST_REIMBURSEMENT', data: wo })} />} />
                <Route path="/spare-parts" element={<SpareParts spareParts={spareParts} suppliers={suppliers} onAddPart={() => setModalState({ type: 'ADD_EDIT_SPARE_PART', data: null })} onEditPart={(sp) => setModalState({ type: 'ADD_EDIT_SPARE_PART', data: sp })} onAddSupplier={() => setModalState({ type: 'ADD_EDIT_SUPPLIER', data: null })} onEditSupplier={(s) => setModalState({ type: 'ADD_EDIT_SUPPLIER', data: s })} />} />
                <Route path="/finance" element={<Finance 
                    invoices={invoices} 
                    customers={customers} 
                    transactions={sortedTransactions}
                    totalIncome={totalIncome}
                    totalExpense={totalExpense}
                    labaRugi={labaRugi}
                    assets={assets}
                    liabilities={liabilities}
                    equity={equity}
                    onAddInvoice={() => setModalState({ type: 'ADD_EDIT_INVOICE', data: null })} 
                    onEditInvoice={(inv) => setModalState({ type: 'ADD_EDIT_INVOICE', data: inv })}
                    onPrintInvoice={handlePrintInvoice}
                    onAddTransaction={() => setModalState({ type: 'ADD_EDIT_TRANSACTION', data: null })}
                    onEditTransaction={(rec) => setModalState({ type: 'ADD_EDIT_TRANSACTION', data: rec })}
                    onGenerateReport={handleGenerateFinancialReport}
                    currentUser={currentUser}
                    onApproveReimbursement={handleApproveReimbursement}
                    onViewAttachment={(attachment) => setModalState({ type: 'VIEW_ATTACHMENT', data: attachment })}
                />} />
                <Route path="/employees" element={<EmployeesPage users={users} workOrders={workOrders} onEdit={(user) => setModalState({ type: 'EDIT_EMPLOYEE', data: user })} onStatusChange={handleTechnicianStatusChange} />} />
                <Route path="/employees/:employeeId" element={<TechnicianProfilePage users={users} workOrders={workOrders} />} />
                <Route path="/notifications" element={<NotificationsPage notifications={notifications} onMarkAllRead={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} />} />
                <Route path="/reimbursements" element={currentUser.role === UserRole.ADMINISTRATOR ? <ReimbursementPage transactions={transactions} users={users} onApprove={handleApproveReimbursement} onViewAttachment={(attachment) => setModalState({ type: 'VIEW_ATTACHMENT', data: attachment })} /> : <Navigate to="/" />} />
                <Route path="/my-reimbursements" element={<MyReimbursementsPage transactions={transactions} currentUser={currentUser} onViewAttachment={(attachment) => setModalState({ type: 'VIEW_ATTACHMENT', data: attachment })} />} />
                <Route path="/settings" element={<Settings customers={customers} workOrders={workOrders} users={users} profile={companyProfile} onProfileSave={setCompanyProfile}/>} />
                <Route path="*" element={<Navigate to="/" />} />
             </Routes>
        </main>
    </div>
  );

  return (
    <>
      <HashRouter>
          <MainLayout/>
      </HashRouter>
      
      <AddEditCustomerModal
        isOpen={modalState.type === 'ADD_EDIT_CUSTOMER'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveCustomer}
        customer={modalState.data}
      />
      
      <AddEditClientModal
        isOpen={modalState.type === 'ADD_EDIT_CLIENT'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveClient}
        client={modalState.data}
      />

      <CreateWorkOrderModal
        isOpen={modalState.type === 'CREATE_WORK_ORDER'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleCreateWorkOrder}
        customers={customers}
        clients={clients}
        preselectedCustomerId={modalState.data?.customerId}
      />

      {modalState.type === 'ASSIGN_TECHNICIAN' && (
          <AssignTechnicianModal 
              workOrder={modalState.data}
              technicians={technicians}
              onClose={() => setModalState({ type: null, data: null })}
              onSave={handleAssignTechnician}
          />
      )}
      
      {modalState.type === 'ADD_SPARE_PART' && (
          <AddSparePartModal 
              workOrder={modalState.data}
              onClose={() => setModalState({ type: null, data: null })}
              onSave={handleUpdateWorkOrderParts}
              availableParts={spareParts}
          />
      )}

      <AddEditInvoiceModal
        isOpen={modalState.type === 'ADD_EDIT_INVOICE'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveInvoice}
        invoice={modalState.data}
        workOrders={workOrders}
      />

      <AddEditSparePartModal
        isOpen={modalState.type === 'ADD_EDIT_SPARE_PART'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveSparePart}
        part={modalState.data}
        suppliers={suppliers}
      />
      
      <AddEditSupplierModal
        isOpen={modalState.type === 'ADD_EDIT_SUPPLIER'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveSupplier}
        supplier={modalState.data}
      />

      <AddEditTransactionModal
        isOpen={modalState.type === 'ADD_EDIT_TRANSACTION'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveTransaction}
        transaction={modalState.data}
      />
      
       <AddEditContractModal
        isOpen={modalState.type === 'ADD_EDIT_CONTRACT'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveContract}
        contract={modalState.data?.contract}
        customerId={modalState.data?.customerId}
      />

      <AddEditEmployeeModal 
          isOpen={modalState.type === 'EDIT_EMPLOYEE'}
          onClose={() => setModalState({ type: null, data: null })}
          onSave={handleSaveEmployee}
          user={modalState.data}
      />

      <MarkAsPaidModal
        isOpen={modalState.type === 'MARK_AS_PAID'}
        onClose={() => setModalState({ type: null, data: null })}
        onConfirm={handleMarkAsPaid}
        workOrder={modalState.data}
      />
      
      <ReimbursementModal
        isOpen={modalState.type === 'REQUEST_REIMBURSEMENT'}
        onClose={() => setModalState({ type: null, data: null })}
        onConfirm={handleRequestReimbursement}
        workOrder={modalState.data}
      />
      
      <AttachmentViewerModal
        isOpen={modalState.type === 'VIEW_ATTACHMENT'}
        onClose={() => setModalState({ type: null, data: null })}
        attachment={modalState.data}
      />

      {currentUser && <Chatbot currentUser={currentUser} appData={appDataForChatbot} />}
    </>
  );
};

export default App;
