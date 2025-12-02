
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, Transaction, Notification, ChatMessage, CompanyProfile, TechnicianStatus, TransactionCategory, PaymentMethod, ServiceContract, ContractStatus, Supplier, Client, AttendanceRecord, CustomerEditRequest } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, ReceiptIcon, MapPinIcon, MoreVerticalIcon, TruckIcon, BriefcaseIcon, TrashIcon, ArrowLeftIcon, WhatsAppIcon, MailIcon } from './components/icons';
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
      reject: 'Reject',
    },
    status: {
      [WorkOrderStatus.PENDING]: 'Pending', [WorkOrderStatus.IN_PROGRESS]: 'In Progress', [WorkOrderStatus.COMPLETED]: 'Completed',
      [WorkOrderStatus.CANCELLED]: 'Cancelled', 'Paid': 'Paid', 'Unpaid': 'Unpaid',
      [TechnicianStatus.AVAILABLE]: 'Available', [TechnicianStatus.ON_JOB]: 'On Job', [TechnicianStatus.ON_BREAK]: 'On Break',
      [TechnicianStatus.OFFLINE]: 'Offline', [ContractStatus.ACTIVE]: 'Active', [ContractStatus.EXPIRED]: 'Expired',
      'Pending Approval': 'Pending Approval', 'Approved': 'Approved',
      pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    },
    modals: {
        addCustomerTitle: 'Add New Customer', editCustomerTitle: 'Edit Customer', requestChangeTitle: 'Request Customer Data Change',
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
        requestReimbursementTitle: 'Request Reimbursement',
        attachmentViewerTitle: 'Attachment Viewer',
    },
    pages: {
        notifications: { title: 'Notifications', markAllRead: 'Mark all as read', empty: 'You have no notifications.' },
        reimbursement: { title: 'Reimbursement Requests', requestedBy: 'Requested By', empty: 'No reimbursement requests found.' },
        myReimbursements: { title: 'My Reimbursement History', workOrderId: 'Work Order ID', empty: 'You have not requested any reimbursements.'},
        customers: { title: 'Customers & Clients', customerList: 'Customer List', clientList: 'Client List', clientsTab: 'Clients', customersTab: 'Customers', importCustomers: 'Import Customers' },
        customerEditRequests: { title: 'Customer Edit Requests', requestedBy: 'Requested By', requestedAt: 'Requested At', noRequests: 'No pending requests.' },
        customerDetail: { back: 'Back to all customers', details: 'Customer Details', contracts: 'Service Contracts', history: 'Service History', noContracts: 'No contracts found.', noHistory: 'No service history found.' },
        workOrders: { title: 'Work Order Management', myTitle: 'Work Orders', myFullName: '{name}', allOrders: 'All Orders', myAssigned: 'My Assigned', available: 'Available', technician: 'Technician', unassigned: 'Unassigned', claimJob: 'Claim Job', addPart: 'Add Part', addCost: 'Add Cost', actions: 'Actions', uploadWorkProof: 'Upload Work Proof', uploadPaymentProof: 'Upload Payment Proof', generatePDF: 'Generate PDF', printWO: 'Print Work Order', completeWork: 'Complete Work', requestReimbursement: 'Request Reimbursement' },
        spareParts: { title: 'Spare Part Management', inventory: 'Spare Part Inventory', suppliers: 'Suppliers', partName: 'Part Name', stock: 'Stock', location: 'Location', importParts: 'Import CSV', deleteSelected: 'Delete Selected', downloadTemplate: 'Download Template' },
        finance: { title: 'Finance', generateReport: 'Generate Financial Report', totalIncome: 'Total Income', totalExpense: 'Total Expense', profitLoss: 'Profit / Loss', invoices: 'Invoices', allTransactions: 'All Transactions', balanceSheet: 'Balance Sheet', profitAndLoss: 'Profit & Loss', assets: 'Assets', cash: 'Cash', inventoryValue: 'Inventory Value', totalAssets: 'Total Assets', liabilitiesAndEquity: 'Liabilities & Equity', liabilities: 'Liabilities', opCosts: 'Operational Costs', equity: 'Equity', retainedEarnings: 'Retained Earnings (Profit)', addTransaction: 'Add Transaction', clientReport: 'Client Report' },
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
      reject: 'Tolak',
    },
    status: {
      [WorkOrderStatus.PENDING]: 'Tertunda', [WorkOrderStatus.IN_PROGRESS]: 'Sedang Dikerjakan', [WorkOrderStatus.COMPLETED]: 'Selesai',
      [WorkOrderStatus.CANCELLED]: 'Dibatalkan', 'Paid': 'Lunas', 'Unpaid': 'Belum Lunas',
      [TechnicianStatus.AVAILABLE]: 'Tersedia', [TechnicianStatus.ON_JOB]: 'Bertugas', [TechnicianStatus.ON_BREAK]: 'Istirahat',
      [TechnicianStatus.OFFLINE]: 'Offline', [ContractStatus.ACTIVE]: 'Aktif', [ContractStatus.EXPIRED]: 'Kadaluarsa',
      'Pending Approval': 'Menunggu Persetujuan', 'Approved': 'Disetujui',
      pending: 'Tertunda', approved: 'Disetujui', rejected: 'Ditolak',
    },
    modals: {
        addCustomerTitle: 'Tambah Pelanggan Baru', editCustomerTitle: 'Ubah Pelanggan', requestChangeTitle: 'Ajukan Perubahan Data Pelanggan',
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
        requestReimbursementTitle: 'Ajukan Reimbursement',
        attachmentViewerTitle: 'Tampilan Lampiran',
    },
    pages: {
        notifications: { title: 'Notifikasi', markAllRead: 'Tandai semua dibaca', empty: 'Anda tidak memiliki notifikasi.' },
        reimbursement: { title: 'Permintaan Reimbursement', requestedBy: 'Diajukan Oleh', empty: 'Tidak ada permintaan reimbursement.' },
        myReimbursements: { title: 'Riwayat Reimbursement Saya', workOrderId: 'ID Perintah Kerja', empty: 'Anda belum mengajukan reimbursement.' },
        customers: { title: 'Pelanggan & Klien', customerList: 'Daftar Pelanggan', clientList: 'Daftar Klien', clientsTab: 'Klien', customersTab: 'Pelanggan', importCustomers: 'Import Pelanggan' },
        customerEditRequests: { title: 'Permintaan Ubah Data Pelanggan', requestedBy: 'Diajukan Oleh', requestedAt: 'Waktu Pengajuan', noRequests: 'Tidak ada permintaan tertunda.' },
        customerDetail: { back: 'Kembali ke semua pelanggan', details: 'Detail Pelanggan', contracts: 'Kontrak Servis', history: 'Riwayat Servis', noContracts: 'Tidak ada kontrak.', noHistory: 'Tidak ada riwayat servis.' },
        workOrders: { title: 'Manajemen Perintah Kerja', myTitle: 'Perintah Kerja', myFullName: '{name}', allOrders: 'Semua SPK', myAssigned: 'Tugas Saya', available: 'SPK Tersedia', technician: 'Teknisi', unassigned: 'Belum Ditugaskan', claimJob: 'Ambil Pekerjaan', addPart: 'Tambah Part', addCost: 'Tambah Biaya', actions: 'Aksi', uploadWorkProof: 'Unggah Bukti Kerja', uploadPaymentProof: 'Unggah Bukti Bayar', generatePDF: 'Buat PDF', printWO: 'Cetak SPK', completeWork: 'Selesaikan Pekerjaan', requestReimbursement: 'Ajukan Reimbursement' },
        spareParts: { title: 'Manajemen Suku Cadang', inventory: 'Inventaris Suku Cadang', suppliers: 'Pemasok', partName: 'Nama Part', stock: 'Stok', location: 'Lokasi', importParts: 'Import CSV', deleteSelected: 'Hapus Terpilih', downloadTemplate: 'Download Template' },
        finance: { title: 'Keuangan', generateReport: 'Buat Laporan Keuangan', totalIncome: 'Total Pendapatan', totalExpense: 'Total Pengeluaran', profitLoss: 'Laba / Rugi', invoices: 'Faktur', allTransactions: 'Semua Transaksi', balanceSheet: 'Neraca', profitAndLoss: 'Laba Rugi', assets: 'Aset', cash: 'Kas', inventoryValue: 'Nilai Persediaan', totalAssets: 'Total Aset', liabilitiesAndEquity: 'Liabilitas & Ekuitas', liabilities: 'Liabilitas', opCosts: 'Biaya Operasional', equity: 'Ekuitas', retainedEarnings: 'Laba Ditahan', addTransaction: 'Tambah Transaksi', clientReport: 'Laporan per Klien' },
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
const INITIAL_CUSTOMER_REQUESTS: CustomerEditRequest[] = [];

// --- UTILITY FUNCTIONS ---
const formatIDR = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const formatUserName = (name?: string | null): string => {
    if (!name || typeof name !== 'string') return '';
    return name.split(' (')[0];
};

const getStatusColor = (status: WorkOrderStatus | 'Paid' | 'Unpaid' | 'Pending Approval' | 'Approved' | ContractStatus | TechnicianStatus | 'pending' | 'approved' | 'rejected') => {
  switch (status) {
    case WorkOrderStatus.PENDING: case 'Unpaid': case 'Pending Approval': case ContractStatus.EXPIRED: case TechnicianStatus.ON_BREAK: case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case WorkOrderStatus.IN_PROGRESS: case TechnicianStatus.ON_JOB: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'; // ON_JOB is green
    case WorkOrderStatus.COMPLETED: case 'Paid': case 'approved': case ContractStatus.ACTIVE: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case TechnicianStatus.AVAILABLE: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'; // AVAILABLE is blue
    case WorkOrderStatus.CANCELLED: case ContractStatus.CANCELLED: case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
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
    const user = users.find(u => (u.email?.toLowerCase() === identifier.toLowerCase()));
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
const ReimbursementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (description: string, amount: number, attachment: { name: string; type: string; data: string; }) => void;
    t: Function;
}> = ({ isOpen, onClose, onConfirm, t }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [attachment, setAttachment] = useState<{ name: string; type: string; data: string; } | null>(null);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setAttachment({
                    name: file.name,
                    type: file.type,
                    data: event.target?.result as string,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (!description || !amount || !attachment) {
            setError('All fields including attachment are required.');
            return;
        }
        onConfirm(description, Number(amount), attachment);
        setDescription('');
        setAmount('');
        setAttachment(null);
        setError('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('modals.requestReimbursementTitle')}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.description')}</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.amount')}</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.attachment')} (Struk, etc.)</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 w-full text-sm" />
                    {attachment && <p className="text-xs text-green-600 mt-1">File attached: {attachment.name}</p>}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border">{t('common.cancel')}</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary-600 text-white">{t('common.submit')}</button>
                </div>
            </div>
        </Modal>
    );
};

const AttachmentViewerModal: React.FC<{ isOpen: boolean; onClose: () => void; attachment: { name: string; type: string; data: string; } | null; t: Function; }> = ({ isOpen, onClose, attachment, t }) => {
    if (!attachment) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('modals.attachmentViewerTitle')}: ${attachment.name}`} size="lg">
            <div>
                <img src={attachment.data} alt={attachment.name} className="max-w-full max-h-[70vh] mx-auto" />
            </div>
        </Modal>
    );
};

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
            password: formData.password || user?.password,
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

const AddEditTransactionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (transaction: Transaction) => void; transaction: Transaction | null; clients: Client[]; t: Function; }> = ({ isOpen, onClose, onSave, transaction, clients, t }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'expense' as 'income' | 'expense',
        amount: '',
        category: TransactionCategory.OTHER_EXPENSE,
        paymentMethod: PaymentMethod.CASH,
        clientId: ''
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
                clientId: transaction.clientId || ''
            });
        } else {
             setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                type: 'expense',
                amount: '',
                category: TransactionCategory.OTHER_EXPENSE,
                paymentMethod: PaymentMethod.CASH,
                clientId: ''
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
            clientId: formData.clientId || undefined
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
                 <div>
                    <label className={labelClass}>Client (Optional)</label>
                    <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className={inputClass}>
                        <option value="">-- No Client --</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                </div>
                 <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white">{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};

const AddEditCustomerModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (customer: Customer) => void; 
    customer: Customer | null; 
    clients: Client[]; 
    currentUser: User;
    t: Function; 
}> = ({ isOpen, onClose, onSave, customer, clients, currentUser, t }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', clientId: '' });
    useEffect(() => {
        if (customer) { setFormData({ name: customer.name, email: customer.email, phone: customer.phone, address: customer.address, clientId: customer.clientId || '' }); } 
        else { setFormData({ name: '', email: '', phone: '', address: '', clientId: '' }); }
    }, [customer, isOpen]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...customer, id: customer?.id || `cust-${Date.now()}`, name: formData.name, email: formData.email, phone: formData.phone, address: formData.address, clientId: formData.clientId || undefined }); };
    
    const isTechnician = currentUser.role === UserRole.TECHNICIAN;
    const modalTitle = isTechnician ? t('modals.requestChangeTitle') : (customer ? t('modals.editCustomerTitle') : t('modals.addCustomerTitle'));
    const buttonText = isTechnician ? 'Request Change' : t('common.save');

    const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.email')}</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className={inputClass} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.address')}</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required rows={3} className={inputClass} /></div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client (Optional)</label>
                    <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className={inputClass}>
                        <option value="">-- Individual Customer --</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">{buttonText}</button>
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
const Dashboard: React.FC<{
    workOrders: WorkOrder[];
    customers: Customer[];
    users: User[];
    currentUser: User;
    transactions: Transaction[];
    t: Function;
}> = ({ workOrders, customers, users, currentUser, transactions, t }) => {
    const navigate = useNavigate();
    const technicians = users.filter(u => u.role === UserRole.TECHNICIAN);

    const monthlyRevenue = useMemo(() => 
        transactions.filter(tr => tr.type === 'income' && tr.approved !== false).reduce((sum, tr) => sum + tr.amount, 0),
        [transactions]
    );

    const userWorkOrders = useMemo(() => 
        currentUser.role === UserRole.TECHNICIAN 
            ? workOrders.filter(wo => wo.technicianId === currentUser.id) 
            : workOrders,
        [workOrders, currentUser]
    );

    const pendingWorkOrders = userWorkOrders.filter(wo => wo.status === WorkOrderStatus.PENDING).length;
    const completedWorkOrdersCount = userWorkOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED).length;

    const woStatusData = useMemo(() => {
        const counts = userWorkOrders.reduce((acc, wo) => {
            acc[wo.status] = (acc[wo.status] || 0) + 1;
            return acc;
        }, {} as Record<WorkOrderStatus, number>);

        return [
            { name: t(`status.${WorkOrderStatus.PENDING}`), value: counts[WorkOrderStatus.PENDING] || 0 },
            { name: t(`status.${WorkOrderStatus.IN_PROGRESS}`), value: counts[WorkOrderStatus.IN_PROGRESS] || 0 },
            { name: t(`status.${WorkOrderStatus.COMPLETED}`), value: counts[WorkOrderStatus.COMPLETED] || 0 },
        ];
    }, [userWorkOrders, t]);
    const totalWOs = userWorkOrders.length;
    const completionPercentage = totalWOs > 0 ? Math.round((completedWorkOrdersCount / totalWOs) * 100) : 0;

    const technicianPerformanceData = useMemo(() => {
        return technicians.map(tech => ({
            name: formatUserName(tech.name),
            completed: workOrders.filter(wo => wo.technicianId === tech.id && wo.status === WorkOrderStatus.COMPLETED).length
        }));
    }, [workOrders, technicians]);

    const COLORS = ['#FFBB28', '#3B82F6', '#22C55E'];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard.welcome', { name: formatUserName(currentUser.name) })}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('dashboard.totalCustomers')} value={String(customers.length)} icon={<CustomerIcon />} color="blue" onClick={() => navigate('/customers')} />
                <StatCard title={currentUser.role === UserRole.TECHNICIAN ? "My Pending Jobs" : t('dashboard.pendingWorkOrders')} value={String(pendingWorkOrders)} icon={<WorkOrderIcon />} color="yellow" onClick={() => navigate('/work-orders')} />
                
                {currentUser.role === UserRole.ADMINISTRATOR && (
                     <StatCard title={t('dashboard.monthlyRevenue')} value={formatIDR(monthlyRevenue)} icon={<FinanceIcon />} color="green" onClick={() => navigate('/finance')} />
                )}

                {currentUser.role === UserRole.TECHNICIAN && (
                     <StatCard title="My Completed Jobs" value={String(completedWorkOrdersCount)} icon={<ReceiptIcon />} color="green" />
                )}

                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ADMINISTRATOR) && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md col-span-1">
                        <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('dashboard.technicianStatus')}</h3>
                        <div className="space-y-2 overflow-y-auto h-24">
                            {technicians.map(tech => (
                                <div key={tech.id} className="flex items-center justify-between text-sm">
                                    <span>{tech.name}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${
                                            tech.status === TechnicianStatus.ON_JOB ? 'bg-green-500' :
                                            tech.status === TechnicianStatus.AVAILABLE ? 'bg-blue-500' :
                                            tech.status === TechnicianStatus.ON_BREAK ? 'bg-yellow-500' : 'bg-gray-400'
                                        }`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {(currentUser.role === UserRole.ADMINISTRATOR || currentUser.role === UserRole.ADMIN) && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t('dashboard.workOrderStatus')}</h3>
                        <div className="h-64 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={woStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                        {woStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-gray-800 dark:text-white">{completionPercentage}%</p>
                                    <p className="text-sm text-gray-500">Completed</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t('dashboard.completedByTechnician')}</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={technicianPerformanceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="completed" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
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
    onRequestReimbursement: (wo: WorkOrder) => void;
    t: Function;
}> = ({ user, workOrders, users, onCreate, onAssign, onClaim, onAddPart, onAddCost, onComplete, onRequestReimbursement, t }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(user.role === UserRole.TECHNICIAN ? 'my_assigned' : 'all');
    const [searchTerm, setSearchTerm] = useState('');
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getTechnicianName = (id: string | null) => users.find(u => u.id === id)?.name || <span className="text-gray-400">{t('pages.workOrders.unassigned')}</span>;

    const filteredWorkOrders = useMemo(() => {
        let orders = workOrders;
        if (activeTab === 'my_assigned' && user) {
            orders = workOrders.filter(wo => wo.technicianId === user.id);
        } else if (activeTab === 'available') {
            orders = workOrders.filter(wo => !wo.technicianId && wo.status === WorkOrderStatus.PENDING);
        }
        
        return orders.filter(wo => 
            wo.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [workOrders, activeTab, user, searchTerm]);
    
    const isAdmin = user.role === UserRole.ADMINISTRATOR || user.role === UserRole.ADMIN;
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.workOrders.title')}</h1>
                {isAdmin && (
                    <button onClick={onCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
                        <WorkOrderIcon className="mr-2 h-5 w-5" /> {t('modals.createWorkOrderTitle')}
                    </button>
                )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6">
                        {isAdmin && <button onClick={() => setActiveTab('all')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>{t('pages.workOrders.allOrders')}</button>}
                        {user.role === UserRole.TECHNICIAN && <button onClick={() => setActiveTab('my_assigned')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my_assigned' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>{t('pages.workOrders.myAssigned')}</button>}
                        {user.role === UserRole.TECHNICIAN && <button onClick={() => setActiveTab('available')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'available' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>{t('pages.workOrders.available')}</button>}
                    </nav>
                </div>
                <div className="p-6">
                     <input type="text" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-1/3 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 mb-4" />
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                                <tr>
                                    <th className="px-6 py-3">WO ID</th>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">{t('common.description')}</th>
                                    <th className="px-6 py-3">{t('common.status')}</th>
                                    <th className="px-6 py-3">{t('pages.workOrders.technician')}</th>
                                    <th className="px-6 py-3">{t('common.total')}</th>
                                    <th className="px-6 py-3">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWorkOrders.map(wo => (
                                    <tr key={wo.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-mono text-xs cursor-pointer hover:underline" onClick={() => navigate(`/work-orders/${wo.id}`)}>{wo.id}</td>
                                        <td className="px-6 py-4">{wo.customer.name}</td>
                                        <td className="px-6 py-4 truncate max-w-xs">{wo.description}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span></td>
                                        <td className="px-6 py-4">{getTechnicianName(wo.technicianId)}</td>
                                        <td className="px-6 py-4">{formatIDR(wo.totalCost)}</td>
                                        <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                             {user.role === UserRole.TECHNICIAN && activeTab === 'available' && <button onClick={() => onClaim(wo)} className="text-green-600 hover:underline">{t('pages.workOrders.claimJob')}</button>}
                                             {isAdmin && !wo.technicianId && <button onClick={() => onAssign(wo)} className="text-green-600 hover:underline">Assign</button>}
                                             <div className="relative inline-block" ref={dropdownRef}>
                                                <button onClick={() => setOpenDropdown(openDropdown === wo.id ? null : wo.id)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                                    <MoreVerticalIcon className="h-5 w-5" />
                                                </button>
                                                {openDropdown === wo.id && wo.status === WorkOrderStatus.IN_PROGRESS && wo.technicianId === user.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-10">
                                                        <button onClick={() => { onAddPart(wo); setOpenDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.addPart')}</button>
                                                        <button onClick={() => { onAddCost(wo); setOpenDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.addCost')}</button>
                                                        <button onClick={() => { onRequestReimbursement(wo); setOpenDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.requestReimbursement')}</button>
                                                        <div className="border-t my-1 dark:border-gray-700"></div>
                                                        <button onClick={() => { onComplete(wo); setOpenDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.completeWork')}</button>
                                                    </div>
                                                )}
                                             </div>
                                        </td>
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

const WorkOrderDetailPage: React.FC<{
    workOrders: WorkOrder[];
    users: User[];
    spareParts: SparePart[];
    onAddPart: (wo: WorkOrder) => void;
    onAddCost: (wo: WorkOrder) => void;
    onComplete: (wo: WorkOrder) => void;
    onPrint: (wo: WorkOrder, action: 'print' | 'download') => void;
    onUploadProof: (workOrderId: string, proofType: 'work' | 'payment') => void;
    onRequestReimbursement: (wo: WorkOrder) => void;
    onChat: (wo: WorkOrder) => void;
    onNotify: (wo: WorkOrder) => void;
    t: Function;
}> = ({ workOrders, users, spareParts, onAddPart, onAddCost, onComplete, onPrint, onUploadProof, onRequestReimbursement, onChat, onNotify, t }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const workOrder = workOrders.find(wo => wo.id === id);

    if (!workOrder) {
        return <div className="text-center p-8">Work Order not found.</div>;
    }

    const technician = users.find(u => u.id === workOrder.technicianId);

    return (
        <div className="space-y-6">
            <button onClick={() => navigate('/work-orders')} className="flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <ArrowLeftIcon className="h-4 w-4 mr-2" /> {t('common.back')} to all work orders
            </button>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Work Order #{workOrder.id}</h1>
                        <p className="text-gray-500">{t('common.date')}: {new Date(workOrder.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 text-sm rounded-full font-semibold ${getStatusColor(workOrder.status)}`}>{t(`status.${workOrder.status}`)}</span>
                        <div className="relative group">
                            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                <MoreVerticalIcon className="h-5 w-5"/>
                            </button>
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 hidden group-hover:block z-10">
                                <button onClick={() => onPrint(workOrder, 'download')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.generatePDF')}</button>
                                <button onClick={() => onPrint(workOrder, 'print')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('pages.workOrders.printWO')}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg mb-2">{t('common.description')}</h3>
                            <p className="text-gray-600 dark:text-gray-300">{workOrder.description}</p>
                        </div>
                        <div className="border-t dark:border-gray-700 pt-6">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-lg">Rincian Biaya</h3>
                            </div>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b dark:border-gray-700"><td className="py-2">Biaya Jasa Awal</td><td className="text-right">{formatIDR(workOrder.initialServiceFee)}</td></tr>
                                    {workOrder.usedParts.map((item, i) => {
                                        const part = spareParts.find(p => p.id === item.partId);
                                        return <tr key={`part-${i}`} className="border-b dark:border-gray-700"><td className="py-2">{part?.name} x{item.quantity}</td><td className="text-right">{formatIDR(item.sellingPrice * item.quantity)}</td></tr>
                                    })}
                                    {workOrder.additionalCosts.map((item, i) => (
                                        <tr key={`cost-${i}`} className="border-b dark:border-gray-700"><td className="py-2">{item.description}</td><td className="text-right">{formatIDR(item.amount)}</td></tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-bold"><td className="py-3 text-lg">Total</td><td className="text-right text-lg">{formatIDR(workOrder.totalCost)}</td></tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="flex space-x-2">
                            {workOrder.status !== WorkOrderStatus.COMPLETED && <button onClick={() => onAddPart(workOrder)} className="px-4 py-2 text-sm rounded-lg border">{t('pages.workOrders.addPart')}</button>}
                            {workOrder.status !== WorkOrderStatus.COMPLETED && <button onClick={() => onAddCost(workOrder)} className="px-4 py-2 text-sm rounded-lg border">{t('pages.workOrders.addCost')}</button>}
                            {workOrder.status !== WorkOrderStatus.COMPLETED && <button onClick={() => onRequestReimbursement(workOrder)} className="px-4 py-2 text-sm rounded-lg border">{t('pages.workOrders.requestReimbursement')}</button>}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg mb-2">{t('pages.customers.customersTab')}</h3>
                            <p className="font-bold">{workOrder.customer.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                                <p className="text-sm text-gray-500">{workOrder.customer.phone}</p>
                                <button onClick={() => onChat(workOrder)} className="text-green-500 hover:text-green-600" title="Chat on WhatsApp"><WhatsAppIcon className="h-5 w-5"/></button>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                                <p className="text-sm text-gray-500">{workOrder.customer.email}</p>
                                <button onClick={() => onNotify(workOrder)} className="text-gray-500 hover:text-gray-600" title="Send Email"><MailIcon className="h-5 w-5"/></button>
                            </div>
                             <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workOrder.customer.address)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline mt-1 block">{workOrder.customer.address}</a>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-2">{t('pages.workOrders.technician')}</h3>
                            {technician ? <p>{technician.name}</p> : <p className="text-gray-500">{t('pages.workOrders.unassigned')}</p>}
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg mb-2">Proofs</h3>
                             <div className="space-y-2">
                                <button onClick={() => onUploadProof(workOrder.id, 'work')} className="text-sm text-blue-600 hover:underline w-full text-left">{t('pages.workOrders.uploadWorkProof')}</button>
                                {workOrder.workProofUrl && <a href={workOrder.workProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600">View Work Proof</a>}
                                <button onClick={() => onUploadProof(workOrder.id, 'payment')} className="text-sm text-blue-600 hover:underline w-full text-left">{t('pages.workOrders.uploadPaymentProof')}</button>
                                {workOrder.paymentProofUrl && <a href={workOrder.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600">View Payment Proof</a>}
                            </div>
                        </div>
                        {workOrder.status === WorkOrderStatus.IN_PROGRESS && (
                            <button onClick={() => onComplete(workOrder)} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">{t('pages.workOrders.completeWork')}</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReimbursementPage: React.FC<{
    transactions: Transaction[],
    users: User[],
    onApprove: (transactionId: string) => void,
    onViewAttachment: (attachment: any) => void,
    t: Function
}> = ({ transactions, users, onApprove, onViewAttachment, t }) => {
    const requests = transactions.filter(tr => tr.category === TransactionCategory.REIMBURSEMENT && tr.approved === false);
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.reimbursement.title')}</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">{t('common.date')}</th>
                                <th className="px-6 py-3">{t('pages.reimbursement.requestedBy')}</th>
                                <th className="px-6 py-3">{t('common.description')}</th>
                                <th className="px-6 py-3 text-right">{t('common.amount')}</th>
                                <th className="px-6 py-3">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length > 0 ? requests.map(req => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4">{req.date}</td>
                                    <td className="px-6 py-4">{users.find(u => u.id === req.requestedByUserId)?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4">{req.description} (WO: {req.workOrderId})</td>
                                    <td className="px-6 py-4 text-right">{formatIDR(req.amount)}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        <button onClick={() => onViewAttachment(req.attachment)} className="text-blue-600 hover:underline">{t('common.view')}</button>
                                        <button onClick={() => onApprove(req.id)} className="text-green-600 hover:underline">{t('common.approve')}</button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={5} className="text-center py-4">{t('pages.reimbursement.empty')}</td></tr>}
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
    onViewAttachment: (attachment: any) => void,
    t: Function
}> = ({ transactions, currentUser, onViewAttachment, t }) => {
    const myRequests = transactions.filter(tr => tr.requestedByUserId === currentUser.id && tr.category === TransactionCategory.REIMBURSEMENT);

    return (
        <div className="space-y-6">
             <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.myReimbursements.title')}</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">{t('common.date')}</th>
                                <th className="px-6 py-3">{t('pages.myReimbursements.workOrderId')}</th>
                                <th className="px-6 py-3">{t('common.description')}</th>
                                <th className="px-6 py-3 text-right">{t('common.amount')}</th>
                                <th className="px-6 py-3">{t('common.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myRequests.length > 0 ? myRequests.map(req => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4">{req.date}</td>
                                    <td className="px-6 py-4">{req.workOrderId}</td>
                                    <td className="px-6 py-4">{req.description}</td>
                                    <td className="px-6 py-4 text-right">{formatIDR(req.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(req.approved ? 'approved' : 'pending')}`}>
                                            {t(`status.${req.approved ? 'approved' : 'pending'}`)}
                                        </span>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={5} className="text-center py-4">{t('pages.myReimbursements.empty')}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const EmployeesPage: React.FC<{
    users: User[];
    workOrders: WorkOrder[];
    attendance: AttendanceRecord[];
    onAddEmployee: () => void;
    t: Function;
}> = ({ users, workOrders, attendance, onAddEmployee, t }) => {
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];

    const performanceData = useMemo(() => {
        return users
            .filter(u => u.role === UserRole.TECHNICIAN)
            .map(tech => ({
                id: tech.id,
                name: tech.name,
                completed: workOrders.filter(wo => wo.technicianId === tech.id && wo.status === WorkOrderStatus.COMPLETED).length
            }));
    }, [users, workOrders]);
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.employees.title')}</h1>
                <button onClick={onAddEmployee} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">{t('pages.employees.addEmployee')}</button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">{t('pages.employees.allEmployees')}</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">{t('common.name')}</th>
                                <th className="px-6 py-3">{t('pages.employees.role')}</th>
                                <th className="px-6 py-3">{t('pages.employees.contact')}</th>
                                <th className="px-6 py-3">{t('common.status')} / Attendance</th>
                                <th className="px-6 py-3">{t('pages.employees.monthlyPerformance')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const attendanceRecord = attendance.find(a => a.userId === user.id && a.date === today);
                                const attendanceStatus = attendanceRecord 
                                    ? (attendanceRecord.clockOutTime ? t('pages.employees.clockedOut') : `${t('pages.employees.clockedInAt', { time: new Date(attendanceRecord.clockInTime).toLocaleTimeString() })}`)
                                    : t('pages.employees.absent');
                                
                                return (
                                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white hover:underline cursor-pointer" onClick={() => navigate(`/employees/${user.id}`)}>{user.name}</td>
                                        <td className="px-6 py-4">{user.role}</td>
                                        <td className="px-6 py-4">{user.email}<br/>{user.phone}</td>
                                        <td className="px-6 py-4">
                                            {user.role === UserRole.TECHNICIAN ? (
                                                <>
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status || TechnicianStatus.OFFLINE)}`}>{t(`status.${user.status || TechnicianStatus.OFFLINE}`)}</span>
                                                    <div className="text-xs mt-1 text-gray-500">{attendanceStatus}</div>
                                                </>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">{performanceData.find(p => p.id === user.id)?.completed || 0}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TechnicianProfilePage: React.FC<{
    users: User[];
    workOrders: WorkOrder[];
    onEdit: (user: User) => void;
    t: Function;
}> = ({ users, workOrders, onEdit, t }) => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const user = users.find(u => u.id === employeeId);
    
    const recentWorkOrders = useMemo(() => {
        return workOrders.filter(wo => wo.technicianId === employeeId).slice(0, 10);
    }, [workOrders, employeeId]);
    
    if (!user) {
        return <div>Employee not found</div>;
    }

    return (
        <div className="space-y-6">
             <button onClick={() => navigate('/employees')} className="flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <ArrowLeftIcon className="h-4 w-4 mr-2" /> {t('technicianProfile.back')}
            </button>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h1>
                        <p className="text-gray-500">{user.role}</p>
                    </div>
                    <button onClick={() => onEdit(user)} className="px-4 py-2 text-sm rounded-lg border">{t('technicianProfile.editEmployee')}</button>
                </div>
                 <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">{t('technicianProfile.personalInfo')}</h3>
                         <div className="space-y-2 text-sm">
                            <p><strong>{t('common.email')}:</strong> {user.email || '-'}</p>
                            <p><strong>{t('common.phone')}:</strong> {user.phone || '-'}</p>
                            <p><strong>{t('common.status')}:</strong> <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status || TechnicianStatus.OFFLINE)}`}>{t(`status.${user.status || TechnicianStatus.OFFLINE}`)}</span></p>
                         </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-2">{t('technicianProfile.recentActivity')}</h3>
                        <ul className="space-y-2 text-sm">
                            {recentWorkOrders.length > 0 ? recentWorkOrders.map(wo => (
                                <li key={wo.id} className="flex justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <Link to={`/work-orders/${wo.id}`} className="hover:underline">{wo.id}: {wo.description}</Link>
                                    <span className={`text-xs ${getStatusColor(wo.status)} px-2 py-0.5 rounded-full`}>{t(`status.${wo.status}`)}</span>
                                </li>
                            )) : <p className="text-gray-500">No recent activity.</p>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FinancePage: React.FC<{
    transactions: Transaction[],
    spareParts: SparePart[],
    onAddTransaction: () => void,
    onGenerateReport: () => void,
    t: Function
}> = ({ transactions, spareParts, onAddTransaction, onGenerateReport, t }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('transactions');

    const { totalIncome, totalExpense, profitLoss } = useMemo(() => {
        const approvedTransactions = transactions.filter(t => t.approved !== false);
        const income = approvedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = approvedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { totalIncome: income, totalExpense: expense, profitLoss: income - expense };
    }, [transactions]);

    const inventoryValue = useMemo(() => 
        spareParts.reduce((sum, part) => sum + (part.stock * (part.purchasePrice || 0)), 0),
        [spareParts]
    );

    const totalAssets = profitLoss + inventoryValue;

    const renderTransactions = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                    <tr>
                        <th className="px-6 py-3">{t('common.date')}</th>
                        <th className="px-6 py-3">{t('common.description')}</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">{t('common.category')}</th>
                        <th className="px-6 py-3 text-right">{t('common.amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.filter(t=> t.approved !== false).map(tr => (
                        <tr key={tr.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                            <td className="px-6 py-4">{tr.date}</td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tr.description}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${tr.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{tr.type}</span>
                            </td>
                            <td className="px-6 py-4">{tr.category}</td>
                            <td className={`px-6 py-4 text-right font-semibold ${tr.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatIDR(tr.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    const renderProfitLoss = () => (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex justify-between py-2 border-b dark:border-gray-700"><span className="font-medium">Total Pendapatan</span> <span>{formatIDR(totalIncome)}</span></div>
        <div className="flex justify-between py-2 border-b dark:border-gray-700"><span className="font-medium">Total Pengeluaran</span> <span>{formatIDR(totalExpense)}</span></div>
        <div className="flex justify-between py-3 border-t-2 dark:border-gray-600 mt-4"><span className="font-bold text-lg">Laba / Rugi Bersih</span> <span className="font-bold text-lg">{formatIDR(profitLoss)}</span></div>
      </div>
    );

    const renderBalanceSheet = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-2 dark:border-gray-700">{t('pages.finance.assets')}</h3>
          <div className="flex justify-between py-2 border-b dark:border-gray-700"><span>{t('pages.finance.cash')} ({t('pages.finance.retainedEarnings')})</span> <span>{formatIDR(profitLoss)}</span></div>
          <div className="flex justify-between py-2 border-b dark:border-gray-700"><span>{t('pages.finance.inventoryValue')}</span> <span>{formatIDR(inventoryValue)}</span></div>
          <div className="flex justify-between py-3 border-t-2 dark:border-gray-600 mt-4"><span className="font-bold text-lg">{t('pages.finance.totalAssets')}</span> <span className="font-bold text-lg">{formatIDR(totalAssets)}</span></div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-2 dark:border-gray-700">{t('pages.finance.liabilitiesAndEquity')}</h3>
          <div className="flex justify-between py-2 border-b dark:border-gray-700"><span>{t('pages.finance.equity')} ({t('pages.finance.retainedEarnings')})</span> <span>{formatIDR(profitLoss)}</span></div>
          <div className="flex justify-between py-3 border-t-2 dark:border-gray-600 mt-4"><span className="font-bold text-lg">Total Liabilitas & Ekuitas</span> <span className="font-bold text-lg">{formatIDR(profitLoss)}</span></div>
        </div>
      </div>
    );

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.finance.title')}</h1>
                <div className="flex space-x-2">
                    <button onClick={onGenerateReport} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center">{t('pages.finance.generateReport')}</button>
                    <button onClick={() => navigate('/finance/client-report')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"><UsersIcon className="mr-2 h-5 w-5" /> {t('pages.finance.clientReport')}</button>
                    <button onClick={onAddTransaction} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"><FinanceIcon className="mr-2 h-5 w-5" /> {t('pages.finance.addTransaction')}</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t('pages.finance.totalIncome')} value={formatIDR(totalIncome)} icon={<FinanceIcon />} color="green" />
                <StatCard title={t('pages.finance.totalExpense')} value={formatIDR(totalExpense)} icon={<FinanceIcon />} color="red" />
                <StatCard title={t('pages.finance.profitLoss')} value={formatIDR(profitLoss)} icon={<FinanceIcon />} color={profitLoss >= 0 ? 'blue' : 'yellow'} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <button onClick={() => setActiveTab('transactions')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'transactions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>{t('pages.finance.allTransactions')}</button>
                        <button onClick={() => setActiveTab('profit_loss')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profit_loss' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>{t('pages.finance.profitAndLoss')}</button>
                        <button onClick={() => setActiveTab('balance_sheet')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'balance_sheet' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>{t('pages.finance.balanceSheet')}</button>
                    </nav>
                </div>
                 <div className="p-6">
                    {activeTab === 'transactions' && renderTransactions()}
                    {activeTab === 'profit_loss' && renderProfitLoss()}
                    {activeTab === 'balance_sheet' && renderBalanceSheet()}
                 </div>
            </div>
        </div>
    );
};


const ClientFinancePage: React.FC<{
    clients: Client[];
    customers: Customer[];
    workOrders: WorkOrder[];
    transactions: Transaction[];
    t: Function;
}> = ({ clients, customers, workOrders, transactions, t }) => {
    const navigate = useNavigate();

    const clientReport = useMemo(() => {
        return clients.map(client => {
            const clientCustomers = customers.filter(c => c.clientId === client.id).map(c => c.id);
            
            const clientIncomeTransactions = transactions.filter(t => t.type === 'income' && t.approved !== false && (
                (t.workOrderId && clientCustomers.includes(workOrders.find(wo => wo.id === t.workOrderId)?.customer.id || '')) ||
                t.clientId === client.id
            ));
            
            const clientExpenseTransactions = transactions.filter(t => t.type === 'expense' && t.clientId === client.id && t.approved !== false);

            const totalRevenue = clientIncomeTransactions.reduce((sum, t) => sum + t.amount, 0);
            const totalCost = clientExpenseTransactions.reduce((sum, t) => sum + t.amount, 0);

            return {
                ...client,
                totalRevenue,
                totalCost,
                netProfit: totalRevenue - totalCost
            };
        });
    }, [clients, customers, transactions, workOrders]);

    return (
        <div className="space-y-6">
            <button onClick={() => navigate('/finance')} className="flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                <ArrowLeftIcon className="h-4 w-4 mr-2" /> Back to Finance
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Client Financial Report</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Client Name</th>
                            <th className="px-6 py-3 text-right">Total Revenue</th>
                            <th className="px-6 py-3 text-right">Total Direct Costs</th>
                            <th className="px-6 py-3 text-right">Net Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientReport.map(report => (
                             <tr key={report.id} className="bg-white border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{report.name}</td>
                                <td className="px-6 py-4 text-right font-semibold text-green-600">{formatIDR(report.totalRevenue)}</td>
                                <td className="px-6 py-4 text-right font-semibold text-red-600">{formatIDR(report.totalCost)}</td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600">{formatIDR(report.netProfit)}</td>
                             </tr>
                        ))}
                    </tbody>
                </table>
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
    currentUser: User;
    t: Function;
}> = ({ customers, clients, onAddCustomer, onEditCustomer, onAddClient, onEditClient, currentUser, t }) => {
    const [activeTab, setActiveTab] = useState<'customers' | 'clients'>('customers');
    const [searchTerm, setSearchTerm] = useState('');

    const isAdmin = currentUser.role === UserRole.ADMINISTRATOR || currentUser.role === UserRole.ADMIN;

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
                        {isAdmin && (
                            <button
                                onClick={activeTab === 'customers' ? onAddCustomer : onAddClient}
                                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                            >
                                {t('common.add')} {activeTab === 'customers' ? 'Customer' : 'Client'}
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        {activeTab === 'customers' ? (
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">{t('common.name')}</th>
                                        <th scope="col" className="px-6 py-3">Client</th>
                                        <th scope="col" className="px-6 py-3">{t('common.email')}</th>
                                        <th scope="col" className="px-6 py-3">{t('common.phone')}</th>
                                        <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                            <td className="px-6 py-4">{clients.find(c => c.id === customer.clientId)?.name || '-'}</td>
                                            <td className="px-6 py-4">{customer.email}</td>
                                            <td className="px-6 py-4">{customer.phone}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => onEditCustomer(customer)} className="text-primary-600 hover:underline">{t('common.edit')}</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                 <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
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

const CustomerEditRequestPage: React.FC<{
    requests: CustomerEditRequest[];
    customers: Customer[];
    users: User[];
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
    t: Function;
}> = ({ requests, customers, users, onApprove, onReject, t }) => {
    const pendingRequests = requests.filter(r => r.status === 'pending');
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.customerEditRequests.title')}</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                 <div className="overflow-x-auto">
                    {pendingRequests.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">{t('pages.customerEditRequests.noRequests')}</p>
                    ) : (
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
                                <tr>
                                    <th className="px-6 py-3">{t('pages.customers.customersTab')}</th>
                                    <th className="px-6 py-3">{t('pages.customerEditRequests.requestedBy')}</th>
                                    <th className="px-6 py-3">{t('pages.customerEditRequests.requestedAt')}</th>
                                    <th className="px-6 py-3">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map(req => {
                                    const customer = customers.find(c => c.id === req.customerId);
                                    const requester = users.find(u => u.id === req.requestedByUserId);
                                    return (
                                        <tr key={req.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                            <td className="px-6 py-4 font-medium">{customer?.name}</td>
                                            <td className="px-6 py-4">{requester?.name}</td>
                                            <td className="px-6 py-4">{new Date(req.timestamp).toLocaleString()}</td>
                                            <td className="px-6 py-4 space-x-2">
                                                <button onClick={() => onApprove(req.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">{t('common.approve')}</button>
                                                <button onClick={() => onReject(req.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">{t('common.reject')}</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
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
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
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
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300">
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

const Chatbot: React.FC<{ currentUser: User; appData: any; initialMessage: string; }> = ({ currentUser, appData, initialMessage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{ sender: 'ai', text: initialMessage }]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const CHATBOT_AVATAR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAHBgsIBw8QEA0QDQ8PDQ4QEA8NDQ8OFREWFhURExMYHSggGBolGxMVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0NDw0NDisZFRkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAJ8AmwMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAgQDBQYBB//EADQQAQABAgMFBwQCAAcAAAAAAAABAgMEBREhMUFREhNhcYGRBiIjUqGxwdFSYhQjM0Jy4fD/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/EACERAQEAAgICAwEBAQAAAAAAAAABEQIhMTJBUQMSYTNx/9oADAMBAAIRAxEAPwD9xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzVdqmmiZqmmIjxl0bfa+Hsqi3brpmqfKIneUCYEdF/tGxbVUTXcoiJ3TudfG7W2b1E00TOKe9W/wAAdQHQ/9asTP7ymnfG//AEc2N2vXMzFFMRHjO+oHQg41e2sWvfcj7QtU4u9VdmmrtUzVT4TAO4Dw1XKaYmarhER4y9FFymqImiqJieExO7IHoAAAAAAAAAAAAAAAAAAAI+0tqxsKiZmubk9KeP0BJR8S7R2rVfmubkxT/LHx9ZX666q5mqqZmfGXkB9DHY2xYnE1+tV4UeEfLzXzbX2jVjK+bVcimbdPSiI/wC5UAPqqqpmZmd5neZAcgCUAAAAAAAAAAAAAAAAAAAJmxsKrE4ii3T4z1T4RHjIP57CwsSu/XFq3G+Z3z4RHjL9E7O2fY2fREURvqe1VPjKo7O2dRs+zFFMb56qp8ZVMgAAIoAAAIgAAIogAAAAAAAIgACKIAACMgA/fsnBfA4Si3V6076vvV4qRAHIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/9k=";

    useEffect(() => {
        if (messages.length === 1 && messages[0].sender === 'ai') {
            setMessages([{ sender: 'ai', text: initialMessage }]);
        }
    }, [initialMessage]);

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
                className="fixed bottom-6 right-6 bg-white dark:bg-gray-700 text-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-transform transform hover:scale-110 z-50"
                aria-label="Toggle Chatbot"
            >
                <img src={CHATBOT_AVATAR} alt="Chatbot Avatar" className="h-12 w-12 rounded-full object-cover" />
            </button>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b dark:border-gray-700 flex items-center space-x-3">
                        <img src={CHATBOT_AVATAR} alt="Chatbot Avatar" className="h-10 w-10 rounded-full object-cover" />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">ServisAI Assistant</h3>
                            <div className="flex items-center space-x-1.5">
                                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                <span className="text-xs text-gray-500">Online</span>
                            </div>
                        </div>
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
  const [customerEditRequests, setCustomerEditRequests] = useState<CustomerEditRequest[]>(INITIAL_CUSTOMER_REQUESTS);
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

  const addNotification = (message: string, link: string, workOrderId?: string, partId?: string) => {
      const newNotif: Notification = {
          id: `notif-${Date.now()}`,
          message,
          timestamp: new Date().toISOString(),
          read: false,
          link,
          workOrderId,
          partId
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
  };

  useEffect(() => {
    const checkSystemStatus = () => {
        const now = new Date();
        const oneHourAgo = now.getTime() - 3600 * 1000;

        // Check for unclaimed work orders older than 1 hour
        workOrders.forEach(wo => {
            if (wo.status === WorkOrderStatus.PENDING && !wo.technicianId) {
                const createdAt = new Date(wo.createdAt).getTime();
                if (createdAt < oneHourAgo) {
                    const hasNotif = notifications.some(n => n.workOrderId === wo.id && n.message.includes('pending for over 1 hour'));
                    if (!hasNotif) {
                        addNotification(`WO #${wo.id} has been pending for over 1 hour.`, `/work-orders/${wo.id}`, wo.id);
                    }
                }
            }
        });

        // Check for low stock parts
        spareParts.forEach(part => {
            if (part.stock <= 5) {
                const hasNotif = notifications.some(n => n.partId === part.id);
                if (!hasNotif) {
                    addNotification(`Stock for ${part.name} is low (${part.stock} left).`, '/spare-parts', undefined, part.id);
                }
            }
        });
    };

    const intervalId = setInterval(checkSystemStatus, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [workOrders, spareParts, notifications]);

  const proactiveChatbotMessage = useMemo(() => {
    const oneHourAgo = new Date().getTime() - 3600 * 1000;
    const pendingWOs = workOrders.filter(wo => 
        wo.status === WorkOrderStatus.PENDING && 
        !wo.technicianId && 
        new Date(wo.createdAt).getTime() < oneHourAgo
    );
    const lowStockParts = spareParts.filter(p => p.stock <= 5);

    const alerts: string[] = [];
    if (pendingWOs.length > 0) {
        alerts.push(...pendingWOs.map(wo => `- WO #${wo.id} has been pending for over an hour.`));
    }
    if (lowStockParts.length > 0) {
        alerts.push(...lowStockParts.map(p => `- Stock for '${p.name}' is low (${p.stock} left).`));
    }

    if (alerts.length > 0) {
        return `Hello! I am ServisAI. I have some important updates for you:\n${alerts.join('\n')}`;
    }
    
    return 'Hello! I am ServisAI. How can I assist you with your business data today?';
  }, [workOrders, spareParts]);

  const handleLogin = (user: User) => { setCurrentUser(user); setAuthScreen('login'); };
  const handleLogout = () => { setCurrentUser(null); };
  const handleSignUp = (newUser: User) => { setUsers(prev => [...prev, newUser]); setAuthScreen('login'); };
  
  const handleCustomerSubmit = (customerData: Customer) => {
    if (!currentUser) return;

    if (currentUser.role === UserRole.ADMINISTRATOR || currentUser.role === UserRole.ADMIN) {
        setCustomers(prev => {
            const exists = prev.some(c => c.id === customerData.id);
            if (exists) { return prev.map(c => c.id === customerData.id ? customerData : c); }
            return [...prev, customerData];
        });
    } else if (currentUser.role === UserRole.TECHNICIAN && customerData.id) {
        const newRequest: CustomerEditRequest = {
            id: `cer-${Date.now()}`,
            customerId: customerData.id,
            requestedByUserId: currentUser.id,
            requestedData: customerData,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        setCustomerEditRequests(prev => [newRequest, ...prev]);
        addNotification(`${currentUser.name} requested changes for ${customerData.name}.`, '/customer-edit-requests');
    }
    setModalState({ type: null, data: null });
  };
  
  const handleApproveCustomerRequest = (requestId: string) => {
    const request = customerEditRequests.find(r => r.id === requestId);
    if (!request) return;

    setCustomers(prev => prev.map(c => c.id === request.customerId ? { ...c, ...request.requestedData, id: c.id } : c));
    setCustomerEditRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
    addNotification(`Your change request for ${request.requestedData.name} was approved.`, '/customers');
  };

  const handleRejectCustomerRequest = (requestId: string) => {
     const request = customerEditRequests.find(r => r.id === requestId);
     if (!request) return;
    setCustomerEditRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    addNotification(`Your change request for ${request.requestedData.name} was rejected.`, '/customers');
  };

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

  const handleGenerateFinancialReport = () => {
    const doc = new jsPDF();
    generatePdfHeader(doc, companyProfile);

    const approvedTransactions = transactions.filter(t => t.approved !== false);
    const totalIncome = approvedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = approvedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const profitLoss = totalIncome - totalExpense;
    const inventoryValue = spareParts.reduce((sum, part) => sum + (part.stock * (part.purchasePrice || 0)), 0);
    const totalAssets = profitLoss + inventoryValue;

    doc.setFontSize(16);
    doc.text('Laporan Keuangan', 14, 60);

    autoTable(doc, {
        startY: 65,
        head: [['Laporan Laba Rugi', '']],
        body: [
            ['Total Pendapatan', formatIDR(totalIncome)],
            ['Total Pengeluaran', formatIDR(totalExpense)],
            [{ content: 'Laba Bersih', styles: { fontStyle: 'bold' } }, { content: formatIDR(profitLoss), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'striped',
        columnStyles: { 1: { halign: 'right' } }
    });

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Neraca', '']],
        body: [
            [{ content: 'ASET', styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }, ''],
            ['Kas (dari Laba Ditahan)', formatIDR(profitLoss)],
            ['Nilai Persediaan', formatIDR(inventoryValue)],
            [{ content: 'Total Aset', styles: { fontStyle: 'bold' } }, { content: formatIDR(totalAssets), styles: { fontStyle: 'bold' } }],
            ['', ''],
            [{ content: 'LIABILITAS & EKUITAS', styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }, ''],
            ['Ekuitas (Laba Ditahan)', formatIDR(profitLoss)],
            [{ content: 'Total Liabilitas & Ekuitas', styles: { fontStyle: 'bold' } }, { content: formatIDR(profitLoss), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'striped',
        columnStyles: { 1: { halign: 'right' } }
    });
    
    doc.save(`Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.pdf`);
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
      addNotification(`New Work Order Created: ${newOrder.id}`, '/work-orders', newOrder.id);
      setModalState({ type: null, data: null });
  };

  const handleAssignTechnician = (techId: string) => {
      if (modalState.data) {
          setWorkOrders(prev => prev.map(wo => wo.id === modalState.data.id ? { ...wo, technicianId: techId, status: WorkOrderStatus.IN_PROGRESS } : wo));
          const tech = users.find(u => u.id === techId);
          addNotification(`Work Order ${modalState.data.id} assigned to ${tech?.name}`, `/work-orders/${modalState.data.id}`, modalState.data.id);
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
      addNotification(`${currentUser.name} has claimed Work Order ${wo.id}`, `/work-orders/${wo.id}`, wo.id);
  };

  const handleCompleteWorkOrder = (wo: WorkOrder) => {
      const updatedWO = { ...wo, status: WorkOrderStatus.COMPLETED, completedAt: new Date().toISOString() };
      setWorkOrders(prev => prev.map(w => w.id === wo.id ? updatedWO : w));
      
      const customer = customers.find(c => c.id === wo.customer.id);

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
            clientId: customer?.clientId,
            approved: true, // Auto-approved
        };
        setTransactions(prev => [newTransaction, ...prev]);
      }
      if(wo.technicianId) {
          setUsers(prev => prev.map(u => u.id === wo.technicianId ? {...u, status: TechnicianStatus.AVAILABLE} : u));
      }
      addNotification(`Work Order ${wo.id} marked as Completed`, `/work-orders/${wo.id}`, wo.id);
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

  const handleRequestReimbursement = (description: string, amount: number, attachment: any) => {
    if (!currentUser || !modalState.data) return;
    const workOrder = modalState.data as WorkOrder;
    const newTransaction: Transaction = {
        id: `trn-reim-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: description,
        type: 'expense',
        amount: amount,
        category: TransactionCategory.REIMBURSEMENT,
        paymentMethod: PaymentMethod.CASH, 
        attachment: attachment,
        workOrderId: workOrder.id,
        requestedByUserId: currentUser.id,
        approved: false, // This is key
    };
    setTransactions(prev => [newTransaction, ...prev]);
    addNotification(`${currentUser.name} requested a reimbursement of ${formatIDR(amount)}`, '/reimbursements');
    setModalState({ type: null, data: null });
  };
  
  const handleApproveReimbursement = (transactionId: string) => {
      setTransactions(prev => prev.map(tr => {
          if (tr.id === transactionId) {
              addNotification(`Reimbursement request for ${formatIDR(tr.amount)} has been approved.`, '/my-reimbursements');
              return { ...tr, approved: true };
          }
          return tr;
      }));
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

  const handleWhatsAppChat = (workOrder: WorkOrder) => {
    if (!workOrder.customer.phone) {
        alert('Customer phone number is not available.');
        return;
    }
    let phoneNumber = workOrder.customer.phone.replace(/[^0-9]/g, '');
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.substring(1);
    }
    const message = encodeURIComponent(`Hello, regarding Work Order #${workOrder.id}, `);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleEmailNotify = (workOrder: WorkOrder) => {
      if (!workOrder.customer.email) {
          alert('Customer email is not available.');
          return;
      }
      const subject = encodeURIComponent(`Regarding Work Order #${workOrder.id}`);
      window.open(`mailto:${workOrder.customer.email}?subject=${subject}`, '_blank');
  };

  if (!currentUser) {
    if (authScreen === 'signup') return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthScreen('login')} t={t} />;
    return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthScreen('signup')} users={users} t={t} />;
  }

  const Sidebar: React.FC = () => {
    const location = useLocation();
    const navItems = [
        { path: '/', labelKey: 'sidebar.dashboard', icon: DashboardIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-blue-500' },
        { path: '/customers', labelKey: 'sidebar.customers', icon: CustomerIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN], color: 'text-green-500' },
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
                {isSidebarCollapsed ? <DashboardIcon className="h-10 w-10 text-primary-600" /> : <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-400 bg-clip-text text-transparent">ServisPro</h1>}
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {accessibleNavItems.map(item => (
                     <Link key={item.path} to={item.path} title={isSidebarCollapsed ? t(item.labelKey) : ''} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${(location.pathname.startsWith(item.path) && item.path !== '/' || location.pathname === item.path) ? 'bg-primary-100 dark:bg-gray-700 text-primary-700 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <item.icon className={`${isSidebarCollapsed ? `h-8 w-8 ${item.color}` : `h-5 w-5 ${item.color}`}`} />
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
                        <Route path="/work-orders" element={<WorkOrders user={currentUser} workOrders={workOrders} users={users} onCreate={() => setModalState({ type: 'create_wo', data: null })} onAssign={(wo) => setModalState({ type: 'assign_tech', data: wo })} onClaim={handleClaimWorkOrder} onAddPart={(wo) => setModalState({ type: 'add_part_wo', data: wo })} onAddCost={(wo) => setModalState({ type: 'add_additional_cost', data: wo })} onComplete={handleCompleteWorkOrder} onRequestReimbursement={(wo) => setModalState({ type: 'request_reimbursement', data: wo })} t={t} />} />
                        <Route path="/work-orders/:id" element={<WorkOrderDetailPage workOrders={workOrders} users={users} spareParts={spareParts} onAddPart={(wo) => setModalState({ type: 'add_part_wo', data: wo })} onAddCost={(wo) => setModalState({ type: 'add_additional_cost', data: wo })} onComplete={handleCompleteWorkOrder} t={t} onPrint={handlePrintWorkOrder} onUploadProof={handleUploadProof} onChat={handleWhatsAppChat} onNotify={handleEmailNotify} onRequestReimbursement={(wo) => setModalState({ type: 'request_reimbursement', data: wo })} />} />
                        <Route path="/customers" element={<CustomersAndClientsPage customers={customers} clients={clients} onAddCustomer={() => setModalState({ type: 'add_customer', data: null })} onEditCustomer={(c) => setModalState({ type: 'edit_customer', data: c })} onAddClient={() => setModalState({ type: 'add_client', data: null })} onEditClient={(c) => setModalState({ type: 'edit_client', data: c })} currentUser={currentUser} t={t} />} />
                        <Route path="/customer-edit-requests" element={<CustomerEditRequestPage requests={customerEditRequests} customers={customers} users={users} onApprove={handleApproveCustomerRequest} onReject={handleRejectCustomerRequest} t={t} />} />
                        <Route path="/employees" element={<EmployeesPage users={users} workOrders={workOrders} attendance={attendance} onAddEmployee={() => setModalState({ type: 'add_employee', data: null })} t={t} />} />
                        <Route path="/employees/:employeeId" element={<TechnicianProfilePage users={users} workOrders={workOrders} onEdit={(user) => setModalState({ type: 'edit_employee', data: user })} t={t} />} />
                        <Route path="/finance" element={<FinancePage transactions={transactions} spareParts={spareParts} onAddTransaction={() => setModalState({ type: 'add_transaction', data: null })} onGenerateReport={handleGenerateFinancialReport} t={t} />} />
                        <Route path="/finance/client-report" element={<ClientFinancePage clients={clients} customers={customers} workOrders={workOrders} transactions={transactions} t={t} />} />
                        <Route path="/reimbursements" element={<ReimbursementPage transactions={transactions} users={users} onApprove={handleApproveReimbursement} onViewAttachment={(att) => setModalState({type: 'view_attachment', data: att})} t={t} />} />
                        <Route path="/my-reimbursements" element={<MyReimbursementsPage transactions={transactions} currentUser={currentUser} onViewAttachment={(att) => setModalState({type: 'view_attachment', data: att})} t={t} />} />
                        <Route path="/settings" element={<SettingsPage customers={customers} workOrders={workOrders} users={users} profile={companyProfile} onProfileSave={setCompanyProfile} t={t} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} spareParts={spareParts} suppliers={suppliers} clients={clients} invoices={invoices} transactions={transactions} contracts={contracts} />} />
                        <Route path="/spare-parts" element={<SpareParts spareParts={spareParts} suppliers={suppliers} onAddPart={() => setModalState({ type: 'add_spare_part', data: null })} onEditPart={(sp) => setModalState({ type: 'edit_spare_part', data: sp })} onAddSupplier={() => setModalState({ type: 'add_supplier', data: null })} onEditSupplier={(s) => setModalState({ type: 'edit_supplier', data: s })} onImport={handleImportSpareParts} onDelete={handleDeleteSparePart} onBulkDelete={handleBulkDeleteSpareParts} t={t} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
            
            <Chatbot currentUser={currentUser} appData={{ customers, workOrders, spareParts, invoices, users, transactions }} initialMessage={proactiveChatbotMessage} />
            
            {/* All Modals */}
            <ReimbursementModal isOpen={modalState.type === 'request_reimbursement'} onClose={() => setModalState({type: null, data: null})} onConfirm={handleRequestReimbursement} t={t} />
            <AttachmentViewerModal isOpen={modalState.type === 'view_attachment'} onClose={() => setModalState({type: null, data: null})} attachment={modalState.data} t={t} />

            {modalState.type === 'create_wo' && <CreateWorkOrderModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleCreateWorkOrder} customers={customers} t={t} />}
            {modalState.type === 'assign_tech' && <AssignTechnicianModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleAssignTechnician} technicians={users.filter(u => u.role === UserRole.TECHNICIAN)} t={t} />}
            {modalState.type === 'add_part_wo' && <AddPartToWorkOrderModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleUpdateWorkOrderParts} availableParts={spareParts} t={t} />}
            {modalState.type === 'add_additional_cost' && <AddAdditionalCostModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveAdditionalCost} t={t} />}
            {modalState.type === 'add_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} part={null} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            {modalState.type === 'edit_spare_part' && <AddEditSparePartModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSparePart} onDelete={handleDeleteSparePart} part={modalState.data} suppliers={suppliers} allSpareParts={spareParts} t={t} />}
            {modalState.type === 'add_transaction' && <AddEditTransactionModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveTransaction} transaction={null} clients={clients} t={t} />}
            {modalState.type === 'add_employee' && <AddEditEmployeeModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveEmployee} user={null} t={t} />}
            {modalState.type === 'edit_employee' && <AddEditEmployeeModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveEmployee} user={modalState.data} t={t} />}
            {modalState.type === 'add_customer' && <AddEditCustomerModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleCustomerSubmit} customer={null} clients={clients} currentUser={currentUser} t={t} />}
            {modalState.type === 'edit_customer' && <AddEditCustomerModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleCustomerSubmit} customer={modalState.data} clients={clients} currentUser={currentUser} t={t} />}
            {modalState.type === 'add_client' && <AddEditClientModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveClient} client={null} t={t} />}
            {modalState.type === 'edit_client' && <AddEditClientModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveClient} client={modalState.data} t={t} />}
            {modalState.type === 'add_supplier' && <AddEditSupplierModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSupplier} supplier={null} t={t} />}
            {modalState.type === 'edit_supplier' && <AddEditSupplierModal isOpen={true} onClose={() => setModalState({ type: null, data: null })} onSave={handleSaveSupplier} supplier={modalState.data} t={t} />}
        </div>
    </HashRouter>
  );
};

export default App;
