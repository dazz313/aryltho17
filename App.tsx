import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, Transaction, Notification, ChatMessage, CompanyProfile, TechnicianStatus, TransactionCategory, PaymentMethod, ServiceContract, ContractStatus, Supplier, Client } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, ReceiptIcon, MapPinIcon, MoreVerticalIcon, TruckIcon, BriefcaseIcon } from './components/icons';
import { generateAiSummary, getChatbotResponse } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- I18N Translations ---
const translations = {
  en: {
    sidebar: {
      dashboard: 'Dashboard', customers: 'Customers', workOrders: 'Work Orders', notifications: 'Notifications',
      myReimbursements: 'My Reimbursements', reimbursement: 'Reimbursement', spareParts: 'Spare Parts',
      finance: 'Finance', employees: 'Employees', settings: 'Settings', logout: 'Logout',
      collapseMenu: 'Collapse Menu', expandMenu: 'Expand Menu'
    },
    dashboard: {
      welcome: 'Welcome back, {name}!', summary: 'Here\'s a summary of your business activities today.',
      totalCustomers: 'Total Customers', pendingWorkOrders: 'Pending Work Orders', technicianStatus: 'Technician Status',
      monthlyRevenue: 'Monthly Revenue', workOrderStatus: 'Work Order Status', completedByTechnician: 'Completed Work Orders by Technician',
      aiSummaryTitle: 'AI-Powered Business Summary', generateSummary: 'Generate Summary', generating: 'Generating...',
      aiPrompt: 'Click "Generate Summary" to get AI-powered insights for your business.', generatingInsights: 'Generating insights...'
    },
    common: {
      actions: 'Actions', edit: 'Edit', cancel: 'Cancel', save: 'Save', add: 'Add', create: 'Create', print: 'Print',
      name: 'Name', email: 'Email', phone: 'Phone', address: 'Address', description: 'Description', status: 'Status',
      total: 'Total', date: 'Date', category: 'Category', amount: 'Amount', paymentMethod: 'Payment Method',
      attachment: 'Attachment', notes: 'Notes', search: 'Search', back: 'Back', close: 'Close', download: 'Download',
      approve: 'Approve', view: 'View', submit: 'Submit', optional: 'Optional', required: 'Required',
    },
    status: {
      [WorkOrderStatus.PENDING]: 'Pending', [WorkOrderStatus.IN_PROGRESS]: 'In Progress', [WorkOrderStatus.COMPLETED]: 'Completed',
      [WorkOrderStatus.CANCELLED]: 'Cancelled', 'Paid': 'Paid', 'Unpaid': 'Unpaid',
      [TechnicianStatus.AVAILABLE]: 'Available', [TechnicianStatus.ON_JOB]: 'On Job', [TechnicianStatus.ON_BREAK]: 'On Break',
      [TechnicianStatus.OFFLINE]: 'Offline', [ContractStatus.ACTIVE]: 'Active', [ContractStatus.EXPIRED]: 'Expired',
      'Pending Approval': 'Pending Approval', 'Approved': 'Approved',
    },
    modals: {
        addCustomerTitle: 'Add New Customer', editCustomerTitle: 'Edit Customer',
        addClientTitle: 'Add New Client', editClientTitle: 'Edit Client',
        createWorkOrderTitle: 'Create New Work Order',
        assignTechnicianTitle: 'Assign Technician to {id}',
        addPartsTitle: 'Add Parts to {id}',
        addInvoiceTitle: 'Add New Invoice', editInvoiceTitle: 'Edit Invoice',
        addSparePartTitle: 'Add New Spare Part', editSparePartTitle: 'Edit Spare Part',
        addSupplierTitle: 'Add New Supplier', editSupplierTitle: 'Edit Supplier',
        addTransactionTitle: 'Add New Transaction', editTransactionTitle: 'Edit Transaction',
        editEmployeeTitle: 'Edit Employee: {name}',
        addContractTitle: 'Add New Service Contract', editContractTitle: 'Edit Service Contract',
        confirmPaymentTitle: 'Confirm Payment for {id}',
        requestReimbursementTitle: 'Request Reimbursement for {id}',
        attachmentViewerTitle: 'Attachment: {name}',
    },
    pages: {
        notifications: { title: 'Notifications', markAllRead: 'Mark all as read', empty: 'You have no notifications.' },
        reimbursement: { title: 'Reimbursement Requests', requestedBy: 'Requested By', empty: 'No reimbursement requests found.' },
        myReimbursements: { title: 'My Reimbursement History', workOrderId: 'Work Order ID', empty: 'You have not requested any reimbursements.'},
        customers: { title: 'Customers & Clients', customerList: 'Customer List', clientList: 'Client List', clientsTab: 'Clients', customersTab: 'Customers' },
        customerDetail: { back: 'Back to all customers', details: 'Customer Details', contracts: 'Service Contracts', history: 'Service History', noContracts: 'No contracts found.', noHistory: 'No service history found.' },
        workOrders: { title: 'Work Order Management', myTitle: 'Work Orders', myFullName: '{name}', allOrders: 'All Work Orders', myAssigned: 'My Assigned Work Orders', available: 'Available Work Orders', technician: 'Technician', unassigned: 'Unassigned', claimJob: 'Claim Job' },
        spareParts: { title: 'Spare Part Management', inventory: 'Spare Part Inventory', suppliers: 'Suppliers', partName: 'Part Name', stock: 'Stock', location: 'Location' },
        finance: { title: 'Finance', generateReport: 'Generate Financial Report', totalIncome: 'Total Income', totalExpense: 'Total Expense', profitLoss: 'Profit / Loss', invoices: 'Invoices', allTransactions: 'All Transactions', balanceSheet: 'Balance Sheet (Neraca)', assets: 'Assets', cash: 'Cash', liabilities: 'Liabilities', opCosts: 'Operational Costs', equity: 'Equity', retainedEarnings: 'Retained Earnings (Profit)' },
        employees: { title: 'Employee Management', allEmployees: 'All Employees', performance: 'Performance', contact: 'Contact' },
        technicianProfile: { title: 'Technician Profile', back: 'Back to all employees', personalInfo: 'Personal Information', recentActivity: 'Recent Activity' },
        settings: { title: 'Settings & Data', companyProfile: 'Company Profile (KOP Surat)', dataBackup: 'Data Backup & Restore', exportData: 'Export Data', exportDesc: 'Download a copy of your application data.', restoreData: 'Restore Data', restoreDesc: 'Upload a JSON backup file to restore data.', language: 'Language / Bahasa' }
    },
    login: {
      title: 'ServisPro CRM',
      subtitle: 'Sign in to your account',
      noAccount: 'Don\'t have an account?',
      signUp: 'Sign Up',
      haveAccount: 'Already have an account?',
      logIn: 'Log In',
      createAccount: 'Create Account',
      joinTeam: 'Join the ServisPro team',
      invalidCredentials: 'Invalid credentials. Please check your email/phone and password.'
    }
  },
  id: {
    sidebar: {
      dashboard: 'Dasbor', customers: 'Pelanggan', workOrders: 'Perintah Kerja', notifications: 'Notifikasi',
      myReimbursements: 'Reimbursement Saya', reimbursement: 'Reimbursement', spareParts: 'Suku Cadang',
      finance: 'Keuangan', employees: 'Karyawan', settings: 'Pengaturan', logout: 'Keluar',
      collapseMenu: 'Ciutkan Menu', expandMenu: 'Perluas Menu'
    },
    dashboard: {
      welcome: 'Selamat datang, {name}!', summary: 'Berikut ringkasan aktivitas bisnis Anda hari ini.',
      totalCustomers: 'Total Pelanggan', pendingWorkOrders: 'SPK Tertunda', technicianStatus: 'Status Teknisi',
      monthlyRevenue: 'Pendapatan Bulanan', workOrderStatus: 'Status Perintah Kerja', completedByTechnician: 'SPK Selesai per Teknisi',
      aiSummaryTitle: 'Ringkasan Bisnis Berbasis AI', generateSummary: 'Buat Ringkasan', generating: 'Membuat...',
      aiPrompt: 'Klik "Buat Ringkasan" untuk mendapat wawasan bisnis berbasis AI.', generatingInsights: 'Membuat wawasan...'
    },
    common: {
      actions: 'Aksi', edit: 'Ubah', cancel: 'Batal', save: 'Simpan', add: 'Tambah', create: 'Buat', print: 'Cetak',
      name: 'Nama', email: 'Email', phone: 'Telepon', address: 'Alamat', description: 'Deskripsi', status: 'Status',
      total: 'Total', date: 'Tanggal', category: 'Kategori', amount: 'Jumlah', paymentMethod: 'Metode Pembayaran',
      attachment: 'Lampiran', notes: 'Catatan', search: 'Cari', back: 'Kembali', close: 'Tutup', download: 'Unduh',
      approve: 'Setujui', view: 'Lihat', submit: 'Kirim', optional: 'Opsional', required: 'Wajib',
    },
    status: {
      [WorkOrderStatus.PENDING]: 'Tertunda', [WorkOrderStatus.IN_PROGRESS]: 'Sedang Dikerjakan', [WorkOrderStatus.COMPLETED]: 'Selesai',
      [WorkOrderStatus.CANCELLED]: 'Dibatalkan', 'Paid': 'Lunas', 'Unpaid': 'Belum Lunas',
      [TechnicianStatus.AVAILABLE]: 'Tersedia', [TechnicianStatus.ON_JOB]: 'Bertugas', [TechnicianStatus.ON_BREAK]: 'Istirahat',
      [TechnicianStatus.OFFLINE]: 'Offline', [ContractStatus.ACTIVE]: 'Aktif', [ContractStatus.EXPIRED]: 'Kadaluarsa',
      'Pending Approval': 'Menunggu Persetujuan', 'Approved': 'Disetujui',
    },
    modals: {
        addCustomerTitle: 'Tambah Pelanggan Baru', editCustomerTitle: 'Ubah Pelanggan',
        addClientTitle: 'Tambah Klien Baru', editClientTitle: 'Ubah Klien',
        createWorkOrderTitle: 'Buat Perintah Kerja Baru',
        assignTechnicianTitle: 'Tugaskan Teknisi ke {id}',
        addPartsTitle: 'Tambah Suku Cadang ke {id}',
        addInvoiceTitle: 'Tambah Faktur Baru', editInvoiceTitle: 'Ubah Faktur',
        addSparePartTitle: 'Tambah Suku Cadang Baru', editSparePartTitle: 'Ubah Suku Cadang',
        addSupplierTitle: 'Tambah Pemasok Baru', editSupplierTitle: 'Ubah Pemasok',
        addTransactionTitle: 'Tambah Transaksi Baru', editTransactionTitle: 'Ubah Transaksi',
        editEmployeeTitle: 'Ubah Karyawan: {name}',
        addContractTitle: 'Tambah Kontrak Servis Baru', editContractTitle: 'Ubah Kontrak Servis',
        confirmPaymentTitle: 'Konfirmasi Pembayaran untuk {id}',
        requestReimbursementTitle: 'Ajukan Reimbursement untuk {id}',
        attachmentViewerTitle: 'Lampiran: {name}',
    },
    pages: {
        notifications: { title: 'Notifikasi', markAllRead: 'Tandai semua dibaca', empty: 'Anda tidak memiliki notifikasi.' },
        reimbursement: { title: 'Permintaan Reimbursement', requestedBy: 'Diajukan Oleh', empty: 'Tidak ada permintaan reimbursement.' },
        myReimbursements: { title: 'Riwayat Reimbursement Saya', workOrderId: 'ID Perintah Kerja', empty: 'Anda belum mengajukan reimbursement.' },
        customers: { title: 'Pelanggan & Klien', customerList: 'Daftar Pelanggan', clientList: 'Daftar Klien', clientsTab: 'Klien', customersTab: 'Pelanggan' },
        customerDetail: { back: 'Kembali ke semua pelanggan', details: 'Detail Pelanggan', contracts: 'Kontrak Servis', history: 'Riwayat Servis', noContracts: 'Tidak ada kontrak.', noHistory: 'Tidak ada riwayat servis.' },
        workOrders: { title: 'Manajemen Perintah Kerja', myTitle: 'Perintah Kerja', myFullName: '{name}', allOrders: 'Semua Perintah Kerja', myAssigned: 'Tugas Saya', available: 'SPK Tersedia', technician: 'Teknisi', unassigned: 'Belum Ditugaskan', claimJob: 'Ambil Pekerjaan' },
        spareParts: { title: 'Manajemen Suku Cadang', inventory: 'Inventaris Suku Cadang', suppliers: 'Pemasok', partName: 'Nama Part', stock: 'Stok', location: 'Lokasi' },
        finance: { title: 'Keuangan', generateReport: 'Buat Laporan Keuangan', totalIncome: 'Total Pendapatan', totalExpense: 'Total Pengeluaran', profitLoss: 'Laba / Rugi', invoices: 'Faktur', semuaTransaksi: 'Semua Transaksi', balanceSheet: 'Neraca', assets: 'Aset', cash: 'Kas', liabilities: 'Liabilitas', opCosts: 'Biaya Operasional', equity: 'Ekuitas', retainedEarnings: 'Laba Ditahan' },
        employees: { title: 'Manajemen Karyawan', allEmployees: 'Semua Karyawan', performance: 'Kinerja', contact: 'Kontak' },
        technicianProfile: { title: 'Profil Teknisi', back: 'Kembali ke semua karyawan', personalInfo: 'Informasi Pribadi', aktivitasTerkini: 'Aktivitas Terkini' },
        settings: { title: 'Pengaturan & Data', companyProfile: 'Profil Perusahaan (KOP Surat)', dataBackup: 'Cadangkan & Pulihkan Data', exportData: 'Ekspor Data', exportDesc: 'Unduh salinan data aplikasi Anda.', restoreData: 'Pulihkan Data', restoreDesc: 'Unggah file cadangan JSON untuk memulihkan data.', language: 'Language / Bahasa' }
    },
    login: {
      title: 'ServisPro CRM',
      subtitle: 'Masuk ke akun Anda',
      noAccount: 'Belum punya akun?',
      signUp: 'Daftar',
      haveAccount: 'Sudah punya akun?',
      logIn: 'Masuk',
      createAccount: 'Buat Akun',
      joinTeam: 'Bergabung dengan tim ServisPro',
      invalidCredentials: 'Kredensial salah. Silakan periksa email/telepon dan kata sandi Anda.'
    }
  }
};


// --- INITIAL MOCK DATA ---
const INITIAL_USERS: User[] = [];

const INITIAL_CUSTOMERS: Customer[] = [];

const INITIAL_SUPPLIERS: Supplier[] = [];

const INITIAL_SPARE_PARTS: SparePart[] = [];

const INITIAL_CLIENTS: Client[] = [];

const INITIAL_WORK_ORDERS: WorkOrder[] = [];

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

const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_CONTRACTS: ServiceContract[] = [];

// --- UTILITY FUNCTIONS ---
const formatIDR = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const formatUserName = (name?: string | null): string => {
    if (!name || typeof name !== 'string') {
        return '';
    }
    return name.split(' (')[0];
};

const getStatusColor = (status: WorkOrderStatus | 'Paid' | 'Unpaid' | 'Pending Approval' | 'Approved' | ContractStatus | TechnicianStatus) => {
  switch (status) {
    case WorkOrderStatus.PENDING: case 'Unpaid': case 'Pending Approval': case ContractStatus.EXPIRED: case TechnicianStatus.ON_BREAK: return 'bg-yellow-100 text-yellow-800';
    case WorkOrderStatus.IN_PROGRESS: case TechnicianStatus.ON_JOB: return 'bg-blue-100 text-blue-800';
    case WorkOrderStatus.COMPLETED: case 'Paid': case 'Approved': case ContractStatus.ACTIVE: case TechnicianStatus.AVAILABLE: return 'bg-green-100 text-green-800';
    case WorkOrderStatus.CANCELLED: case ContractStatus.CANCELLED: return 'bg-red-100 text-red-800';
    case TechnicianStatus.OFFLINE: return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-800';
  }
};

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
  icon: React.ReactElement<{ className?: string }>;
  color: 'blue' | 'yellow' | 'green' | 'indigo' | 'red';
}
const StatCard: React.FC<CardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
        green: { bg: 'bg-green-100', text: 'text-green-600' },
        indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
        red: { bg: 'bg-red-100', text: 'text-red-600' },
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
const LoginScreen: React.FC<{ onLogin: (user: User) => void; onSwitchToSignUp: () => void, users: User[]; t: Function }> = ({ onLogin, onSwitchToSignUp, users, t }) => {
  const [identifier, setIdentifier] = useState(''); // Can be email or phone
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(u => 
        (u.email?.toLowerCase() === identifier.toLowerCase() || u.phone === identifier) && u.password === password
    );

    if (user) {
        onLogin(user);
    } else {
        setError(t('login.invalidCredentials'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary-700 mb-2 text-center">{t('login.logIn')}</h1>
        <p className="text-gray-600 mb-8 text-center">{t('login.subtitle')}</p>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">Email or Phone</label>
                <input
                    type="text"
                    id="identifier"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="you@example.com or 0812..."
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
            </div>
            {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
            <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 !mt-6"
            >
                {t('login.logIn')}
            </button>
        </form>
        <div className="mt-6 text-sm text-center">
          <span className="text-gray-600">{t('login.noAccount')} </span>
          <button onClick={onSwitchToSignUp} className="font-semibold text-primary-600 hover:underline">{t('login.signUp')}</button>
        </div>
      </div>
    </div>
  );
};

const SignUpScreen: React.FC<{ onSignUp: (user: User) => void; onSwitchToLogin: () => void; t: Function }> = ({ onSignUp, onSwitchToLogin, t }) => {
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
                <h1 className="text-3xl font-bold text-primary-700 mb-2 text-center">{t('login.createAccount')}</h1>
                <p className="text-gray-600 mb-8 text-center">{t('login.joinTeam')}</p>
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
                        {t('login.signUp')}
                    </button>
                </form>
                 <div className="mt-6 text-sm text-center">
                    <span className="text-gray-600">{t('login.haveAccount')} </span>
                    <button onClick={onSwitchToLogin} className="font-semibold text-primary-600 hover:underline">{t('login.logIn')}</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, customer, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? t('modals.editCustomerTitle') : t('modals.addCustomerTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.name')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.email')}</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.phone')}</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.address')}</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.category')}</label>
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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Customer</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, client, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={client ? t('modals.editClientTitle') : t('modals.addClientTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client Name</label>
                    <input type="text" name="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Client</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, customers, clients, preselectedCustomerId, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.createWorkOrderTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('sidebar.customers')}</label>
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} required disabled={!!preselectedCustomerId} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100">
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client ({t('common.optional')})</label>
                    <select value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value="">-- No Client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.description')}</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Cost (e.g., Service Fee)</label>
                    <input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.create')} Order</button>
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
    t: Function;
}> = ({ workOrder, technicians, onClose, onSave, t }) => {
    const [selectedTech, setSelectedTech] = useState(workOrder.technicianId || '');

     const handleSave = () => {
        if (!selectedTech) return;
        onSave(workOrder.id, selectedTech);
        onClose();
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={t('modals.assignTechnicianTitle', {id: workOrder.id})}>
            <div>
                <label className="block text-sm font-medium text-gray-700">Select Technician</label>
                <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                    <option value="">-- Choose a technician --</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
                 <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
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
    t: Function;
}> = ({ workOrder, onClose, onSave, availableParts, t }) => {
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
        <Modal isOpen={true} onClose={onClose} title={t('modals.addPartsTitle', {id: workOrder.id})}>
           <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableParts.map(part => (
                    <div key={part.id} className={`flex items-center justify-between p-2 border rounded-md ${part.stock === 0 ? 'bg-gray-100 opacity-60' : ''}`}>
                        <div>
                            <p className="font-semibold">{part.name}</p>
                            <p className="text-sm text-gray-500">{formatIDR(part.sellingPrice)} - <span className={`font-bold ${part.stock <= 5 ? 'text-red-600' : 'text-gray-700'}`}>{t('pages.spareParts.stock')}: {part.stock}</span></p>
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
                <button onClick={handleSave} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.save')} Changes</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, invoice, workOrders, t }) => {
    const getInitialState = () => ({
        workOrderId: '',
        subtotal: 0,
        discount: '',
        tax: '',
        amount: '0',
        issuedDate: new Date().toISOString().split('T')[0],
        status: 'Unpaid' as 'Paid' | 'Unpaid',
        notes: '',
    });

    const [formData, setFormData] = useState(getInitialState());
    const completedWorkOrders = useMemo(() => workOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED), [workOrders]);

    useEffect(() => {
        if (invoice) {
            const workOrder = workOrders.find(wo => wo.id === invoice.workOrderId);
            const subtotal = workOrder?.totalCost || 0;
            setFormData({
                workOrderId: invoice.workOrderId,
                subtotal: subtotal,
                discount: String(invoice.discount || ''),
                tax: String(invoice.tax || ''),
                amount: String(invoice.amount),
                issuedDate: invoice.issuedDate,
                status: invoice.status,
                notes: invoice.notes || '',
            });
        } else {
            setFormData(getInitialState());
        }
    }, [invoice, isOpen, workOrders]);

    useEffect(() => {
        const sub = formData.subtotal || 0;
        const disc = Number(formData.discount) || 0;
        const taxVal = Number(formData.tax) || 0;
        const total = sub - disc + taxVal;
        setFormData(prev => ({ ...prev, amount: String(total) }));
    }, [formData.subtotal, formData.discount, formData.tax]);

    const handleWorkOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const woId = e.target.value;
        const selectedWO = completedWorkOrders.find(wo => wo.id === woId);
        const subtotal = selectedWO ? selectedWO.totalCost : 0;
        setFormData(prev => ({
            ...prev,
            workOrderId: woId,
            subtotal: subtotal,
            amount: String(subtotal)
        }));
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
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
            discount: Number(formData.discount) || undefined,
            tax: Number(formData.tax) || undefined,
            notes: formData.notes || undefined,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={invoice ? t('modals.editInvoiceTitle') : t('modals.addInvoiceTitle')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Completed Work Order</label>
                    <select name="workOrderId" value={formData.workOrderId} onChange={handleWorkOrderChange} required disabled={!!invoice} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-gray-100">
                        <option value="">Select a Work Order</option>
                        {completedWorkOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.id} - {wo.customer.name}</option>)}
                    </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                        <input type="text" value={formatIDR(formData.subtotal)} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Issued Date</label>
                        <input type="date" name="issuedDate" value={formData.issuedDate} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Discount (IDR)</label>
                        <input type="number" name="discount" value={formData.discount} onChange={handleChange} placeholder="e.g. 50000" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tax (IDR)</label>
                        <input type="number" name="tax" value={formData.tax} onChange={handleChange} placeholder="e.g. 10000" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <input type="text" name="amount" value={formatIDR(Number(formData.amount))} disabled required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 font-bold" />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.notes')} / Terms & Conditions</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="e.g. Pembayaran via transfer Bank ABC 123456789 a.n. ServisPro" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.status')}</label>
                    <select name="status" value={formData.status} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value="Unpaid">{t('status.Unpaid')}</option>
                        <option value="Paid">{t('status.Paid')}</option>
                    </select>
                </div>

                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Invoice</button>
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
    allSpareParts: SparePart[];
    t: Function;
}> = ({ isOpen, onClose, onSave, part, suppliers, allSpareParts, t }) => {
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
    
    useEffect(() => {
        if (!part && formData.name.length >= 3) {
            const generateUniqueItemCode = (partName: string): string => {
                const now = new Date();
                const year = now.getFullYear().toString().slice(-2);
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const datePart = `${year}${month}`;
                
                const acronymPart = partName.replace(/[^a-zA-Z\s]/g, '').split(' ').map(word => word[0]).join('').slice(0, 3).toUpperCase();
                if (acronymPart.length < 1) return '';

                const prefix = `${datePart}-${acronymPart}`;
                
                const relevantParts = allSpareParts.filter(p => p.itemCode.startsWith(prefix));
                
                let maxSeq = 0;
                relevantParts.forEach(p => {
                    const seqStr = p.itemCode.split('-')[2];
                    if (seqStr) {
                        const seq = parseInt(seqStr, 10);
                        if (!isNaN(seq) && seq > maxSeq) {
                            maxSeq = seq;
                        }
                    }
                });
                
                const newSeqStr = (maxSeq + 1).toString().padStart(3, '0');
                return `${prefix}-${newSeqStr}`;
            };
            
            const newItemCode = generateUniqueItemCode(formData.name);
            setFormData(prev => ({ ...prev, itemCode: newItemCode }));
        }
    }, [formData.name, part, allSpareParts]);

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
        <Modal isOpen={isOpen} onClose={onClose} title={part ? t('modals.editSparePartTitle') : t('modals.addSparePartTitle')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Kode Item</label>
                    <input type="text" name="itemCode" value={formData.itemCode} onChange={handleChange} required disabled={!part} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('pages.spareParts.partName')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Harga Beli (IDR)</label>
                        <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder={t('common.optional')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
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
                    <label className="block text-sm font-medium text-gray-700">{t('pages.spareParts.location')} (e.g. Rack A1)</label>
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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Part</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, supplier, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? t('modals.editSupplierTitle') : t('modals.addSupplierTitle')}>
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
                        <label className="block text-sm font-medium text-gray-700">{t('common.phone')}</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.email')}</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Supplier</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, transaction, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={transaction ? t('modals.editTransactionTitle') : t('modals.addTransactionTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.description')}</label>
                    <input type="text" name="description" value={formData.description} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.amount')} (IDR)</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.date')}</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.category')}</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                            {(formData.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.paymentMethod')}</label>
                        <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                            {Object.values(PaymentMethod).map(method => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.attachment')} (Nota/Receipt)</label>
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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Transaction</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, user, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.editEmployeeTitle', {name: formatUserName(user?.name)})}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.name')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.email')}</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.phone')}</label>
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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Changes</button>
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
    t: Function;
}> = ({ isOpen, onClose, onSave, contract, customerId, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={contract ? t('modals.editContractTitle') : t('modals.addContractTitle')} size="lg">
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
                    <label className="block text-sm font-medium text-gray-700">{t('common.status')}</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                        {Object.values(ContractStatus).map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                    <textarea name="terms" value={formData.terms} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                 <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Contract</button>
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
    t: Function;
}> = ({ isOpen, onClose, onConfirm, workOrder, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.confirmPaymentTitle', {id: workOrder.id})}>
            <div className="space-y-4">
                <p>Please confirm that you have received payment for this work order from <strong>{workOrder.customer.name}</strong>.</p>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.paymentMethod')}</label>
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
                        <label className="block text-sm font-medium text-gray-700">Upload Bukti Transfer ({t('common.optional')})</label>
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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
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
    t: Function;
}> = ({ isOpen, onClose, onConfirm, workOrder, t }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.requestReimbursementTitle', {id: workOrder.id})}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.amount')} (IDR)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('common.description')}</label>
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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.submit')} Request</button>
                </div>
            </div>
        </Modal>
    );
};

const AttachmentViewerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    attachment: { name: string; type: string; data: string; } | null;
    t: Function;
}> = ({ isOpen, onClose, attachment, t }) => {
    if (!isOpen || !attachment) return null;

    const isImage = attachment.type.startsWith('image/');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.attachmentViewerTitle', {name: attachment.name})} size="lg">
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
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.close')}</button>
                <a href={attachment.data} download={attachment.name} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 no-underline">
                    {t('common.download')} File
                </a>
            </div>
        </Modal>
    );
};


// --- PAGE COMPONENTS ---

const NotificationsPage: React.FC<{ notifications: Notification[], onMarkAllRead: () => void, t: Function }> = ({ notifications, onMarkAllRead, t }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{t('pages.notifications.title')}</h1>
                {notifications.some(n => !n.read) && (
                    <button onClick={onMarkAllRead} className="text-sm font-medium text-primary-600 hover:underline">
                        {t('pages.notifications.markAllRead')}
                    </button>
                )}
            </div>
            <div className="bg-white rounded-lg shadow-md">
                {notifications.length === 0 ? (
                    <p className="text-gray-500 text-center py-16">{t('pages.notifications.empty')}</p>
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
    t: Function;
}> = ({ transactions, users, onApprove, onViewAttachment, t }) => {
    const reimbursementRequests = transactions.filter(t => t.category === TransactionCategory.REIMBURSEMENT)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.reimbursement.title')}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">{t('common.date')}</th>
                                <th scope="col" className="px-6 py-3">{t('pages.reimbursement.requestedBy')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.description')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.amount')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.status')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.attachment')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reimbursementRequests.map(req => {
                                const user = users.find(u => u.id === req.requestedByUserId);
                                const statusKey = req.approved ? 'Approved' : 'Pending Approval';
                                return (
                                    <tr key={req.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">{req.date}</td>
                                        <td className="px-6 py-4 font-medium">{user ? formatUserName(user.name) : 'Unknown'}</td>
                                        <td className="px-6 py-4">{req.description}</td>
                                        <td className="px-6 py-4 font-semibold">{formatIDR(req.amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(statusKey)}`}>{t(`status.${statusKey}`)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {req.attachment ? (
                                                <button onClick={() => onViewAttachment(req.attachment!)} className="font-medium text-blue-600 hover:underline">{t('common.view')}</button>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {!req.approved && (
                                                <button onClick={() => onApprove(req.id)} className="font-medium text-green-600 hover:underline">{t('common.approve')}</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {reimbursementRequests.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">{t('pages.reimbursement.empty')}</td></tr>
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
    t: Function;
}> = ({ transactions, currentUser, onViewAttachment, t }) => {
    const myReimbursements = transactions
        .filter(t => t.category === TransactionCategory.REIMBURSEMENT && t.requestedByUserId === currentUser.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.myReimbursements.title')}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">{t('common.date')}</th>
                                <th scope="col" className="px-6 py-3">{t('pages.myReimbursements.workOrderId')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.description')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.amount')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.status')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.attachment')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myReimbursements.map(req => {
                                const statusKey = req.approved ? 'Approved' : 'Pending Approval';
                                return (
                                <tr key={req.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{req.date}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{req.workOrderId ? `...${req.workOrderId.slice(-7)}` : '-'}</td>
                                    <td className="px-6 py-4">{req.description}</td>
                                    <td className="px-6 py-4 font-semibold">{formatIDR(req.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(statusKey)}`}>{t(`status.${statusKey}`)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {req.attachment ? (
                                            <button onClick={() => onViewAttachment(req.attachment!)} className="font-medium text-blue-600 hover:underline">{t('common.view')} Receipt</button>
                                        ) : '-'}
                                    </td>
                                </tr>
                            )})}
                            {myReimbursements.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">{t('pages.myReimbursements.empty')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<{workOrders: WorkOrder[], customers: Customer[], users: User[], currentUser: User, t: Function}> = ({ workOrders, customers, users, currentUser, t }) => {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const woStatusData = useMemo(() => {
    const counts = workOrders.reduce((acc, wo) => {
      acc[wo.status] = (acc[wo.status] || 0) + 1;
      return acc;
    }, {} as Record<WorkOrderStatus, number>);
    return Object.entries(counts).map(([name, value]) => ({ name: t(`status.${name}`), value }));
  }, [workOrders, t]);
  
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
      <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.welcome', {name: formatUserName(currentUser.name)})}</h1>
      <p className="text-gray-500 mb-6">{t('dashboard.summary')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title={t('dashboard.totalCustomers')} value={customers.length.toString()} icon={<CustomerIcon />} color="blue" />
        <StatCard title={t('dashboard.pendingWorkOrders')} value={workOrders.filter(wo => wo.status === WorkOrderStatus.PENDING).length.toString()} icon={<WorkOrderIcon />} color="yellow" />
        
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4 transition-transform transform hover:-translate-y-1 hover:shadow-lg">
            <div className="bg-indigo-100 p-3 rounded-full"><TechnicianIcon className="h-6 w-6 text-indigo-600" /></div>
            <div>
                <p className="text-sm text-gray-500">{t('dashboard.technicianStatus')}</p>
                <div className="h-20 overflow-y-auto pr-2 mt-1">
                    {technicians.map(tech => (
                        <div key={tech.id} className="flex items-center justify-between text-sm py-0.5">
                            <span className="font-semibold text-gray-700">{formatUserName(tech.name)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(tech.status!)}`}>{t(`status.${tech.status!}`)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <StatCard title={t('dashboard.monthlyRevenue')} value={formatIDR(monthlyRevenueData[3].revenue)} icon={<FinanceIcon />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
           <h2 className="text-lg font-semibold text-gray-700 mb-4">{t('dashboard.monthlyRevenue')}</h2>
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
          <h2 className="text-lg font-semibold text-gray-700 mb-4">{t('dashboard.workOrderStatus')}</h2>
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
           <h2 className="text-lg font-semibold text-gray-700 mb-4">{t('dashboard.completedByTechnician')}</h2>
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
           <h2 className="text-lg font-semibold">{t('dashboard.aiSummaryTitle')}</h2>
           <button onClick={handleGenerateSummary} disabled={isLoading} className="flex items-center space-x-2 bg-white text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 transition disabled:bg-gray-300 disabled:text-gray-500 font-semibold">
             {isLoading ? <SpinnerIcon className="h-5 w-5"/> : <AiIcon className="h-5 w-5"/>}
             <span>{isLoading ? t('dashboard.generating') : t('dashboard.generateSummary')}</span>
           </button>
        </div>
        <div className="p-6">
            <div className="prose max-w-none bg-gray-50 p-4 rounded-md min-h-[150px]">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">{t('dashboard.generatingInsights')}</p>
                </div>
            ) : (
                summary ? <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }} /> : <p className="text-gray-500">{t('dashboard.aiPrompt')}</p>
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
    t: Function;
}> = ({ customers, clients, onAddCustomer, onEditCustomer, onAddClient, onEditClient, t }) => {
    const [activeTab, setActiveTab] = useState<'customers' | 'clients'>('customers');
    
    const renderCustomers = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{t('pages.customers.customerList')}</h2>
                <button onClick={onAddCustomer} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Customer</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">{t('common.name')}</th>
                            <th scope="col" className="px-6 py-3">{t('common.category')}</th>
                            <th scope="col" className="px-6 py-3">Tags</th>
                            <th scope="col" className="px-6 py-3">{t('pages.employees.contact')}</th>
                            <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
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
                                    <button onClick={() => onEditCustomer(customer)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
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
                <h2 className="text-xl font-semibold">{t('pages.customers.clientList')}</h2>
                <button onClick={onAddClient} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Client</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Client Name</th>
                            <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{client.name}</td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => onEditClient(client)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.customers.title')}</h1>
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('customers')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'customers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <CustomerIcon className={`mr-2 h-5 w-5 ${activeTab === 'customers' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>{t('pages.customers.customersTab')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'clients' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <BriefcaseIcon className={`mr-2 h-5 w-5 ${activeTab === 'clients' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>{t('pages.customers.clientsTab')}</span>
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
    t: Function;
}> = ({ customers, workOrders, contracts, users, onEditCustomer, onAddContract, onEditContract, onCreateWorkOrder, onChat, onNotify, t }) => {
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
                <Link to="/customers" className="mt-4 inline-block text-primary-600 hover:underline">← {t('pages.customerDetail.back')}</Link>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                 <Link to="/customers" className="text-sm font-medium text-primary-600 hover:underline flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    {t('pages.customerDetail.back')}
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">{customer.name}</h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">{t('pages.customerDetail.details')}</h2>
                        <div className="space-y-3 text-sm">
                            <p><strong>{t('common.email')}:</strong> <a href={`mailto:${customer.email}`} className="text-primary-600">{customer.email}</a></p>
                            <p><strong>{t('common.phone')}:</strong> <a href={`tel:${customer.phone}`} className="text-primary-600">{customer.phone}</a></p>
                            <p><strong>{t('common.address')}:</strong> {customer.address}</p>
                            <p><strong>{t('common.category')}:</strong> <span className="font-semibold">{customer.category || 'N/A'}</span></p>
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
                            <button onClick={() => onEditCustomer(customer)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">{t('common.edit')} Customer</button>
                            <button onClick={() => onChat(customer)} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm">Chat</button>
                            <button onClick={() => onNotify(customer)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">Notify</button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{t('pages.customerDetail.contracts')}</h2>
                            <button onClick={() => onAddContract(customer.id)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">{t('common.add')} Contract</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2">Title</th>
                                        <th className="px-4 py-2">Period</th>
                                        <th className="px-4 py-2">{t('common.status')}</th>
                                        <th className="px-4 py-2">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerContracts.map(contract => (
                                        <tr key={contract.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium">{contract.title}</td>
                                            <td className="px-4 py-2">{contract.startDate} to {contract.endDate}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>{t(`status.${contract.status}`)}</span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <button onClick={() => onEditContract(contract)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customerContracts.length === 0 && (
                                        <tr><td colSpan={4} className="text-center py-4 text-gray-500">{t('pages.customerDetail.noContracts')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{t('pages.customerDetail.history')}</h2>
                            <button onClick={() => onCreateWorkOrder(customer.id)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">{t('common.create')} Work Order</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2">{t('common.date')}</th>
                                        <th className="px-4 py-2">{t('common.description')}</th>
                                        <th className="px-4 py-2">{t('pages.workOrders.technician')}</th>
                                        <th className="px-4 py-2">{t('common.status')}</th>
                                        <th className="px-4 py-2">{t('common.total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerWorkOrders.map(wo => (
                                        <tr key={wo.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{wo.createdAt}</td>
                                            <td className="px-4 py-2 max-w-xs truncate">{wo.description}</td>
                                            <td className="px-4 py-2">{formatUserName(users.find(u => u.id === wo.technicianId)?.name) || 'N/A'}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span>
                                            </td>
                                            <td className="px-4 py-2 font-semibold">{formatIDR(wo.totalCost)}</td>
                                        </tr>
                                    ))}
                                    {customerWorkOrders.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-4 text-gray-500">{t('pages.customerDetail.noHistory')}</td></tr>
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
    t: Function;
}> = ({ user, workOrders, invoices, users, transactions, companyProfile, clients, onAddPart, onCreate, onAssign, onClaim, onComplete, onMarkAsPaid, onChat, onNotify, onRequestReimbursement, t }) => {
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

        const currentSpareParts = order.spareParts || [];
        if(currentSpareParts.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['No', 'Spare Part', 'Harga']],
                body: currentSpareParts.map((part, i) => [i + 1, part.name, formatIDR(part.sellingPrice)]),
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
                    {title === t('pages.workOrders.allOrders') && <button onClick={onCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.create')} Work Order</button>}
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">ID</th>
                                <th scope="col" className="px-6 py-3">{t('sidebar.customers')}</th>
                                {showClientColumn && <th scope="col" className="px-6 py-3">Client</th>}
                                <th scope="col" className="px-6 py-3">{t('common.description')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.status')}</th>
                                <th scope="col" className="px-6 py-3">{t('pages.workOrders.technician')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.total')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('common.actions')}</th>
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
                                              <button onClick={() => onAddPart(order)} className={actionItemClass}>{t('common.add')} Part</button>
                                              <button onClick={() => onComplete(order.id)} className={actionItemClass}>Complete</button>
                                            </>
                                        )}
                                        {order.status === WorkOrderStatus.COMPLETED && !isPaid && (
                                            <button onClick={() => onMarkAsPaid(order)} className={actionItemClassGreen}>Confirm Payment</button>
                                        )}
                                        <button onClick={() => onRequestReimbursement(order)} className={actionItemClass}>{t('sidebar.reimbursement')}</button>
                                        <button onClick={() => generateSpkPdf(order)} className={actionItemClass}>{t('common.print')} SPK</button>
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
                                        <button onClick={() => generateSpkPdf(order)} className={actionItemClass}>{t('common.print')} SPK</button>
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
                                                {t(`status.${order.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{formatUserName(users.find(u => u.id === order.technicianId)?.name) || t('pages.workOrders.unassigned')}</td>
                                        <td className="px-6 py-4 font-semibold">{formatIDR(order.totalCost)}</td>
                                        <td className="px-6 py-4 text-right">
                                            {isTechnician ? (
                                                order.technicianId === user.id ? (
                                                    isPaid ? (
                                                        <span className="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">{t('status.Paid')}</span>
                                                    ) : (
                                                        <DropdownMenu trigger={<MoreVerticalIcon className="h-5 w-5 text-gray-500" />}>
                                                            {technicianActions}
                                                        </DropdownMenu>
                                                    )
                                                ) : !order.technicianId ? (
                                                    <DropdownMenu trigger={<MoreVerticalIcon className="h-5 w-5 text-gray-500" />}>
                                                        <button onClick={() => onClaim(order.id, user.id)} className={actionItemClassPrimary}>{t('pages.workOrders.claimJob')}</button>
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
                                                        {reimbursementHistory.map(req => {
                                                            const statusKey = req.approved ? 'Approved' : 'Pending Approval';
                                                            return (
                                                            <li key={req.id} className="flex justify-between items-center text-xs text-gray-700">
                                                                <span>{req.description} - {formatIDR(req.amount)}</span>
                                                                <span className={`px-2 py-0.5 font-medium rounded-full ${getStatusColor(statusKey)}`}>{t(`status.${statusKey}`)}</span>
                                                            </li>
                                                        )})}
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
                    <h1 className="text-3xl font-bold text-gray-800">{t('pages.workOrders.myFullName', {name: formatUserName(user.name)})}</h1>
                    <h2 className="text-xl text-gray-500 mb-6">{t('pages.workOrders.myTitle')}</h2>
                </>
            ) : (
                <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.workOrders.title')}</h1>
            )}
             {isTechnician ? (
                <>
                    {renderOrderTable(t('pages.workOrders.myAssigned'), myWorkOrders)}
                    {renderOrderTable(t('pages.workOrders.available'), unassignedWorkOrders)}
                </>
             ) : (
                renderOrderTable(t('pages.workOrders.allOrders'), workOrders)
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
    t: Function;
}> = ({ spareParts, suppliers, onAddPart, onEditPart, onAddSupplier, onEditSupplier, t }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers'>('inventory');

    const renderInventory = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{t('pages.spareParts.inventory')}</h2>
                <button onClick={onAddPart} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Spare Part</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Kode Item</th>
                            <th scope="col" className="px-6 py-3">{t('pages.spareParts.partName')}</th>
                            <th scope="col" className="px-6 py-3">Supplier</th>
                            <th scope="col" className="px-6 py-3">Harga Beli</th>
                            <th scope="col" className="px-6 py-3">Harga Jual</th>
                            <th scope="col" className="px-6 py-3">{t('pages.spareParts.stock')}</th>
                            <th scope="col" className="px-6 py-3">Satuan</th>
                            <th scope="col" className="px-6 py-3">{t('pages.spareParts.location')}</th>
                            <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
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
                                    <button onClick={() => onEditPart(part)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
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
                <button onClick={onAddSupplier} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Supplier</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Supplier Name</th>
                            <th scope="col" className="px-6 py-3">Contact Person</th>
                            <th scope="col" className="px-6 py-3">Contact Info</th>
                            <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
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
                                    <button onClick={() => onEditSupplier(supplier)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.spareParts.title')}</h1>
             <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <SparePartIcon className={`mr-2 h-5 w-5 ${activeTab === 'inventory' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>{t('pages.spareParts.inventory')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'suppliers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <TruckIcon className={`mr-2 h-5 w-5 ${activeTab === 'suppliers' ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span>{t('pages.spareParts.suppliers')}</span>
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
    t: Function;
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
    onViewAttachment,
    t
}) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{t('pages.finance.title')}</h1>
                <button onClick={onGenerateReport} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    {t('pages.finance.generateReport')}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                 <StatCard title={t('pages.finance.totalIncome')} value={formatIDR(totalIncome)} icon={<FinanceIcon />} color="green" />
                 <StatCard title={t('pages.finance.totalExpense')} value={formatIDR(totalExpense)} icon={<FinanceIcon />} color="red" />
                 <StatCard title={t('pages.finance.profitLoss')} value={formatIDR(labaRugi)} icon={<FinanceIcon />} color="blue" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('pages.finance.invoices')}</h2>
                    <button onClick={onAddInvoice} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Invoice</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Invoice ID</th>
                                <th className="px-6 py-3">{t('sidebar.customers')}</th>
                                <th className="px-6 py-3">Issued Date</th>
                                <th className="px-6 py-3">{t('common.amount')}</th>
                                <th className="px-6 py-3">{t('common.status')}</th>
                                <th className="px-6 py-3">{t('common.actions')}</th>
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
                                            {t(`status.${invoice.status}`)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                        <button onClick={() => onEditInvoice(invoice)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
                                        <button onClick={() => onPrintInvoice(invoice)} className="font-medium text-green-600 hover:underline">{t('common.print')}</button>
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
                        <h2 className="text-xl font-semibold">{t('pages.finance.allTransactions')}</h2>
                        <button onClick={onAddTransaction} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm">{t('common.add')} Transaction</button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">{t('common.date')}</th>
                                    <th className="px-6 py-3">{t('common.description')}</th>
                                    <th className="px-6 py-3">{t('common.category')}</th>
                                    <th className="px-6 py-3">{t('common.amount')}</th>
                                    <th className="px-6 py-3">{t('common.actions')}</th>
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
                                                {isPendingReimbursement && <span className="text-xs font-bold text-yellow-800 ml-2">({t('status.Pending Approval')})</span>}
                                            </td>
                                            <td className="px-6 py-4">{record.category}</td>
                                            <td className={`px-6 py-4 font-semibold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatIDR(record.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {record.attachment && (
                                                    <button onClick={() => onViewAttachment(record.attachment!)} className="font-medium text-blue-600 hover:underline mr-2">
                                                        {t('common.view')}
                                                    </button>
                                                )}
                                                {!record.invoiceId && record.category !== TransactionCategory.REIMBURSEMENT && (
                                                    <button onClick={() => onEditTransaction(record)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
                                                )}
                                                {isPendingReimbursement && currentUser.role === UserRole.ADMINISTRATOR && (
                                                    <button onClick={() => onApproveReimbursement(record.id)} className="font-medium text-green-600 hover:underline">{t('common.approve')}</button>
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
                     <h2 className="text-xl font-semibold mb-4">{t('pages.finance.balanceSheet')}</h2>
                     <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg text-green-700">{t('pages.finance.assets')}</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span>{t('pages.finance.cash')}</span>
                                <span className="font-bold">{formatIDR(assets)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 border-t pt-2">
                                <span className="font-bold">Total Assets</span>
                                <span className="font-bold">{formatIDR(assets)}</span>
                            </div>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-red-700">{t('pages.finance.liabilities')}</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span>{t('pages.finance.opCosts')}</span>
                                <span className="font-bold">{formatIDR(liabilities)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 border-t pt-2">
                                <span className="font-bold">Total Liabilities</span>
                                <span className="font-bold">{formatIDR(liabilities)}</span>
                            </div>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-blue-700">{t('pages.finance.equity')}</h3>
                             <div className="flex justify-between items-center mt-1">
                                <span>{t('pages.finance.retainedEarnings')}</span>
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
    t: Function;
}> = ({ users, workOrders, onEdit, onStatusChange, t }) => {
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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.employees.title')}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('pages.employees.allEmployees')}</h2>
                    <div className="w-full max-w-xs">
                        <input
                            type="text"
                            placeholder={`${t('common.search')} by name...`}
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
                                <th scope="col" className="px-6 py-3">{t('common.name')}</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">{t('common.status')}</th>
                                <th scope="col" className="px-6 py-3">{t('pages.employees.performance')}</th>
                                <th scope="col" className="px-6 py-3">{t('pages.employees.contact')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
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
                                                className={`w-full p-1 text-xs border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${getStatusColor(user.status!)}`}
                                            >
                                                {Object.values(TechnicianStatus).map(status => (
                                                    <option key={status} value={status}>{t(`status.${status}`)}</option>
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
                                        <button onClick={() => onEdit(user)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
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

const TechnicianProfilePage: React.FC<{ users: User[]; workOrders: WorkOrder[]; t: Function; }> = ({ users, workOrders, t }) => {
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
                <Link to="/employees" className="mt-4 inline-block text-primary-600 hover:underline">← {t('pages.technicianProfile.back')}</Link>
            </div>
        );
    }
    
    return (
        <div>
            <div className="mb-6">
                 <Link to="/employees" className="text-sm font-medium text-primary-600 hover:underline flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    {t('pages.technicianProfile.back')}
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">{t('pages.technicianProfile.title')}</h1>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                        <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">{formatUserName(technician.name)}</h2>
                        <p className="text-gray-500 capitalize">{technician.role}</p>
                        <span className={`mt-2 inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(technician.status!)}`}>
                            {t(`status.${technician.status!}`)}
                        </span>
                        <div className="mt-4 text-left space-y-2 text-sm border-t pt-4">
                            <p><strong>{t('common.email')}:</strong> <a href={`mailto:${technician.email}`} className="text-primary-600">{technician.email || '-'}</a></p>
                            <p><strong>{t('common.phone')}:</strong> <a href={`tel:${technician.phone}`} className="text-primary-600">{technician.phone || '-'}</a></p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">{t('pages.employees.performance')}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between"><span>Completed WOs</span><span className="font-bold">{kpis.completed}</span></div>
                            <div className="flex justify-between"><span>In Progress WOs</span><span className="font-bold">{kpis.inProgress}</span></div>
                            <div className="flex justify-between"><span>Revenue Generated</span><span className="font-bold">{formatIDR(kpis.revenue)}</span></div>
                        </div>
                    </div>
                </div>
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">{t('pages.technicianProfile.personalInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><strong>No. Karyawan:</strong> <p>{technician.employeeId || '-'}</p></div>
                            <div><strong>Jenis Kelamin:</strong> <p>{technician.gender || '-'}</p></div>
                            <div><strong>Tempat, Tgl Lahir:</strong> <p>{technician.placeOfBirth || '-'}, {technician.dateOfBirth || '-'}</p></div>
                             <div><strong>Lama Bekerja:</strong> <p>{technician.joinDate ? calculateTenure(technician.joinDate) : '-'}</p></div>
                            <div className="md:col-span-2"><strong>{t('common.address')}:</strong> <p>{technician.address || '-'}</p></div>
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
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">{t('pages.technicianProfile.recentActivity')}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2">{t('common.date')}</th>
                                        <th className="px-4 py-2">{t('sidebar.customers')}</th>
                                        <th className="px-4 py-2">{t('common.description')}</th>
                                        <th className="px-4 py-2">{t('common.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {technicianWorkOrders.slice(0, 5).map(wo => (
                                        <tr key={wo.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{wo.createdAt}</td>
                                            <td className="px-4 py-2">{wo.customer.name}</td>
                                            <td className="px-4 py-2 truncate max-w-xs">{wo.description}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span>
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


const SettingsPage: React.FC<{
    customers: Customer[], 
    workOrders: WorkOrder[], 
    users: User[],
    profile: CompanyProfile,
    onProfileSave: (profile: CompanyProfile) => void,
    t: Function,
    language: string,
    setLanguage: (lang: 'en' | 'id') => void,
}> = ({customers, workOrders, users, profile, onProfileSave, t, language, setLanguage}) => {
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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.settings.title')}</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">{t('pages.settings.language')}</h2>
                <div className="max-w-xs">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'en' | 'id')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                        <option value="en">English</option>
                        <option value="id">Indonesian</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">{t('pages.settings.companyProfile')}</h2>
                 <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Company Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('common.address')}</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('common.email')}</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('common.phone')}</label>
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
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Changes</button>
                        {saved && <span className="text-sm text-green-600">Profile saved successfully!</span>}
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">{t('pages.settings.dataBackup')}</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-gray-700">{t('pages.settings.exportData')}</h3>
                        <p className="text-sm text-gray-500 mb-2">{t('pages.settings.exportDesc')}</p>
                        <div className="flex space-x-2">
                            <button onClick={() => handleExport('json')} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Export JSON</button>
                            <button onClick={() => handleExport('pdf')} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Export PDF</button>
                            <button onClick={() => handleExport('excel')} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">Export Excel</button>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-700">{t('pages.settings.restoreData')}</h3>
                        <p className="text-sm text-gray-500 mb-2">{t('pages.settings.restoreDesc')}</p>
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
  const [language, setLanguage] = useState<'en' | 'id'>((localStorage.getItem('appLanguage') as 'en' | 'id') || 'en');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  const useTranslation = () => {
    const t = (key: string, replacements?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let text: any = translations[language] || translations.en;
      for (const k of keys) {
        text = text?.[k];
        if (text === undefined) return key; 
      }
      let result = String(text);
      if (replacements) {
        Object.keys(replacements).forEach(rKey => {
          result = result.replace(`{${rKey}}`, String(replacements[rKey]));
        });
      }
      return result;
    };
    return { t, language, setLanguage };
  };

  const { t } = useTranslation();

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

    const generateWorkOrderId = (existingWorkOrders: WorkOrder[]): string => {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `WO${year}${month}`;
        
        const currentMonthWorkOrders = existingWorkOrders.filter(wo => wo.id.startsWith(prefix));
        
        let maxSeq = 0;
        currentMonthWorkOrders.forEach(wo => {
            const seqStr = wo.id.substring(6);
            if (seqStr) {
                const seq = parseInt(seqStr, 10);
                if (!isNaN(seq) && seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        });
        
        const newSeqStr = (maxSeq + 1).toString().padStart(4, '0');
        return `${prefix}${newSeqStr}`;
    };
    const newWorkOrderId = generateWorkOrderId(workOrders);

    const newWorkOrder: WorkOrder = {
        id: newWorkOrderId,
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

      const originalParts = originalWorkOrder.spareParts || [];
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
              const baseCost = wo.totalCost - (wo.spareParts || []).reduce((sum, part) => sum + part.sellingPrice, 0);
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
        message: `${formatUserName(currentUser?.name)} confirmed payment of ${formatIDR(updatedInvoice.amount)} for ${workOrderId} via ${paymentMethod}.`,
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
    
    const currentSpareParts = workOrder.spareParts || [];
    const serviceFee = workOrder.totalCost - currentSpareParts.reduce((sum, p) => sum + p.sellingPrice, 0);
    const tableBody = [
        ['Jasa Perbaikan', workOrder.description, formatIDR(serviceFee)]
    ];
    currentSpareParts.forEach(p => {
        tableBody.push(['Spare Part', p.name, formatIDR(p.sellingPrice)])
    });


    autoTable(doc, {
        startY: 100,
        head: [['Item', 'Description', 'Amount']],
        body: tableBody,
        theme: 'striped',
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;
    let summaryY = finalY + 10;
    
    const subtotal = workOrder.totalCost;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 150, summaryY, { align: 'right' });
    doc.text(formatIDR(subtotal), 196, summaryY, { align: 'right' });
    summaryY += 7;

    if (invoice.discount) {
        doc.text('Discount:', 150, summaryY, { align: 'right' });
        doc.text(`- ${formatIDR(invoice.discount)}`, 196, summaryY, { align: 'right' });
        summaryY += 7;
    }

    if (invoice.tax) {
        doc.text('Tax:', 150, summaryY, { align: 'right' });
        doc.text(`+ ${formatIDR(invoice.tax)}`, 196, summaryY, { align: 'right' });
        summaryY += 7;
    }
    
    doc.setLineWidth(0.2);
    doc.line(145, summaryY - 2, 196, summaryY - 2);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 150, summaryY + 2, { align: 'right' });
    doc.text(formatIDR(invoice.amount), 196, summaryY + 2, { align: 'right' });
    summaryY += 15;
    
    if (invoice.notes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        const splitNotes = doc.splitTextToSize(invoice.notes, 182);
        if (splitNotes && splitNotes.length > 0) {
            doc.text('Notes:', 14, summaryY);
            doc.text(splitNotes, 14, summaryY + 5);
            summaryY += (splitNotes.length * 5) + 5;
        }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${invoice.status}`, 14, summaryY);
    doc.text("Thank you for your business!", 105, summaryY + 20, { align: 'center'});

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
      description: `Reimbursement for ${workOrderId}: ${description}`,
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
        return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthScreen('login')} t={t} />;
    }
    return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthScreen('signup')} users={users} t={t} />;
  }
  
  const navItems = [
    { path: '/', labelKey: 'sidebar.dashboard', icon: DashboardIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-blue-500' },
    { path: '/customers', labelKey: 'sidebar.customers', icon: CustomerIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-green-500' },
    { path: '/work-orders', labelKey: 'sidebar.workOrders', icon: WorkOrderIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-orange-500' },
    { path: '/notifications', labelKey: 'sidebar.notifications', icon: BellIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-red-500' },
    { path: '/my-reimbursements', labelKey: 'sidebar.myReimbursements', icon: ReceiptIcon, roles: [UserRole.TECHNICIAN], color: 'text-cyan-500' },
    { path: '/reimbursements', labelKey: 'sidebar.reimbursement', icon: ReceiptIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-cyan-500' },
    { path: '/spare-parts', labelKey: 'sidebar.spareParts', icon: SparePartIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-indigo-500' },
    { path: '/finance', labelKey: 'sidebar.finance', icon: FinanceIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-purple-500' },
    { path: '/employees', labelKey: 'sidebar.employees', icon: UsersIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-teal-500' },
    { path: '/settings', labelKey: 'sidebar.settings', icon: SettingsIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-gray-500' },
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
                     <Link key={item.path} to={item.path} title={isSidebarCollapsed ? t(item.labelKey) : ''} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${(location.pathname.startsWith(item.path) && item.path !== '/' || location.pathname === item.path) ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <item.icon className={`${isSidebarCollapsed ? `h-9 w-9 ${item.color}` : 'h-5 w-5'}`} />
                        {!isSidebarCollapsed && <span className="font-medium">{t(item.labelKey)}</span>}
                        {item.labelKey === 'sidebar.notifications' && !isSidebarCollapsed && unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-200">
                 <button onClick={handleLogout} className={`flex items-center w-full space-x-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? t('sidebar.logout') : ''}>
                    <LogoutIcon className="h-5 w-5" />
                    {!isSidebarCollapsed && <span className="font-medium">{t('sidebar.logout')}</span>}
                </button>
                 <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`flex items-center w-full space-x-3 px-4 py-2 mt-2 rounded-lg text-gray-600 hover:bg-gray-100 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}>
                    {isSidebarCollapsed ? <ChevronsRightIcon className="h-5 w-5" /> : <ChevronsLeftIcon className="h-5 w-5" />}
                    {!isSidebarCollapsed && <span className="font-medium">{t('sidebar.collapseMenu')}</span>}
                </button>
            </div>
        </div>
    );
  }
  
  return (
    <HashRouter>
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
                <Routes>
                    <Route path="/" element={<Dashboard workOrders={workOrders} customers={customers} users={users} currentUser={currentUser} t={t} />} />
                    <Route path="/customers" element={<CustomersAndClientsPage customers={customers} clients={clients} onAddCustomer={() => setModalState({ type: 'add_customer', data: null })} onEditCustomer={(c) => setModalState({ type: 'edit_customer', data: c })} onAddClient={() => setModalState({ type: 'add_client', data: null })} onEditClient={(c) => setModalState({ type: 'edit_client', data: c })} t={t} />} />
                    <Route path="/customers/:customerId" element={<CustomerDetail customers={customers} workOrders={workOrders} contracts={contracts} users={users} onEditCustomer={(c) => setModalState({ type: 'edit_customer', data: c })} onAddContract={(customerId) => setModalState({ type: 'add_contract', data: { customerId } })} onEditContract={(c) => setModalState({type: 'edit_contract', data: c})} onCreateWorkOrder={(customerId) => setModalState({ type: 'create_work_order_from_detail', data: { customerId } })} onChat={handleWhatsAppChat} onNotify={handleEmailNotify} t={t} />} />
                    <Route path="/work-orders" element={<WorkOrders user={currentUser} workOrders={workOrders} invoices={invoices} users={users} transactions={transactions} companyProfile={companyProfile} clients={clients} onCreate={() => setModalState({ type: 'create_work_order', data: null })} onAssign={(wo) => setModalState({ type: 'assign_technician', data: wo })} onClaim={handleClaimJob} onAddPart={(wo) => setModalState({ type: 'add_part_to_wo', data: wo })} onComplete={handleCompleteWorkOrder} onMarkAsPaid={(wo) => setModalState({ type: 'mark_as_paid', data: wo })} onChat={handleWhatsAppChat} onNotify={handleEmailNotify} onRequestReimbursement={(wo) => setModalState({ type: 'request_reimbursement', data: wo })} t={t} />} />
                    <Route path="/notifications" element={<NotificationsPage notifications={notifications} onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} t={t} />} />
                    <Route path="/my-reimbursements" element={<MyReimbursementsPage transactions={transactions} currentUser={currentUser} onViewAttachment={(a) => setModalState({ type: 'view_attachment', data: a })} t={t} />} />
                    <Route path="/reimbursements" element={ currentUser.role === UserRole.ADMINISTRATOR ? <ReimbursementPage transactions={transactions} users={users} onApprove={handleApproveReimbursement} onViewAttachment={(a) => setModalState({ type: 'view_attachment', data: a })} t={t}/> : <Navigate to="/" replace />} />
                    <Route path="/spare-parts" element={<SpareParts spareParts={spareParts} suppliers={suppliers} onAddPart={() => setModalState({ type: 'add_spare_part', data: null })} onEditPart={(sp) => setModalState({ type: 'edit_spare_part', data: sp })} onAddSupplier={() => setModalState({ type: 'add_supplier', data: null })} onEditSupplier={(s) => setModalState({ type: 'edit_supplier', data: s })} t={t} />} />
                    <Route path="/finance" element={<Finance invoices={invoices} customers={customers} transactions={sortedTransactions} totalIncome={totalIncome} totalExpense={totalExpense} labaRugi={labaRugi} assets={assets} liabilities={liabilities} equity={equity} onAddInvoice={() => setModalState({ type: 'add_invoice', data: null })} onEditInvoice={(i) => setModalState({ type: 'edit_invoice', data: i })} onPrintInvoice={handlePrintInvoice} onAddTransaction={() => setModalState({ type: 'add_transaction', data: null })} onEditTransaction={(r) => setModalState({ type: 'edit_transaction', data: r })} onGenerateReport={handleGenerateFinancialReport} currentUser={currentUser} onApproveReimbursement={handleApproveReimbursement} onViewAttachment={(a) => setModalState({ type: 'view_attachment', data: a })} t={t} />} />
                    <Route path="/employees" element={<EmployeesPage users={users} workOrders={workOrders} onEdit={(user) => setModalState({ type: 'edit_employee', data: user })} onStatusChange={handleTechnicianStatusChange} t={t} />} />
                    <Route path="/employees/:employeeId" element={<TechnicianProfilePage users={users} workOrders={workOrders} t={t} />} />
                    <Route path="/settings" element={<SettingsPage customers={customers} workOrders={workOrders} users={users} profile={companyProfile} onProfileSave={setCompanyProfile} t={t} language={language} setLanguage={setLanguage} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            
            {/* --- MODALS --- */}
            {modalState.type === 'add_customer' && <AddEditCustomerModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveCustomer} customer={null} t={t} />}
            {modalState.type === 'edit_customer' && <AddEditCustomerModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveCustomer} customer={modalState.data} t={t} />}
            {modalState.type === 'add_client' && <AddEditClientModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveClient} client={null} t={t} />}
            {modalState.type === 'edit_client' && <AddEditClientModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveClient} client={modalState.data} t={t} />}
            {modalState.type === 'create_work_order' && <CreateWorkOrderModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleCreateWorkOrder} customers={customers} clients={clients} t={t} />}
            {modalState.type === 'create_work_order_from_detail' && <CreateWorkOrderModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleCreateWorkOrder} customers={customers} clients={clients} preselectedCustomerId={modalState.data.customerId} t={t} />}
            {modalState.type === 'assign_technician' && <AssignTechnicianModal workOrder={modalState.data} technicians={technicians} onClose={() => setModalState({ type: null, data: null })} onSave={handleAssignTechnician} t={t} />}
            {modalState.type === 'add_part_to_wo' && <AddSparePartModal workOrder={modalState.data} onClose={() => setModalState({ type: null, data: null })} onSave={handleUpdateWorkOrderParts} availableParts={spareParts} t={t} />}
            {modalState.type === 'add_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} part={null} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            {modalState.type === 'edit_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} part={modalState.data} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            {modalState.type === 'add_supplier' && <AddEditSupplierModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSupplier} supplier={null} t={t} />}
            {modalState.type === 'edit_supplier' && <AddEditSupplierModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSupplier} supplier={modalState.data} t={t} />}
            {modalState.type === 'add_invoice' && <AddEditInvoiceModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveInvoice} invoice={null} workOrders={workOrders} t={t} />}
            {modalState.type === 'edit_invoice' && <AddEditInvoiceModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveInvoice} invoice={modalState.data} workOrders={workOrders} t={t} />}
            {modalState.type === 'add_transaction' && <AddEditTransactionModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveTransaction} transaction={null} t={t} />}
            {modalState.type === 'edit_transaction' && <AddEditTransactionModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveTransaction} transaction={modalState.data} t={t} />}
            {modalState.type === 'edit_employee' && <AddEditEmployeeModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveEmployee} user={modalState.data} t={t} />}
            {modalState.type === 'add_contract' && <AddEditContractModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveContract} contract={null} customerId={modalState.data.customerId} t={t} />}
            {modalState.type === 'edit_contract' && <AddEditContractModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveContract} contract={modalState.data} customerId={modalState.data.customerId} t={t} />}
            {modalState.type === 'mark_as_paid' && <MarkAsPaidModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onConfirm={handleMarkAsPaid} workOrder={modalState.data} t={t} />}
            {modalState.type === 'request_reimbursement' && <ReimbursementModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onConfirm={handleRequestReimbursement} workOrder={modalState.data} t={t} />}
            {modalState.type === 'view_attachment' && <AttachmentViewerModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} attachment={modalState.data} t={t} />}
            
            <Chatbot currentUser={currentUser} appData={{ customers, workOrders, spareParts, invoices, users }} />
        </div>
    </HashRouter>
  );
}

// FIX: Add default export for the App component to fix import error in index.tsx.
export default App;
