import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, Transaction, Notification, ChatMessage, CompanyProfile, TechnicianStatus, TransactionCategory, PaymentMethod, ServiceContract, ContractStatus, Supplier, Client, AttendanceRecord, CustomerEditRequest } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, ReceiptIcon, MapPinIcon, MoreVerticalIcon, TruckIcon, BriefcaseIcon, TrashIcon, ArrowLeftIcon, WhatsAppIcon, MailIcon } from './components/icons';
import { generateAiSummary, getChatbotResponse } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- I1N Translations ---
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
        workOrders: { title: 'Work Order Management', myTitle: 'Work Orders', myFullName: '{name}', allOrders: 'All Orders', myAssigned: 'My Assigned', available: 'Available', technician: 'Technician', unassigned: 'Unassigned', claimJob: 'Claim Job', addPart: 'Add Part', addCost: 'Add Cost', actions: 'Actions', uploadWorkProof: 'Upload Work Proof', uploadPaymentProof: 'Upload Payment Proof', generatePDF: 'Generate PDF', printWO: 'Print Work Order', completeWork: 'Complete Work', requestReimbursement: 'Request Reimbursement' },
        spareParts: { title: 'Spare Part Management', inventory: 'Spare Part Inventory', suppliers: 'Suppliers', partName: 'Part Name', stock: 'Stock', location: 'Location', importParts: 'Import CSV', deleteSelected: 'Delete Selected', downloadTemplate: 'Download Template' },
        finance: { title: 'Finance', generateReport: 'Generate Financial Report', totalIncome: 'Total Income', totalExpense: 'Total Expense', profitLoss: 'Profit / Loss', invoices: 'Invoices', allTransactions: 'All Transactions', balanceSheet: 'Balance Sheet', profitAndLoss: 'Profit & Loss', assets: 'Assets', cash: 'Cash', inventoryValue: 'Inventory Value', totalAssets: 'Total Assets', liabilitiesAndEquity: 'Liabilities & Equity', liabilities: 'Liabilities', opCosts: 'Operational Costs', equity: 'Equity', retainedEarnings: 'Retained Earnings (Profit)', addTransaction: 'Add Transaction', clientReport: 'Client Report' },
        employees: { title: 'Employee Management', allEmployees: 'All Employees', performance: 'Performance', contact: 'Contact', role: 'Role', monthlyPerformance: 'Monthly Performance (Completed WO)', attendanceStatus: 'Today\'s Attendance', clockIn: 'Clock In', clockOut: 'Clock Out', clockedInAt: 'Clocked In @ {time}', clockedOut: 'Clocked Out', absent: 'Absent', addEmployee: 'Add Employee' },
        technicianProfile: { title: 'Technician Profile', back: 'Back to all employees', personalInfo: 'Personal Information', recentActivity: 'Recent Activity', editEmployee: 'Edit Employee' },
        settings: { 
            title: 'Settings & Data', 
            companyProfile: 'Company Profile (KOP Surat)', 
            companyLogo: 'Company Logo',
            changeLogo: 'Change Logo',
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
        workOrders: { title: 'Manajemen Perintah Kerja', myTitle: 'Lembar Kerja', myFullName: '{name}', allOrders: 'Semua SPK', myAssigned: 'Tugas Saya', available: 'SPK Tersedia', technician: 'Teknisi', unassigned: 'Belum Ditugaskan', claimJob: 'Ambil Pekerjaan', addPart: 'Tambah Part', addCost: 'Tambah Biaya', actions: 'Aksi', uploadWorkProof: 'Unggah Bukti Kerja', uploadPaymentProof: 'Unggah Bukti Bayar', generatePDF: 'Buat PDF', printWO: 'Cetak SPK', completeWork: 'Selesaikan Pekerjaan', requestReimbursement: 'Ajukan Reimbursement' },
        spareParts: { title: 'Manajemen Suku Cadang', inventory: 'Inventaris Suku Cadang', suppliers: 'Pemasok', partName: 'Nama Part', stock: 'Stok', location: 'Lokasi', importParts: 'Import CSV', deleteSelected: 'Hapus Terpilih', downloadTemplate: 'Download Template' },
        finance: { title: 'Keuangan', generateReport: 'Buat Laporan Keuangan', totalIncome: 'Total Pendapatan', totalExpense: 'Total Pengeluaran', profitLoss: 'Laba / Rugi', invoices: 'Faktur', semuaTransaksi: 'Semua Transaksi', balanceSheet: 'Neraca', profitAndLoss: 'Laba Rugi', assets: 'Aset', cash: 'Kas', inventoryValue: 'Nilai Persediaan', totalAssets: 'Total Aset', liabilitiesAndEquity: 'Liabilitas & Ekuitas', liabilities: 'Liabilitas', opCosts: 'Biaya Operasional', equity: 'Ekuitas', retainedEarnings: 'Laba Ditahan', addTransaction: 'Tambah Transaksi', clientReport: 'Laporan per Klien' },
        employees: { title: 'Manajemen Karyawan', allEmployees: 'Semua Karyawan', performance: 'Kinerja', contact: 'Kontak', role: 'Peran', monthlyPerformance: 'Kinerja Bulanan (SPK Selesai)', attendanceStatus: 'Status Absensi Hari Ini', clockIn: 'Clock In', clockOut: 'Clock Out', clockedInAt: 'Clocked In @ {time}', clockedOut: 'Clocked Out', absent: 'Absen', addEmployee: 'Tambah Karyawan' },
        technicianProfile: { title: 'Profil Teknisi', back: 'Kembali ke semua karyawan', personalInfo: 'Informasi Pribadi', aktivitasTerkini: 'Aktivitas Terkini', editEmployee: 'Ubah Karyawan' },
        settings: { 
            title: 'Pengaturan & Data', 
            companyProfile: 'Profil Perusahaan (KOP Surat)', 
            companyLogo: 'Logo Perusahaan',
            changeLogo: 'Ganti Logo',
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
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.name, 50, 25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(profile.address, 50, 32);
    doc.text(`Email: ${profile.email} | Phone: ${profile.phone}`, 50, 39);
    doc.setLineWidth(0.5);
    doc.line(14, 50, 196, 50);
};

// FIX: Define a reusable type for the translation function to ensure consistency and fix type errors.
type TFunction = (key: string, replacements?: Record<string, string | number>) => string;

// --- HELPER & MODAL COMPONENTS ---
const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactElement<{ className?: string }>;
  color: 'blue' | 'yellow' | 'green' | 'indigo' | 'red';
  onClick?: () => void;
}> = ({ title, value, icon, color, onClick }) => {
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
const LoginScreen: React.FC<{ onLogin: (user: User) => void; onSwitchToSignUp: () => void, users: User[]; t: TFunction }> = ({ onLogin, onSwitchToSignUp, users, t }) => {
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

const SignUpScreen: React.FC<{ onSignUp: (user: User) => void; onSwitchToLogin: () => void; t: TFunction; }> = ({ onSignUp, onSwitchToLogin, t }) => {
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
    t: TFunction;
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

const AttachmentViewerModal: React.FC<{ isOpen: boolean; onClose: () => void; attachment: { name: string; type: string; data: string; } | null; t: TFunction; }> = ({ isOpen, onClose, attachment, t }) => {
    if (!attachment) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('modals.attachmentViewerTitle')}: ${attachment.name}`} size="lg">
            <div>
                <img src={attachment.data} alt={attachment.name} className="max-w-full max-h-[70vh] mx-auto" />
            </div>
        </Modal>
    );
};

const AddEditEmployeeModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (user: User) => void; user: User | null; t: TFunction; }> = ({ isOpen, onClose, onSave, user, t }) => {
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

const AddEditTransactionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (transaction: Transaction) => void; transaction: Transaction | null; clients: Client[]; t: TFunction; }> = ({ isOpen, onClose, onSave, transaction, clients, t }) => {
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
    t: TFunction; 
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

const AddEditClientModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (client: Client) => void; client: Client | null; t: TFunction; }> = ({ isOpen, onClose, onSave, client, t }) => {
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

const AddEditSupplierModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (supplier: Supplier) => void; supplier: Supplier | null; t: TFunction; }> = ({ isOpen, onClose, onSave, supplier, t }) => {
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

const CreateWorkOrderModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (wo: Partial<WorkOrder>) => void; customers: Customer[]; t: TFunction }> = ({ isOpen, onClose, onSave, customers, t }) => {
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

const AssignTechnicianModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (techId: string) => void; technicians: User[]; t: TFunction }> = ({ isOpen, onClose, onSave, technicians, t }) => {
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
    t: TFunction;
}> = ({ isOpen, onClose, onSave, availableParts, t }) => {
    const [partsToAdd, setPartsToAdd] = useState<Record<string, number>>({});

    const handleQuantityChange = (partId: string, quantity: number, maxStock: number) => {
        if (quantity < 0 || quantity > maxStock) return;
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
    t: TFunction;
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


const AddEditSparePartModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (part: SparePart) => void; onDelete?: (id: string) => void; part: SparePart | null; suppliers: Supplier[]; allSpareParts: SparePart[]; t: TFunction; }> = ({ isOpen, onClose, onSave, onDelete, part, suppliers, allSpareParts, t }) => {
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
    t: TFunction;
}> = ({ workOrders, customers, users, currentUser, transactions, t }) => {
    const navigate = useNavigate();
    const technicians = users.filter(u => u.role === UserRole.TECHNICIAN);

    const stats = useMemo(() => {
        const relevantWorkOrders = currentUser.role === UserRole.TECHNICIAN
            ? workOrders.filter(wo => wo.technicianId === currentUser.id)
            : workOrders;

        const pending = relevantWorkOrders.filter(w => w.status === WorkOrderStatus.PENDING).length;
        const totalCustomers = customers.length;
        
        const approvedTransactions = transactions.filter(t => t.approved !== false);
        const totalRevenue = approvedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

        return { pending, totalCustomers, totalRevenue };
    }, [workOrders, customers, users, currentUser, transactions]);

    const workOrderDonutData = useMemo(() => {
        const counts = workOrders.reduce((acc, wo) => {
            acc[wo.status] = (acc[wo.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const total = workOrders.length;
        const completed = counts[WorkOrderStatus.COMPLETED] || 0;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            data: [
                { name: t('status.Completed'), value: completed },
                { name: t('status.In Progress'), value: counts[WorkOrderStatus.IN_PROGRESS] || 0 },
                { name: t('status.Pending'), value: counts[WorkOrderStatus.PENDING] || 0 },
            ],
            completionRate
        };
    }, [workOrders, t]);
    
    const technicianPerformanceData = useMemo(() => {
        return technicians.map(tech => ({
            name: formatUserName(tech.name),
            completed: workOrders.filter(wo => wo.technicianId === tech.id && wo.status === WorkOrderStatus.COMPLETED).length
        })).sort((a, b) => b.completed - a.completed);
    }, [workOrders, technicians]);

    const COLORS = ['#8884d8', '#3B82F6', '#F59E0B']; // Completed is gray, In Progress is blue, Pending is yellow

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard.welcome', { name: formatUserName(currentUser.name) })}</h1>
                <p className="text-gray-600 dark:text-gray-400">{t('dashboard.summary')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title={t('dashboard.totalCustomers')} value={stats.totalCustomers.toString()} icon={<CustomerIcon />} color="blue" onClick={() => navigate('/customers')} />
                <StatCard title={t('dashboard.pendingWorkOrders')} value={stats.pending.toString()} icon={<WorkOrderIcon />} color="yellow" onClick={() => navigate('/work-orders')} />
                 {(currentUser.role === UserRole.ADMINISTRATOR) ? (
                    <StatCard title={t('dashboard.monthlyRevenue')} value={formatIDR(stats.totalRevenue)} icon={<FinanceIcon />} color="green" onClick={() => navigate('/finance')} />
                 ) : (currentUser.role === UserRole.TECHNICIAN) ? (
                     <StatCard title="My Completed Jobs" value={workOrders.filter(wo => wo.technicianId === currentUser.id && wo.status === WorkOrderStatus.COMPLETED).length.toString()} icon={<ReceiptIcon />} color="green" />
                 ) : null}

                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ADMINISTRATOR) && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('dashboard.technicianStatus')}</h3>
                        <div className="space-y-2">
                             {technicians.map(tech => (
                                <div key={tech.id} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-800 dark:text-white">{formatUserName(tech.name)}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(tech.status!).replace(/text-(.*?)-(\d+)/, 'bg-$1-500')}`}></span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t(`status.${tech.status!}`)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

             {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ADMINISTRATOR) && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t('dashboard.workOrderStatus')}</h3>
                        <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={workOrderDonutData.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                                        {workOrderDonutData.data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-gray-800 dark:fill-white">
                                        {`${workOrderDonutData.completionRate}%`}
                                    </text>
                                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-gray-500 dark:fill-gray-400">
                                        Completed
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t('dashboard.completedByTechnician')}</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={technicianPerformanceData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
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
    t: TFunction;
}> = ({ user, workOrders, users, onCreate, onAssign, onClaim, onAddPart, onAddCost, onComplete, onRequestReimbursement, t }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'myAssigned' | 'available' | 'all'>('all');
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user.role === UserRole.TECHNICIAN) setActiveTab('myAssigned');
        else setActiveTab('all');
    }, [user.role]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOrders = useMemo(() => {
        switch (activeTab) {
            case 'myAssigned': return workOrders.filter(wo => wo.technicianId === user.id);
            case 'available': return workOrders.filter(wo => !wo.technicianId && wo.status === WorkOrderStatus.PENDING);
            case 'all': default: return workOrders;
        }
    }, [activeTab, workOrders, user.id]);

    const DropdownItem: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
        <button onClick={onClick} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
            {children}
        </button>
    );
    
    const isTechnician = user.role === UserRole.TECHNICIAN;

    // --- TECHNICIAN CARD VIEW (PORTABLE SHEET STYLE) ---
    if (isTechnician) {
        return (
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.workOrders.title')}</h1>
                </div>

                <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('myAssigned')} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'myAssigned' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                        {t('pages.workOrders.myAssigned')} ({workOrders.filter(wo => wo.technicianId === user.id).length})
                    </button>
                    <button onClick={() => setActiveTab('available')} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium ${activeTab === 'available' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                        {t('pages.workOrders.available')} ({workOrders.filter(wo => !wo.technicianId && wo.status === WorkOrderStatus.PENDING).length})
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map(wo => (
                        <div key={wo.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-mono text-xs text-gray-500">#{wo.id}</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                                        {t(`status.${wo.status}`)}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 truncate">{wo.customer.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 flex items-start">
                                    <MapPinIcon className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0"/>
                                    {wo.customer.address}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-4 line-clamp-3">
                                    "{wo.description}"
                                </p>
                            </div>
                            
                            <div className="mt-auto">
                                {activeTab === 'available' ? (
                                    <button onClick={() => onClaim(wo)} className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 shadow-sm">
                                        {t('pages.workOrders.claimJob')}
                                    </button>
                                ) : (
                                    <Link to={`/work-orders/${wo.id}`} className="block w-full text-center py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 shadow-sm">
                                        Open Job Sheet
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredOrders.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No work orders found in this section.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- STANDARD TABLE VIEW (ADMIN) ---
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.workOrders.title')}</h1>
                {user.role !== UserRole.TECHNICIAN && (
                    <button onClick={onCreate} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
                        {t('common.create')} Work Order
                    </button>
                )}
            </div>
            
             <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                     <button onClick={() => setActiveTab('all')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.workOrders.allOrders')}</button>
                </nav>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">ID</th>
                            <th scope="col" className="px-6 py-3">Customer</th>
                            <th scope="col" className="px-6 py-3">{t('pages.workOrders.technician')}</th>
                            <th scope="col" className="px-6 py-3">{t('common.status')}</th>
                            <th scope="col" className="px-6 py-3">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(wo => (
                            <tr key={wo.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    <Link to={`/work-orders/${wo.id}`} className="text-primary-600 hover:underline">{wo.id}</Link>
                                </td>
                                <td className="px-6 py-4">{wo.customer.name}</td>
                                <td className="px-6 py-4">{users.find(u => u.id === wo.technicianId)?.name || <span className="text-gray-500">{t('pages.workOrders.unassigned')}</span>}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span></td>
                                <td className="px-6 py-4 relative">
                                     {user.role !== UserRole.TECHNICIAN && wo.status === WorkOrderStatus.PENDING && (
                                        <button onClick={() => onAssign(wo)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Assign</button>
                                     )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const WorkOrderDetailPage: React.FC<{
    workOrders: WorkOrder[]; users: User[]; spareParts: SparePart[]; 
    onAddPart: (wo: WorkOrder) => void; onAddCost: (wo: WorkOrder) => void; onComplete: (wo: WorkOrder) => void; 
    t: TFunction; onPrint: (wo: WorkOrder, action: 'print' | 'download') => void; onUploadProof: (id: string, type: 'work' | 'payment') => void;
    onChat: (wo: WorkOrder) => void; onNotify: (wo: WorkOrder) => void; onRequestReimbursement: (wo: WorkOrder) => void;
}> = ({ workOrders, users, spareParts, onAddPart, onAddCost, onComplete, t, onPrint, onUploadProof, onChat, onNotify, onRequestReimbursement }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const workOrder = workOrders.find(wo => wo.id === id);

    // Identify if current user is technician (mocking check via localStorage or passing User as prop in real app)
    // For now, we infer based on UI structure, but ideally should pass `currentUser` prop.
    // Assuming if we are here, we have access to context or we check based on role.
    // Let's rely on the design being responsive, but add specific mobile touches.
    
    if (!workOrder) return <div className="text-center text-gray-500 p-10">Work Order not found. <Link to="/work-orders" className="text-primary-600 underline">{t('common.back')}</Link></div>;
    
    const technician = users.find(u => u.id === workOrder.technicianId);
    
    // --- JOB SHEET LAYOUT (PORTABLE) ---
    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300">
                    <ArrowLeftIcon className="h-5 w-5 mr-1" />
                    <span className="font-medium">Back</span>
                </button>
                <div className="flex space-x-2">
                    <button onClick={() => onPrint(workOrder, 'download')} className="p-2 text-gray-600 bg-white rounded-full shadow-sm border dark:bg-gray-700 dark:border-gray-600 dark:text-white"><ReceiptIcon className="h-5 w-5"/></button>
                </div>
            </div>

            {/* Main Job Sheet Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                
                {/* Header Status */}
                <div className={`p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${workOrder.status === WorkOrderStatus.COMPLETED ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                    <div>
                        <div className="text-xs text-gray-500 font-mono">#{workOrder.id}</div>
                        <div className="font-bold text-lg dark:text-white">{workOrder.customer.name}</div>
                    </div>
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(workOrder.status)}`}>
                        {t(`status.${workOrder.status}`)}
                    </span>
                </div>

                {/* Customer Actions & Address */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                     <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 flex items-start">
                        <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0"/>
                        {workOrder.customer.address}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                         <a href={`tel:${workOrder.customer.phone}`} className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm active:bg-gray-100">
                            <span className="p-2 bg-blue-100 text-blue-600 rounded-full mb-1"><BriefcaseIcon className="h-5 w-5"/></span>
                            <span className="text-xs font-medium">Call</span>
                        </a>
                        <button onClick={() => onChat(workOrder)} className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm active:bg-gray-100">
                             <span className="p-2 bg-green-100 text-green-600 rounded-full mb-1"><WhatsAppIcon className="h-5 w-5"/></span>
                             <span className="text-xs font-medium">WhatsApp</span>
                        </button>
                         <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workOrder.customer.address)}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm active:bg-gray-100">
                             <span className="p-2 bg-red-100 text-red-600 rounded-full mb-1"><MapPinIcon className="h-5 w-5"/></span>
                             <span className="text-xs font-medium">Map</span>
                        </a>
                    </div>
                </div>

                {/* Task Description */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Task Description</h3>
                    <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{workOrder.description}</p>
                </div>

                {/* Spare Parts Section */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Used Parts</h3>
                        {workOrder.status === WorkOrderStatus.IN_PROGRESS && (
                            <button onClick={() => onAddPart(workOrder)} className="text-sm font-semibold text-primary-600 flex items-center bg-primary-50 px-3 py-1 rounded-full">
                                + Add Part
                            </button>
                        )}
                    </div>
                    {workOrder.usedParts.length === 0 ? (
                        <div className="text-sm text-gray-400 italic">No parts added yet.</div>
                    ) : (
                        <ul className="space-y-3">
                            {workOrder.usedParts.map((item, i) => {
                                const part = spareParts.find(p => p.id === item.partId);
                                return (
                                    <li key={i} className="flex justify-between items-center text-sm p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                                        <span className="font-medium text-gray-800 dark:text-white">{part?.name || 'Unknown'} <span className="text-gray-500 text-xs">x{item.quantity}</span></span>
                                        <span className="font-mono text-gray-600 dark:text-gray-300">{formatIDR(item.sellingPrice * item.quantity)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Additional Costs Section */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Extra Costs</h3>
                         {workOrder.status === WorkOrderStatus.IN_PROGRESS && (
                            <button onClick={() => onAddCost(workOrder)} className="text-sm font-semibold text-primary-600 flex items-center bg-primary-50 px-3 py-1 rounded-full">
                                + Add Cost
                            </button>
                        )}
                    </div>
                    {workOrder.additionalCosts.length === 0 ? (
                        <div className="text-sm text-gray-400 italic">No additional costs.</div>
                    ) : (
                        <ul className="space-y-3">
                            {workOrder.additionalCosts.map((cost, i) => (
                                <li key={i} className="flex justify-between items-center text-sm p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                                    <span className="font-medium text-gray-800 dark:text-white">{cost.description}</span>
                                    <span className="font-mono text-gray-600 dark:text-gray-300">{formatIDR(cost.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Evidence / Proofs */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Job Evidence</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Work Proof */}
                        <div onClick={() => onUploadProof(workOrder.id, 'work')} className="cursor-pointer group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 transition-colors">
                            {workOrder.workProofUrl ? (
                                <img src={workOrder.workProofUrl} className="w-full h-full object-cover" alt="Work Proof" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <BriefcaseIcon className="h-8 w-8 mb-2" />
                                    <span className="text-xs font-medium">Tap to upload<br/>Work Proof</span>
                                </div>
                            )}
                            {workOrder.workProofUrl && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs">Change</div>}
                        </div>

                        {/* Payment Proof */}
                        <div onClick={() => onUploadProof(workOrder.id, 'payment')} className="cursor-pointer group relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 transition-colors">
                            {workOrder.paymentProofUrl ? (
                                <img src={workOrder.paymentProofUrl} className="w-full h-full object-cover" alt="Payment Proof" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <ReceiptIcon className="h-8 w-8 mb-2" />
                                    <span className="text-xs font-medium">Tap to upload<br/>Payment Proof</span>
                                </div>
                            )}
                             {workOrder.paymentProofUrl && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs">Change</div>}
                        </div>
                    </div>
                </div>

                {/* Total Summary */}
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Total Bill</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatIDR(workOrder.totalCost)}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Floating Action Bar for Technicians */}
            {workOrder.status !== WorkOrderStatus.COMPLETED && (
                 <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex space-x-3 z-30 pb-6 md:pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button onClick={() => onRequestReimbursement(workOrder)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-sm">
                        Reimburse
                    </button>
                    <button onClick={() => onComplete(workOrder)} className="flex-[2] py-3 rounded-xl bg-green-600 text-white font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-transform">
                        Complete Job
                    </button>
                </div>
            )}
        </div>
    );
};

const CustomersAndClientsPage: React.FC<{ 
    customers: Customer[]; 
    clients: Client[]; 
    onAddCustomer: () => void; 
    onEditCustomer: (c: Customer) => void; 
    onAddClient: () => void; 
    onEditClient: (c: Client) => void; 
    currentUser: User; 
    t: TFunction; 
}> = ({ customers, clients, onAddCustomer, onEditCustomer, onAddClient, onEditClient, currentUser, t }) => {
    const [activeTab, setActiveTab] = useState<'customers' | 'clients'>('customers');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderCustomerTable = () => (
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th className="px-6 py-3">{t('common.name')}</th>
                    <th className="px-6 py-3">{t('common.phone')}</th>
                    <th className="px-6 py-3">{t('common.email')}</th>
                    <th className="px-6 py-3">{t('pages.customers.clientsTab')}</th>
                    <th className="px-6 py-3">{t('common.actions')}</th>
                </tr>
            </thead>
            <tbody>
                {filteredCustomers.map(customer => (
                    <tr key={customer.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                        <td className="px-6 py-4">{customer.phone}</td>
                        <td className="px-6 py-4">{customer.email}</td>
                        <td className="px-6 py-4">{clients.find(c => c.id === customer.clientId)?.name || '-'}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => onEditCustomer(customer)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderClientTable = () => (
         <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th className="px-6 py-3">Client Name</th>
                    <th className="px-6 py-3">{t('common.actions')}</th>
                </tr>
            </thead>
            <tbody>
                {filteredClients.map(client => (
                    <tr key={client.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{client.name}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => onEditClient(client)} className="font-medium text-primary-600 hover:underline">{t('common.edit')}</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.customers.title')}</h1>
                {currentUser.role !== UserRole.TECHNICIAN && (
                    <button onClick={activeTab === 'customers' ? onAddCustomer : onAddClient} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
                        {activeTab === 'customers' ? t('modals.addCustomerTitle') : t('modals.addClientTitle')}
                    </button>
                )}
            </div>
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <button onClick={() => setActiveTab('customers')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'customers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.customers.customersTab')}</button>
                        <button onClick={() => setActiveTab('clients')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'clients' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.customers.clientsTab')}</button>
                    </nav>
                </div>
                 <div className="p-4">
                     <input type="text" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-sm px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                 </div>
                 <div className="overflow-x-auto">
                    {activeTab === 'customers' ? renderCustomerTable() : renderClientTable()}
                </div>
            </div>
        </div>
    );
};

const CustomerEditRequestPage: React.FC<{ requests: CustomerEditRequest[]; customers: Customer[]; users: User[]; onApprove: (id: string) => void; onReject: (id: string) => void; t: TFunction; }> = ({ requests, customers, users, onApprove, onReject, t }) => {
    const pendingRequests = requests.filter(r => r.status === 'pending');
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">{t('pages.customerEditRequests.title')}</h1>
            <div className="space-y-4">
                {pendingRequests.length === 0 && <p>{t('pages.customerEditRequests.noRequests')}</p>}
                {pendingRequests.map(req => {
                    const customer = customers.find(c => c.id === req.customerId);
                    const requester = users.find(u => u.id === req.requestedByUserId);
                    return (
                        <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                            <p><strong>{customer?.name}</strong> requested by <strong>{requester?.name}</strong></p>
                            <div className="flex space-x-2 mt-2">
                                <button onClick={() => onApprove(req.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded">{t('common.approve')}</button>
                                <button onClick={() => onReject(req.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">{t('common.reject')}</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const EmployeesPage: React.FC<{ users: User[]; workOrders: WorkOrder[]; attendance: AttendanceRecord[]; onAddEmployee: () => void; t: TFunction; }> = ({ users, workOrders, attendance, onAddEmployee, t }) => {
    const navigate = useNavigate();
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t('pages.employees.title')}</h1>
                <button onClick={onAddEmployee} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
                    {t('pages.employees.addEmployee')}
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <table className="w-full text-sm">
                    <thead>
                        <tr><th>{t('common.name')}</th><th>{t('pages.employees.role')}</th><th>{t('common.status')}</th></tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} onClick={() => navigate(`/employees/${user.id}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td>{user.name}</td>
                                <td>{user.role}</td>
                                <td>{user.status && <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>{t(`status.${user.status}`)}</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TechnicianProfilePage: React.FC<{ users: User[]; workOrders: WorkOrder[]; onEdit: (u: User) => void; t: TFunction; }> = ({ users, workOrders, onEdit, t }) => {
    const { employeeId } = useParams();
    const user = users.find(u => u.id === employeeId);
    if (!user) return <div>{t('pages.employees.notFound')}</div>;
    return (
        <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <button onClick={() => onEdit(user)}>{t('common.edit')}</button>
        </div>
    );
};

const FinancePage: React.FC<{ transactions: Transaction[]; spareParts: SparePart[]; onAddTransaction: () => void; onGenerateReport: () => void; t: TFunction; }> = ({ transactions, spareParts, onAddTransaction, onGenerateReport, t }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('transactions');

    const { totalIncome, totalExpense, profitLoss, inventoryValue, totalAssets } = useMemo(() => {
        const approvedTransactions = transactions.filter(t => t.approved !== false);
        const totalIncome = approvedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = approvedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const profitLoss = totalIncome - totalExpense;
        const inventoryValue = spareParts.reduce((sum, part) => sum + (part.stock * (part.purchasePrice || 0)), 0);
        const totalAssets = profitLoss + inventoryValue; // Simplified cash = profitLoss
        return { totalIncome, totalExpense, profitLoss, inventoryValue, totalAssets };
    }, [transactions, spareParts]);

    const renderTransactions = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th className="px-6 py-3">{t('common.date')}</th>
                        <th className="px-6 py-3">{t('common.description')}</th>
                        <th className="px-6 py-3">{t('common.category')}</th>
                        <th className="px-6 py-3 text-right">{t('common.amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.filter(t => t.approved !== false).map(tr => (
                        <tr key={tr.id} className="border-b dark:border-gray-700">
                            <td className="px-6 py-4">{tr.date}</td>
                            <td className="px-6 py-4">{tr.description}</td>
                            <td className="px-6 py-4">{tr.category}</td>
                            <td className={`px-6 py-4 text-right font-medium ${tr.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {tr.type === 'expense' ? '-' : ''}{formatIDR(tr.amount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderProfitLoss = () => (
        <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Laporan Laba Rugi</h3>
            <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Total Pendapatan</span>
                    <span className="font-medium text-green-600">{formatIDR(totalIncome)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Total Pengeluaran</span>
                    <span className="font-medium text-red-600">{formatIDR(totalExpense)}</span>
                </div>
                <div className="flex justify-between pt-2 text-lg">
                    <span className="font-bold">Laba / Rugi Bersih</span>
                    <span className="font-bold">{formatIDR(profitLoss)}</span>
                </div>
            </div>
        </div>
    );

    const renderBalanceSheet = () => (
        <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Neraca</h3>
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <h4 className="font-bold border-b pb-1">Aset</h4>
                    <div className="flex justify-between"><span>Kas (dari Laba Ditahan)</span><span>{formatIDR(profitLoss)}</span></div>
                    <div className="flex justify-between"><span>Nilai Persediaan</span><span>{formatIDR(inventoryValue)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-2"><span>Total Aset</span><span>{formatIDR(totalAssets)}</span></div>
                </div>
                 <div className="space-y-2">
                     <h4 className="font-bold border-b pb-1">Liabilitas & Ekuitas</h4>
                     <div className="flex justify-between"><span>Ekuitas (Laba Ditahan)</span><span>{formatIDR(profitLoss)}</span></div>
                     <div className="flex justify-between font-bold border-t pt-2"><span>Total Liabilitas & Ekuitas</span><span>{formatIDR(profitLoss)}</span></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('pages.finance.title')}</h1>
                <div className="flex space-x-2">
                     <button onClick={() => navigate('/finance/client-report')} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('pages.finance.clientReport')}</button>
                    <button onClick={onGenerateReport} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('pages.finance.generateReport')}</button>
                    <button onClick={onAddTransaction} className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700">{t('pages.finance.addTransaction')}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t('pages.finance.totalIncome')} value={formatIDR(totalIncome)} icon={<FinanceIcon />} color="green" />
                <StatCard title={t('pages.finance.totalExpense')} value={formatIDR(totalExpense)} icon={<FinanceIcon />} color="red" />
                <StatCard title={t('pages.finance.profitLoss')} value={formatIDR(profitLoss)} icon={<FinanceIcon />} color="blue" />
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <button onClick={() => setActiveTab('transactions')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'transactions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.finance.allTransactions')}</button>
                        <button onClick={() => setActiveTab('profit_loss')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profit_loss' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.finance.profitAndLoss')}</button>
                        <button onClick={() => setActiveTab('balance_sheet')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'balance_sheet' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t('pages.finance.balanceSheet')}</button>
                    </nav>
                </div>
                <div>
                    {activeTab === 'transactions' && renderTransactions()}
                    {activeTab === 'profit_loss' && renderProfitLoss()}
                    {activeTab === 'balance_sheet' && renderBalanceSheet()}
                </div>
            </div>
        </div>
    );
};


const ClientFinancePage: React.FC<{ clients: Client[]; customers: Customer[]; workOrders: WorkOrder[]; transactions: Transaction[]; t: TFunction; }> = ({ clients, customers, workOrders, transactions, t }) => {
    const clientReport = useMemo(() => {
        return clients.map(client => {
            const clientCustomers = customers.filter(c => c.clientId === client.id);
            const clientCustomerIds = clientCustomers.map(c => c.id);
            const clientWorkOrders = workOrders.filter(wo => clientCustomerIds.includes(wo.customer.id) && wo.status === WorkOrderStatus.COMPLETED);
            const clientIncome = clientWorkOrders.reduce((sum, wo) => sum + wo.totalCost, 0);
            const clientExpenses = transactions.filter(t => t.clientId === client.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            return {
                ...client,
                income: clientIncome,
                expense: clientExpenses,
                profit: clientIncome - clientExpenses
            };
        });
    }, [clients, customers, workOrders, transactions]);
    
    return <h1>{t('pages.finance.clientReport')}</h1>;
};

const ReimbursementPage: React.FC<{ transactions: Transaction[]; users: User[]; onApprove: (id: string) => void; onViewAttachment: (att: any) => void; t: TFunction; }> = ({ transactions, users, onApprove, onViewAttachment, t }) => {
    const requests = transactions.filter(tr => tr.category === TransactionCategory.REIMBURSEMENT && !tr.approved);
    return (
        <div>
            <h1 className="text-2xl font-bold">{t('pages.reimbursement.title')}</h1>
             {requests.map(req => (
                <div key={req.id}>
                    <p>{req.description} - {formatIDR(req.amount)}</p>
                    <button onClick={() => onApprove(req.id)}>{t('common.approve')}</button>
                    {req.attachment && <button onClick={() => onViewAttachment(req.attachment)}>{t('common.view')} Attachment</button>}
                </div>
            ))}
        </div>
    );
};

const MyReimbursementsPage: React.FC<{ transactions: Transaction[]; currentUser: User; onViewAttachment: (att: any) => void; t: TFunction; }> = ({ transactions, currentUser, onViewAttachment, t }) => {
    const myRequests = transactions.filter(tr => tr.category === TransactionCategory.REIMBURSEMENT && tr.requestedByUserId === currentUser.id);
    return (
         <div>
            <h1 className="text-2xl font-bold">{t('pages.myReimbursements.title')}</h1>
            {myRequests.map(req => (
                <div key={req.id}>
                    <p>{req.description} - {formatIDR(req.amount)} - {req.approved ? t('status.Approved') : t('status.Pending Approval')}</p>
                    {req.attachment && <button onClick={() => onViewAttachment(req.attachment)}>{t('common.view')} Attachment</button>}
                </div>
            ))}
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
    t: TFunction;
}> = ({ spareParts, suppliers, onAddPart, onEditPart, onAddSupplier, onEditSupplier, onImport, onDelete, onBulkDelete, t }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers'>('inventory');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(spareParts.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
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
                    // FIX: Operator '>' cannot be applied to types 'unknown' and 'number'. Cast results.data to any[].
                    if (results.data && (results.data as any[]).length > 0) {
                        onImport(results.data as any[]);
                    }
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
                error: (error: any) => {
                    alert('Error parsing CSV: ' + error.message);
                }
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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
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
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
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

const SettingsPage: React.FC<{
    customers: Customer[];
    workOrders: WorkOrder[];
    users: User[];
    profile: CompanyProfile;
    onProfileSave: (profile: CompanyProfile) => void;
    t: TFunction;
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
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    useEffect(() => {
        setCompanyProfileData(profile);
    }, [profile]);
    
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompanyProfileData({ ...companyProfileData, [e.target.name]: e.target.value });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCompanyProfileData(prev => ({ ...prev, logo: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
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
                            <label className={labelClass}>{t('common.name')}</label>
                            <input type="text" name="name" value={companyProfileData.name} onChange={handleProfileChange} className={inputClass} />
                        </div>
                         <div>
                            <label className={labelClass}>{t('common.phone')}</label>
                            <input type="text" name="phone" value={companyProfileData.phone} onChange={handleProfileChange} className={inputClass} />
                        </div>
                    </div>
                     <div>
                        <label className={labelClass}>{t('common.email')}</label>
                        <input type="email" name="email" value={companyProfileData.email} onChange={handleProfileChange} className={inputClass} />
                    </div>
                     <div>
                        <label className={labelClass}>{t('common.address')}</label>
                        <input type="text" name="address" value={companyProfileData.address} onChange={handleProfileChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>{t('pages.settings.companyLogo')}</label>
                        <div className="mt-2 flex items-center space-x-4">
                            {companyProfileData.logo ? (
                                <img src={companyProfileData.logo} alt="Company Logo" className="h-20 w-20 object-contain rounded-md bg-gray-100 dark:bg-gray-700 p-1 border dark:border-gray-600" />
                            ) : (
                                <div className="h-20 w-20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md text-gray-400">
                                    <BriefcaseIcon className="h-10 w-10" />
                                </div>
                            )}
                            <label className="cursor-pointer px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                                {t('pages.settings.changeLogo')}
                                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
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
    const CHATBOT_AVATAR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAHBgsIBw8QEA0QDQ8PDQ4QEA8NDQ8OFREWFhURExMYHSggGBolGxMVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0NDw0NDisZFRkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//EABEIAJ8AmwMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAgQDBQYBB//EADQQAQABAgMFBwQCAAcAAAAAAAABAgMEBREhMUFREhNhcYGRBiIjUqGxwdFSYhQjM0Jy4fD/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/EACERAQEAAgICAwEBAQAAAAAAAAABEQIhMTJBUQMSYTNx/9oADAMBAAIRAxEAPwD9xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzVdqmmiZqmmIjxl0bfa+Hsqi3brpmqfKIneUCYEdF/tGxbVUTXcoiJ3TudfG7W2b1E00TOKe9W/wAAdQHQ/9asTP7ymnfG//AEc2N2vXMzFFMRHjO+oHQg41e2sWvfcj7QtU4u9VdmmrtUzVT4TAO4Dw1XKaYmarlER4y9FFymqImiqJieExO7IHoAAAAAAAAAAAAAAAAAAAI+0tqxsKiZmubk9KeP0BJR8S7R2rVfmubkxT/LHx9ZX666q5mqqZmfGXkB9DHY2xYnE1+tV4UeEfLzXzbX2jVjK+bVcimbdPSiI/wC5UAPqqqpmZmd5neZAcgCUAAAAAAAAAAAAAAAAAAAJmxsKrE4ii3T4z1T4RHjIP57CwsSu/XFq3G+Z3z4RHjL9E7O2fY2fREURvqe1VPjKo7O2dRs+zFFMb56qp8ZVMgAAIoAAAIgAAIogAAAAAAAIgACKIAACMgA/fsnBfA4Si3V6076vvV4qRAHIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/9k=";

    useEffect(() => {
        if (messages.length <= 1) { // Only reset if it's the initial state
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

// --- App Routes Component ---
const AppRoutes: React.FC<{
    currentUser: User;
    appState: any;
    handlers: any;
    t: TFunction;
}> = ({ currentUser, appState, handlers, t }) => {
    const isAdmin = currentUser.role === UserRole.ADMINISTRATOR || currentUser.role === UserRole.ADMIN;
    const isTech = currentUser.role === UserRole.TECHNICIAN;

    return (
        <Routes>
            <Route path="/" element={
                <Dashboard 
                    workOrders={appState.workOrders}
                    customers={appState.customers}
                    users={appState.users}
                    currentUser={currentUser}
                    transactions={appState.transactions}
                    t={t}
                />
            } />
            <Route path="/customers" element={
                <CustomersAndClientsPage
                    customers={appState.customers}
                    clients={appState.clients}
                    onAddCustomer={() => handlers.openModal('add_customer', null)}
                    onEditCustomer={(c) => handlers.openModal('edit_customer', c)}
                    onAddClient={() => handlers.openModal('add_client', null)}
                    onEditClient={(c) => handlers.openModal('edit_client', c)}
                    currentUser={currentUser}
                    t={t}
                />
            } />
            {isAdmin && <Route path="/customer-edit-requests" element={
                <CustomerEditRequestPage 
                    requests={appState.customerEditRequests}
                    customers={appState.customers}
                    users={appState.users}
                    onApprove={handlers.handleApproveCustomerRequest}
                    onReject={handlers.handleRejectCustomerRequest}
                    t={t}
                />
            } />}
            <Route path="/work-orders" element={
                <WorkOrders
                    user={currentUser}
                    workOrders={appState.workOrders}
                    users={appState.users}
                    onCreate={() => handlers.openModal('create_work_order', null)}
                    onAssign={(wo) => handlers.openModal('assign_technician', wo)}
                    onClaim={handlers.handleClaimWorkOrder}
                    onAddPart={(wo) => handlers.openModal('add_part_to_wo', wo)}
                    onAddCost={(wo) => handlers.openModal('add_cost_to_wo', wo)}
                    onComplete={handlers.handleCompleteWorkOrder}
                    onRequestReimbursement={(wo) => handlers.openModal('request_reimbursement', wo)}
                    t={t}
                />
            } />
            <Route path="/work-orders/:id" element={
                <WorkOrderDetailPage
                    workOrders={appState.workOrders}
                    users={appState.users}
                    spareParts={appState.spareParts}
                    onAddPart={(wo) => handlers.openModal('add_part_to_wo', wo)}
                    onAddCost={(wo) => handlers.openModal('add_cost_to_wo', wo)}
                    onComplete={handlers.handleCompleteWorkOrder}
                    onPrint={handlers.handlePrintWorkOrder}
                    onUploadProof={handlers.handleUploadProof}
                    onChat={handlers.handleWhatsAppChat}
                    onNotify={handlers.handleEmailNotify}
                    onRequestReimbursement={(wo) => handlers.openModal('request_reimbursement', wo)}
                    t={t}
                />
            } />
            {isTech && <Route path="/my-reimbursements" element={
                <MyReimbursementsPage
                    transactions={appState.transactions}
                    currentUser={currentUser}
                    onViewAttachment={(att) => handlers.openModal('view_attachment', att)}
                    t={t}
                />
            } />}
            {isAdmin && <Route path="/reimbursements" element={
                <ReimbursementPage
                    transactions={appState.transactions}
                    users={appState.users}
                    onApprove={handlers.handleApproveReimbursement}
                    onViewAttachment={(att) => handlers.openModal('view_attachment', att)}
                    t={t}
                />
            } />}
            {isAdmin && <Route path="/spare-parts" element={
                <SpareParts
                    spareParts={appState.spareParts}
                    suppliers={appState.suppliers}
                    onAddPart={() => handlers.openModal('add_spare_part', null)}
                    onEditPart={(sp) => handlers.openModal('edit_spare_part', sp)}
                    onDelete={handlers.handleDeleteSparePart}
                    onBulkDelete={handlers.handleBulkDeleteSpareParts}
                    onAddSupplier={() => handlers.openModal('add_supplier', null)}
                    onEditSupplier={(s) => handlers.openModal('edit_supplier', s)}
                    onImport={handlers.handleImportSpareParts}
                    t={t}
                />
            } />}
            {isAdmin && <Route path="/finance" element={
                <FinancePage
                    transactions={appState.transactions}
                    spareParts={appState.spareParts}
                    onAddTransaction={() => handlers.openModal('add_transaction', null)}
                    onGenerateReport={handlers.handleGenerateFinancialReport}
                    t={t}
                />
            } />}
            {isAdmin && <Route path="/finance/client-report" element={
                <ClientFinancePage 
                    clients={appState.clients} 
                    customers={appState.customers} 
                    workOrders={appState.workOrders} 
                    transactions={appState.transactions} 
                    t={t}
                />
            } />}
            {isAdmin && <Route path="/employees" element={
                <EmployeesPage
                    users={appState.users}
                    workOrders={appState.workOrders}
                    attendance={appState.attendance}
                    onAddEmployee={() => handlers.openModal('add_employee', null)}
                    t={t}
                />
            } />}
            {isAdmin && <Route path="/employees/:employeeId" element={
                <TechnicianProfilePage
                    users={appState.users}
                    workOrders={appState.workOrders}
                    onEdit={(u) => handlers.openModal('edit_employee', u)}
                    t={t}
                />
            } />}
            <Route path="/settings" element={
                <SettingsPage
                    customers={appState.customers}
                    workOrders={appState.workOrders}
                    users={appState.users}
                    spareParts={appState.spareParts}
                    suppliers={appState.suppliers}
                    clients={appState.clients}
                    invoices={appState.invoices}
                    transactions={appState.transactions}
                    contracts={appState.contracts}
                    profile={appState.companyProfile}
                    onProfileSave={handlers.setCompanyProfile}
                    language={appState.language}
                    setLanguage={handlers.setLanguage}
                    theme={appState.theme}
                    setTheme={handlers.setTheme}
                    t={t}
                />
            } />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

// --- Root Modal Component ---
const RootModal: React.FC<{
    modalState: { type: string | null; data: any };
    closeModal: () => void;
    handlers: any;
    appState: any;
    t: TFunction;
}> = ({ modalState, closeModal, handlers, appState, t }) => {
    if (!modalState.type) return null;

    switch (modalState.type) {
        case 'request_reimbursement':
            return <ReimbursementModal isOpen={true} onClose={closeModal} onConfirm={handlers.handleRequestReimbursement} t={t} />;
        
        case 'view_attachment':
            return <AttachmentViewerModal isOpen={true} onClose={closeModal} attachment={modalState.data} t={t} />;

        case 'add_employee':
        case 'edit_employee':
            return <AddEditEmployeeModal isOpen={true} onClose={closeModal} onSave={handlers.handleSaveEmployee} user={modalState.data} t={t} />;
        
        case 'add_transaction':
        case 'edit_transaction':
            return <AddEditTransactionModal isOpen={true} onClose={closeModal} onSave={handlers.handleSaveTransaction} transaction={modalState.data} clients={appState.clients} t={t} />;

        case 'add_customer':
        case 'edit_customer':
            return <AddEditCustomerModal isOpen={true} onClose={closeModal} onSave={handlers.handleCustomerSubmit} customer={modalState.data} clients={appState.clients} currentUser={appState.currentUser} t={t} />;

        case 'add_client':
        case 'edit_client':
            return <AddEditClientModal isOpen={true} onClose={closeModal} onSave={handlers.handleSaveClient} client={modalState.data} t={t} />;

        case 'add_supplier':
        case 'edit_supplier':
            return <AddEditSupplierModal isOpen={true} onClose={closeModal} onSave={handlers.handleSaveSupplier} supplier={modalState.data} t={t} />;

        case 'create_work_order':
            return <CreateWorkOrderModal isOpen={true} onClose={closeModal} onSave={handlers.handleCreateWorkOrder} customers={appState.customers} t={t} />;
        
        case 'assign_technician':
            const availableTechnicians = appState.users.filter((u: User) => u.role === UserRole.TECHNICIAN);
            return <AssignTechnicianModal isOpen={true} onClose={closeModal} onSave={handlers.handleAssignTechnician} technicians={availableTechnicians} t={t} />;

        case 'add_part_to_wo':
            return <AddPartToWorkOrderModal isOpen={true} onClose={closeModal} onSave={handlers.handleUpdateWorkOrderParts} availableParts={appState.spareParts} t={t} />;

        case 'add_cost_to_wo':
            return <AddAdditionalCostModal isOpen={true} onClose={closeModal} onSave={handlers.handleSaveAdditionalCost} t={t} />;

        case 'add_spare_part':
        case 'edit_spare_part':
            return <AddEditSparePartModal 
                        isOpen={true} 
                        onClose={closeModal} 
                        onSave={handlers.handleSaveSparePart}
                        onDelete={handlers.handleDeleteSparePart}
                        part={modalState.data}
                        suppliers={appState.suppliers}
                        allSpareParts={appState.spareParts}
                        t={t} 
                    />;
        default:
            return null;
    }
};

const SidebarLink: React.FC<{ 
    item: { key: string; path: string; icon: React.FC<any>; roles: UserRole[] }; 
    isSidebarCollapsed: boolean; 
    t: TFunction 
}> = ({ item, isSidebarCollapsed, t }) => {
    const location = useLocation();
    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    
    return (
        <Link 
            to={item.path} 
            title={isSidebarCollapsed ? t(item.key) : ''} 
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-primary-100 dark:bg-gray-700 text-primary-700 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
        >
            <item.icon className={isSidebarCollapsed ? 'h-8 w-8' : 'h-6 w-6'} />
            {!isSidebarCollapsed && <span className="font-medium">{t(item.key)}</span>}
        </Link>
    );
};

// --- MAIN APP COMPONENT (Simplified for brevity, assuming handlers are defined) ---
const App: React.FC = () => {
    // All state variables and handlers are assumed to be defined here...
    const [language, setLanguage] = useState<'en' | 'id'>((localStorage.getItem('appLanguage') as 'en' | 'id') || 'en');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('appTheme') as 'light' | 'dark') || 'light');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    useEffect(() => { localStorage.setItem('appLanguage', language); }, [language]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('appTheme', theme);
    }, [theme]);

    const t: TFunction = useMemo(() => {
        return (key: string, replacements?: Record<string, string | number>): string => {
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
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
        name: 'ServisPro Inc.',
        address: '123 Service St, Jakarta, Indonesia',
        email: 'contact@servispro.com',
        phone: '0812-3456-7890',
        logo: ''
    });
    const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: null });

    // Notification and Proactive AI Logic...
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
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = new Date();
            const oneHourAgo = now.getTime() - 3600 * 1000;

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

            spareParts.forEach(part => {
                if (part.stock <= 5) {
                    const hasNotif = notifications.some(n => n.partId === part.id);
                    if (!hasNotif) {
                        addNotification(`Stock for ${part.name} is low (${part.stock} left).`, '/spare-parts', undefined, part.id);
                    }
                }
            });
        }, 60000);
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

    // All handlers...
    const handleLogin = (user: User) => setCurrentUser(user);
    const handleLogout = () => setCurrentUser(null);
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

    const handleSaveClient = (client: Client) => {
        const exists = clients.some(c => c.id === client.id);
        if (exists) { setClients(prev => prev.map(c => c.id === client.id ? client : c)); }
        else { setClients(prev => [client, ...prev]); }
        setModalState({ type: null, data: null });
    };

    const handleSaveEmployee = (user: User) => {
        const exists = users.some(u => u.id === user.id);
        if (exists) { setUsers(prev => prev.map(u => u.id === user.id ? user : u)); }
        else { setUsers(prev => [...prev, user]); }
        setModalState({ type: null, data: null });
    };
    
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
        if (!modalState.data) return;
        setWorkOrders(prev => prev.map(wo => wo.id === modalState.data.id ? { ...wo, technicianId: techId, status: WorkOrderStatus.IN_PROGRESS } : wo));
        const tech = users.find(u => u.id === techId);
        addNotification(`Work Order ${modalState.data.id} assigned to ${tech?.name}`, `/work-orders/${modalState.data.id}`, modalState.data.id);
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
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, status: TechnicianStatus.ON_JOB } : u));
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
                description: `Service Income from WO #${wo.id} for ${customer?.name}`,
                type: 'income',
                amount: updatedWO.totalCost,
                category: TransactionCategory.SERVICE_INCOME,
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                workOrderId: wo.id,
                clientId: customer?.clientId,
                approved: true,
            };
            setTransactions(prev => [newTransaction, ...prev]);
        }
        if (wo.technicianId) {
            setUsers(prev => prev.map(u => u.id === wo.technicianId ? { ...u, status: TechnicianStatus.AVAILABLE } : u));
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
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        generatePdfHeader(doc, companyProfile);
    
        doc.setFontSize(14);
        doc.text(`Work Order: #${workOrder.id}`, 20, 60);
        
        autoTable(doc, {
            startY: 65,
            head: [['Customer Details', 'Job Information']],
            body: [[
                `Name: ${workOrder.customer.name}\nPhone: ${workOrder.customer.phone}\nAddress: ${workOrder.customer.address}`,
                `Created: ${new Date(workOrder.createdAt).toLocaleDateString()}\nCompleted: ${workOrder.completedAt ? new Date(workOrder.completedAt).toLocaleDateString() : 'N/A'}\nStatus: ${workOrder.status}`
            ]],
            theme: 'striped',
            styles: { fontSize: 9 },
            headStyles: { fontSize: 10, fontStyle: 'bold' },
            margin: { left: 20, right: 20 }
        });
        
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Deskripsi Pekerjaan']],
            body: [[workOrder.description]],
            styles: { fontSize: 9 },
            headStyles: { fontSize: 10, fontStyle: 'bold' },
            margin: { left: 20, right: 20 }
        });
        
        const costBody: any[][] = [];
        costBody.push(['Biaya Jasa Awal', formatIDR(workOrder.initialServiceFee)]);
    
        if (workOrder.additionalCosts.length > 0) {
            costBody.push([{ content: 'Biaya Tambahan:', styles: { fontStyle: 'bold' } }, '']);
            workOrder.additionalCosts.forEach(cost => {
                costBody.push([`  - ${cost.description}`, formatIDR(cost.amount)]);
            });
        }
    
        if (workOrder.usedParts.length > 0) {
            costBody.push([{ content: 'Suku Cadang:', styles: { fontStyle: 'bold' } }, '']);
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
            bodyStyles: { fontSize: 9 },
            headStyles: { fontSize: 9, fontStyle: 'bold' },
            margin: { left: 20, right: 20 }
        });
    
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Tagihan:', 20, (doc as any).lastAutoTable.finalY + 15);
        doc.text(formatIDR(workOrder.totalCost), 190, (doc as any).lastAutoTable.finalY + 15, { align: 'right' });
        
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

    const handleGenerateFinancialReport = () => {
        alert('Generating financial report...');
    };

    if (!currentUser) {
        if (authScreen === 'signup') {
            return <SignUpScreen onSignUp={handleSignUp} onSwitchToLogin={() => setAuthScreen('login')} t={t} />;
        }
        return <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setAuthScreen('signup')} users={users} t={t} />;
    }
    
    const hasClockedInToday = attendance.some(a => a.userId === currentUser?.id && a.date === new Date().toISOString().split('T')[0] && !a.clockOutTime);

    const navItems = [
      { key: 'sidebar.dashboard', path: '/', icon: DashboardIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN] },
      { key: 'sidebar.customers', path: '/customers', icon: CustomerIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN] },
      { key: 'sidebar.workOrders', path: '/work-orders', icon: WorkOrderIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN] },
      { key: 'sidebar.myReimbursements', path: '/my-reimbursements', icon: ReceiptIcon, roles: [UserRole.TECHNICIAN] },
      { key: 'sidebar.reimbursement', path: '/reimbursements', icon: ReceiptIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN] },
      { key: 'sidebar.spareParts', path: '/spare-parts', icon: SparePartIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN] },
      { key: 'sidebar.finance', path: '/finance', icon: FinanceIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN] },
      { key: 'sidebar.employees', path: '/employees', icon: UsersIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN] },
      { key: 'sidebar.settings', path: '/settings', icon: SettingsIcon, roles: [UserRole.ADMINISTRATOR, UserRole.ADMIN, UserRole.TECHNICIAN] },
    ];

    const accessibleNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

    return (
        <HashRouter>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                <aside className={`flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-24' : 'w-64'}`}>
                    <div className={`h-16 flex items-center border-b border-gray-200 dark:border-gray-700 ${isSidebarCollapsed ? 'justify-center' : 'px-6'}`}>
                        {isSidebarCollapsed ? (
                            <DashboardIcon className="h-8 w-8 text-primary-600" />
                        ) : (
                            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">ServisPro</h1>
                        )}
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                        {accessibleNavItems.map(item => (
                            <SidebarLink key={item.path} item={item} isSidebarCollapsed={isSidebarCollapsed} t={t} />
                        ))}
                    </nav>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`flex items-center w-full space-x-3 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}>
                            {isSidebarCollapsed ? <ChevronsRightIcon className="h-6 w-6" /> : <ChevronsLeftIcon className="h-6 w-6" />}
                            {!isSidebarCollapsed && <span className="font-medium">{t('sidebar.collapseMenu')}</span>}
                        </button>
                        <button onClick={handleLogout} className={`flex items-center w-full space-x-3 px-4 py-2 mt-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ${isSidebarCollapsed ? 'justify-center' : ''}`} title={isSidebarCollapsed ? t('sidebar.logout') : ''}>
                            <LogoutIcon className="h-6 w-6" />
                            {!isSidebarCollapsed && <span className="font-medium">{t('sidebar.logout')}</span>}
                        </button>
                    </div>
                </aside>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-6 z-10 border-b dark:border-gray-700">
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                            {currentUser.role === UserRole.TECHNICIAN && (
                                <div className="mr-4">
                                {!hasClockedInToday ? (
                                    <button onClick={handleClockIn} className="px-3 py-1.5 text-sm rounded-md bg-green-500 text-white hover:bg-green-600">{t('pages.employees.clockIn')}</button>
                                ) : (
                                    <button onClick={handleClockOut} className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600">{t('pages.employees.clockOut')}</button>
                                )}
                                </div>
                            )}
                            <span>{new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <BellIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                    {notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>}
                                </button>
                                {isNotificationsOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-20">
                                      <div className="p-3 border-b dark:border-gray-700">
                                        <h3 className="font-semibold text-gray-800 dark:text-white">{t('pages.notifications.title')}</h3>
                                      </div>
                                      <div className="max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                          notifications.map(n => (
                                            <Link to={n.link} key={n.id} onClick={() => setIsNotificationsOpen(false)} className={`block p-3 border-b dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 ${!n.read ? 'font-semibold' : ''}`}>
                                              <p className="text-sm">{n.message}</p>
                                              <p className="text-xs text-gray-500 mt-1">{timeAgo(n.timestamp)}</p>
                                            </Link>
                                          ))
                                        ) : (
                                          <p className="p-4 text-sm text-gray-500">{t('pages.notifications.empty')}</p>
                                        )}
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
                        <AppRoutes 
                            currentUser={currentUser}
                            appState={{
                                workOrders, customers, users, transactions, spareParts, 
                                suppliers, clients, invoices, contracts, attendance, 
                                customerEditRequests, companyProfile, language, theme
                            }}
                            handlers={{
                                handleCreateWorkOrder, handleAssignTechnician, handleClaimWorkOrder, handleCompleteWorkOrder,
                                handleUpdateWorkOrderParts, handleSaveAdditionalCost, handlePrintWorkOrder, handleUploadProof,
                                handleWhatsAppChat, handleEmailNotify, handleRequestReimbursement, handleApproveReimbursement,
                                handleCustomerSubmit, handleApproveCustomerRequest, handleRejectCustomerRequest,
                                handleSaveClient, handleSaveEmployee, handleSaveTransaction, handleGenerateFinancialReport,
                                handleSaveSparePart, handleDeleteSparePart, handleBulkDeleteSpareParts, handleImportSpareParts,
                                handleSaveSupplier, setCompanyProfile, setLanguage, setTheme,
                                openModal: (type: string, data: any) => setModalState({ type, data }),
                            }}
                            t={t}
                        />
                    </main>
                </div>
                
                <Chatbot currentUser={currentUser} appData={{ customers, workOrders, spareParts, invoices, users, transactions }} initialMessage={proactiveChatbotMessage} />
                
                <RootModal 
                    modalState={modalState}
                    closeModal={() => setModalState({ type: null, data: null })}
                    handlers={{
                        handleRequestReimbursement, handleSaveEmployee, handleSaveTransaction, handleCustomerSubmit,
                        handleSaveClient, handleSaveSupplier, handleCreateWorkOrder, handleAssignTechnician,
                        handleUpdateWorkOrderParts, handleSaveAdditionalCost, handleSaveSparePart, handleDeleteSparePart
                    }}
                    appState={{
                        clients, users, spareParts, suppliers, customers, currentUser
                    }}
                    t={t}
                />
            </div>
        </HashRouter>
    );
};

export default App;