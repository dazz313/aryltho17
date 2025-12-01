
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, Transaction, Notification, ChatMessage, CompanyProfile, TechnicianStatus, TransactionCategory, PaymentMethod, ServiceContract, ContractStatus, Supplier, Client } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, ReceiptIcon, MapPinIcon, MoreVerticalIcon, TruckIcon, BriefcaseIcon, TrashIcon } from './components/icons';
import { generateAiSummary, getChatbotResponse } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

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
      approve: 'Approve', view: 'View', submit: 'Submit', optional: 'Optional', required: 'Required', delete: 'Delete',
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
        assignTechnicianTitle: 'Assign Technician',
        addPartsTitle: 'Add Parts',
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
        customers: { title: 'Customers & Clients', customerList: 'Customer List', clientList: 'Client List', clientsTab: 'Clients', customersTab: 'Customers', importCustomers: 'Import Customers' },
        customerDetail: { back: 'Back to all customers', details: 'Customer Details', contracts: 'Service Contracts', history: 'Service History', noContracts: 'No contracts found.', noHistory: 'No service history found.' },
        workOrders: { title: 'Work Order Management', myTitle: 'Work Orders', myFullName: '{name}', allOrders: 'All Work Orders', myAssigned: 'My Assigned Work Orders', available: 'Available Work Orders', technician: 'Technician', unassigned: 'Unassigned', claimJob: 'Claim Job' },
        spareParts: { title: 'Spare Part Management', inventory: 'Spare Part Inventory', suppliers: 'Suppliers', partName: 'Part Name', stock: 'Stock', location: 'Location', importParts: 'Import CSV', deleteSelected: 'Delete Selected', downloadTemplate: 'Download Template' },
        finance: { title: 'Finance', generateReport: 'Generate Financial Report', totalIncome: 'Total Income', totalExpense: 'Total Expense', profitLoss: 'Profit / Loss', invoices: 'Invoices', allTransactions: 'All Transactions', balanceSheet: 'Balance Sheet (Neraca)', assets: 'Assets', cash: 'Cash', liabilities: 'Liabilities', opCosts: 'Operational Costs', equity: 'Equity', retainedEarnings: 'Retained Earnings (Profit)' },
        employees: { title: 'Employee Management', allEmployees: 'All Employees', performance: 'Performance', contact: 'Contact' },
        technicianProfile: { title: 'Technician Profile', back: 'Back to all employees', personalInfo: 'Personal Information', recentActivity: 'Recent Activity' },
        settings: { 
            title: 'Settings & Data', 
            companyProfile: 'Company Profile (KOP Surat)', 
            dataBackup: 'Data Backup & Restore', 
            exportData: 'Export Data', 
            exportDesc: 'Download a copy of your application data.', 
            restoreData: 'Restore Data', 
            restoreDesc: 'Upload a JSON backup file to restore data.', 
            language: 'Language / Bahasa',
            appearance: 'Appearance',
            theme: 'Theme',
            lightMode: 'Light Mode',
            darkMode: 'Dark Mode'
        }
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
      approve: 'Setujui', view: 'Lihat', submit: 'Kirim', optional: 'Opsional', required: 'Wajib', delete: 'Hapus',
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
        assignTechnicianTitle: 'Tugaskan Teknisi',
        addPartsTitle: 'Tambah Suku Cadang',
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
        customers: { title: 'Pelanggan & Klien', customerList: 'Daftar Pelanggan', clientList: 'Daftar Klien', clientsTab: 'Klien', customersTab: 'Pelanggan', importCustomers: 'Import Pelanggan' },
        customerDetail: { back: 'Kembali ke semua pelanggan', details: 'Detail Pelanggan', contracts: 'Kontrak Servis', history: 'Riwayat Servis', noContracts: 'Tidak ada kontrak.', noHistory: 'Tidak ada riwayat servis.' },
        workOrders: { title: 'Manajemen Perintah Kerja', myTitle: 'Perintah Kerja', myFullName: '{name}', allOrders: 'Semua Perintah Kerja', myAssigned: 'Tugas Saya', available: 'SPK Tersedia', technician: 'Teknisi', unassigned: 'Belum Ditugaskan', claimJob: 'Ambil Pekerjaan' },
        spareParts: { title: 'Manajemen Suku Cadang', inventory: 'Inventaris Suku Cadang', suppliers: 'Pemasok', partName: 'Nama Part', stock: 'Stok', location: 'Lokasi', importParts: 'Import CSV', deleteSelected: 'Hapus Terpilih', downloadTemplate: 'Download Template' },
        finance: { title: 'Keuangan', generateReport: 'Buat Laporan Keuangan', totalIncome: 'Total Pendapatan', totalExpense: 'Total Pengeluaran', profitLoss: 'Laba / Rugi', invoices: 'Faktur', semuaTransaksi: 'Semua Transaksi', balanceSheet: 'Neraca', assets: 'Aset', cash: 'Kas', liabilities: 'Liabilitas', opCosts: 'Biaya Operasional', equity: 'Ekuitas', retainedEarnings: 'Laba Ditahan' },
        employees: { title: 'Manajemen Karyawan', allEmployees: 'Semua Karyawan', performance: 'Kinerja', contact: 'Kontak' },
        technicianProfile: { title: 'Profil Teknisi', back: 'Kembali ke semua karyawan', personalInfo: 'Informasi Pribadi', aktivitasTerkini: 'Aktivitas Terkini' },
        settings: { 
            title: 'Pengaturan & Data', 
            companyProfile: 'Profil Perusahaan (KOP Surat)', 
            dataBackup: 'Cadangkan & Pulihkan Data', 
            exportData: 'Ekspor Data', 
            exportDesc: 'Unduh salinan data aplikasi Anda.', 
            restoreData: 'Pulihkan Data', 
            restoreDesc: 'Unggah file cadangan JSON untuk memulihkan data.', 
            language: 'Language / Bahasa',
            appearance: 'Tampilan',
            theme: 'Tema',
            lightMode: 'Mode Terang',
            darkMode: 'Mode Gelap'
        }
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
const INITIAL_INVOICES: Invoice[] = [];
const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_CONTRACTS: ServiceContract[] = [];

// --- UTILITY FUNCTIONS ---
const formatIDR = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const formatUserName = (name?: string | null): string => {
    if (!name || typeof name !== 'string') return '';
    return name.split(' (')[0];
};

const getStatusColor = (status: WorkOrderStatus | 'Paid' | 'Unpaid' | 'Pending Approval' | 'Approved' | ContractStatus | TechnicianStatus) => {
  switch (status) {
    case WorkOrderStatus.PENDING: case 'Unpaid': case 'Pending Approval': case ContractStatus.EXPIRED: case TechnicianStatus.ON_BREAK: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case WorkOrderStatus.IN_PROGRESS: case TechnicianStatus.ON_JOB: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case WorkOrderStatus.COMPLETED: case 'Paid': case 'Approved': case ContractStatus.ACTIVE: case TechnicianStatus.AVAILABLE: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case WorkOrderStatus.CANCELLED: case ContractStatus.CANCELLED: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case TechnicianStatus.OFFLINE: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
    if (months < 0) { years--; months += 12; }
    return `${years} tahun, ${months} bulan`;
};

// --- HELPER & MODAL COMPONENTS ---
interface CardProps {
  title: string;
  value: string;
  icon: React.ReactElement<{ className?: string }>;
  color: 'blue' | 'yellow' | 'green' | 'indigo' | 'red';
  onClick?: () => void;
}
const StatCard: React.FC<CardProps> = ({ title, value, icon, color, onClick }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-200' },
        yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-600 dark:text-yellow-200' },
        green: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-600 dark:text-green-200' },
        indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-600 dark:text-indigo-200' },
        red: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-200' },
    };
    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
        <div 
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4 transition-transform transform hover:-translate-y-1 hover:shadow-lg ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <div className={`${selectedColor.bg} p-3 rounded-full`}>
                {React.cloneElement(icon, { className: `h-6 w-6 ${selectedColor.text}` })}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl' }> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClasses = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full ${sizeClasses[size]}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = users.find(u => (u.email?.toLowerCase() === identifier.toLowerCase() || u.phone === identifier) && u.password === password);
    if (user) onLogin(user); else setError(t('login.invalidCredentials'));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2 text-center">{t('login.logIn')}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">{t('login.subtitle')}</p>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email or Phone</label>
                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
            </div>
            {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 !mt-6">
                {t('login.logIn')}
            </button>
        </form>
        <div className="mt-6 text-sm text-center">
          <span className="text-gray-600 dark:text-gray-400">{t('login.noAccount')} </span>
          <button onClick={onSwitchToSignUp} className="font-semibold text-primary-600 hover:underline dark:text-primary-400">{t('login.signUp')}</button>
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
        const newUser: User = {
            id: `user-${Date.now()}`,
            name: `${name} (${role.charAt(0).toUpperCase() + role.slice(1)})`,
            role, email: email || undefined, phone: phone || undefined, password,
            age: age ? parseInt(age, 10) : undefined, gender,
            skills: skills.split(',').map(s => s.trim()).filter(Boolean),
            status: role === UserRole.TECHNICIAN ? TechnicianStatus.AVAILABLE : undefined
        };
        onSignUp(newUser);
    };

    const inputClass = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500";

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2 text-center">{t('login.createAccount')}</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">{t('login.joinTeam')}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                    <input type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
                     <select value={role} onChange={e => setRole(e.target.value as UserRole)} className={inputClass}>
                        <option value={UserRole.TECHNICIAN}>Technician</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                        <option value={UserRole.ADMINISTRATOR}>Administrator</option>
                    </select>
                    <button type="submit" className="w-full flex justify-center py-2 px-4 rounded-md text-white bg-primary-600 hover:bg-primary-700">
                        {t('login.signUp')}
                    </button>
                </form>
                 <div className="mt-6 text-sm text-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('login.haveAccount')} </span>
                    <button onClick={onSwitchToLogin} className="font-semibold text-primary-600 hover:underline dark:text-primary-400">{t('login.logIn')}</button>
                </div>
            </div>
        </div>
    );
};

// --- CUSTOMER & CLIENT MODALS ---
const AddEditCustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
    customer: Customer | null;
    t: Function;
}> = ({ isOpen, onClose, onSave, customer, t }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

    useEffect(() => {
        if (customer) {
            setFormData({ name: customer.name, email: customer.email, phone: customer.phone, address: customer.address });
        } else {
            setFormData({ name: '', email: '', phone: '', address: '' });
        }
    }, [customer, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: customer?.id || `cust-${Date.now()}`,
            ...formData
        });
    };

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? t('modals.editCustomerTitle') : t('modals.addCustomerTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelClass}>{t('common.name')}</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>{t('common.email')}</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>{t('common.phone')}</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>{t('common.address')}</label>
                    <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required rows={3} className={inputClass} />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
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
        if (client) setName(client.name);
        else setName('');
    }, [client, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: client?.id || `client-${Date.now()}`, name });
    };

     const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? t('modals.editClientTitle') : t('modals.addClientTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
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
            setFormData({ name: supplier.name, contactPerson: supplier.contactPerson, phone: supplier.phone, email: supplier.email });
        } else {
            setFormData({ name: '', contactPerson: '', phone: '', email: '' });
        }
    }, [supplier, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: supplier?.id || `sup-${Date.now()}`, ...formData });
    };
    
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? t('modals.editSupplierTitle') : t('modals.addSupplierTitle')}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelClass}>Supplier Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className={inputClass} /></div>
                <div><label className={labelClass}>Contact Person</label><input type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} required className={inputClass} /></div>
                <div><label className={labelClass}>{t('common.phone')}</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className={inputClass} /></div>
                <div><label className={labelClass}>{t('common.email')}</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className={inputClass} /></div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};


// --- WORK ORDER MODALS ---
const CreateWorkOrderModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (wo: Partial<WorkOrder>) => void; customers: Customer[]; t: Function }> = ({ isOpen, onClose, onSave, customers, t }) => {
    const [customerId, setCustomerId] = useState('');
    const [description, setDescription] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customerId && description) {
            onSave({ customer: customers.find(c => c.id === customerId)!, description });
            setCustomerId(''); setDescription('');
        }
    };
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.createWorkOrderTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pages.customers.customersTab')}</label>
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} required className={inputClass}>
                        <option value="">Select Customer</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.description')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} className={inputClass} />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.create')}</button>
                </div>
            </form>
        </Modal>
    );
};

const AssignTechnicianModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (techId: string) => void; technicians: User[]; t: Function }> = ({ isOpen, onClose, onSave, technicians, t }) => {
    const [techId, setTechId] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(techId) onSave(techId); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.assignTechnicianTitle')}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pages.workOrders.technician')}</label>
                    <select value={techId} onChange={e => setTechId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="">Select Technician</option>
                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};

// --- SPARE PART MODAL ---
const AddEditSparePartModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (part: SparePart) => void;
    onDelete?: (id: string) => void;
    part: SparePart | null;
    suppliers: Supplier[];
    allSpareParts: SparePart[];
    t: Function;
}> = ({ isOpen, onClose, onSave, onDelete, part, suppliers, allSpareParts, t }) => {
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
            itemCode: formData.itemCode || `ITEM-${Date.now()}`, 
            name: formData.name,
            purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
            sellingPrice: Number(formData.sellingPrice),
            stock: Number(formData.stock),
            unit: formData.unit,
            location: formData.location,
            supplierId: formData.supplierId || undefined,
        });
    };

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-800";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={part ? t('modals.editSparePartTitle') : t('modals.addSparePartTitle')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className={labelClass}>Kode Item</label>
                    <input type="text" name="itemCode" value={formData.itemCode} onChange={handleChange} placeholder="Auto-generated if blank" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>{t('pages.spareParts.partName')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Harga Beli (IDR)</label>
                        <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder={t('common.optional')} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Harga Jual (IDR)</label>
                        <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required className={inputClass} />
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Stock Quantity</label>
                        <input type="number" name="stock" value={formData.stock} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Satuan (e.g. pcs, kg)</label>
                        <input type="text" name="unit" value={formData.unit} onChange={handleChange} required className={inputClass} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>{t('pages.spareParts.location')}</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required className={inputClass} />
                </div>
                 <div>
                    <label className={labelClass}>Supplier</label>
                    <select name="supplierId" value={formData.supplierId} onChange={handleChange} className={inputClass}>
                        <option value="">-- No Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-between pt-4">
                    {part && onDelete && (
                        <button type="button" onClick={() => { if(confirm('Are you sure you want to delete this part?')) onDelete(part.id); }} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">{t('common.delete')}</button>
                    )}
                    <div className="flex space-x-2 ml-auto">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

// --- WORK ORDERS PAGE COMPONENT ---
const WorkOrders: React.FC<{ 
    user: User; 
    workOrders: WorkOrder[]; 
    users: User[]; 
    onCreate: () => void; 
    onAssign: (wo: WorkOrder) => void; 
    onComplete: (wo: WorkOrder) => void; 
    t: Function 
}> = ({ user, workOrders, users, onCreate, onAssign, onComplete, t }) => {
    const [filter, setFilter] = useState<'all' | 'assigned'>('all');

    const filteredOrders = workOrders.filter(wo => {
        if (user.role === UserRole.TECHNICIAN) return wo.technicianId === user.id;
        if (filter === 'assigned') return wo.technicianId === user.id;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.workOrders.title')}</h1>
                {(user.role === UserRole.ADMIN || user.role === UserRole.ADMINISTRATOR) && (
                    <button onClick={onCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
                        <WorkOrderIcon className="mr-2 h-5 w-5" /> {t('common.create')} Order
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                 {(user.role === UserRole.ADMIN || user.role === UserRole.ADMINISTRATOR) && (
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
                        <nav className="-mb-px flex space-x-8">
                            <button onClick={() => setFilter('all')} className={`py-4 px-1 border-b-2 font-medium text-sm ${filter === 'all' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                {t('pages.workOrders.allOrders')}
                            </button>
                            <button onClick={() => setFilter('assigned')} className={`py-4 px-1 border-b-2 font-medium text-sm ${filter === 'assigned' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                {t('pages.workOrders.myAssigned')}
                            </button>
                        </nav>
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">{t('common.description')}</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">{t('common.status')}</th>
                                <th className="px-6 py-3">{t('pages.workOrders.technician')}</th>
                                <th className="px-6 py-3">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length > 0 ? filteredOrders.map(wo => (
                                <tr key={wo.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 font-mono text-xs">{wo.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{wo.description}</td>
                                    <td className="px-6 py-4">{wo.customer.name}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span></td>
                                    <td className="px-6 py-4">{users.find(u => u.id === wo.technicianId)?.name || t('pages.workOrders.unassigned')}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        {(user.role === UserRole.ADMIN || user.role === UserRole.ADMINISTRATOR) && wo.status === WorkOrderStatus.PENDING && (
                                            <button onClick={() => onAssign(wo)} className="text-primary-600 hover:underline dark:text-primary-400">Assign</button>
                                        )}
                                        {wo.technicianId === user.id && wo.status !== WorkOrderStatus.COMPLETED && (
                                             <button onClick={() => onComplete(wo)} className="text-green-600 hover:underline dark:text-green-400">Complete</button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="px-6 py-4 text-center">No work orders found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SettingsPage: React.FC<{
    customers: Customer[], 
    workOrders: WorkOrder[], 
    users: User[],
    profile: CompanyProfile,
    onProfileSave: (profile: CompanyProfile) => void,
    t: Function,
    language: string,
    setLanguage: (lang: 'en' | 'id') => void,
    theme: 'light' | 'dark',
    setTheme: (theme: 'light' | 'dark') => void,
}> = ({customers, workOrders, users, profile, onProfileSave, t, language, setLanguage, theme, setTheme}) => {
    const [formData, setFormData] = useState<CompanyProfile>(profile);
    const [saved, setSaved] = useState(false);

    useEffect(() => { setFormData(profile); }, [profile]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onProfileSave(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('pages.settings.title')}</h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{t('pages.settings.appearance')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>{t('pages.settings.language')}</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'id')} className={inputClass}>
                            <option value="en">English</option>
                            <option value="id">Indonesian</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>{t('pages.settings.theme')}</label>
                        <div className="mt-1 flex space-x-4">
                            <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-md border ${theme === 'light' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>{t('pages.settings.lightMode')}</button>
                            <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-md border ${theme === 'dark' ? 'bg-primary-900 border-primary-500 text-white' : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>{t('pages.settings.darkMode')}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{t('pages.settings.companyProfile')}</h2>
                 <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                    <div><label className={labelClass}>Company Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>{t('common.address')}</label><input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass} /></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>{t('common.email')}</label><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>{t('common.phone')}</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Changes</button>
                        {saved && <span className="text-sm text-green-600">Profile saved successfully!</span>}
                    </div>
                </form>
            </div>
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
    onImport: (data: any[]) => void,
    onDelete: (id: string) => void,
    onBulkDelete: (ids: string[]) => void,
    t: Function;
}> = ({ spareParts, suppliers, onAddPart, onEditPart, onAddSupplier, onEditSupplier, onImport, onDelete, onBulkDelete, t }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers'>('inventory');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(new Set(spareParts.map(p => p.id)));
        else setSelectedIds(new Set());
    };

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = () => {
        if (confirm(`Delete ${selectedIds.size} items?`)) {
            onBulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvData = event.target?.result as string;
            const cleanedData = csvData.split('\n').map(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.indexOf('","') === -1) {
                    return trimmed.substring(1, trimmed.length - 1);
                }
                return line;
            }).join('\n');

            Papa.parse(cleanedData, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) onImport(results.data);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                },
                error: (error: any) => alert('Error parsing CSV: ' + error.message)
            });
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const csvContent = "Name,Selling Price,Purchase Price,Stock,Unit,Location,Supplier,Item Code\nContoh Part,50000,30000,10,pcs,Gudang A,PT ABC,";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "sparepart_template.csv");
        link.click();
    };

    const renderInventory = () => (
        <>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('pages.spareParts.inventory')}</h2>
                <div className="flex space-x-2">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={downloadTemplate} className="bg-gray-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600">{t('pages.spareParts.downloadTemplate')}</button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">{t('pages.spareParts.importParts')}</button>
                    {selectedIds.size > 0 && (
                        <button onClick={handleBulkDelete} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700">{t('pages.spareParts.deleteSelected')} ({selectedIds.size})</button>
                    )}
                    <button onClick={onAddPart} className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700">{t('common.add')} Part</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={spareParts.length > 0 && selectedIds.size === spareParts.length} /></th>
                            <th className="px-6 py-3">Kode Item</th>
                            <th className="px-6 py-3">{t('pages.spareParts.partName')}</th>
                            <th className="px-6 py-3">Supplier</th>
                            <th className="px-6 py-3">Harga Beli</th>
                            <th className="px-6 py-3">Harga Jual</th>
                            <th className="px-6 py-3">{t('pages.spareParts.stock')}</th>
                            <th className="px-6 py-3">Satuan</th>
                            <th className="px-6 py-3">{t('pages.spareParts.location')}</th>
                            <th className="px-6 py-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {spareParts.map(part => (
                            <tr key={part.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                <td className="p-4"><input type="checkbox" checked={selectedIds.has(part.id)} onChange={() => handleSelectOne(part.id)} /></td>
                                <td className="px-6 py-4 font-mono text-xs">{part.itemCode}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{part.name}</td>
                                <td className="px-6 py-4">{suppliers.find(s => s.id === part.supplierId)?.name || '-'}</td>
                                <td className="px-6 py-4">{part.purchasePrice ? formatIDR(part.purchasePrice) : '-'}</td>
                                <td className="px-6 py-4">{formatIDR(part.sellingPrice)}</td>
                                <td className={`px-6 py-4 font-semibold ${part.stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{part.stock}</td>
                                <td className="px-6 py-4">{part.unit}</td>
                                <td className="px-6 py-4">{part.location}</td>
                                <td className="px-6 py-4 space-x-2 flex">
                                    <button onClick={() => onEditPart(part)} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{t('common.edit')}</button>
                                    <button onClick={() => { if(confirm('Delete this part?')) onDelete(part.id); }} className="text-red-600 hover:text-red-800 dark:text-red-400 ml-2"><TrashIcon className="h-4 w-4" /></button>
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
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Supplier List</h2>
                <button onClick={onAddSupplier} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Supplier</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Supplier Name</th>
                            <th className="px-6 py-3">Contact Person</th>
                            <th className="px-6 py-3">Contact Info</th>
                            <th className="px-6 py-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.map(supplier => (
                            <tr key={supplier.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{supplier.name}</td>
                                <td className="px-6 py-4">{supplier.contactPerson}</td>
                                <td className="px-6 py-4"><div>{supplier.phone}</div><div>{supplier.email}</div></td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => onEditSupplier(supplier)} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{t('common.edit')}</button>
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
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('pages.spareParts.title')}</h1>
             <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('inventory')} className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}>
                        <SparePartIcon className={`mr-2 h-5 w-5 ${activeTab === 'inventory' ? 'text-primary-500' : 'text-gray-400'}`} />
                        <span>{t('pages.spareParts.inventory')}</span>
                    </button>
                    <button onClick={() => setActiveTab('suppliers')} className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'suppliers' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}`}>
                        <TruckIcon className={`mr-2 h-5 w-5 ${activeTab === 'suppliers' ? 'text-primary-500' : 'text-gray-400'}`} />
                        <span>{t('pages.spareParts.suppliers')}</span>
                    </button>
                </nav>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                {activeTab === 'inventory' ? renderInventory() : renderSuppliers()}
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ workOrders: WorkOrder[]; customers: Customer[]; users: User[]; currentUser: User; t: Function }> = ({ workOrders, customers, users, currentUser, t }) => {
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const navigate = useNavigate();

    const stats = useMemo(() => {
        const pending = workOrders.filter(w => w.status === WorkOrderStatus.PENDING).length;
        const completed = workOrders.filter(w => w.status === WorkOrderStatus.COMPLETED).length;
        const totalRevenue = workOrders.reduce((sum, w) => sum + (w.totalCost || 0), 0);
        return { pending, completed, totalRevenue, totalCustomers: customers.length };
    }, [workOrders, customers]);

    const handleGenerateSummary = async () => {
        setLoadingAi(true);
        const summary = await generateAiSummary({ workOrders, customers, users });
        setAiSummary(summary);
        setLoadingAi(false);
    };

    const chartData = useMemo(() => {
        const data = users.filter(u => u.role === UserRole.TECHNICIAN).map(tech => ({
            name: tech.name.split(' ')[0],
            completed: workOrders.filter(w => w.technicianId === tech.id && w.status === WorkOrderStatus.COMPLETED).length
        }));
        return data;
    }, [users, workOrders]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard.welcome', { name: currentUser.name.split(' ')[0] })}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('dashboard.summary')}</p>
                </div>
                <button onClick={handleGenerateSummary} disabled={loadingAi} className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 transition-all">
                    {loadingAi ? <SpinnerIcon className="h-5 w-5" /> : <AiIcon className="h-5 w-5" />}
                    <span>{loadingAi ? t('dashboard.generating') : t('dashboard.generateSummary')}</span>
                </button>
            </div>

            {aiSummary && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 p-6 rounded-lg border border-indigo-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-start space-x-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg"><AiIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" /></div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{t('dashboard.aiSummaryTitle')}</h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('dashboard.totalCustomers')} value={stats.totalCustomers.toString()} icon={<CustomerIcon />} color="blue" onClick={() => navigate('/customers')} />
                <StatCard title={t('dashboard.pendingWorkOrders')} value={stats.pending.toString()} icon={<WorkOrderIcon />} color="yellow" onClick={() => navigate('/work-orders')} />
                <StatCard title="Completed Orders" value={stats.completed.toString()} icon={<ReceiptIcon />} color="green" />
                <StatCard title={t('dashboard.monthlyRevenue')} value={formatIDR(stats.totalRevenue)} icon={<FinanceIcon />} color="indigo" onClick={() => navigate('/finance')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t('dashboard.completedByTechnician')}</h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="#8884d8" />
                                <YAxis stroke="#8884d8" />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completed" fill="#4f46e5" name="Completed Orders" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                     <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Recent Activity</h3>
                     <div className="space-y-4">
                         {workOrders.slice(0, 5).map(wo => (
                             <div key={wo.id} className="flex justify-between items-center border-b dark:border-gray-700 pb-2 last:border-0">
                                 <div>
                                     <p className="font-medium text-gray-800 dark:text-white">{wo.description}</p>
                                     <p className="text-xs text-gray-500">{timeAgo(wo.createdAt)}</p>
                                 </div>
                                 <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(wo.status)}`}>{wo.status}</span>
                             </div>
                         ))}
                         {workOrders.length === 0 && <p className="text-gray-500">No recent activity.</p>}
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
    t: Function
}> = ({ customers, clients, onAddCustomer, onEditCustomer, onAddClient, onEditClient, t }) => {
    const [activeTab, setActiveTab] = useState<'customers' | 'clients'>('customers');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.customers.title')}</h1>
                <div className="flex space-x-2">
                    {activeTab === 'customers' ? (
                        <button onClick={onAddCustomer} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"><UsersIcon className="mr-2 h-5 w-5" /> {t('modals.addCustomerTitle')}</button>
                    ) : (
                        <button onClick={onAddClient} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"><BriefcaseIcon className="mr-2 h-5 w-5" /> {t('modals.addClientTitle')}</button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4 flex justify-between items-center flex-wrap gap-4">
                    <nav className="-mb-px flex space-x-8">
                         <button onClick={() => setActiveTab('customers')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'customers' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                             <CustomerIcon className="mr-2 h-5 w-5" /> {t('pages.customers.customersTab')}
                         </button>
                         <button onClick={() => setActiveTab('clients')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'clients' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                             <BriefcaseIcon className="mr-2 h-5 w-5" /> {t('pages.customers.clientsTab')}
                         </button>
                    </nav>
                    <div className="pb-3">
                        <input type="text" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">{t('common.name')}</th>
                                {activeTab === 'customers' && <th className="px-6 py-3">{t('common.phone')}</th>}
                                {activeTab === 'customers' && <th className="px-6 py-3">{t('common.address')}</th>}
                                <th className="px-6 py-3">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTab === 'customers' ? (
                                filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                    <tr key={c.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                                        <td className="px-6 py-4">{c.phone}</td>
                                        <td className="px-6 py-4">{c.address}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => onEditCustomer(c)} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={4} className="px-6 py-4 text-center">No customers found.</td></tr>
                            ) : (
                                filteredClients.length > 0 ? filteredClients.map(c => (
                                    <tr key={c.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => onEditClient(c)} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={2} className="px-6 py-4 text-center">No clients found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const Chatbot: React.FC<{ currentUser: User; appData: any }> = ({ currentUser, appData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: `Hi ${currentUser.name.split(' ')[0]}! How can I help you with your business today?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        
        const responseText = await getChatbotResponse([...messages, userMsg], { currentUser, ...appData });
        setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
        setIsLoading(false);
    };

    return (
        <>
            <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-all z-50">
                {isOpen ? <XIcon className="h-6 w-6" /> : <AiIcon className="h-6 w-6" />}
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-primary-600 p-4 text-white flex items-center space-x-2">
                        <AiIcon className="h-5 w-5" />
                        <span className="font-bold">ServisAI Assistant</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none shadow-sm'}`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br />') }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && <div className="flex justify-start"><div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 shadow-sm"><SpinnerIcon className="h-5 w-5 text-primary-600" /></div></div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex space-x-2">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={e => setInput(e.target.value)} 
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about revenue, orders..." 
                            className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <button onClick={handleSend} disabled={isLoading} className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"><SendIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            )}
        </>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'id'>((localStorage.getItem('appLanguage') as 'en' | 'id') || 'en');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('appTheme') as 'light' | 'dark') || 'light');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  useEffect(() => { localStorage.setItem('appLanguage', language); }, [language]);

  useEffect(() => {
      if (theme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('appTheme', theme);
  }, [theme]);

  const { t } = useMemo(() => {
    const translate = (key: string, replacements?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let text: any = translations[language] || translations.en;
      for (const k of keys) { text = text?.[k]; if (text === undefined) return key; }
      let result = String(text);
      if (replacements) { Object.keys(replacements).forEach(rKey => { result = result.replace(`{${rKey}}`, String(replacements[rKey])); }); }
      return result;
    };
    return { t: translate };
  }, [language]);

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
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({ name: 'ServisPro Inc.', address: '123 Service St', email: 'contact@servispro.com', phone: '0812-3456-7890', logo: '' });
  const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: null });

  const handleLogin = (user: User) => { setCurrentUser(user); setAuthScreen('login'); };
  const handleLogout = () => { setCurrentUser(null); };
  const handleSignUp = (newUser: User) => { setUsers(prev => [...prev, newUser]); setAuthScreen('login'); };
  const handleSaveCustomer = (c: Customer) => { setCustomers(prev => { const ex = prev.find(x => x.id === c.id); return ex ? prev.map(x => x.id === c.id ? c : x) : [...prev, c]; }); setModalState({type:null, data:null}); };
  const handleSaveClient = (c: Client) => { setClients(prev => { const ex = prev.find(x => x.id === c.id); return ex ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev]; }); setModalState({type:null, data:null}); };
  
  // Work Order Handlers
  const handleCreateWorkOrder = (data: Partial<WorkOrder>) => {
      const newOrder: WorkOrder = {
          id: `WO-${Date.now()}`,
          customer: data.customer!,
          description: data.description!,
          status: WorkOrderStatus.PENDING,
          technicianId: null,
          createdAt: new Date().toISOString(),
          spareParts: [],
          totalCost: 0
      };
      setWorkOrders(prev => [newOrder, ...prev]);
      setModalState({ type: null, data: null });
  };

  const handleAssignTechnician = (techId: string) => {
      if (modalState.data) {
          setWorkOrders(prev => prev.map(wo => wo.id === modalState.data.id ? { ...wo, technicianId: techId, status: WorkOrderStatus.IN_PROGRESS } : wo));
      }
      setModalState({ type: null, data: null });
  };

  const handleCompleteWorkOrder = (wo: WorkOrder) => {
      if(confirm('Mark this order as completed?')) {
          setWorkOrders(prev => prev.map(w => w.id === wo.id ? { ...w, status: WorkOrderStatus.COMPLETED, completedAt: new Date().toISOString() } : w));
      }
  };

  const handleImportSpareParts = (parsedParts: any[]) => {
    const newParts: SparePart[] = [];
    let newSuppliers = [...suppliers];
    let transactionTotal = 0;

    const generateItemCode = (name: string, sequence: number) => {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const acronym = name.replace(/[^a-zA-Z\s]/g, '').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
        return `${year}${month}-${acronym}-${sequence.toString().padStart(3, '0')}`;
    };

    let currentMaxSeq = 0;
    spareParts.forEach(p => {
        const parts = p.itemCode.split('-');
        if (parts.length === 3) {
            const seq = parseInt(parts[2]);
            if (!isNaN(seq) && seq > currentMaxSeq) currentMaxSeq = seq;
        }
    });

    parsedParts.forEach((row: any) => {
        const name = row.Name || row.Nama;
        const sellPrice = row['Selling Price'] || row['Harga Jual'];
        if (!name || !sellPrice) return;
        
        const supplierName = row.Supplier || row.Pemasok;
        let supplierId = undefined;
        if (supplierName) {
            const existingSup = newSuppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
            if (existingSup) { supplierId = existingSup.id; } 
            else { const newSup = { id: `sup-${Date.now()}-${Math.random()}`, name: supplierName, contactPerson: '', phone: '', email: '' }; newSuppliers.push(newSup); supplierId = newSup.id; }
        }

        let itemCode = row['Item Code'] || row['Kode Barang'];
        if (!itemCode) { currentMaxSeq++; itemCode = generateItemCode(name, currentMaxSeq); }

        const buyPrice = Number(row['Purchase Price'] || row['Harga Beli'] || 0);
        const stock = Number(row.Stock || row.Stok || 0);
        
        if (stock > 0 && buyPrice > 0) transactionTotal += stock * buyPrice;

        newParts.push({
            id: `sp-${Date.now()}-${Math.random()}`,
            itemCode: itemCode,
            name: name,
            purchasePrice: buyPrice || undefined,
            sellingPrice: Number(sellPrice),
            stock: stock,
            unit: row.Unit || row.Satuan || 'pcs',
            location: row.Location || row.Lokasi || 'Warehouse',
            supplierId: supplierId
        });
    });

    setSuppliers(newSuppliers);
    setSpareParts(prev => [...prev, ...newParts]);

    if (transactionTotal > 0) {
         const newTransaction: Transaction = {
            id: `trn-import-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            description: `Bulk Import Spareparts (${newParts.length} items)`,
            type: 'expense',
            amount: transactionTotal,
            category: TransactionCategory.PART_PURCHASE,
            paymentMethod: PaymentMethod.CASH,
            approved: true
        };
        setTransactions(prev => [newTransaction, ...prev]);
    }
    setModalState({ type: null, data: null });
    alert(`Imported ${newParts.length} parts.`);
  };

  const handleDeleteSparePart = (id: string) => {
      setSpareParts(prev => prev.filter(p => p.id !== id));
      setModalState({ type: null, data: null });
  };
  
  const handleBulkDeleteSpareParts = (ids: string[]) => {
      setSpareParts(prev => prev.filter(p => !ids.includes(p.id)));
  };

  const handleSaveSparePart = (part: SparePart) => {
      const exists = spareParts.some(p => p.id === part.id);
      if (exists) {
           const oldPart = spareParts.find(p => p.id === part.id);
           if (oldPart && part.stock > oldPart.stock && part.purchasePrice) {
               const cost = (part.stock - oldPart.stock) * part.purchasePrice;
               const newTransaction: Transaction = { id: `trn-adj-${Date.now()}`, date: new Date().toISOString().split('T')[0], description: `Stock Adjustment: ${part.name}`, type: 'expense', amount: cost, category: TransactionCategory.PART_PURCHASE, paymentMethod: PaymentMethod.CASH, approved: true };
               setTransactions(prev => [newTransaction, ...prev]);
           }
           setSpareParts(prev => prev.map(p => p.id === part.id ? part : p));
      } else {
          if (part.stock > 0 && part.purchasePrice) {
               const newTransaction: Transaction = { id: `trn-init-${Date.now()}`, date: new Date().toISOString().split('T')[0], description: `Initial Stock: ${part.name}`, type: 'expense', amount: part.stock * part.purchasePrice, category: TransactionCategory.PART_PURCHASE, paymentMethod: PaymentMethod.CASH, approved: true };
               setTransactions(prev => [newTransaction, ...prev]);
          }
          setSpareParts(prev => [part, ...prev]);
      }
      setModalState({ type: null, data: null });
  };

  const handleSaveSupplier = (s: Supplier) => { setSuppliers(prev => { const ex = prev.find(x => x.id === s.id); return ex ? prev.map(x => x.id === s.id ? s : x) : [s, ...prev]; }); setModalState({type:null, data:null}); };

  if (!currentUser) {
    if (authScreen === 'signup') return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthScreen('login')} t={t} />;
    return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthScreen('signup')} users={users} t={t} />;
  }

  const Sidebar: React.FC = () => {
    const location = useLocation();
    const unreadCount = notifications.filter(n => !n.read).length;
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

    return (
        <div className={`flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`h-16 flex items-center border-b border-gray-200 dark:border-gray-700 ${isSidebarCollapsed ? 'justify-center' : 'justify-center'}`}>
                {isSidebarCollapsed ? <DashboardIcon className="h-10 w-10 text-primary-600" /> : <h1 className="text-2xl font-bold text-primary-600">ServisPro</h1>}
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {accessibleNavItems.map(item => (
                     <Link key={item.path} to={item.path} title={isSidebarCollapsed ? t(item.labelKey) : ''} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${(location.pathname.startsWith(item.path) && item.path !== '/' || location.pathname === item.path) ? 'bg-primary-100 dark:bg-gray-700 text-primary-700 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <item.icon className={`${isSidebarCollapsed ? `h-9 w-9 ${item.color}` : 'h-5 w-5'}`} />
                        {!isSidebarCollapsed && <span className="font-medium">{t(item.labelKey)}</span>}
                        {item.labelKey === 'sidebar.notifications' && !isSidebarCollapsed && unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">{unreadCount}</span>
                        )}
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                 <button onClick={handleLogout} className={`flex items-center w-full space-x-3 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? t('sidebar.logout') : ''}>
                    <LogoutIcon className="h-5 w-5" />
                    {!isSidebarCollapsed && <span className="font-medium">{t('sidebar.logout')}</span>}
                </button>
                 <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`flex items-center w-full space-x-3 px-4 py-2 mt-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}>
                    {isSidebarCollapsed ? <ChevronsRightIcon className="h-5 w-5" /> : <ChevronsLeftIcon className="h-5 w-5" />}
                    {!isSidebarCollapsed && <span className="font-medium">{t('sidebar.collapseMenu')}</span>}
                </button>
            </div>
        </div>
    );
  }

  return (
    <HashRouter>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-6 z-10 border-b dark:border-gray-700">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                        <span>{new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="font-medium text-gray-700 dark:text-white">{formatUserName(currentUser.name)}</span>
                        <div className="h-8 w-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-200 font-bold">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    <Routes>
                        <Route path="/" element={<Dashboard workOrders={workOrders} customers={customers} users={users} currentUser={currentUser} t={t} />} />
                        <Route path="/work-orders" element={<WorkOrders user={currentUser} workOrders={workOrders} users={users} onCreate={() => setModalState({ type: 'create_wo', data: null })} onAssign={(wo) => setModalState({ type: 'assign_tech', data: wo })} onComplete={handleCompleteWorkOrder} t={t} />} />
                        <Route path="/customers" element={<CustomersAndClientsPage customers={customers} clients={clients} onAddCustomer={() => setModalState({ type: 'add_customer', data: null })} onEditCustomer={(c) => setModalState({ type: 'edit_customer', data: c })} onAddClient={() => setModalState({ type: 'add_client', data: null })} onEditClient={(c) => setModalState({ type: 'edit_client', data: c })} t={t} />} />
                        <Route path="/settings" element={<SettingsPage customers={customers} workOrders={workOrders} users={users} profile={companyProfile} onProfileSave={setCompanyProfile} t={t} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} />} />
                        <Route path="/spare-parts" element={<SpareParts spareParts={spareParts} suppliers={suppliers} onAddPart={() => setModalState({ type: 'add_spare_part', data: null })} onEditPart={(sp) => setModalState({ type: 'edit_spare_part', data: sp })} onAddSupplier={() => setModalState({ type: 'add_supplier', data: null })} onEditSupplier={(s) => setModalState({ type: 'edit_supplier', data: s })} onImport={handleImportSpareParts} onDelete={handleDeleteSparePart} onBulkDelete={handleBulkDeleteSpareParts} t={t} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
            
            <Chatbot currentUser={currentUser} appData={{ customers, workOrders, spareParts, invoices, users }} />

            {modalState.type === 'create_wo' && <CreateWorkOrderModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleCreateWorkOrder} customers={customers} t={t} />}
            {modalState.type === 'assign_tech' && <AssignTechnicianModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleAssignTechnician} technicians={users.filter(u => u.role === UserRole.TECHNICIAN)} t={t} />}
            {modalState.type === 'add_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} part={null} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            {modalState.type === 'edit_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} onDelete={handleDeleteSparePart} part={modalState.data} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            
            {modalState.type === 'add_customer' && <AddEditCustomerModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveCustomer} customer={null} t={t} />}
            {modalState.type === 'edit_customer' && <AddEditCustomerModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveCustomer} customer={modalState.data} t={t} />}
            {modalState.type === 'add_client' && <AddEditClientModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveClient} client={null} t={t} />}
            {modalState.type === 'edit_client' && <AddEditClientModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveClient} client={modalState.data} t={t} />}
            {modalState.type === 'add_supplier' && <AddEditSupplierModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSupplier} supplier={null} t={t} />}
            {modalState.type === 'edit_supplier' && <AddEditSupplierModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSupplier} supplier={modalState.data} t={t} />}
        </div>
    </HashRouter>
  );
};

export default App;
