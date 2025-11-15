import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, FinancialRecord, Notification, ChatMessage, CompanyProfile, TechnicianStatus } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon } from './components/icons';
import { generateAiSummary, getChatbotResponse } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- INITIAL MOCK DATA ---
const INITIAL_USERS: User[] = [
  { id: 'user-1', name: 'Alice (Administrator)', role: UserRole.ADMINISTRATOR, password: 'password123', age: 35, gender: 'Female', skills: ['Management', 'Finance', 'System Administration'] },
  { id: 'user-2', name: 'Bob (Admin)', role: UserRole.ADMIN, password: 'password123', age: 28, gender: 'Male', skills: ['Data Entry', 'Customer Support'] },
  { id: 'user-3', name: 'Budi Santoso (Technician)', role: UserRole.TECHNICIAN, email: 'budi.s@example.com', password: 'password123', age: 32, gender: 'Male', skills: ['AC Repair', 'Refrigeration'], status: TechnicianStatus.ON_JOB },
  { id: 'user-4', name: 'Charlie (Technician)', role: UserRole.TECHNICIAN, phone: '081234567891', password: 'password123', age: 25, gender: 'Male', skills: ['Electrical Wiring', 'Plumbing'], status: TechnicianStatus.ON_JOB },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'PT Sejahtera Abadi', email: 'contact@sejahtera.co.id', phone: '081234567890', address: 'Jl. Merdeka No. 1, Jakarta' },
  { id: 'cust-2', name: 'Toko Roti Enak', email: 'order@rotienak.com', phone: '081298765432', address: 'Jl. Sudirman No. 22, Jakarta' },
  { id: 'cust-3', name: 'Ibu Susanti', email: 'susanti@gmail.com', phone: '085611223344', address: 'Jl. Gatot Subroto No. 5, Bandung' },
];

const INITIAL_SPARE_PARTS: SparePart[] = [
  { id: 'sp-1', name: 'Compressor XYZ', price: 750000, stock: 10, location: 'Rak A1' },
  { id: 'sp-2', name: 'Freon R32', price: 150000, stock: 25, location: 'Rak B2' },
  { id: 'sp-3', name: 'Capacitor 25uF', price: 85000, stock: 5, location: 'Rak A2' },
  { id: 'sp-4', name: 'Fan Motor', price: 350000, stock: 0, location: 'Rak C1' },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
    { id: 'wo-1', customer: INITIAL_CUSTOMERS[0], description: 'AC not cooling in meeting room', status: WorkOrderStatus.COMPLETED, technicianId: 'user-3', createdAt: '2023-10-01', completedAt: '2023-10-02', spareParts: [INITIAL_SPARE_PARTS[0]], totalCost: 850000 },
    { id: 'wo-2', customer: INITIAL_CUSTOMERS[1], description: 'Refrigerator making strange noises', status: WorkOrderStatus.IN_PROGRESS, technicianId: 'user-4', createdAt: '2023-10-03', spareParts: [], totalCost: 100000 },
    { id: 'wo-3', customer: INITIAL_CUSTOMERS[2], description: 'Annual AC maintenance', status: WorkOrderStatus.PENDING, technicianId: null, createdAt: '2023-10-05', spareParts: [], totalCost: 250000 },
    { id: 'wo-4', customer: INITIAL_CUSTOMERS[0], description: 'Fix leaking indoor AC unit', status: WorkOrderStatus.IN_PROGRESS, technicianId: 'user-3', createdAt: '2023-10-06', spareParts: [], totalCost: 150000 },
];

const INITIAL_INVOICES: Invoice[] = INITIAL_WORK_ORDERS
    .filter(wo => wo.status === WorkOrderStatus.COMPLETED)
    .map(wo => ({
        id: `INV-${wo.id}`,
        workOrderId: wo.id,
        customerId: wo.customer.id,
        amount: wo.totalCost,
        issuedDate: wo.completedAt || new Date().toISOString().split('T')[0],
        status: 'Unpaid',
    }));

const INITIAL_FINANCIAL_RECORDS: FinancialRecord[] = [
    { id: 'exp-1', date: '2023-10-01', description: 'Gaji Teknisi', type: 'expense', amount: 5000000 },
    { id: 'exp-2', date: '2023-10-02', description: 'Pembelian Sparepart', type: 'expense', amount: 1500000 },
];

// --- UTILITY FUNCTIONS ---
const formatIDR = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

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
  icon: React.ReactNode;
}
const StatCard: React.FC<CardProps> = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
    <div className="bg-primary-100 p-3 rounded-full">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
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
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

    useEffect(() => {
        if (customer) {
            setFormData({ name: customer.name, email: customer.email, phone: customer.phone, address: customer.address });
        } else {
            setFormData({ name: '', email: '', phone: '', address: '' });
        }
    }, [customer, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...customer, ...formData, id: customer?.id || `cust-${Date.now()}` });
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
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Customer</button>
                </div>
            </form>
        </Modal>
    );
};

const CreateWorkOrderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { customerId: string; description: string; totalCost: number; }) => void;
    customers: Customer[];
}> = ({ isOpen, onClose, onSave, customers }) => {
    const [customerId, setCustomerId] = useState('');
    const [description, setDescription] = useState('');
    const [totalCost, setTotalCost] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCustomerId(customers[0]?.id || '');
            setDescription('');
            setTotalCost('');
        }
    }, [isOpen, customers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId || !description) return;
        onSave({ customerId, description, totalCost: Number(totalCost) || 0 });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Work Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                            <p className="text-sm text-gray-500">{formatIDR(part.price)} - <span className={`font-bold ${part.stock <= 5 ? 'text-red-600' : 'text-gray-700'}`}>Stock: {part.stock}</span></p>
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
}> = ({ isOpen, onClose, onSave, part }) => {
    const [formData, setFormData] = useState({ name: '', price: '', stock: '', location: '' });

    useEffect(() => {
        if (part) {
            setFormData({ name: part.name, price: String(part.price), stock: String(part.stock), location: part.location });
        } else {
            setFormData({ name: '', price: '', stock: '0', location: '' });
        }
    }, [part, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...part,
            id: part?.id || `sp-${Date.now()}`,
            name: formData.name,
            price: Number(formData.price),
            stock: Number(formData.stock),
            location: formData.location,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={part ? 'Edit Spare Part' : 'Add New Spare Part'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Part Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Price (IDR)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Location (e.g. Rack A1)</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Part</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: FinancialRecord) => void;
    record: FinancialRecord | null;
}> = ({ isOpen, onClose, onSave, record }) => {
    const [formData, setFormData] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        if (record) {
            setFormData({ description: record.description, amount: String(record.amount), date: record.date });
        } else {
            setFormData({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
        }
    }, [record, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...record,
            id: record?.id || `exp-${Date.now()}`,
            type: 'expense',
            description: formData.description,
            amount: Number(formData.amount),
            date: formData.date
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? 'Edit Expense' : 'Add New Expense'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input type="text" name="description" value={formData.description} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Amount (IDR)</label>
                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Save Expense</button>
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
                name: user.name.split(' (')[0],
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
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Employee: ${user?.name.split(' (')[0]}`}>
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

const Dashboard: React.FC<{workOrders: WorkOrder[], customers: Customer[], users: User[]}> = ({ workOrders, customers, users }) => {
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
        name: tech.name.split(' (')[0],
        completed: workOrders.filter(wo => wo.technicianId === tech.id && wo.status === WorkOrderStatus.COMPLETED).length
    }));
  }, [workOrders, users]);


  const monthlyRevenueData = useMemo(() => [
    { name: 'Jul', revenue: 1500000 },
    { name: 'Aug', revenue: 2200000 },
    { name: 'Sep', revenue: 1800000 },
    { name: 'Oct', revenue: workOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED).reduce((sum, wo) => sum + wo.totalCost, 0) },
  ], [workOrders]);
  
  const COLORS = ['#FFBB28', '#00C49F', '#0088FE', '#FF8042'];

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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Total Customers" value={customers.length.toString()} icon={<CustomerIcon className="h-6 w-6 text-primary-600" />} />
        <StatCard title="Pending Work Orders" value={workOrders.filter(wo => wo.status === WorkOrderStatus.PENDING).length.toString()} icon={<WorkOrderIcon className="h-6 w-6 text-primary-600" />} />
        
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center space-x-4">
                <div className="bg-primary-100 p-3 rounded-full"><TechnicianIcon className="h-6 w-6 text-primary-600" /></div>
                <div>
                    <p className="text-sm text-gray-500">Technician Status</p>
                    <div className="h-20 overflow-y-auto pr-2 mt-1">
                        {technicians.map(tech => (
                            <div key={tech.id} className="flex items-center justify-between text-sm py-0.5">
                                <span className="font-semibold text-gray-700">{tech.name.split(' (')[0]}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${getTechnicianStatusColor(tech.status)}`}>{tech.status || 'N/A'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <StatCard title="Monthly Revenue" value={formatIDR(monthlyRevenueData[3].revenue)} icon={<FinanceIcon className="h-6 w-6 text-primary-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
           <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Revenue</h2>
           <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(tick) => formatIDR(tick as number)}/>
              <Tooltip formatter={(value) => formatIDR(value as number)} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Work Order Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={woStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {woStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
       <div className="grid grid-cols-1 gap-6 mb-6">
         <div className="bg-white p-6 rounded-lg shadow-md">
           <h2 className="text-lg font-semibold text-gray-700 mb-4">Completed Work Orders by Technician</h2>
           <ResponsiveContainer width="100%" height={300}>
            <BarChart data={technicianPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false}/>
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="Completed WOs" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-lg font-semibold text-gray-700">AI-Powered Business Summary</h2>
           <button onClick={handleGenerateSummary} disabled={isLoading} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:bg-primary-300">
             {isLoading ? <SpinnerIcon className="h-5 w-5"/> : <AiIcon className="h-5 w-5"/>}
             <span>{isLoading ? 'Generating...' : 'Generate Summary'}</span>
           </button>
        </div>
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
  );
};

const Customers: React.FC<{ 
    customers: Customer[], 
    onAdd: () => void, 
    onEdit: (c: Customer) => void,
    onChat: (c: Customer) => void,
    onNotify: (c: Customer) => void
}> = ({ customers, onAdd, onEdit, onChat, onNotify }) => {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Customer Management</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Customer List</h2>
                    <button onClick={onAdd} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add Customer</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Contact</th>
                                <th scope="col" className="px-6 py-3">Address</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                                    <td className="px-6 py-4">
                                        <div>{customer.email}</div>
                                        <div>{customer.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">{customer.address}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        <button onClick={() => onEdit(customer)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                        <button onClick={() => onChat(customer)} className="font-medium text-blue-600 hover:underline">Chat</button>
                                        <button onClick={() => onNotify(customer)} className="font-medium text-green-600 hover:underline">Notify</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const WorkOrders: React.FC<{
    user: User;
    workOrders: WorkOrder[];
    users: User[];
    companyProfile: CompanyProfile;
    onAddPart: (wo: WorkOrder) => void;
    onCreate: () => void;
    onAssign: (wo: WorkOrder) => void;
    onClaim: (woId: string, techId: string) => void;
    onComplete: (woId: string) => void;
    onChat: (c: Customer, wo: WorkOrder) => void;
    onNotify: (c: Customer, wo: WorkOrder) => void;
}> = ({ user, workOrders, users, companyProfile, onAddPart, onCreate, onAssign, onClaim, onComplete, onChat, onNotify }) => {
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
                body: order.spareParts.map((part, i) => [i + 1, part.name, formatIDR(part.price)]),
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

    const renderOrderTable = (title: string, orders: WorkOrder[]) => (
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
                            <th scope="col" className="px-6 py-3">Description</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Technician</th>
                            <th scope="col" className="px-6 py-3">Total</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                                <td className="px-6 py-4">{order.customer.name}</td>
                                <td className="px-6 py-4 max-w-xs truncate">{order.description}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{users.find(u => u.id === order.technicianId)?.name.split(' (')[0] || 'Unassigned'}</td>
                                <td className="px-6 py-4 font-semibold">{formatIDR(order.totalCost)}</td>
                                <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                    {isTechnician ? (
                                        order.technicianId === user.id ? (
                                            // My Jobs
                                            <>
                                                {order.status === WorkOrderStatus.IN_PROGRESS && (
                                                    <>
                                                      <button onClick={() => onAddPart(order)} className="font-medium text-green-600 hover:underline">Add Part</button>
                                                      <button onClick={() => onComplete(order.id)} className="font-medium text-indigo-600 hover:underline">Complete</button>
                                                    </>
                                                )}
                                                <button onClick={() => generateSpkPdf(order)} className="font-medium text-red-600 hover:underline">Print SPK</button>
                                                <button onClick={() => onChat(order.customer, order)} className="font-medium text-blue-600 hover:underline">Chat</button>
                                                <button onClick={() => onNotify(order.customer, order)} className="font-medium text-purple-600 hover:underline">Notify</button>
                                            </>
                                        ) : !order.technicianId ? (
                                            // Unassigned Jobs
                                            <button onClick={() => onClaim(order.id, user.id)} className="font-medium text-blue-600 hover:underline">Claim Job</button>
                                        ) : (
                                            // Assigned to someone else
                                            <span className="text-gray-400">-</span>
                                        )
                                    ) : (
                                        // Admin View
                                        <>
                                            <button onClick={() => onAssign(order)} className="font-medium text-primary-600 hover:underline">{order.technicianId ? 'Re-assign' : 'Assign'}</button>
                                            <button onClick={() => generateSpkPdf(order)} className="font-medium text-red-600 hover:underline">Print SPK</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const myWorkOrders = workOrders.filter(wo => wo.technicianId === user.id);
    const unassignedWorkOrders = workOrders.filter(wo => !wo.technicianId);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{isTechnician ? 'My Work Orders (SPK)' : 'Work Order Management'}</h1>
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

const SpareParts: React.FC<{ spareParts: SparePart[], onAdd: () => void, onEdit: (sp: SparePart) => void }> = ({ spareParts, onAdd, onEdit }) => {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Spare Part Management</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Spare Part Inventory</h2>
                    <button onClick={onAdd} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add Spare Part</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Part Name</th>
                                <th scope="col" className="px-6 py-3">Price</th>
                                <th scope="col" className="px-6 py-3">Stock</th>
                                <th scope="col" className="px-6 py-3">Location</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {spareParts.map(part => (
                                <tr key={part.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{part.name}</td>
                                    <td className="px-6 py-4">{formatIDR(part.price)}</td>
                                    <td className={`px-6 py-4 font-semibold ${part.stock <= 5 ? 'text-red-600' : 'text-gray-900'}`}>{part.stock}</td>
                                    <td className="px-6 py-4">{part.location}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        <button onClick={() => onEdit(part)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const Finance: React.FC<{
    invoices: Invoice[],
    financialRecords: FinancialRecord[],
    customers: Customer[],
    onAddInvoice: () => void,
    onEditInvoice: (invoice: Invoice) => void,
    onPrintInvoice: (invoice: Invoice) => void,
    onAddExpense: () => void,
    onEditExpense: (record: FinancialRecord) => void
}> = ({ invoices, financialRecords, customers, onAddInvoice, onEditInvoice, onPrintInvoice, onAddExpense, onEditExpense }) => {
    
    const cashFlow = useMemo(() => {
        const incomeRecords: FinancialRecord[] = invoices
            .filter(i => i.status === 'Paid')
            .map(inv => ({
                id: inv.id,
                date: inv.paidDate || inv.issuedDate,
                description: `Payment for Invoice ${inv.id.substring(0, 12)}...`,
                type: 'income' as 'income',
                amount: inv.amount
            }));

        const expenseRecords: FinancialRecord[] = financialRecords.filter(r => r.type === 'expense');

        return [...incomeRecords, ...expenseRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, financialRecords]);
    
    const totalIncome = cashFlow.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = cashFlow.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const labaRugi = totalIncome - totalExpense;
    
    const assets = totalIncome;
    const liabilities = totalExpense;
    const equity = labaRugi;


    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Finance</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <StatCard title="Total Income" value={formatIDR(totalIncome)} icon={<FinanceIcon className="h-6 w-6 text-green-600" />} />
                 <StatCard title="Total Expense" value={formatIDR(totalExpense)} icon={<FinanceIcon className="h-6 w-6 text-red-600" />} />
                 <StatCard title="Profit / Loss" value={formatIDR(labaRugi)} icon={<FinanceIcon className={`h-6 w-6 ${labaRugi >= 0 ? 'text-blue-600' : 'text-red-600'}`} />} />
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
                        <h2 className="text-xl font-semibold">Cash Flow (Arus Kas)</h2>
                        <button onClick={onAddExpense} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm">Add Expense</button>
                    </div>
                     <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cashFlow.map(record => (
                                <tr key={record.id} className="border-b">
                                    <td className="px-6 py-4">{record.date}</td>
                                    <td className="px-6 py-4">{record.description}</td>
                                    <td className={`px-6 py-4 font-semibold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatIDR(record.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {record.type === 'expense' && (
                                            <button onClick={() => onEditExpense(record)} className="font-medium text-primary-600 hover:underline">Edit</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
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
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.name.split(' (')[0]}</td>
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
                body: workOrders.map(w => [w.id, w.customer.name, w.status, users.find(u => u.id === w.technicianId)?.name.split(' (')[0] || 'N/A', formatIDR(w.totalCost)]),
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
  
  // App-wide state
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [spareParts, setSpareParts] = useState<SparePart[]>(INITIAL_SPARE_PARTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(INITIAL_FINANCIAL_RECORDS);
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

  const handleSaveEmployee = (user: User) => {
    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    setModalState({ type: null, data: null });
};
  
  const handleCreateWorkOrder = (data: { customerId: string; description: string; totalCost: number; }) => {
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
    setNotifications(prev => prev.filter(n => n.workOrderId !== workOrderId));
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
              const partsCost = newParts.reduce((sum, part) => sum + part.price, 0);
              const baseCost = originalWorkOrder.totalCost - originalParts.reduce((sum, part) => sum + part.price, 0);
              return { ...wo, spareParts: newParts, totalCost: baseCost + partsCost };
          }
          return wo;
      }));
  };

  const handleCompleteWorkOrder = (workOrderId: string) => {
    const workOrderToComplete = workOrders.find(wo => wo.id === workOrderId);

    if (workOrderToComplete) {
      const completionDate = new Date().toISOString().split('T')[0];
      
      const newInvoice: Invoice = {
        id: `INV-${workOrderToComplete.id}`,
        workOrderId: workOrderToComplete.id,
        customerId: workOrderToComplete.customer.id,
        amount: workOrderToComplete.totalCost,
        issuedDate: completionDate,
        status: 'Unpaid',
      };
      
      setInvoices(prev => [...prev, newInvoice]);

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
  
  const handleSaveSparePart = (part: SparePart) => {
    const exists = spareParts.some(p => p.id === part.id);
    if (exists) {
        setSpareParts(spareParts.map(p => p.id === part.id ? part : p));
    } else {
        setSpareParts([part, ...spareParts]);
    }
    setModalState({ type: null, data: null });
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    const exists = invoices.some(i => i.id === invoice.id);
    if (exists) {
        setInvoices(invoices.map(i => i.id === invoice.id ? invoice : i));
    } else {
        setInvoices([invoice, ...invoices]);
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

    const partsDescription = workOrder.spareParts.map(p => `${p.name} (${formatIDR(p.price)})`).join('\n');
    const tableBody = [
        ['Jasa Perbaikan', workOrder.description, formatIDR(workOrder.totalCost - workOrder.spareParts.reduce((sum, p) => sum + p.price, 0))]
    ];
    workOrder.spareParts.forEach(p => {
        tableBody.push(['Spare Part', p.name, formatIDR(p.price)])
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

  const handleSaveExpense = (record: FinancialRecord) => {
    const exists = financialRecords.some(r => r.id === record.id);
    if (exists) {
        setFinancialRecords(financialRecords.map(r => r.id === record.id ? record : r));
    } else {
        setFinancialRecords([record, ...financialRecords]);
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

  if (!currentUser) {
    if (authScreen === 'signup') {
        return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthScreen('signup')} users={users} />;
  }
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: DashboardIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN] },
    { path: '/customers', label: 'Customers', icon: CustomerIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN] },
    { path: '/work-orders', label: 'Work Orders', icon: WorkOrderIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN] },
    { path: '/notifications', label: 'Notifications', icon: BellIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN] },
    { path: '/spare-parts', label: 'Spare Parts', icon: SparePartIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN] },
    { path: '/finance', label: 'Finance', icon: FinanceIcon, roles: [UserRole.ADMINISTRATOR] },
    { path: '/employees', label: 'Employees', icon: UsersIcon, roles: [UserRole.ADMINISTRATOR] },
    { path: '/settings', label: 'Settings', icon: SettingsIcon, roles: [UserRole.ADMINISTRATOR] },
  ];

  const accessibleNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

  const Sidebar: React.FC = () => {
    const location = useLocation();
    const unreadCount = notifications.filter(n => !n.read).length;
    
    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 flex items-center justify-center border-b border-gray-200">
                <h1 className="text-2xl font-bold text-primary-600">ServisPro</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {accessibleNavItems.map(item => (
                     <Link key={item.path} to={item.path} className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${location.pathname === item.path ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                        {item.label === 'Notifications' && unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-200">
                 <button onClick={handleLogout} className="flex items-center w-full space-x-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
                    <LogoutIcon className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
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
                <Route path="/" element={currentUser.role === UserRole.TECHNICIAN ? <Navigate to="/work-orders" /> : <Dashboard workOrders={workOrders} customers={customers} users={users} />} />
                <Route path="/customers" element={<Customers customers={customers} onAdd={() => setModalState({ type: 'ADD_EDIT_CUSTOMER', data: null })} onEdit={(c) => setModalState({ type: 'ADD_EDIT_CUSTOMER', data: c })} onChat={handleWhatsAppChat} onNotify={handleEmailNotify} />} />
                <Route path="/work-orders" element={<WorkOrders user={currentUser} workOrders={workOrders} users={users} companyProfile={companyProfile} onAddPart={(wo) => setModalState({ type: 'ADD_SPARE_PART', data: wo})} onCreate={() => setModalState({ type: 'CREATE_WORK_ORDER', data: null })} onAssign={(wo) => setModalState({ type: 'ASSIGN_TECHNICIAN', data: wo })} onClaim={handleClaimJob} onComplete={handleCompleteWorkOrder} onChat={handleWhatsAppChat} onNotify={handleEmailNotify} />} />
                <Route path="/spare-parts" element={<SpareParts spareParts={spareParts} onAdd={() => setModalState({ type: 'ADD_EDIT_SPARE_PART', data: null })} onEdit={(sp) => setModalState({ type: 'ADD_EDIT_SPARE_PART', data: sp })} />} />
                <Route path="/finance" element={<Finance 
                    invoices={invoices} 
                    financialRecords={financialRecords} 
                    customers={customers} 
                    onAddInvoice={() => setModalState({ type: 'ADD_EDIT_INVOICE', data: null })} 
                    onEditInvoice={(inv) => setModalState({ type: 'ADD_EDIT_INVOICE', data: inv })}
                    onPrintInvoice={handlePrintInvoice}
                    onAddExpense={() => setModalState({ type: 'ADD_EDIT_EXPENSE', data: null })}
                    onEditExpense={(rec) => setModalState({ type: 'ADD_EDIT_EXPENSE', data: rec })}
                />} />
                <Route path="/employees" element={<EmployeesPage users={users} workOrders={workOrders} onEdit={(user) => setModalState({ type: 'EDIT_EMPLOYEE', data: user })} onStatusChange={handleTechnicianStatusChange} />} />
                <Route path="/notifications" element={<NotificationsPage notifications={notifications} onMarkAllRead={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} />} />
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
      
      <CreateWorkOrderModal
        isOpen={modalState.type === 'CREATE_WORK_ORDER'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleCreateWorkOrder}
        customers={customers}
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
      />

      <AddEditExpenseModal
        isOpen={modalState.type === 'ADD_EDIT_EXPENSE'}
        onClose={() => setModalState({ type: null, data: null })}
        onSave={handleSaveExpense}
        record={modalState.data}
      />

      <AddEditEmployeeModal 
          isOpen={modalState.type === 'EDIT_EMPLOYEE'}
          onClose={() => setModalState({ type: null, data: null })}
          onSave={handleSaveEmployee}
          user={modalState.data}
      />
      
      {currentUser && <Chatbot currentUser={currentUser} appData={appDataForChatbot} />}
    </>
  );
};

export default App;