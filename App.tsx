
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, Transaction, Notification, ChatMessage, CompanyProfile, TechnicianStatus, TransactionCategory, PaymentMethod, ServiceContract, ContractStatus, Supplier, Client, AttendanceRecord } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, ReceiptIcon, MapPinIcon, MoreVerticalIcon, TruckIcon, BriefcaseIcon, TrashIcon, ArrowLeftIcon } from './components/icons';
import { generateAiSummary, getChatbotResponse } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- I18N Translations ---
const translations = {
  en: {
    sidebar: {
      dashboard: 'Dashboard', customers: 'Customers', workOrders: 'Work Orders',
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
        addPartsTitle: 'Add Parts to Work Order',
        addCostTitle: 'Add Additional Cost',
        addInvoiceTitle: 'Add New Invoice', editInvoiceTitle: 'Edit Invoice',
        addSparePartTitle: 'Add New Spare Part', editSparePartTitle: 'Edit Spare Part',
        addSupplierTitle: 'Add New Supplier', editSupplierTitle: 'Edit Supplier',
        addTransactionTitle: 'Add New Transaction', editTransactionTitle: 'Edit Transaction',
        addEmployeeTitle: 'Add New Employee',
        editEmployeeTitle: 'Edit Employee',
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
        workOrders: { title: 'Work Order Management', myTitle: 'Work Orders', myFullName: '{name}', allOrders: 'All Orders', myAssigned: 'My Assigned', available: 'Available', technician: 'Technician', unassigned: 'Unassigned', claimJob: 'Claim Job', addPart: 'Add Part', addCost: 'Add Cost', actions: 'Actions', uploadWorkProof: 'Upload Work Proof', uploadPaymentProof: 'Upload Payment Proof', generatePDF: 'Generate PDF', printWO: 'Print Work Order', completeWork: 'Complete Work' },
        spareParts: { title: 'Spare Part Management', inventory: 'Spare Part Inventory', suppliers: 'Suppliers', partName: 'Part Name', stock: 'Stock', location: 'Location', importParts: 'Import CSV', deleteSelected: 'Delete Selected', downloadTemplate: 'Download Template' },
        finance: { title: 'Finance', generateReport: 'Generate Financial Report', totalIncome: 'Total Income', totalExpense: 'Total Expense', profitLoss: 'Profit / Loss', invoices: 'Invoices', allTransactions: 'All Transactions', balanceSheet: 'Balance Sheet (Neraca)', assets: 'Assets', cash: 'Cash', liabilities: 'Liabilities', opCosts: 'Operational Costs', equity: 'Equity', retainedEarnings: 'Retained Earnings (Profit)', addTransaction: 'Add Transaction' },
        employees: { title: 'Employee Management', allEmployees: 'All Employees', performance: 'Performance', contact: 'Contact', role: 'Role', monthlyPerformance: 'Monthly Performance (Completed WO)', attendanceStatus: 'Today\'s Attendance', clockIn: 'Clock In', clockOut: 'Clock Out', clockedInAt: 'Clocked In @ {time}', clockedOut: 'Clocked Out', absent: 'Absent', addEmployee: 'Add Employee' },
        technicianProfile: { title: 'Technician Profile', back: 'Back to all employees', personalInfo: 'Personal Information', recentActivity: 'Recent Activity', editEmployee: 'Edit Employee' },
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
      dashboard: 'Dasbor', customers: 'Pelanggan', workOrders: 'Perintah Kerja',
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
        addPartsTitle: 'Tambah Suku Cadang ke SPK',
        addCostTitle: 'Tambah Biaya Tambahan',
        addInvoiceTitle: 'Tambah Faktur Baru', editInvoiceTitle: 'Ubah Faktur',
        addSparePartTitle: 'Tambah Suku Cadang Baru', editSparePartTitle: 'Ubah Suku Cadang',
        addSupplierTitle: 'Tambah Pemasok Baru', editSupplierTitle: 'Ubah Pemasok',
        addTransactionTitle: 'Tambah Transaksi Baru', editTransactionTitle: 'Ubah Transaksi',
        addEmployeeTitle: 'Tambah Karyawan Baru',
        editEmployeeTitle: 'Ubah Karyawan',
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
        workOrders: { title: 'Manajemen Perintah Kerja', myTitle: 'Perintah Kerja', myFullName: '{name}', allOrders: 'Semua SPK', myAssigned: 'Tugas Saya', available: 'SPK Tersedia', technician: 'Teknisi', unassigned: 'Belum Ditugaskan', claimJob: 'Ambil Pekerjaan', addPart: 'Tambah Part', addCost: 'Tambah Biaya', actions: 'Aksi', uploadWorkProof: 'Unggah Bukti Kerja', uploadPaymentProof: 'Unggah Bukti Bayar', generatePDF: 'Buat PDF', printWO: 'Cetak SPK', completeWork: 'Selesaikan Pekerjaan' },
        spareParts: { title: 'Manajemen Suku Cadang', inventory: 'Inventaris Suku Cadang', suppliers: 'Pemasok', partName: 'Nama Part', stock: 'Stok', location: 'Lokasi', importParts: 'Import CSV', deleteSelected: 'Hapus Terpilih', downloadTemplate: 'Download Template' },
        finance: { title: 'Keuangan', generateReport: 'Buat Laporan Keuangan', totalIncome: 'Total Pendapatan', totalExpense: 'Total Pengeluaran', profitLoss: 'Laba / Rugi', invoices: 'Faktur', semuaTransaksi: 'Semua Transaksi', balanceSheet: 'Neraca', assets: 'Aset', cash: 'Kas', liabilities: 'Liabilitas', opCosts: 'Biaya Operasional', equity: 'Ekuitas', retainedEarnings: 'Laba Ditahan', addTransaction: 'Tambah Transaksi' },
        employees: { title: 'Manajemen Karyawan', allEmployees: 'Semua Karyawan', performance: 'Kinerja', contact: 'Kontak', role: 'Peran', monthlyPerformance: 'Kinerja Bulanan (SPK Selesai)', attendanceStatus: 'Status Absensi Hari Ini', clockIn: 'Clock In', clockOut: 'Clock Out', clockedInAt: 'Clock In @ {time}', clockedOut: 'Clocked Out', absent: 'Absen', addEmployee: 'Tambah Karyawan' },
        technicianProfile: { title: 'Profil Teknisi', back: 'Kembali ke semua karyawan', personalInfo: 'Informasi Pribadi', aktivitasTerkini: 'Aktivitas Terkini', editEmployee: 'Ubah Karyawan' },
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
const INITIAL_USERS: User[] = [
    { id: 'admin-full', name: 'Administrator', role: UserRole.ADMINISTRATOR, email: 'administrator', password: '123' },
];
const INITIAL_CUSTOMERS: Customer[] = [];
const INITIAL_SUPPLIERS: Supplier[] = [];
const INITIAL_SPARE_PARTS: SparePart[] = [];
const INITIAL_CLIENTS: Client[] = [];
const INITIAL_WORK_ORDERS: WorkOrder[] = [];
const INITIAL_INVOICES: Invoice[] = [];
const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_CONTRACTS: ServiceContract[] = [];
const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

// --- UTILITY FUNCTIONS ---
const formatIDR = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const formatUserName = (name?: string | null): string => {
    if (!name || typeof name !== 'string') return '';
    return name.split(' (')[0];
};

const getStatusColor = (status: WorkOrderStatus | 'Paid' | 'Unpaid' | 'Pending Approval' | 'Approved' | ContractStatus | TechnicianStatus) => {
  switch (status) {
    case WorkOrderStatus.PENDING: case 'Unpaid': case 'Pending Approval': case ContractStatus.EXPIRED: case TechnicianStatus.ON_BREAK: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case WorkOrderStatus.IN_PROGRESS: case TechnicianStatus.ON_JOB: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'; // ON_JOB is green
    case WorkOrderStatus.COMPLETED: case 'Paid': case 'Approved': case ContractStatus.ACTIVE: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case TechnicianStatus.AVAILABLE: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'; // AVAILABLE is blue
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

const generatePdfHeader = (doc: jsPDF, profile: CompanyProfile) => {
    if (profile.logo) {
        try { doc.addImage(profile.logo, 'PNG', 14, 15, 30, 30); } 
        catch(e) { console.error("Error adding logo to PDF", e); }
    }
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.name, 50, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(profile.address, 50, 32);
    doc.text(`Email: ${profile.email} | Phone: ${profile.phone}`, 50, 39);
    doc.setLineWidth(0.5);
    doc.line(14, 50, 196, 50);
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
  const [identifier, setIdentifier] = useState('administrator');
  const [password, setPassword] = useState('123');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Bypass password check for testing
    const user = users.find(u => (u.email?.toLowerCase() === identifier.toLowerCase() || u.phone === identifier));
    if (user) onLogin(user); else setError(t('login.invalidCredentials'));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2 text-center">{t('login.logIn')}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">{t('login.subtitle')}</p>
        <div className="bg-yellow-50 text-yellow-800 p-3 rounded mb-4 text-xs dark:bg-yellow-900 dark:text-yellow-200">
            <strong>Testing Mode:</strong> Password is not required. Default login is 'administrator'.
        </div>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email or Phone</label>
                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: User = {
            id: `user-${Date.now()}`,
            name: `${name}`,
            role, email: email || undefined, phone: phone || undefined, password,
            status: role === UserRole.TECHNICIAN ? TechnicianStatus.AVAILABLE : undefined
        };
        onSignUp(newUser);
    };

    const inputClass = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500";

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2 text-center">{t('login.createAccount')}</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
                    <input type="email" placeholder="Email (used for login)" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
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

// --- MODALS ---
const AddEditEmployeeModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (user: User) => void; user: User | null; t: Function; }> = ({ isOpen, onClose, onSave, user, t }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: UserRole.TECHNICIAN, status: TechnicianStatus.AVAILABLE });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email || '',
                phone: user.phone || '',
                password: user.password || '',
                role: user.role,
                status: user.status || TechnicianStatus.OFFLINE
            });
        } else {
            setFormData({ name: '', email: '', phone: '', password: '', role: UserRole.TECHNICIAN, status: TechnicianStatus.AVAILABLE });
        }
    }, [user, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalUser: User = {
            ...user,
            id: user?.id || `user-${Date.now()}`,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            role: formData.role,
            status: formData.role === UserRole.TECHNICIAN ? formData.status : undefined,
        };
        onSave(finalUser);
    };

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? t('modals.editEmployeeTitle') : t('modals.addEmployeeTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelClass}>{t('common.name')}</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className={inputClass} /></div>
                <div><label className={labelClass}>{t('common.email')} (for login)</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required className={inputClass} /></div>
                <div><label className={labelClass}>{t('common.phone')}</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Password</label><input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!user} placeholder={user ? "Leave blank to keep unchanged" : ""} className={inputClass} /></div>
                <div>
                    <label className={labelClass}>{t('pages.employees.role')}</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className={inputClass}>
                        <option value={UserRole.TECHNICIAN}>Technician</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                        <option value={UserRole.ADMINISTRATOR}>Administrator</option>
                    </select>
                </div>
                 {formData.role === UserRole.TECHNICIAN && (
                    <div>
                        <label className={labelClass}>{t('common.status')}</label>
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as TechnicianStatus })} className={inputClass}>
                            {Object.values(TechnicianStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
                 <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditTransactionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (transaction: Transaction) => void; transaction: Transaction | null; t: Function; }> = ({ isOpen, onClose, onSave, transaction, t }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'expense' as 'income' | 'expense',
        amount: '',
        category: TransactionCategory.OTHER_EXPENSE,
        paymentMethod: PaymentMethod.CASH
    });

    useEffect(() => {
        if (transaction) {
            setFormData({
                date: transaction.date,
                description: transaction.description,
                type: transaction.type,
                amount: String(transaction.amount),
                category: transaction.category,
                paymentMethod: transaction.paymentMethod,
            });
        } else {
             setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                type: 'expense',
                amount: '',
                category: TransactionCategory.OTHER_EXPENSE,
                paymentMethod: PaymentMethod.CASH
            });
        }
    }, [transaction, isOpen]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: transaction?.id || `trn-${Date.now()}`,
            date: formData.date,
            description: formData.description,
            type: formData.type,
            amount: Number(formData.amount),
            category: formData.category,
            paymentMethod: formData.paymentMethod,
        });
    };

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transaction ? t('modals.editTransactionTitle') : t('modals.addTransactionTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className={labelClass}>{t('common.date')}</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className={inputClass} /></div>
                <div><label className={labelClass}>{t('common.description')}</label><input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required className={inputClass} /></div>
                <div><label className={labelClass}>{t('common.amount')}</label><input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Type</label>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'income' | 'expense'})} className={inputClass}>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>{t('common.category')}</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as TransactionCategory})} className={inputClass}>
                            {Object.values(TransactionCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditCustomerModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (customer: Customer) => void; customer: Customer | null; t: Function; }> = ({ isOpen, onClose, onSave, customer, t }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
    useEffect(() => {
        if (customer) { setFormData({ name: customer.name, email: customer.email, phone: customer.phone, address: customer.address }); } 
        else { setFormData({ name: '', email: '', phone: '', address: '' }); }
    }, [customer, isOpen]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ id: customer?.id || `cust-${Date.now()}`, ...formData }); };
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? t('modals.editCustomerTitle') : t('modals.addCustomerTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.email')}</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.address')}</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required rows={3} className={inputClass} /></div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditClientModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (client: Client) => void; client: Client | null; t: Function; }> = ({ isOpen, onClose, onSave, client, t }) => {
    const [name, setName] = useState('');
    useEffect(() => { if (client) setName(client.name); else setName(''); }, [client, isOpen]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ id: client?.id || `client-${Date.now()}`, name }); };
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? t('modals.editClientTitle') : t('modals.addClientTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} /></div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditSupplierModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (supplier: Supplier) => void; supplier: Supplier | null; t: Function; }> = ({ isOpen, onClose, onSave, supplier, t }) => {
    const [formData, setFormData] = useState({ name: '', contactPerson: '', phone: '', email: '' });
    useEffect(() => { if (supplier) { setFormData({ name: supplier.name, contactPerson: supplier.contactPerson, phone: supplier.phone, email: supplier.email }); } else { setFormData({ name: '', contactPerson: '', phone: '', email: '' }); } }, [supplier, isOpen]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ id: supplier?.id || `sup-${Date.now()}`, ...formData }); };
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? t('modals.editSupplierTitle') : t('modals.addSupplierTitle')}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label><input type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.email')}</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className={inputClass} /></div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};

const CreateWorkOrderModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (wo: Partial<WorkOrder>) => void; customers: Customer[]; t: Function }> = ({ isOpen, onClose, onSave, customers, t }) => {
    const [customerId, setCustomerId] = useState('');
    const [description, setDescription] = useState('');
    const [initialServiceFee, setInitialServiceFee] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customerId && description && initialServiceFee) {
            onSave({
                customer: customers.find(c => c.id === customerId)!,
                description,
                initialServiceFee: Number(initialServiceFee)
            });
            setCustomerId('');
            setDescription('');
            setInitialServiceFee('');
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
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Biaya Jasa Awal (IDR)</label>
                    <input
                        type="number"
                        value={initialServiceFee}
                        onChange={e => setInitialServiceFee(e.target.value)}
                        required
                        className={inputClass}
                        placeholder="e.g. 150000"
                    />
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

const AddPartToWorkOrderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (parts: { partId: string; quantity: number }[]) => void;
    availableParts: SparePart[];
    t: Function;
}> = ({ isOpen, onClose, onSave, availableParts, t }) => {
    const [partsToAdd, setPartsToAdd] = useState<Record<string, number>>({});

    const handleQuantityChange = (partId: string, quantity: number, maxStock: number) => {
        if (quantity < 0 || quantity > (maxStock as number)) return;
        setPartsToAdd(prev => ({ ...prev, [partId]: quantity }));
    };

    const handleSubmit = () => {
        const finalParts = Object.entries(partsToAdd)
            .filter(([, qty]) => qty > 0)
            .map(([partId, quantity]) => ({ partId, quantity }));
        onSave(finalParts);
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.addPartsTitle')} size="lg">
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {availableParts.filter(p => p.stock > 0).map(part => (
                    <div key={part.id} className="grid grid-cols-3 items-center gap-4">
                        <span className="font-medium text-gray-800 dark:text-white">{part.name}</span>
                        <span className="text-sm text-gray-500">Stock: {part.stock}</span>
                        <input
                            type="number"
                            min="0"
                            max={part.stock}
                            value={partsToAdd[part.id] || 0}
                            onChange={(e) => handleQuantityChange(part.id, parseInt(e.target.value) || 0, part.stock)}
                            className="w-full px-3 py-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end space-x-2 pt-4 mt-4 border-t dark:border-gray-700">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">{t('common.cancel')}</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.add')} Parts</button>
            </div>
        </Modal>
    );
};

const AddAdditionalCostModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (cost: { description: string; amount: number }) => void;
    t: Function;
}> = ({ isOpen, onClose, onSave, t }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description && amount) {
            onSave({ description, amount: Number(amount) });
            setDescription('');
            setAmount('');
        }
    };
    
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.addCostTitle')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi Biaya</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className={inputClass} placeholder="e.g. Penggantian Pipa Freon"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah (IDR)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className={inputClass} placeholder="e.g. 50000"/>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};


const AddEditSparePartModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (part: SparePart) => void; onDelete?: (id: string) => void; part: SparePart | null; suppliers: Supplier[]; allSpareParts: SparePart[]; t: Function; }> = ({ isOpen, onClose, onSave, onDelete, part, suppliers, allSpareParts, t }) => {
    const [formData, setFormData] = useState({ itemCode: '', name: '', purchasePrice: '', sellingPrice: '', stock: '', unit: '', location: '', supplierId: '' });
    useEffect(() => {
        if (part) { setFormData({ itemCode: part.itemCode, name: part.name, purchasePrice: String(part.purchasePrice || ''), sellingPrice: String(part.sellingPrice), stock: String(part.stock), unit: part.unit, location: part.location, supplierId: part.supplierId || '' }); } 
        else { setFormData({ itemCode: '', name: '', purchasePrice: '', sellingPrice: '', stock: '0', unit: '', location: '', supplierId: '' }); }
    }, [part, isOpen]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...part, id: part?.id || `sp-${Date.now()}`, itemCode: formData.itemCode || `ITEM-${Date.now()}`, name: formData.name, purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined, sellingPrice: Number(formData.sellingPrice), stock: Number(formData.stock), unit: formData.unit, location: formData.location, supplierId: formData.supplierId || undefined, }); };
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-800";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={part ? t('modals.editSparePartTitle') : t('modals.addSparePartTitle')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div><label className={labelClass}>Kode Item</label><input type="text" name="itemCode" value={formData.itemCode} onChange={handleChange} placeholder="Auto-generated if blank" className={inputClass} /></div>
                <div><label className={labelClass}>{t('pages.spareParts.partName')}</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} /></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Harga Beli (IDR)</label><input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder={t('common.optional')} className={inputClass} /></div>
                    <div><label className={labelClass}>Harga Jual (IDR)</label><input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required className={inputClass} /></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Stock Quantity</label><input type="number" name="stock" value={formData.stock} onChange={handleChange} required className={inputClass} /></div>
                    <div><label className={labelClass}>Satuan (e.g. pcs, kg)</label><input type="text" name="unit" value={formData.unit} onChange={handleChange} required className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>{t('pages.spareParts.location')}</label><input type="text" name="location" value={formData.location} onChange={handleChange} required className={inputClass} /></div>
                 <div><label className={labelClass}>Supplier</label><select name="supplierId" value={formData.supplierId} onChange={handleChange} className={inputClass}><option value="">-- No Supplier --</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="flex justify-between pt-4">
                    {part && onDelete && (<button type="button" onClick={() => { if(confirm('Are you sure you want to delete this part?')) onDelete(part.id); }} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">{t('common.delete')}</button>)}
                    <div className="flex space-x-2 ml-auto">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')} Part</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

// --- PAGES ---
const FinancePage: React.FC<{ transactions: Transaction[], onAddTransaction: () => void, t: Function }> = ({ transactions, onAddTransaction, t }) => {
    const { totalIncome, totalExpense, profitLoss } = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { totalIncome: income, totalExpense: expense, profitLoss: income - expense };
    }, [transactions]);

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.finance.title')}</h1>
                <button onClick={onAddTransaction} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
                    <FinanceIcon className="mr-2 h-5 w-5" /> {t('pages.finance.addTransaction')}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t('pages.finance.totalIncome')} value={formatIDR(totalIncome)} icon={<FinanceIcon />} color="green" />
                <StatCard title={t('pages.finance.totalExpense')} value={formatIDR(totalExpense)} icon={<FinanceIcon />} color="red" />
                <StatCard title={t('pages.finance.profitLoss')} value={formatIDR(profitLoss)} icon={<FinanceIcon />} color={profitLoss >= 0 ? 'blue' : 'yellow'} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                 <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">{t('pages.finance.allTransactions')}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-6 py-3">{t('common.date')}</th>
                                    <th className="px-6 py-3">{t('common.description')}</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">{t('common.category')}</th>
                                    <th className="px-6 py-3 text-right">{t('common.amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tr => (
                                    <tr key={tr.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4">{tr.date}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tr.description}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${tr.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                {tr.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{tr.category}</td>
                                        <td className={`px-6 py-4 text-right font-semibold ${tr.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatIDR(tr.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            </div>
        </div>
    );
};

const CustomersAndClientsPage: React.FC<{
    customers: Customer[];
    clients: Client[];
    onAddCustomer: () => void;
    onEditCustomer: (customer: Customer) => void;
    onAddClient: () => void;
    onEditClient: (client: Client) => void;
    t: Function;
}> = ({ customers, clients, onAddCustomer, onEditCustomer, onAddClient, onEditClient, t }) => {
    const [activeTab, setActiveTab] = useState<'customers' | 'clients'>('customers');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.customers.title')}</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <button onClick={() => setActiveTab('customers')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'customers' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            {t('pages.customers.customersTab')}
                        </button>
                        <button onClick={() => setActiveTab('clients')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'clients' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            {t('pages.customers.clientsTab')}
                        </button>
                    </nav>
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-1/3 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                        <button
                            onClick={activeTab === 'customers' ? onAddCustomer : onAddClient}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                        >
                            {t('common.add')} {activeTab === 'customers' ? t('pages.customers.customersTab') : t('pages.customers.clientsTab')}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        {activeTab === 'customers' ? (
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">{t('common.name')}</th>
                                        <th scope="col" className="px-6 py-3">{t('common.email')}</th>
                                        <th scope="col" className="px-6 py-3">{t('common.phone')}</th>
                                        <th scope="col" className="px-6 py-3">{t('common.address')}</th>
                                        <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                            <td className="px-6 py-4">{customer.email}</td>
                                            <td className="px-6 py-4">{customer.phone}</td>
                                            <td className="px-6 py-4">{customer.address}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => onEditCustomer(customer)} className="text-primary-600 hover:underline">{t('common.edit')}</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                 <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">{t('common.name')}</th>
                                        <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {filteredClients.map(client => (
                                         <tr key={client.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{client.name}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => onEditClient(client)} className="text-primary-600 hover:underline">{t('common.edit')}</button>
                                            </td>
                                        </tr>
                                     ))}
                                 </tbody>
                             </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SpareParts: React.FC<{
    spareParts: SparePart[];
    suppliers: Supplier[];
    onAddPart: () => void;
    onEditPart: (part: SparePart) => void;
    onAddSupplier: () => void;
    onEditSupplier: (supplier: Supplier) => void;
    onImport: (parsedParts: any[]) => void;
    onDelete: (id: string) => void;
    onBulkDelete: (ids: string[]) => void;
    t: Function;
}> = ({ spareParts, suppliers, onAddPart, onEditPart, onAddSupplier, onEditSupplier, onImport, onBulkDelete, t }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedParts, setSelectedParts] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredParts = spareParts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.itemCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedParts(filteredParts.map(p => p.id));
        } else {
            setSelectedParts([]);
        }
    };
    const handleSelectOne = (id: string) => {
        setSelectedParts(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    };
    
    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            Papa.parse(e.target.files[0], {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    onImport(results.data);
                },
            });
        }
    };

    const downloadCsvTemplate = () => {
        const csv = Papa.unparse([{
            itemCode: 'SKU-001',
            name: 'Compressor',
            purchasePrice: '500000',
            sellingPrice: '750000',
            stock: '10',
            unit: 'pcs',
            location: 'Rack A1',
            supplierId: ''
        }]);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "spare_part_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.spareParts.title')}</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <button onClick={() => setActiveTab('inventory')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('pages.spareParts.inventory')}</button>
                        <button onClick={() => setActiveTab('suppliers')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'suppliers' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('pages.spareParts.suppliers')}</button>
                    </nav>
                </div>
                {activeTab === 'inventory' ? (
                     <div className="p-6">
                         <div className="flex justify-between items-center mb-4">
                             <input type="text" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-1/3 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                             <div className="space-x-2">
                                <button onClick={handleImportClick} className="px-4 py-2 rounded-lg border">{t('pages.spareParts.importParts')}</button>
                                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".csv"/>
                                <button onClick={downloadCsvTemplate} className="px-4 py-2 rounded-lg border">{t('pages.spareParts.downloadTemplate')}</button>
                                {selectedParts.length > 0 && <button onClick={() => onBulkDelete(selectedParts)} className="px-4 py-2 rounded-lg bg-red-600 text-white">{t('pages.spareParts.deleteSelected')}</button>}
                                <button onClick={onAddPart} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Part</button>
                             </div>
                         </div>
                         <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedParts.length === filteredParts.length && filteredParts.length > 0} /></th>
                                    <th className="px-6 py-3">Item Code</th>
                                    <th className="px-6 py-3">{t('pages.spareParts.partName')}</th>
                                    <th className="px-6 py-3">{t('pages.spareParts.stock')}</th>
                                    <th className="px-6 py-3">Price</th>
                                    <th className="px-6 py-3">{t('pages.spareParts.location')}</th>
                                    <th className="px-6 py-3">Supplier</th>
                                    <th className="px-6 py-3">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredParts.map(part => (
                                    <tr key={part.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="p-4"><input type="checkbox" checked={selectedParts.includes(part.id)} onChange={() => handleSelectOne(part.id)} /></td>
                                        <td className="px-6 py-4 font-mono text-xs">{part.itemCode}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{part.name}</td>
                                        <td className="px-6 py-4">{part.stock} {part.unit}</td>
                                        <td className="px-6 py-4">{formatIDR(part.sellingPrice)}</td>
                                        <td className="px-6 py-4">{part.location}</td>
                                        <td className="px-6 py-4">{suppliers.find(s => s.id === part.supplierId)?.name || '-'}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => onEditPart(part)} className="text-primary-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                ) : (
                    <div className="p-6">
                         <div className="flex justify-between items-center mb-4">
                            <input type="text" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-1/3 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                            <button onClick={onAddSupplier} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('common.add')} Supplier</button>
                         </div>
                         <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-6 py-3">Supplier Name</th>
                                    <th className="px-6 py-3">Contact Person</th>
                                    <th className="px-6 py-3">{t('common.phone')}</th>
                                    <th className="px-6 py-3">{t('common.email')}</th>
                                    <th className="px-6 py-3">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map(supplier => (
                                    <tr key={supplier.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{supplier.name}</td>
                                        <td className="px-6 py-4">{supplier.contactPerson}</td>
                                        <td className="px-6 py-4">{supplier.phone}</td>
                                        <td className="px-6 py-4">{supplier.email}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => onEditSupplier(supplier)} className="text-primary-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
};

const SettingsPage: React.FC<{
    customers: Customer[];
    workOrders: WorkOrder[];
    users: User[];
    profile: CompanyProfile;
    onProfileSave: (profile: CompanyProfile) => void;
    t: Function;
    language: 'en' | 'id';
    setLanguage: (lang: 'en' | 'id') => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    spareParts: SparePart[];
    suppliers: Supplier[];
    clients: Client[];
    invoices: Invoice[];
    transactions: Transaction[];
    contracts: ServiceContract[];
}> = ({ customers, workOrders, users, profile, onProfileSave, t, language, setLanguage, theme, setTheme, spareParts, suppliers, clients, invoices, transactions, contracts }) => {
    const [companyProfileData, setCompanyProfileData] = useState(profile);
    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";

    useEffect(() => {
        setCompanyProfileData(profile);
    }, [profile]);
    
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompanyProfileData({ ...companyProfileData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onProfileSave(companyProfileData);
        alert('Profile updated!');
    };

    const handleExportData = () => {
        const dataToExport = {
            users,
            customers,
            workOrders,
            spareParts,
            suppliers,
            clients,
            invoices,
            transactions,
            contracts,
            companyProfile: profile,
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `servispro_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const restoredData = JSON.parse(e.target?.result as string);
                    alert('Data restore functionality is for demonstration. To implement fully, pass all state setters to this component.');
                    console.log("Restored data:", restoredData);
                } catch (error) {
                    alert('Invalid JSON file.');
                    console.error("Restore error:", error);
                }
            };
            reader.readAsText(file);
        }
    };
    
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.settings.title')}</h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{t('pages.settings.companyProfile')}</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</label>
                            <input type="text" name="name" value={companyProfileData.name} onChange={handleProfileChange} className={inputClass} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</label>
                            <input type="text" name="phone" value={companyProfileData.phone} onChange={handleProfileChange} className={inputClass} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.email')}</label>
                        <input type="email" name="email" value={companyProfileData.email} onChange={handleProfileChange} className={inputClass} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.address')}</label>
                        <input type="text" name="address" value={companyProfileData.address} onChange={handleProfileChange} className={inputClass} />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('common.save')}</button>
                    </div>
                </form>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">{t('pages.settings.language')}</h2>
                    <div className="flex space-x-2">
                        <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded ${language === 'en' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>English</button>
                        <button onClick={() => setLanguage('id')} className={`px-4 py-2 rounded ${language === 'id' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Bahasa Indonesia</button>
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">{t('pages.settings.appearance')}</h2>
                    <div className="flex space-x-2">
                        <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded ${theme === 'light' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{t('pages.settings.lightMode')}</button>
                        <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded ${theme === 'dark' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{t('pages.settings.darkMode')}</button>
                    </div>
                </div>
             </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{t('pages.settings.dataBackup')}</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                         <h3 className="font-semibold">{t('pages.settings.exportData')}</h3>
                         <p className="text-sm text-gray-500 mb-2">{t('pages.settings.exportDesc')}</p>
                         <button onClick={handleExportData} className="px-4 py-2 rounded-lg border">{t('pages.settings.exportData')}</button>
                     </div>
                     <div>
                        <h3 className="font-semibold">{t('pages.settings.restoreData')}</h3>
                        <p className="text-sm text-gray-500 mb-2">{t('pages.settings.restoreDesc')}</p>
                        <label className="text-sm cursor-pointer border rounded-lg px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                           Upload File
                           <input type="file" onChange={handleRestoreData} accept=".json" className="hidden" />
                        </label>
                     </div>
                 </div>
            </div>
        </div>
    );
};

const WorkOrderDetailPage: React.FC<{
    workOrders: WorkOrder[];
    users: User[];
    spareParts: SparePart[];
    onAddPart: (wo: WorkOrder) => void;
    onAddCost: (wo: WorkOrder) => void;
    onComplete: (wo: WorkOrder) => void;
    t: Function;
}> = ({ workOrders, users, spareParts, onAddPart, onAddCost, onComplete, t }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const workOrder = workOrders.find(wo => wo.id === id);

    if (!workOrder) {
        return <div className="text-center text-gray-500">Work Order not found.</div>;
    }

    const { customer, description, status, technicianId, createdAt } = workOrder;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={() => navigate('/work-orders')} className="flex items-center space-x-2 text-primary-600 hover:underline">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Back to Work Orders</span>
            </button>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Work Order #{workOrder.id}</h1>
                        <p className="text-sm text-gray-500">Created on {new Date(createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>{t(`status.${status}`)}</span>
                </div>
                
                <div className="mt-6 border-t dark:border-gray-700 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Customer Details</h3>
                        <p className="font-bold text-gray-800 dark:text-white">{customer.name}</p>
                        <p className="text-gray-600 dark:text-gray-400">{customer.address}</p>
                        <p className="text-gray-600 dark:text-gray-400">{customer.phone}</p>
                         <div className="flex space-x-2 mt-2">
                             <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm hover:underline">View on Map</a>
                             <a href={`tel:${customer.phone}`} className="text-primary-600 text-sm hover:underline">Call Customer</a>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-2">Job Details</h3>
                        <p className="font-bold text-gray-800 dark:text-white">Problem Description</p>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
                        <p className="font-bold text-gray-800 dark:text-white">Assigned Technician</p>
                        <p className="text-gray-600 dark:text-gray-400">{users.find(u => u.id === technicianId)?.name || 'Unassigned'}</p>
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>
                <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Initial Service Fee</span> <span className="font-medium">{formatIDR(workOrder.initialServiceFee)}</span></div>
                    {workOrder.additionalCosts.map((cost, i) => (
                        <div key={i} className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{cost.description}</span> <span className="font-medium">{formatIDR(cost.amount)}</span></div>
                    ))}
                    {workOrder.usedParts.map((item, i) => {
                        const part = spareParts.find(p => p.id === item.partId);
                        return <div key={i} className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{part?.name} x{item.quantity}</span> <span className="font-medium">{formatIDR(item.quantity * item.sellingPrice)}</span></div>
                    })}
                </div>
                 <div className="flex justify-between mt-4 pt-4 border-t dark:border-gray-700">
                    <span className="font-bold text-lg">Total Cost</span>
                    <span className="font-bold text-lg">{formatIDR(workOrder.totalCost)}</span>
                </div>
            </div>

            {status === WorkOrderStatus.IN_PROGRESS && (
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex justify-around items-center">
                     <button onClick={() => onAddPart(workOrder)} className="px-6 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold">{t('pages.workOrders.addPart')}</button>
                     <button onClick={() => onAddCost(workOrder)} className="px-6 py-3 rounded-lg text-white bg-purple-600 hover:bg-purple-700 font-semibold">{t('pages.workOrders.addCost')}</button>
                     <button onClick={() => onComplete(workOrder)} className="px-6 py-3 rounded-lg text-white bg-green-600 hover:bg-green-700 font-semibold">{t('pages.workOrders.completeWork')}</button>
                 </div>
            )}
        </div>
    );
};

const WorkOrders: React.FC<{ 
    user: User; 
    workOrders: WorkOrder[]; 
    users: User[]; 
    onCreate: () => void;
    onAssign: (wo: WorkOrder) => void; 
    onClaim: (wo: WorkOrder) => void;
    onAddPart: (wo: WorkOrder) => void;
    onAddCost: (wo: WorkOrder) => void;
    onComplete: (wo: WorkOrder) => void;
    t: Function;
}> = ({ user, workOrders, users, onCreate, onAssign, onClaim, onAddPart, onAddCost, onComplete, t }) => {
    
    const isTechnician = user.role === UserRole.TECHNICIAN;
    const [techTab, setTechTab] = useState<'my_assigned' | 'available'>('my_assigned');
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const ordersToDisplay = useMemo(() => {
        if (isTechnician) {
            if (techTab === 'my_assigned') {
                return workOrders.filter(wo => wo.technicianId === user.id);
            }
            return workOrders.filter(wo => !wo.technicianId && wo.status === WorkOrderStatus.PENDING);
        }
        return workOrders;
    }, [workOrders, user, isTechnician, techTab]);

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
                 <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
                    <nav className="-mb-px flex space-x-8">
                        {isTechnician ? (
                            <>
                                <button onClick={() => setTechTab('my_assigned')} className={`py-4 px-1 border-b-2 font-medium text-sm ${techTab === 'my_assigned' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('pages.workOrders.myAssigned')}</button>
                                <button onClick={() => setTechTab('available')} className={`py-4 px-1 border-b-2 font-medium text-sm ${techTab === 'available' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>{t('pages.workOrders.available')}</button>
                            </>
                        ) : (
                            <button className={`py-4 px-1 border-b-2 font-medium text-sm border-primary-500 text-primary-600 dark:text-primary-400`}>{t('pages.workOrders.allOrders')}</button>
                        )}
                    </nav>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">ID / Job</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">{t('common.status')}</th>
                                <th className="px-6 py-3">{t('pages.workOrders.technician')}</th>
                                <th className="px-6 py-3">{t('common.total')}</th>
                                <th className="px-6 py-3">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersToDisplay.length > 0 ? ordersToDisplay.map(wo => (
                                <tr key={wo.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4">
                                        <Link to={`/work-orders/${wo.id}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{wo.id}</Link>
                                        <p className="text-xs text-gray-500 truncate max-w-xs">{wo.description}</p>
                                    </td>
                                    <td className="px-6 py-4">{wo.customer.name}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span></td>
                                    <td className="px-6 py-4">{users.find(u => u.id === wo.technicianId)?.name || <span className="text-gray-400 italic">{t('pages.workOrders.unassigned')}</span>}</td>
                                    <td className="px-6 py-4 font-semibold">{formatIDR(wo.totalCost)}</td>
                                    <td className="px-6 py-4">
                                        <div className="relative" ref={dropdownRef}>
                                            {!isTechnician && wo.status === WorkOrderStatus.PENDING && (
                                                <button onClick={() => onAssign(wo)} className="text-primary-600 hover:underline dark:text-primary-400">Assign</button>
                                            )}
                                            {isTechnician && techTab === 'available' && (
                                                <button onClick={() => onClaim(wo)} className="text-blue-600 hover:underline dark:text-blue-400">{t('pages.workOrders.claimJob')}</button>
                                            )}
                                            {(isTechnician && techTab === 'my_assigned' && wo.status === WorkOrderStatus.IN_PROGRESS) && (
                                                <button onClick={() => setOpenDropdownId(openDropdownId === wo.id ? null : wo.id)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                                                    <MoreVerticalIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                            
                                            {openDropdownId === wo.id && (
                                                <div className="absolute right-0 top-6 z-10 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700">
                                                    <ul className="py-1">
                                                        <li><button onClick={() => { onAddPart(wo); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.addPart')}</button></li>
                                                        <li><button onClick={() => { onAddCost(wo); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.addCost')}</button></li>
                                                        <li><button onClick={() => { onComplete(wo); setOpenDropdownId(null); }} className="block w-full text-left px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.completeWork')}</button></li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (<tr><td colSpan={6} className="px-6 py-4 text-center">No work orders found.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const EmployeesPage: React.FC<{ users: User[], workOrders: WorkOrder[], attendance: AttendanceRecord[], onAddEmployee: () => void, t: Function }> = ({ users, workOrders, attendance, onAddEmployee, t }) => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const getAttendanceStatus = (userId: string) => {
        const record = attendance.find(a => a.userId === userId && a.date === today);
        if (!record) {
            return <span className="text-gray-500 italic">{t('pages.employees.absent')}</span>;
        }
        if (record.clockOutTime) {
            return <span className="text-red-600">{t('pages.employees.clockedOut')}</span>;
        }
        const time = new Date(record.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return <span className="text-green-600">{t('pages.employees.clockedInAt', { time })}</span>;
    };
    
    const getMonthlyPerformance = (userId: string) => {
        return workOrders.filter(wo => {
            const completedDate = wo.completedAt ? new Date(wo.completedAt) : null;
            return wo.technicianId === userId &&
                   wo.status === WorkOrderStatus.COMPLETED &&
                   completedDate &&
                   completedDate.getMonth() === currentMonth &&
                   completedDate.getFullYear() === currentYear;
        }).length;
    };

    return (
         <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.employees.title')}</h1>
                <button onClick={onAddEmployee} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
                    <UsersIcon className="mr-2 h-5 w-5" /> {t('pages.employees.addEmployee')}
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">{t('common.name')}</th>
                                <th className="px-6 py-3">{t('pages.employees.role')}</th>
                                <th className="px-6 py-3">{t('common.contact')}</th>
                                <th className="px-6 py-3">{t('pages.employees.monthlyPerformance')}</th>
                                <th className="px-6 py-3">{t('pages.employees.attendanceStatus')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 font-medium">
                                        <Link to={`/employees/${user.id}`} className="text-primary-600 hover:underline dark:text-primary-400">{user.name}</Link>
                                    </td>
                                    <td className="px-6 py-4 capitalize">{user.role}</td>
                                    <td className="px-6 py-4">{user.email || user.phone || 'N/A'}</td>
                                    <td className="px-6 py-4 text-center font-semibold">{user.role === UserRole.TECHNICIAN ? getMonthlyPerformance(user.id) : '-'}</td>
                                    <td className="px-6 py-4">{user.role === UserRole.TECHNICIAN ? getAttendanceStatus(user.id) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TechnicianProfilePage: React.FC<{ users: User[], workOrders: WorkOrder[], onEdit: (user: User) => void, t: Function }> = ({ users, workOrders, onEdit, t }) => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const user = users.find(u => u.id === employeeId);

    if (!user) {
        return <div className="text-center text-gray-500">Employee not found.</div>;
    }

    const recentWork = workOrders.filter(wo => wo.technicianId === user.id).slice(0, 5);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={() => navigate('/employees')} className="flex items-center space-x-2 text-primary-600 hover:underline">
                <ArrowLeftIcon className="h-5 w-5" />
                <span>{t('pages.technicianProfile.back')}</span>
            </button>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h1>
                        <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <button onClick={() => onEdit(user)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
                        {t('pages.technicianProfile.editEmployee')}
                    </button>
                </div>
                <div className="mt-6 border-t dark:border-gray-700 pt-6">
                    <h3 className="font-semibold text-lg mb-2">{t('pages.technicianProfile.personalInfo')}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-500">Email</p><p className="font-medium">{user.email || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Phone</p><p className="font-medium">{user.phone || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Status</p><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(user.status!)}`}>{t(`status.${user.status!}`)}</span></div>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <h3 className="font-semibold text-lg mb-2">{t('pages.technicianProfile.recentActivity')}</h3>
                 <div className="space-y-3">
                     {recentWork.length > 0 ? recentWork.map(wo => (
                         <div key={wo.id} className="flex justify-between items-center border-b dark:border-gray-700 pb-2 last:border-0">
                             <div>
                                 <p className="font-medium">{wo.description}</p>
                                 <p className="text-xs text-gray-500">WO #{wo.id} for {wo.customer.name}</p>
                             </div>
                             <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span>
                         </div>
                     )) : <p className="text-sm text-gray-500">No recent work orders found.</p>}
                 </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ workOrders: WorkOrder[]; customers: Customer[]; users: User[]; currentUser: User; transactions: Transaction[]; t: Function }> = ({ workOrders, customers, users, currentUser, transactions, t }) => {
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const navigate = useNavigate();

    const stats = useMemo(() => {
        let relevantOrders = workOrders;
        if (currentUser.role === UserRole.TECHNICIAN) {
            relevantOrders = workOrders.filter(w => w.technicianId === currentUser.id);
        }

        const pending = relevantOrders.filter(w => w.status === WorkOrderStatus.PENDING || w.status === WorkOrderStatus.IN_PROGRESS).length;
        const completed = relevantOrders.filter(w => w.status === WorkOrderStatus.COMPLETED).length;
        
        const totalRevenue = transactions.filter(tr => tr.type === 'income').reduce((sum, tr) => sum + tr.amount, 0);

        return { pending, completed, totalRevenue, totalCustomers: customers.length };
    }, [workOrders, customers, currentUser, transactions]);
    
    const technicians = useMemo(() => users.filter(u => u.role === UserRole.TECHNICIAN), [users]);

    const handleGenerateSummary = async () => {
        setLoadingAi(true);
        const summary = await generateAiSummary({ workOrders, customers, users, transactions });
        setAiSummary(summary);
        setLoadingAi(false);
    };

    const chartData = useMemo(() => {
        const data = technicians.map(tech => ({
            name: tech.name.split(' ')[0],
            completed: workOrders.filter(w => w.technicianId === tech.id && w.status === WorkOrderStatus.COMPLETED).length
        }));
        return data;
    }, [technicians, workOrders]);
    
    const TechnicianStatusWidget = ({ isCard = false }: { isCard?: boolean }) => {
        const statusColorMap: Record<string, string> = {
            [TechnicianStatus.ON_JOB]: 'bg-green-500', // On Progress -> Green
            [TechnicianStatus.AVAILABLE]: 'bg-blue-500', // Available -> Blue
            [TechnicianStatus.ON_BREAK]: 'bg-yellow-500', // Break -> Yellow
            [TechnicianStatus.OFFLINE]: 'bg-gray-400', // Offline -> Gray
        };

        const content = (
            <div className={`space-y-2 ${isCard ? 'mt-2 max-h-[6.5rem] pr-2' : 'max-h-64'} overflow-y-auto`}>
                {technicians.map(tech => (
                    <div key={tech.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{formatUserName(tech.name)}</span>
                        <div className="flex items-center space-x-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${statusColorMap[tech.status!]}`} title={t(`status.${tech.status!}`)}></span>
                            {!isCard && <span className="text-xs text-gray-500 dark:text-gray-400">{t(`status.${tech.status!}`)}</span>}
                        </div>
                    </div>
                ))}
            </div>
        );

        if (isCard) {
            return (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full flex flex-col justify-center cursor-pointer" onClick={() => navigate('/employees')}>
                    <div className="flex items-center space-x-4 mb-2">
                        <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full">
                           <TechnicianIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-200" />
                        </div>
                         <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.technicianStatus')}</p>
                    </div>
                    {content}
                </div>
            );
        }

        return (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t('dashboard.technicianStatus')}</h3>
                {content}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard.welcome', { name: currentUser.name.split(' ')[0] })}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('dashboard.summary')}</p>
                </div>
                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ADMINISTRATOR) && (
                    <button onClick={handleGenerateSummary} disabled={loadingAi} className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 transition-all">
                        {loadingAi ? <SpinnerIcon className="h-5 w-5" /> : <AiIcon className="h-5 w-5" />}
                        <span>{loadingAi ? t('dashboard.generating') : t('dashboard.generateSummary')}</span>
                    </button>
                )}
            </div>

            {aiSummary && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 p-6 rounded-lg border border-indigo-100 dark:border-gray-700 shadow-sm">
                    {/* AI Summary Content */}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {currentUser.role === UserRole.TECHNICIAN ? (
                    <>
                        <StatCard title="My Pending Jobs" value={stats.pending.toString()} icon={<WorkOrderIcon />} color="yellow" onClick={() => navigate('/work-orders')} />
                        <StatCard title="My Completed Jobs" value={stats.completed.toString()} icon={<ReceiptIcon />} color="green" />
                    </>
                ) : (
                    <>
                        <StatCard title={t('dashboard.totalCustomers')} value={stats.totalCustomers.toString()} icon={<CustomerIcon />} color="blue" onClick={() => navigate('/customers')} />
                        <StatCard title={t('dashboard.pendingWorkOrders')} value={stats.pending.toString()} icon={<WorkOrderIcon />} color="yellow" onClick={() => navigate('/work-orders')} />
                        {currentUser.role === UserRole.ADMINISTRATOR ? (
                            <>
                                <StatCard title="Completed Orders" value={stats.completed.toString()} icon={<ReceiptIcon />} color="green" />
                                <StatCard title={t('dashboard.monthlyRevenue')} value={formatIDR(stats.totalRevenue)} icon={<FinanceIcon />} color="indigo" onClick={() => navigate('/finance')} />
                            </>
                        ) : (
                           <>
                             <StatCard title="Completed Orders" value={stats.completed.toString()} icon={<ReceiptIcon />} color="green" />
                             <TechnicianStatusWidget isCard={true} />
                           </>
                        )}
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ADMINISTRATOR) && (
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
                )}
                
                {currentUser.role === UserRole.ADMINISTRATOR ? (
                    <TechnicianStatusWidget />
                ) : (
                    <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md ${currentUser.role === UserRole.TECHNICIAN ? 'lg:col-span-2' : ''}`}>
                         <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Recent Activity</h3>
                         <div className="space-y-4">
                             {workOrders.filter(w => currentUser.role === UserRole.TECHNICIAN ? w.technicianId === currentUser.id : true).slice(0, 5).map(wo => (
                                 <div key={wo.id} className="flex justify-between items-center border-b dark:border-gray-700 pb-2 last:border-0">
                                     <div>
                                         <p className="font-medium text-gray-800 dark:text-white">{wo.description}</p>
                                         <p className="text-xs text-gray-500">{timeAgo(wo.createdAt)}</p>
                                     </div>
                                     <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span>
                                 </div>
                             ))}
                             {workOrders.length === 0 && <p className="text-gray-500">No recent activity.</p>}
                         </div>
                     </div>
                )}
            </div>
        </div>
    );
};

const Chatbot: React.FC<{ currentUser: User; appData: any; }> = ({ currentUser, appData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{ sender: 'ai', text: 'Hello! I am ServisAI. How can I assist you with your business data today?' }]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newMessages: ChatMessage[] = [...messages, { sender: 'user', text: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            const context = { currentUser, ...appData };
            const aiResponse = await getChatbotResponse(newMessages, context);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I'm having trouble connecting. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-transform transform hover:scale-110 z-50"
                aria-label="Toggle Chatbot"
            >
                {isOpen ? <XIcon className="h-8 w-8" /> : <AiIcon className="h-8 w-8" />}
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b dark:border-gray-700">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">ServisAI Assistant</h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'}`}>
                                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700">
                                    <SpinnerIcon className="h-5 w-5 text-gray-500" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-700 flex items-center space-x-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            placeholder="Ask about your data..."
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-primary-600 text-white rounded-full p-3 disabled:bg-gray-400 dark:disabled:bg-gray-600 hover:bg-primary-700">
                            <SendIcon className="h-5 w-5" />
                        </button>
                    </form>
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
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
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({ name: 'ServisPro Inc.', address: '123 Service St', email: 'contact@servispro.com', phone: '0812-3456-7890', logo: '' });
  const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: null });

  const addNotification = (message: string, link: string) => {
      const newNotif: Notification = {
          id: `notif-${Date.now()}`,
          message,
          timestamp: new Date().toISOString(),
          read: false,
          link
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
  };

  const handleLogin = (user: User) => { setCurrentUser(user); setAuthScreen('login'); };
  const handleLogout = () => { setCurrentUser(null); };
  const handleSignUp = (newUser: User) => { setUsers(prev => [...prev, newUser]); setAuthScreen('login'); };
  const handleSaveCustomer = (c: Customer) => { setCustomers(prev => { const ex = prev.find(x => x.id === c.id); return ex ? prev.map(x => x.id === c.id ? c : x) : [...prev, c]; }); setModalState({type:null, data:null}); };
  const handleSaveClient = (c: Client) => { setClients(prev => { const ex = prev.find(x => x.id === c.id); return ex ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev]; }); setModalState({type:null, data:null}); };
  
  const handleSaveEmployee = (user: User) => {
    const exists = users.some(u => u.id === user.id);
    if (exists) {
        setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    } else {
        setUsers(prev => [...prev, user]);
    }
    setModalState({type: null, data: null});
  };

  // Work Order Handlers
  const handleCreateWorkOrder = (data: Partial<WorkOrder>) => {
      const serviceFee = data.initialServiceFee || 0;
      const newOrder: WorkOrder = {
          id: `WO-${Date.now()}`,
          customer: data.customer!,
          description: data.description!,
          status: WorkOrderStatus.PENDING,
          technicianId: null,
          createdAt: new Date().toISOString(),
          usedParts: [],
          initialServiceFee: serviceFee,
          additionalCosts: [],
          totalCost: serviceFee,
      };
      setWorkOrders(prev => [newOrder, ...prev]);
      addNotification(`New Work Order Created: ${newOrder.id}`, '/work-orders');
      setModalState({ type: null, data: null });
  };

  const handleAssignTechnician = (techId: string) => {
      if (modalState.data) {
          setWorkOrders(prev => prev.map(wo => wo.id === modalState.data.id ? { ...wo, technicianId: techId, status: WorkOrderStatus.IN_PROGRESS } : wo));
          const tech = users.find(u => u.id === techId);
          addNotification(`Work Order ${modalState.data.id} assigned to ${tech?.name}`, '/work-orders');
      }
      setModalState({ type: null, data: null });
  };
  
  const handleClaimWorkOrder = (wo: WorkOrder) => {
      if (!currentUser || currentUser.role !== UserRole.TECHNICIAN) return;
      setWorkOrders(prev => 
          prev.map(order => 
              order.id === wo.id 
                  ? { ...order, technicianId: currentUser.id, status: WorkOrderStatus.IN_PROGRESS } 
                  : order
          )
      );
      setUsers(prev => prev.map(u => u.id === currentUser.id ? {...u, status: TechnicianStatus.ON_JOB} : u));
      addNotification(`${currentUser.name} has claimed Work Order ${wo.id}`, '/work-orders');
  };

  const handleCompleteWorkOrder = (wo: WorkOrder) => {
      const updatedWO = { ...wo, status: WorkOrderStatus.COMPLETED, completedAt: new Date().toISOString() };
      setWorkOrders(prev => prev.map(w => w.id === wo.id ? updatedWO : w));
      
      if (updatedWO.totalCost > 0) {
        const newTransaction: Transaction = {
            id: `trn-wo-${wo.id}`,
            date: new Date().toISOString().split('T')[0],
            description: `Service Income from WO #${wo.id}`,
            type: 'income',
            amount: updatedWO.totalCost,
            category: TransactionCategory.SERVICE_INCOME,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            workOrderId: wo.id,
        };
        setTransactions(prev => [newTransaction, ...prev]);
      }
      if(wo.technicianId) {
          setUsers(prev => prev.map(u => u.id === wo.technicianId ? {...u, status: TechnicianStatus.AVAILABLE} : u));
      }
      addNotification(`Work Order ${wo.id} marked as Completed`, '/work-orders');
  };
  
  const handleUpdateWorkOrderParts = (parts: { partId: string; quantity: number }[]) => {
    const workOrder = modalState.data as WorkOrder;
    if (!workOrder) return;

    let costOfNewParts = 0;
    const newUsedParts = [...workOrder.usedParts];
    const updatedSpareParts = [...spareParts];

    let allPartsValid = true;
    parts.forEach(({ partId, quantity }) => {
        const partInfo = updatedSpareParts.find(p => p.id === partId);
        if (!partInfo || partInfo.stock < quantity) {
            alert(`Not enough stock for ${partInfo?.name}. Available: ${partInfo?.stock}`);
            allPartsValid = false;
            return;
        }

        costOfNewParts += partInfo.sellingPrice * quantity;
        
        const partIndex = updatedSpareParts.findIndex(p => p.id === partId);
        updatedSpareParts[partIndex] = { ...updatedSpareParts[partIndex], stock: updatedSpareParts[partIndex].stock - quantity };

        const existingPartIndex = newUsedParts.findIndex(p => p.partId === partId);
        if (existingPartIndex > -1) {
            newUsedParts[existingPartIndex].quantity += quantity;
        } else {
            newUsedParts.push({ partId, quantity, sellingPrice: partInfo.sellingPrice });
        }
    });
    
    if (allPartsValid) {
      setSpareParts(updatedSpareParts);
      setWorkOrders(prev => prev.map(wo => wo.id === workOrder.id ? {
          ...wo,
          usedParts: newUsedParts,
          totalCost: wo.totalCost + costOfNewParts
      } : wo));
      setModalState({ type: null, data: null });
    }
  };

  const handleSaveAdditionalCost = (cost: { description: string; amount: number }) => {
    const workOrder = modalState.data as WorkOrder;
    if (!workOrder) return;

    setWorkOrders(prev => prev.map(wo => {
        if (wo.id === workOrder.id) {
            const newAdditionalCosts = [...wo.additionalCosts, cost];
            const newTotalCost = wo.totalCost + cost.amount;
            return {
                ...wo,
                additionalCosts: newAdditionalCosts,
                totalCost: newTotalCost,
            };
        }
        return wo;
    }));
    setModalState({ type: null, data: null });
  };

  const handleUploadProof = (workOrderId: string, proofType: 'work' | 'payment') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = readerEvent => {
                const url = readerEvent.target?.result as string;
                setWorkOrders(prev => prev.map(wo => wo.id === workOrderId ? {
                    ...wo,
                    [proofType === 'work' ? 'workProofUrl' : 'paymentProofUrl']: url
                } : wo));
                alert(`${proofType.charAt(0).toUpperCase() + proofType.slice(1)} proof uploaded.`);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
  };
  
  const handlePrintWorkOrder = (workOrder: WorkOrder, action: 'print' | 'download' = 'download') => {
    const doc = new jsPDF();
    generatePdfHeader(doc, companyProfile);

    doc.setFontSize(16);
    doc.text(`Work Order: #${workOrder.id}`, 14, 60);
    
    autoTable(doc, {
        startY: 65,
        head: [['Customer Details', 'Job Information']],
        body: [[
            `Name: ${workOrder.customer.name}\nPhone: ${workOrder.customer.phone}\nAddress: ${workOrder.customer.address}`,
            `Created: ${new Date(workOrder.createdAt).toLocaleDateString()}\nCompleted: ${workOrder.completedAt ? new Date(workOrder.completedAt).toLocaleDateString() : 'N/A'}\nStatus: ${workOrder.status}`
        ]],
        theme: 'striped',
    });
    
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Deskripsi Pekerjaan']],
        body: [[workOrder.description]],
    });
    
    const costBody: (string | number)[][] = [];
    costBody.push(['Biaya Jasa Awal', formatIDR(workOrder.initialServiceFee)]);

    if (workOrder.additionalCosts.length > 0) {
        costBody.push(['Biaya Tambahan:', '']);
        workOrder.additionalCosts.forEach(cost => {
            costBody.push([`  - ${cost.description}`, formatIDR(cost.amount)]);
        });
    }

    if (workOrder.usedParts.length > 0) {
        costBody.push(['Suku Cadang:', '']);
        workOrder.usedParts.forEach(item => {
            const part = spareParts.find(p => p.id === item.partId);
            costBody.push([`  - ${part?.name || 'Unknown'} (x${item.quantity})`, formatIDR(item.quantity * item.sellingPrice)]);
        });
    }

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Rincian Biaya', 'Jumlah']],
        body: costBody,
        theme: 'grid',
        columnStyles: { 1: { halign: 'right' } },
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Tagihan:', 14, (doc as any).lastAutoTable.finalY + 15);
    doc.text(formatIDR(workOrder.totalCost), 200, (doc as any).lastAutoTable.finalY + 15, { align: 'right' });
    
    if (action === 'print') {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    } else {
        doc.save(`WO-${workOrder.id}.pdf`);
    }
  };

  const handleSaveTransaction = (transaction: Transaction) => {
      const exists = transactions.some(t => t.id === transaction.id);
      if (exists) {
          setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
      } else {
          setTransactions(prev => [transaction, ...prev]);
      }
      setModalState({ type: null, data: null });
  };

  const handleImportSpareParts = (parsedParts: any[]) => {
       const newParts: SparePart[] = [];
       alert(`Import logic would run here for ${parsedParts.length} items.`);
       setModalState({type:null, data:null});
  };
  const handleDeleteSparePart = (id: string) => { setSpareParts(prev => prev.filter(p => p.id !== id)); setModalState({ type: null, data: null }); };
  const handleBulkDeleteSpareParts = (ids: string[]) => { setSpareParts(prev => prev.filter(p => !ids.includes(p.id))); };
  const handleSaveSparePart = (part: SparePart) => {
      const exists = spareParts.some(p => p.id === part.id);
      if (exists) { setSpareParts(prev => prev.map(p => p.id === part.id ? part : p)); } 
      else { setSpareParts(prev => [part, ...prev]); }
      setModalState({ type: null, data: null });
  };
  const handleSaveSupplier = (s: Supplier) => { setSuppliers(prev => { const ex = prev.find(x => x.id === s.id); return ex ? prev.map(x => x.id === s.id ? s : x) : [s, ...prev]; }); setModalState({type:null, data:null}); };

  const handleClockIn = () => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = attendance.find(a => a.userId === currentUser.id && a.date === today && !a.clockOutTime);
    if (existingRecord) return;

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId: currentUser.id,
      date: today,
      clockInTime: new Date().toISOString(),
    };
    setAttendance(prev => [...prev, newRecord]);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, status: TechnicianStatus.AVAILABLE } : u));
    addNotification('You have successfully clocked in.', '/');
  };

  const handleClockOut = () => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const record = attendance.find(a => a.userId === currentUser.id && a.date === today && !a.clockOutTime);
    if (!record) return;

    setAttendance(prev => prev.map(a => a.id === record.id ? { ...a, clockOutTime: new Date().toISOString() } : a));
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, status: TechnicianStatus.OFFLINE } : u));
    addNotification('You have successfully clocked out.', '/');
  };

  if (!currentUser) {
    if (authScreen === 'signup') return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthScreen('login')} t={t} />;
    return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthScreen('signup')} users={users} t={t} />;
  }

  const Sidebar: React.FC = () => {
    const location = useLocation();
    const navItems = [
        { path: '/', labelKey: 'sidebar.dashboard', icon: DashboardIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-blue-500' },
        { path: '/customers', labelKey: 'sidebar.customers', icon: CustomerIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-green-500' },
        { path: '/work-orders', labelKey: 'sidebar.workOrders', icon: WorkOrderIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-orange-500' },
        { path: '/my-reimbursements', labelKey: 'sidebar.myReimbursements', icon: ReceiptIcon, roles: [UserRole.TECHNICIAN], color: 'text-cyan-500' },
        { path: '/reimbursements', labelKey: 'sidebar.reimbursement', icon: ReceiptIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-cyan-500' },
        { path: '/spare-parts', labelKey: 'sidebar.spareParts', icon: SparePartIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-indigo-500' },
        { path: '/finance', labelKey: 'sidebar.finance', icon: FinanceIcon, roles: [UserRole.ADMINISTRATOR], color: 'text-purple-500' },
        { path: '/employees', labelKey: 'sidebar.employees', icon: UsersIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN], color: 'text-teal-500' },
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
  
  const hasClockedInToday = attendance.some(a => a.userId === currentUser?.id && a.date === new Date().toISOString().split('T')[0] && !a.clockOutTime);

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
                        {currentUser.role === UserRole.TECHNICIAN && (
                            !hasClockedInToday ? (
                                <button onClick={handleClockIn} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">{t('pages.employees.clockIn')}</button>
                            ) : (
                                <button onClick={handleClockOut} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('pages.employees.clockOut')}</button>
                            )
                        )}
                        <div className="relative">
                            <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                <BellIcon className="h-6 w-6" />
                                {notifications.some(n => !n.read) && <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full"></span>}
                            </button>
                            {isNotificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-20">
                                    <div className="p-3 font-semibold text-sm border-b dark:border-gray-700">{t('pages.notifications.title')}</div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? notifications.map(notif => (
                                            <Link to={notif.link} key={notif.id} onClick={() => setIsNotificationsOpen(false)} className={`block p-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                                <p className="text-sm">{notif.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{timeAgo(notif.timestamp)}</p>
                                            </Link>
                                        )) : <p className="p-4 text-sm text-gray-500">{t('pages.notifications.empty')}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="font-medium text-gray-700 dark:text-white">{formatUserName(currentUser.name)}</span>
                        <div className="h-8 w-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-200 font-bold">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    <Routes>
                        <Route path="/" element={<Dashboard workOrders={workOrders} customers={customers} users={users} currentUser={currentUser} transactions={transactions} t={t} />} />
                        <Route path="/work-orders" element={<WorkOrders user={currentUser} workOrders={workOrders} users={users} onCreate={() => setModalState({ type: 'create_wo', data: null })} onAssign={(wo) => setModalState({ type: 'assign_tech', data: wo })} onClaim={handleClaimWorkOrder} onAddPart={(wo) => setModalState({ type: 'add_part_wo', data: wo })} onAddCost={(wo) => setModalState({ type: 'add_additional_cost', data: wo })} onComplete={handleCompleteWorkOrder} t={t} />} />
                        <Route path="/work-orders/:id" element={<WorkOrderDetailPage workOrders={workOrders} users={users} spareParts={spareParts} onAddPart={(wo) => setModalState({ type: 'add_part_wo', data: wo })} onAddCost={(wo) => setModalState({ type: 'add_additional_cost', data: wo })} onComplete={handleCompleteWorkOrder} t={t} />} />
                        <Route path="/customers" element={<CustomersAndClientsPage customers={customers} clients={clients} onAddCustomer={() => setModalState({ type: 'add_customer', data: null })} onEditCustomer={(c) => setModalState({ type: 'edit_customer', data: c })} onAddClient={() => setModalState({ type: 'add_client', data: null })} onEditClient={(c) => setModalState({ type: 'edit_client', data: c })} t={t} />} />
                        <Route path="/employees" element={<EmployeesPage users={users} workOrders={workOrders} attendance={attendance} onAddEmployee={() => setModalState({ type: 'add_employee', data: null })} t={t} />} />
                        <Route path="/employees/:employeeId" element={<TechnicianProfilePage users={users} workOrders={workOrders} onEdit={(user) => setModalState({ type: 'edit_employee', data: user })} t={t} />} />
                        <Route path="/finance" element={<FinancePage transactions={transactions} onAddTransaction={() => setModalState({ type: 'add_transaction', data: null })} t={t} />} />
                        <Route path="/settings" element={<SettingsPage customers={customers} workOrders={workOrders} users={users} profile={companyProfile} onProfileSave={setCompanyProfile} t={t} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} spareParts={spareParts} suppliers={suppliers} clients={clients} invoices={invoices} transactions={transactions} contracts={contracts} />} />
                        <Route path="/spare-parts" element={<SpareParts spareParts={spareParts} suppliers={suppliers} onAddPart={() => setModalState({ type: 'add_spare_part', data: null })} onEditPart={(sp) => setModalState({ type: 'edit_spare_part', data: sp })} onAddSupplier={() => setModalState({ type: 'add_supplier', data: null })} onEditSupplier={(s) => setModalState({ type: 'edit_supplier', data: s })} onImport={handleImportSpareParts} onDelete={handleDeleteSparePart} onBulkDelete={handleBulkDeleteSpareParts} t={t} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
            
            <Chatbot currentUser={currentUser} appData={{ customers, workOrders, spareParts, invoices, users, transactions }} />

            {modalState.type === 'create_wo' && <CreateWorkOrderModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleCreateWorkOrder} customers={customers} t={t} />}
            {modalState.type === 'assign_tech' && <AssignTechnicianModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleAssignTechnician} technicians={users.filter(u => u.role === UserRole.TECHNICIAN)} t={t} />}
            {modalState.type === 'add_part_wo' && <AddPartToWorkOrderModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleUpdateWorkOrderParts} availableParts={spareParts} t={t} />}
            {modalState.type === 'add_additional_cost' && <AddAdditionalCostModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveAdditionalCost} t={t} />}
            {modalState.type === 'add_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} part={null} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            {modalState.type === 'edit_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} onDelete={handleDeleteSparePart} part={modalState.data} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            {modalState.type === 'add_transaction' && <AddEditTransactionModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveTransaction} transaction={null} t={t} />}
            {modalState.type === 'add_employee' && <AddEditEmployeeModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveEmployee} user={null} t={t} />}
            {modalState.type === 'edit_employee' && <AddEditEmployeeModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveEmployee} user={modalState.data} t={t} />}
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
