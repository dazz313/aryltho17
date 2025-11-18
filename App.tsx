import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, UserRole, Customer, WorkOrder, WorkOrderStatus, SparePart, Invoice, Transaction, Notification, ChatMessage, CompanyProfile, TechnicianStatus, TransactionCategory, PaymentMethod, ServiceContract, ContractStatus, Supplier, Client } from './types';
import { AiIcon, CustomerIcon, DashboardIcon, FinanceIcon, LogoutIcon, SettingsIcon, SparePartIcon, TechnicianIcon, WorkOrderIcon, SpinnerIcon, XIcon, BellIcon, SendIcon, UsersIcon, ChevronsLeftIcon, ChevronsRightIcon, ReceiptIcon, MapPinIcon, MoreVerticalIcon, TruckIcon, BriefcaseIcon, ClipboardIcon } from './components/icons';
import { generateAiSummary, getChatbotResponse } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- I18N Translations ---
const translations = {
  en: {
    sidebar: {
      dashboard: 'Dashboard', customers: 'Customers', workOrders: 'Work Orders', notifications: 'Notifications',
      myReimbursements: 'My Reimbursements', reimbursement: 'Reimbursement', spareParts: 'Spare Parts',
      finance: 'Finance', employees: 'Employees', settings: 'Settings', logout: 'Logout',
      dataPendaftaran: 'Registration Data',
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
      reject: 'Reject', import: 'Import'
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
        importCustomersTitle: 'Import Customers',
        importSparePartsTitle: 'Import Spare Parts',
        importInstructions: 'To import data, please download the template file, fill it with your data, and then upload it back here.',
        importData: 'Import Data'
    },
    pages: {
        notifications: { title: 'Notifications', markAllRead: 'Mark all as read', empty: 'You have no notifications.' },
        reimbursement: { title: 'Reimbursement Requests', requestedBy: 'Requested By', empty: 'No reimbursement requests found.' },
        myReimbursements: { title: 'My Reimbursement History', workOrderId: 'Work Order ID', empty: 'You have not requested any reimbursements.'},
        customers: { title: 'Customers & Clients', customerList: 'Customer List', clientList: 'Client List', clientsTab: 'Clients', customersTab: 'Customers' },
        customerDetail: { back: 'Back to all customers', details: 'Customer Details', contracts: 'Service Contracts', history: 'Service History', noContracts: 'No contracts found.', noHistory: 'No service history found.' },
        workOrders: { title: 'Work Order Management', myTitle: 'Work Orders', myFullName: '{name}', allOrders: 'All Work Orders', myAssigned: 'My Assigned Work Orders', available: 'Available Work Orders', technician: 'Technician', unassigned: 'Unassigned', claimJob: 'Claim Job' },
        spareParts: { title: 'Spare Part Management', inventory: 'Spare Part Inventory', suppliers: 'Suppliers', partName: 'Part Name', stock: 'Stock', location: 'Location', usageSummary: 'Usage Summary', totalPartsUsed: 'Total Parts Used', totalValueUsed: 'Total Value of Used Parts', mostUsedPart: 'Most Used Part', highestValuePart: 'Highest Value Part', timesUsed: 'Times Used', totalValue: 'Total Value' },
        finance: { title: 'Finance', generateReport: 'Generate Financial Report', totalIncome: 'Total Income', totalExpense: 'Total Expense', profitLoss: 'Profit / Loss', invoices: 'Invoices', allTransactions: 'All Transactions', balanceSheet: 'Balance Sheet (Neraca)', assets: 'Assets', cash: 'Cash', liabilities: 'Liabilities', opCosts: 'Operational Costs', equity: 'Equity', retainedEarnings: 'Retained Earnings (Profit)' },
        employees: { title: 'Employee Management', allEmployees: 'All Employees', performance: 'Performance', contact: 'Contact' },
        technicianProfile: { title: 'Technician Profile', back: 'Back to all employees', personalInfo: 'Personal Information', recentActivity: 'Recent Activity' },
        settings: { title: 'Settings & Data', companyProfile: 'Company Profile (KOP Surat)', dataBackup: 'Data Backup & Restore', exportData: 'Export Data', exportDesc: 'Download a copy of your application data.', restoreData: 'Restore Data', restoreDesc: 'Upload a JSON backup file to restore data.', language: 'Language / Bahasa' },
        registrations: { title: 'Pending Registrations', applicant: 'Applicant', role: 'Role', contact: 'Contact Info', approve: 'Approve', reject: 'Reject', empty: 'No pending registrations.' }
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
      invalidCredentials: 'Invalid credentials. Please check your email/phone and password.',
      approvalPending: 'Your account is pending administrator approval.'
    }
  },
  id: {
    sidebar: {
      dashboard: 'Dasbor', customers: 'Pelanggan', workOrders: 'Perintah Kerja', notifications: 'Notifikasi',
      myReimbursements: 'Reimbursement Saya', reimbursement: 'Reimbursement', spareParts: 'Suku Cadang',
      finance: 'Keuangan', employees: 'Karyawan', settings: 'Pengaturan', logout: 'Keluar',
      dataPendaftaran: 'Data Pendaftaran',
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
      reject: 'Tolak', import: 'Impor'
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
        importCustomersTitle: 'Impor Pelanggan',
        importSparePartsTitle: 'Impor Suku Cadang',
        importInstructions: 'Untuk impor data, unduh file template, isi dengan data Anda, lalu unggah kembali di sini.',
        importData: 'Impor Data'
    },
    pages: {
        notifications: { title: 'Notifikasi', markAllRead: 'Tandai semua dibaca', empty: 'Anda tidak memiliki notifikasi.' },
        reimbursement: { title: 'Permintaan Reimbursement', requestedBy: 'Diajukan Oleh', empty: 'Tidak ada permintaan reimbursement.' },
        myReimbursements: { title: 'Riwayat Reimbursement Saya', workOrderId: 'ID Perintah Kerja', empty: 'Anda belum mengajukan reimbursement.' },
        customers: { title: 'Pelanggan & Klien', customerList: 'Daftar Pelanggan', clientList: 'Daftar Klien', clientsTab: 'Klien', customersTab: 'Pelanggan' },
        customerDetail: { back: 'Kembali ke semua pelanggan', details: 'Detail Pelanggan', contracts: 'Kontrak Servis', history: 'Riwayat Servis', noContracts: 'Tidak ada kontrak.', noHistory: 'Tidak ada riwayat servis.' },
        workOrders: { title: 'Manajemen Perintah Kerja', myTitle: 'Perintah Kerja', myFullName: '{name}', allOrders: 'Semua Perintah Kerja', myAssigned: 'Tugas Saya', available: 'SPK Tersedia', technician: 'Teknisi', unassigned: 'Belum Ditugaskan', claimJob: 'Ambil Pekerjaan' },
        spareParts: { title: 'Manajemen Suku Cadang', inventory: 'Inventaris Suku Cadang', suppliers: 'Pemasok', partName: 'Nama Part', stock: 'Stok', location: 'Lokasi', usageSummary: 'Ringkasan Penggunaan', totalPartsUsed: 'Total Part Terpakai', totalValueUsed: 'Total Nilai Part Terpakai', mostUsedPart: 'Part Paling Sering Dipakai', highestValuePart: 'Part Nilai Tertinggi', timesUsed: 'Digunakan (kali)', totalValue: 'Total Nilai' },
        finance: { title: 'Keuangan', generateReport: 'Buat Laporan Keuangan', totalIncome: 'Total Pendapatan', totalExpense: 'Total Pengeluaran', profitLoss: 'Laba / Rugi', invoices: 'Faktur', semuaTransaksi: 'Semua Transaksi', balanceSheet: 'Neraca', assets: 'Aset', cash: 'Kas', liabilities: 'Liabilitas', opCosts: 'Biaya Operasional', equity: 'Ekuitas', retainedEarnings: 'Laba Ditahan' },
        employees: { title: 'Manajemen Karyawan', allEmployees: 'Semua Karyawan', performance: 'Kinerja', contact: 'Kontak' },
        technicianProfile: { title: 'Profil Teknisi', back: 'Kembali ke semua karyawan', personalInfo: 'Informasi Pribadi', aktivitasTerkini: 'Aktivitas Terkini' },
        settings: { title: 'Pengaturan & Data', companyProfile: 'Profil Perusahaan (KOP Surat)', dataBackup: 'Cadangkan & Pulihkan Data', exportData: 'Ekspor Data', exportDesc: 'Unduh salinan data aplikasi Anda.', restoreData: 'Pulihkan Data', restoreDesc: 'Unggah file cadangan JSON untuk memulihkan data.', language: 'Language / Bahasa' },
        registrations: { title: 'Pendaftaran Tertunda', applicant: 'Pemohon', role: 'Peran', contact: 'Info Kontak', approve: 'Setujui', reject: 'Tolak', empty: 'Tidak ada pendaftaran tertunda.' }
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
      invalidCredentials: 'Kredensial salah. Silakan periksa email/telepon dan kata sandi Anda.',
      approvalPending: 'Akun Anda sedang menunggu persetujuan administrator.'
    }
  }
};


// --- INITIAL MOCK DATA ---
const INITIAL_USERS: User[] = [
    {
        id: 'user-admin-1',
        name: 'Admin Utama (Administrator)',
        role: UserRole.ADMINISTRATOR,
        email: 'admin@servispro.com',
        phone: '081200000001',
        password: 'password',
        approved: true,
    },
    {
        id: 'user-budi',
        name: 'Budi Santoso (Technician)',
        role: UserRole.TECHNICIAN,
        email: 'budi@servispro.com',
        phone: '081200001001',
        password: 'password',
        status: TechnicianStatus.AVAILABLE,
        approved: true,
        skills: ['AC Repair', 'Plumbing', 'Electrical'],
        employeeId: 'T001',
        joinDate: '2022-01-15',
        placeOfBirth: 'Jakarta',
        dateOfBirth: '1990-05-20',
        address: 'Jl. Merdeka No. 10, Jakarta',
        gender: 'Male',
        age: 34,
    },
    {
        id: 'user-citra',
        name: 'Citra Lestari (Admin)',
        role: UserRole.ADMIN,
        email: 'citra@servispro.com',
        phone: '081200002002',
        password: 'password',
        approved: true,
    }
];

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
        if (user.approved === false) {
            setError(t('login.approvalPending'));
            return;
        }
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
            status: role === UserRole.TECHNICIAN ? TechnicianStatus.AVAILABLE : undefined,
            approved: false,
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
const ImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[]) => void;
    templateHeaders: string[];
    templateFileName: string;
    title: string;
    t: Function;
}> = ({ isOpen, onClose, onImport, templateHeaders, templateFileName, title, t }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, templateFileName);
    };

    const handleImport = () => {
        if (!file) return;
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                onImport(jsonData);
            } catch (error) {
                console.error("Error parsing file:", error);
                alert("Failed to parse the file. Please ensure it's a valid Excel/CSV file and matches the template format.");
            } finally {
                setIsLoading(false);
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <p className="text-sm text-gray-600">{t('modals.importInstructions')}</p>
                <button
                    onClick={handleDownloadTemplate}
                    className="w-full text-center px-4 py-2 rounded-lg border border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold"
                >
                    {t('common.download')} Template
                </button>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Upload File</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        accept=".xlsx, .xls, .csv"
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                </div>
                <div className="flex justify-end pt-4 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                    <button
                        onClick={handleImport}
                        disabled={!file || isLoading}
                        className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-400 flex items-center space-x-2"
                    >
                        {isLoading && <SpinnerIcon className="h-4 w-4" />}
                        <span>{t('modals.importData')}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

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

const RegistrationsPage: React.FC<{
    users: User[];
    onApprove: (userId: string) => void;
    onReject: (userId: string) => void;
    t: Function;
}> = ({ users, onApprove, onReject, t }) => {
    const pendingUsers = users.filter(u => u.approved === false);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.registrations.title')}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">{t('pages.registrations.applicant')}</th>
                                <th scope="col" className="px-6 py-3">{t('pages.registrations.role')}</th>
                                <th scope="col" className="px-6 py-3">{t('pages.registrations.contact')}</th>
                                <th scope="col" className="px-6 py-3">{t('common.status')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(user => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{formatUserName(user.name)}</td>
                                    <td className="px-6 py-4 capitalize">{user.role}</td>
                                    <td className="px-6 py-4">
                                        <div>{user.email || '-'}</div>
                                        <div>{user.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor('Pending Approval')}`}>
                                            {t('status.Pending Approval')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => onApprove(user.id)} className="font-medium text-green-600 hover:underline">{t('pages.registrations.approve')}</button>
                                        <button onClick={() => onReject(user.id)} className="font-medium text-red-600 hover:underline">{t('pages.registrations.reject')}</button>
                                    </td>
                                </tr>
                            ))}
                            {pendingUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-500">
                                        {t('pages.registrations.empty')}
                                    </td>
                                </tr>
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

  const isAdministrator = currentUser.role === UserRole.ADMINISTRATOR;

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

        {isAdministrator && (
            <StatCard title={t('dashboard.monthlyRevenue')} value={formatIDR(monthlyRevenueData[3].revenue)} icon={<FinanceIcon />} color="green" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {isAdministrator && (
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
        )}
        <div className={`${isAdministrator ? 'lg:col-span-2' : 'lg:col-span-5'} bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300`}>
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

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                <AiIcon className="h-5 w-5 mr-2 text-primary-600"/>
                {t('dashboard.aiSummaryTitle')}
            </h2>
             <button
                onClick={handleGenerateSummary}
                disabled={isLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 flex items-center text-sm"
            >
                {isLoading ? (
                    <>
                        <SpinnerIcon className="h-4 w-4 mr-2" />
                        {t('dashboard.generating')}
                    </>
                ) : (
                    t('dashboard.generateSummary')
                )}
            </button>
        </div>
        {summary ? (
            <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200">
                <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
            </div>
        ) : (
            <p className="text-gray-500 text-sm italic">{t('dashboard.aiPrompt')}</p>
        )}
      </div>
    </div>
  );
};

const CustomersPage: React.FC<{
    customers: Customer[],
    clients: Client[],
    contracts: ServiceContract[],
    onAddCustomer: () => void,
    onEditCustomer: (c: Customer) => void,
    onAddClient: () => void,
    onEditClient: (c: Client) => void,
    onImportCustomers: () => void,
    t: Function
}> = ({ customers, clients, contracts, onAddCustomer, onEditCustomer, onAddClient, onEditClient, onImportCustomers, t }) => {
    const [activeTab, setActiveTab] = useState<'customers' | 'clients'>('customers');

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{t('pages.customers.title')}</h1>
                <div className="space-x-2 flex">
                    <button onClick={onImportCustomers} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm flex items-center">
                        <ClipboardIcon className="w-4 h-4 mr-2" />
                        {t('common.import')}
                    </button>
                    <button onClick={activeTab === 'customers' ? onAddCustomer : onAddClient} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm flex items-center">
                        <XIcon className="w-4 h-4 mr-2 rotate-45" />
                        {t('common.add')} {activeTab === 'customers' ? 'Customer' : 'Client'}
                    </button>
                </div>
            </div>

            <div className="mb-4 border-b border-gray-200">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('customers')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'customers' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>
                            {t('pages.customers.customersTab')}
                        </button>
                    </li>
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('clients')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'clients' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>
                            {t('pages.customers.clientsTab')}
                        </button>
                    </li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                {activeTab === 'customers' ? (
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">{t('common.name')}</th>
                                    <th scope="col" className="px-6 py-3">{t('common.email')} / {t('common.phone')}</th>
                                    <th scope="col" className="px-6 py-3">{t('common.address')}</th>
                                    <th scope="col" className="px-6 py-3">{t('common.category')}</th>
                                    <th scope="col" className="px-6 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(c => (
                                    <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                                        <td className="px-6 py-4">
                                            <div>{c.email}</div>
                                            <div className="text-xs text-gray-500">{c.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">{c.address}</td>
                                        <td className="px-6 py-4"><span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">{c.category}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEditCustomer(c)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                                {customers.length === 0 && <tr><td colSpan={5} className="text-center py-4">{t('pages.customers.empty')}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">{t('common.name')}</th>
                                    <th scope="col" className="px-6 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map(c => (
                                    <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEditClient(c)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                                {clients.length === 0 && <tr><td colSpan={2} className="text-center py-4">{t('pages.customers.empty')}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const WorkOrdersPage: React.FC<{
    workOrders: WorkOrder[],
    technicians: User[],
    customers: Customer[],
    currentUser: User,
    onCreate: () => void,
    onAssign: (wo: WorkOrder) => void,
    onUpdateStatus: (woId: string, status: WorkOrderStatus) => void,
    onAddParts: (wo: WorkOrder) => void,
    onConfirmPayment: (wo: WorkOrder) => void,
    onRequestReimbursement: (wo: WorkOrder) => void,
    t: Function
}> = ({ workOrders, technicians, customers, currentUser, onCreate, onAssign, onUpdateStatus, onAddParts, onConfirmPayment, onRequestReimbursement, t }) => {
    const getTechnicianName = (id: string | null) => {
        if (!id) return t('pages.workOrders.unassigned');
        const tech = technicians.find(t => t.id === id);
        return tech ? formatUserName(tech.name) : 'Unknown';
    };

    const filteredWorkOrders = currentUser.role === UserRole.TECHNICIAN
        ? workOrders.filter(wo => wo.technicianId === currentUser.id || (wo.technicianId === null && wo.status === WorkOrderStatus.PENDING))
        : workOrders;

    return (
        <div>
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{currentUser.role === UserRole.TECHNICIAN ? t('pages.workOrders.myTitle') : t('pages.workOrders.title')}</h1>
                {currentUser.role !== UserRole.TECHNICIAN && (
                    <button onClick={onCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm flex items-center">
                        <XIcon className="w-4 h-4 mr-2 rotate-45" />
                        {t('common.create')} WO
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredWorkOrders.map(wo => (
                    <div key={wo.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-primary-500 relative">
                         <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{wo.customer.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">{wo.id} • {new Date(wo.createdAt).toLocaleDateString()}</p>
                                <p className="text-gray-700 mb-2">{wo.description}</p>
                                <p className="text-sm text-gray-600 flex items-center">
                                    <TechnicianIcon className="h-4 w-4 mr-1"/>
                                    {getTechnicianName(wo.technicianId)}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(wo.status)}`}>
                                    {t(`status.${wo.status}`)}
                                </span>
                                <p className="mt-2 text-lg font-bold text-primary-600">{formatIDR(wo.totalCost)}</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                             {/* Actions for Admin/Administrator */}
                            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ADMINISTRATOR) && (
                                <>
                                    {wo.status === WorkOrderStatus.PENDING && (
                                        <button onClick={() => onAssign(wo)} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-sm font-medium">Assign Tech</button>
                                    )}
                                    {wo.status === WorkOrderStatus.COMPLETED && (
                                        <button onClick={() => onConfirmPayment(wo)} className="px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm font-medium">Confirm Payment</button>
                                    )}
                                    <button onClick={() => onAddParts(wo)} className="px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm font-medium">Add Parts</button>
                                </>
                            )}

                            {/* Actions for Technician */}
                            {currentUser.role === UserRole.TECHNICIAN && (
                                <>
                                    {wo.technicianId === null && (
                                         <button onClick={() => onAssign(wo)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">{t('pages.workOrders.claimJob')}</button>
                                    )}
                                    {wo.technicianId === currentUser.id && (
                                        <>
                                            {wo.status === WorkOrderStatus.PENDING && (
                                                <button onClick={() => onUpdateStatus(wo.id, WorkOrderStatus.IN_PROGRESS)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">Start Job</button>
                                            )}
                                            {wo.status === WorkOrderStatus.IN_PROGRESS && (
                                                <button onClick={() => onUpdateStatus(wo.id, WorkOrderStatus.COMPLETED)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium">Complete Job</button>
                                            )}
                                            <button onClick={() => onAddParts(wo)} className="px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm font-medium">Add Parts</button>
                                            <button onClick={() => onRequestReimbursement(wo)} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 text-sm font-medium">Reimburse</button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
                 {filteredWorkOrders.length === 0 && <p className="text-gray-500 text-center py-12">No work orders found.</p>}
            </div>
        </div>
    );
};

const SparePartsPage: React.FC<{
    spareParts: SparePart[],
    suppliers: Supplier[],
    workOrders: WorkOrder[],
    onAddPart: () => void,
    onEditPart: (p: SparePart) => void,
    onAddSupplier: () => void,
    onEditSupplier: (s: Supplier) => void,
    onImportSpareParts: () => void,
    t: Function
}> = ({ spareParts, suppliers, workOrders, onAddPart, onEditPart, onAddSupplier, onEditSupplier, onImportSpareParts, t }) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers' | 'summary'>('inventory');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const usageStats = useMemo(() => {
        const stats: Record<string, { count: number, value: number, name: string }> = {};
        
        workOrders.forEach(wo => {
            wo.spareParts.forEach(part => {
                if (!stats[part.id]) {
                    stats[part.id] = { count: 0, value: 0, name: part.name };
                }
                stats[part.id].count += 1;
                stats[part.id].value += part.sellingPrice;
            });
        });

        let statsArray = Object.values(stats);

        if (sortConfig) {
            statsArray.sort((a, b) => {
                if (a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return statsArray;
    }, [workOrders, sortConfig]);

    const totalPartsUsed = usageStats.reduce((acc, curr) => acc + curr.count, 0);
    const totalValueUsed = usageStats.reduce((acc, curr) => acc + curr.value, 0);
    const mostUsedPart = usageStats.length > 0 ? [...usageStats].sort((a, b) => b.count - a.count)[0] : null;
    const highestValuePart = usageStats.length > 0 ? [...usageStats].sort((a, b) => b.value - a.value)[0] : null;

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{t('pages.spareParts.title')}</h1>
                <div className="flex space-x-2">
                    {activeTab === 'inventory' && (
                        <button onClick={onImportSpareParts} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm flex items-center">
                            <ClipboardIcon className="w-4 h-4 mr-2" />
                            {t('common.import')}
                        </button>
                    )}
                    {activeTab !== 'summary' && (
                        <button onClick={activeTab === 'inventory' ? onAddPart : onAddSupplier} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm flex items-center">
                            <XIcon className="w-4 h-4 mr-2 rotate-45" />
                            {t('common.add')} {activeTab === 'inventory' ? 'Part' : 'Supplier'}
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4 border-b border-gray-200">
                 <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('inventory')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'inventory' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>{t('pages.spareParts.inventory')}</button>
                    </li>
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('suppliers')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'suppliers' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>{t('pages.spareParts.suppliers')}</button>
                    </li>
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('summary')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'summary' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>{t('pages.spareParts.usageSummary')}</button>
                    </li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                {activeTab === 'inventory' && (
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Item Code</th>
                                    <th className="px-6 py-3">{t('pages.spareParts.partName')}</th>
                                    <th className="px-6 py-3">{t('pages.spareParts.stock')}</th>
                                    <th className="px-6 py-3">Price</th>
                                    <th className="px-6 py-3">{t('pages.spareParts.location')}</th>
                                    <th className="px-6 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {spareParts.map(part => (
                                    <tr key={part.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs">{part.itemCode}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{part.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold ${part.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>{part.stock} {part.unit}</span>
                                        </td>
                                        <td className="px-6 py-4">{formatIDR(part.sellingPrice)}</td>
                                        <td className="px-6 py-4">{part.location}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEditPart(part)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                                {spareParts.length === 0 && <tr><td colSpan={6} className="text-center py-4">No spare parts found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
                 {activeTab === 'suppliers' && (
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">{t('common.name')}</th>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3">{t('common.phone')}</th>
                                    <th className="px-6 py-3">{t('common.email')}</th>
                                    <th className="px-6 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(s => (
                                    <tr key={s.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                                        <td className="px-6 py-4">{s.contactPerson}</td>
                                        <td className="px-6 py-4">{s.phone}</td>
                                        <td className="px-6 py-4">{s.email}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEditSupplier(s)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                                {suppliers.length === 0 && <tr><td colSpan={5} className="text-center py-4">No suppliers found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'summary' && (
                    <div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-600 font-semibold">{t('pages.spareParts.totalPartsUsed')}</p>
                                <p className="text-2xl font-bold text-blue-800">{totalPartsUsed}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-sm text-green-600 font-semibold">{t('pages.spareParts.totalValueUsed')}</p>
                                <p className="text-2xl font-bold text-green-800">{formatIDR(totalValueUsed)}</p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <p className="text-sm text-yellow-600 font-semibold">{t('pages.spareParts.mostUsedPart')}</p>
                                <p className="text-lg font-bold text-yellow-800 truncate" title={mostUsedPart?.name}>{mostUsedPart ? mostUsedPart.name : '-'}</p>
                            </div>
                             <div className="bg-purple-50 p-4 rounded-lg">
                                <p className="text-sm text-purple-600 font-semibold">{t('pages.spareParts.highestValuePart')}</p>
                                <p className="text-lg font-bold text-purple-800 truncate" title={highestValuePart?.name}>{highestValuePart ? highestValuePart.name : '-'}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">{t('pages.spareParts.partName')}</th>
                                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('count')}>
                                            {t('pages.spareParts.timesUsed')} {sortConfig?.key === 'count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('value')}>
                                            {t('pages.spareParts.totalValue')} {sortConfig?.key === 'value' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usageStats.map((stat, idx) => (
                                        <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{stat.name}</td>
                                            <td className="px-6 py-4">{stat.count}</td>
                                            <td className="px-6 py-4 font-semibold">{formatIDR(stat.value)}</td>
                                        </tr>
                                    ))}
                                    {usageStats.length === 0 && <tr><td colSpan={3} className="text-center py-4">No usage data available.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FinancePage: React.FC<{
    invoices: Invoice[],
    transactions: Transaction[],
    onAddInvoice: () => void,
    onEditInvoice: (inv: Invoice) => void,
    onAddTransaction: () => void,
    onEditTransaction: (trn: Transaction) => void,
    onViewAttachment: (att: {name: string, type: string, data: string}) => void,
    t: Function
}> = ({ invoices, transactions, onAddInvoice, onEditInvoice, onAddTransaction, onEditTransaction, onViewAttachment, t }) => {
    const [activeTab, setActiveTab] = useState<'invoices' | 'transactions' | 'balance'>('invoices');

    // Calculations for Balance Sheet
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalIncome - totalExpense;

    const assets = {
        cash: totalIncome - totalExpense, // Simplified
        receivables: invoices.filter(i => i.status === 'Unpaid').reduce((sum, i) => sum + i.amount, 0),
    };
    const liabilities = {
        payables: 0, // Placeholder
    };
    const equity = {
        retainedEarnings: netIncome,
    }
    const totalAssets = assets.cash + assets.receivables;
    const totalLiabilitiesEquity = liabilities.payables + equity.retainedEarnings;


    return (
        <div>
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{t('pages.finance.title')}</h1>
                <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm flex items-center">
                        <ClipboardIcon className="w-4 h-4 mr-2" />
                        {t('pages.finance.generateReport')}
                    </button>
                    {activeTab !== 'balance' && (
                         <button onClick={activeTab === 'invoices' ? onAddInvoice : onAddTransaction} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm flex items-center">
                            <XIcon className="w-4 h-4 mr-2 rotate-45" />
                            {t('common.add')} {activeTab === 'invoices' ? 'Invoice' : 'Transaction'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <p className="text-sm text-gray-500 uppercase tracking-wider">{t('pages.finance.totalIncome')}</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatIDR(totalIncome)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                    <p className="text-sm text-gray-500 uppercase tracking-wider">{t('pages.finance.totalExpense')}</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatIDR(totalExpense)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500 uppercase tracking-wider">{t('pages.finance.profitLoss')}</p>
                    <p className={`text-2xl font-bold mt-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatIDR(netIncome)}</p>
                </div>
            </div>

            <div className="mb-4 border-b border-gray-200">
                 <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('invoices')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'invoices' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>{t('pages.finance.invoices')}</button>
                    </li>
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('transactions')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'transactions' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>{t('pages.finance.allTransactions')}</button>
                    </li>
                    <li className="mr-2">
                        <button onClick={() => setActiveTab('balance')} className={`inline-block p-4 rounded-t-lg border-b-2 ${activeTab === 'balance' ? 'text-primary-600 border-primary-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}>{t('pages.finance.balanceSheet')}</button>
                    </li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                {activeTab === 'invoices' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Invoice ID</th>
                                    <th className="px-6 py-3">{t('common.date')}</th>
                                    <th className="px-6 py-3">{t('common.amount')}</th>
                                    <th className="px-6 py-3">{t('common.status')}</th>
                                    <th className="px-6 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{inv.id}</td>
                                        <td className="px-6 py-4">{inv.issuedDate}</td>
                                        <td className="px-6 py-4">{formatIDR(inv.amount)}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(inv.status)}`}>{t(`status.${inv.status}`)}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEditInvoice(inv)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'transactions' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">{t('common.date')}</th>
                                    <th className="px-6 py-3">{t('common.description')}</th>
                                    <th className="px-6 py-3">{t('common.category')}</th>
                                    <th className="px-6 py-3">{t('common.amount')}</th>
                                    <th className="px-6 py-3">{t('common.attachment')}</th>
                                    <th className="px-6 py-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(transaction => (
                                    <tr key={transaction.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">{transaction.date}</td>
                                        <td className="px-6 py-4">{transaction.description}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{transaction.category}</span></td>
                                        <td className={`px-6 py-4 font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatIDR(transaction.amount)}</td>
                                        <td className="px-6 py-4">
                                             {transaction.attachment ? (
                                                <button onClick={() => onViewAttachment(transaction.attachment!)} className="font-medium text-blue-600 hover:underline">{t('common.view')}</button>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => onEditTransaction(transaction)} className="font-medium text-blue-600 hover:underline">{t('common.edit')}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'balance' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">{t('pages.finance.assets')}</h3>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span>{t('pages.finance.cash')}</span>
                                <span>{formatIDR(assets.cash)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span>Accounts Receivable</span>
                                <span>{formatIDR(assets.receivables)}</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold mt-2">
                                <span>Total {t('pages.finance.assets')}</span>
                                <span>{formatIDR(totalAssets)}</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">{t('pages.finance.liabilities')} & {t('pages.finance.equity')}</h3>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span>{t('pages.finance.liabilities')} (Payables)</span>
                                <span>{formatIDR(liabilities.payables)}</span>
                            </div>
                             <div className="flex justify-between py-2 border-b border-gray-100">
                                <span>{t('pages.finance.retainedEarnings')}</span>
                                <span>{formatIDR(equity.retainedEarnings)}</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold mt-2">
                                <span>Total {t('pages.finance.liabilities')} & {t('pages.finance.equity')}</span>
                                <span>{formatIDR(totalLiabilitiesEquity)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const EmployeesPage: React.FC<{
    users: User[],
    onAddEmployee: () => void,
    onEditEmployee: (u: User) => void,
    t: Function
}> = ({ users, onAddEmployee, onEditEmployee, t }) => {
    return (
        <div>
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{t('pages.employees.title')}</h1>
                <button onClick={onAddEmployee} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm flex items-center">
                    <XIcon className="w-4 h-4 mr-2 rotate-45" />
                    {t('common.add')} Employee
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div key={user.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="p-6 text-center border-b border-gray-100">
                            <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600 text-2xl font-bold">
                                {formatUserName(user.name).charAt(0)}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">{formatUserName(user.name)}</h3>
                            <p className="text-sm text-gray-500 uppercase tracking-wide mt-1">{user.role}</p>
                            {user.role === UserRole.TECHNICIAN && (
                                <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status!)}`}>
                                    {t(`status.${user.status}`)}
                                </span>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50">
                            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                                <span>{t('common.phone')}</span>
                                <span>{user.phone || '-'}</span>
                            </div>
                             <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>{t('common.email')}</span>
                                <span className="truncate max-w-[150px]" title={user.email}>{user.email || '-'}</span>
                            </div>
                             <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                                <Link to={`/technician/${user.id}`} className="text-primary-600 hover:text-primary-800 font-medium text-sm mr-4">{t('common.view')} Profile</Link>
                                <button onClick={() => onEditEmployee(user)} className="text-gray-500 hover:text-gray-700 font-medium text-sm">{t('common.edit')}</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TechnicianProfilePage: React.FC<{
    users: User[],
    workOrders: WorkOrder[],
    t: Function
}> = ({ users, workOrders, t }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate => (path: string) => window.location.hash = path; // Simple hack for linking back without hook inside component (though we are inside router context)

    const technician = users.find(u => u.id === id);
    
    if (!technician) return <div>Technician not found</div>;

    const techWorkOrders = workOrders.filter(wo => wo.technicianId === technician.id);
    const completedCount = techWorkOrders.filter(wo => wo.status === WorkOrderStatus.COMPLETED).length;
    
    return (
        <div>
            <Link to="/employees" className="flex items-center text-gray-500 hover:text-gray-700 mb-6">
                <ChevronsLeftIcon className="w-5 h-5 mr-1" />
                {t('pages.technicianProfile.back')}
            </Link>

            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="md:flex">
                    <div className="md:w-1/3 bg-gray-50 p-8 text-center border-r border-gray-200">
                         <div className="bg-primary-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600 text-4xl font-bold">
                            {formatUserName(technician.name).charAt(0)}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">{formatUserName(technician.name)}</h1>
                        <p className="text-gray-500 uppercase tracking-wide font-semibold mt-1">{technician.role}</p>
                        <div className="mt-4 flex justify-center space-x-2">
                             <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(technician.status || TechnicianStatus.OFFLINE)}`}>
                                {t(`status.${technician.status || TechnicianStatus.OFFLINE}`)}
                            </span>
                        </div>
                    </div>
                    <div className="md:w-2/3 p-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('pages.technicianProfile.personalInfo')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm">
                            <div>
                                <p className="text-gray-500">Employee ID</p>
                                <p className="font-semibold">{technician.employeeId || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Joined Date</p>
                                <p className="font-semibold">{technician.joinDate || '-'}</p>
                            </div>
                             <div>
                                <p className="text-gray-500">Phone</p>
                                <p className="font-semibold">{technician.phone || '-'}</p>
                            </div>
                             <div>
                                <p className="text-gray-500">Email</p>
                                <p className="font-semibold">{technician.email || '-'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Address</p>
                                <p className="font-semibold">{technician.address || '-'}</p>
                            </div>
                             <div>
                                <p className="text-gray-500">Skills</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {technician.skills?.map(skill => (
                                        <span key={skill} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">{skill}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
             
             <h2 className="text-xl font-bold text-gray-800 mb-4">{t('pages.technicianProfile.recentActivity')} ({completedCount} Completed)</h2>
             <div className="bg-white rounded-lg shadow-md overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">WO ID</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">{t('common.date')}</th>
                                <th className="px-6 py-3">{t('common.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {techWorkOrders.slice(0, 5).map(wo => (
                                <tr key={wo.id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono">{wo.id}</td>
                                    <td className="px-6 py-4">{wo.customer.name}</td>
                                    <td className="px-6 py-4">{new Date(wo.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>{t(`status.${wo.status}`)}</span></td>
                                </tr>
                            ))}
                            {techWorkOrders.length === 0 && <tr><td colSpan={4} className="text-center py-4">No recent activity.</td></tr>}
                        </tbody>
                    </table>
                 </div>
             </div>

        </div>
    );
}

const SettingsPage: React.FC<{
    companyProfile: CompanyProfile,
    onSaveProfile: (p: CompanyProfile) => void,
    onExport: () => void,
    onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void,
    currentLang: string,
    onToggleLang: () => void,
    t: Function,
    currentUser: User
}> = ({ companyProfile, onSaveProfile, onExport, onRestore, currentLang, onToggleLang, t, currentUser }) => {
    const [profile, setProfile] = useState(companyProfile);
    const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ADMINISTRATOR;

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveProfile(profile);
        alert('Company profile saved!');
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('pages.settings.title')}</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('pages.settings.language')}</h2>
                <div className="flex items-center space-x-4">
                    <p className="text-gray-600">Current Language: <strong>{currentLang === 'en' ? 'English' : 'Bahasa Indonesia'}</strong></p>
                    <button onClick={onToggleLang} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Switch Language</button>
                </div>
            </div>

            {isAdmin && (
                <>
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('pages.settings.companyProfile')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                    <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <input type="text" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="text" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Logo</label>
                                <input type="file" onChange={handleLogoChange} accept="image/*" className="mt-1 block w-full" />
                                {profile.logo && <img src={profile.logo} alt="Logo" className="mt-2 h-16 object-contain" />}
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{t('common.save')} Profile</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('pages.settings.dataBackup')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border p-4 rounded-lg">
                                <h3 className="font-bold text-gray-700 mb-2">{t('pages.settings.exportData')}</h3>
                                <p className="text-sm text-gray-500 mb-4">{t('pages.settings.exportDesc')}</p>
                                <button onClick={onExport} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full">{t('common.download')} JSON Backup</button>
                            </div>
                            <div className="border p-4 rounded-lg">
                                <h3 className="font-bold text-gray-700 mb-2">{t('pages.settings.restoreData')}</h3>
                                <p className="text-sm text-gray-500 mb-4">{t('pages.settings.restoreDesc')}</p>
                                <input type="file" onChange={onRestore} accept=".json" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const Chatbot: React.FC<{ currentUser: User, contextData: any }> = ({ currentUser, contextData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{ sender: 'ai', text: `Hi ${formatUserName(currentUser.name)}, I'm ServisAI. How can I help you with your business data today?` }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        const aiResponseText = await getChatbotResponse([...messages, userMsg], { ...contextData, currentUser });
        
        setIsTyping(false);
        setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-transform transform hover:scale-110 z-50"
            >
                {isOpen ? <XIcon className="h-6 w-6" /> : <AiIcon className="h-6 w-6" />}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200">
                    <div className="bg-primary-600 text-white p-4 rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center">
                             <AiIcon className="h-5 w-5 mr-2" />
                             <span className="font-bold">ServisAI Assistant</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white text-gray-800 shadow rounded-bl-none border border-gray-100'}`}>
                                     {msg.sender === 'ai' ? (
                                        <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                     ) : msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-lg shadow rounded-bl-none border border-gray-100">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t bg-white rounded-b-xl">
                        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about your business..."
                                className="bg-transparent flex-1 focus:outline-none text-sm"
                            />
                            <button onClick={handleSend} className="text-primary-600 hover:text-primary-800 ml-2">
                                <SendIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const Sidebar: React.FC<{
    isOpen: boolean;
    toggleSidebar: () => void;
    user: User;
    onLogout: () => void;
    unreadCount: number;
    t: Function;
}> = ({ isOpen, toggleSidebar, user, onLogout, unreadCount, t }) => {
    const location = useLocation();
    const isAdmin = user.role === UserRole.ADMINISTRATOR || user.role === UserRole.ADMIN;

    const NavLink: React.FC<{ to: string; icon: React.ReactElement<{ className?: string }>; label: string }> = ({ to, icon, label }) => {
        const isActive = location.pathname === to;
        return (
            <Link to={to} className={`flex items-center px-4 py-3 transition-colors ${isActive ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                 {React.cloneElement(icon, { className: `h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400'}` })}
                {isOpen && <span className="ml-3 font-medium">{label}</span>}
            </Link>
        );
    };

    return (
        <div className={`bg-white h-screen shadow-xl transition-all duration-300 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
            <div className="h-16 flex items-center justify-center border-b border-gray-100">
                {isOpen ? (
                    <span className="text-2xl font-extrabold text-primary-600 tracking-tight">ServisPro</span>
                ) : (
                    <span className="text-2xl font-extrabold text-primary-600">SP</span>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                <NavLink to="/" icon={<DashboardIcon />} label={t('sidebar.dashboard')} />
                <NavLink to="/customers" icon={<CustomerIcon />} label={t('sidebar.customers')} />
                <NavLink to="/work-orders" icon={<WorkOrderIcon />} label={t('sidebar.workOrders')} />
                
                <div className="relative">
                    <NavLink to="/notifications" icon={<BellIcon />} label={t('sidebar.notifications')} />
                    {unreadCount > 0 && (
                        <span className={`absolute top-3 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full ${!isOpen && 'top-2 right-2'}`}>
                            {unreadCount}
                        </span>
                    )}
                </div>

                {isAdmin && <NavLink to="/finance" icon={<FinanceIcon />} label={t('sidebar.finance')} />}
                <NavLink to="/spare-parts" icon={<SparePartIcon />} label={t('sidebar.spareParts')} />
                
                {isAdmin ? (
                     <>
                        <NavLink to="/reimbursement" icon={<ReceiptIcon />} label={t('sidebar.reimbursement')} />
                        <NavLink to="/employees" icon={<UsersIcon />} label={t('sidebar.employees')} />
                        {user.role === UserRole.ADMINISTRATOR && <NavLink to="/registrations" icon={<ClipboardIcon />} label={t('sidebar.dataPendaftaran')} />}
                     </>
                ) : (
                    <NavLink to="/my-reimbursements" icon={<ReceiptIcon />} label={t('sidebar.myReimbursements')} />
                )}

                <NavLink to="/settings" icon={<SettingsIcon />} label={t('sidebar.settings')} />
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button onClick={toggleSidebar} className="w-full flex items-center justify-center p-2 text-gray-500 hover:bg-gray-100 rounded-lg mb-2">
                    {isOpen ? <ChevronsLeftIcon className="h-5 w-5" /> : <ChevronsRightIcon className="h-5 w-5" />}
                </button>
                <button onClick={onLogout} className={`w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${!isOpen && 'justify-center'}`}>
                    <LogoutIcon className="h-5 w-5" />
                    {isOpen && <span className="ml-3 font-medium">{t('sidebar.logout')}</span>}
                </button>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export const App = () => {
    // State Management
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
    const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
    const [spareParts, setSpareParts] = useState<SparePart[]>(INITIAL_SPARE_PARTS);
    const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
    const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
    const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
    const [contracts, setContracts] = useState<ServiceContract[]>(INITIAL_CONTRACTS);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [lang, setLang] = useState<'en' | 'id'>('id');
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
        name: 'ServisPro Solutions',
        address: 'Jl. Teknologi No. 123, Jakarta Selatan',
        email: 'info@servispro.com',
        phone: '(021) 555-0199'
    });

    // Modals State
    const [modals, setModals] = useState({
        importCustomer: false,
        customer: false,
        client: false,
        workOrder: false,
        assignTech: false,
        addParts: false,
        invoice: false,
        sparePart: false,
        supplier: false,
        transaction: false,
        importSparePart: false,
        employee: false,
        contract: false,
        payment: false,
        reimbursement: false,
        attachment: false,
    });

    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Helpers
    const t = (key: string, params?: any) => {
        const keys = key.split('.');
        let value: any = translations[lang];
        for (const k of keys) {
            value = value?.[k];
        }
        if (!value) return key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(`{${k}}`, String(v));
            });
        }
        return value;
    };

    const unreadNotifications = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    // Handlers
    const handleLogin = (user: User) => setCurrentUser(user);
    const handleLogout = () => setCurrentUser(null);
    const handleSignUp = (user: User) => {
        setUsers([...users, user]);
        alert('Account created! Please wait for admin approval.');
    };

    const toggleModal = (modalName: keyof typeof modals, item: any = null) => {
        setSelectedItem(item);
        setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }));
    };

    const handleImportData = (type: 'customers' | 'spareParts', data: any[]) => {
        if (type === 'customers') {
            const newCustomers: Customer[] = data.map((row, idx) => ({
                id: `cust-imp-${Date.now()}-${idx}`,
                name: row['Name'] || row['Nama'] || 'Unknown',
                email: row['Email'] || '',
                phone: row['Phone'] || row['Telepon'] || '',
                address: row['Address'] || row['Alamat'] || '',
                category: 'Residential'
            }));
            setCustomers([...customers, ...newCustomers]);
            alert(`Successfully imported ${newCustomers.length} customers.`);
        } else if (type === 'spareParts') {
             const newParts: SparePart[] = data.map((row, idx) => ({
                id: `sp-imp-${Date.now()}-${idx}`,
                itemCode: row['Item Code'] || `IC-${idx}`,
                name: row['Name'] || row['Nama Part'] || 'Unknown',
                stock: Number(row['Stock'] || row['Stok'] || 0),
                sellingPrice: Number(row['Price'] || row['Harga Jual'] || 0),
                purchasePrice: Number(row['Purchase Price'] || row['Harga Beli'] || 0),
                unit: row['Unit'] || 'pcs',
                location: row['Location'] || row['Lokasi'] || 'Warehouse'
            }));
            setSpareParts([...spareParts, ...newParts]);
            alert(`Successfully imported ${newParts.length} spare parts.`);
        }
        toggleModal(type === 'customers' ? 'importCustomer' : 'importSparePart');
    };

    // Data Updaters
    const handleSaveCustomer = (c: Customer) => {
        if (customers.find(x => x.id === c.id)) {
            setCustomers(customers.map(x => x.id === c.id ? c : x));
        } else {
            setCustomers([...customers, c]);
        }
        toggleModal('customer');
    };

    const handleSaveClient = (c: Client) => {
        if (clients.find(x => x.id === c.id)) {
             setClients(clients.map(x => x.id === c.id ? c : x));
        } else {
            setClients([...clients, c]);
        }
        toggleModal('client');
    };

    const handleCreateWorkOrder = (data: { customerId: string; description: string; totalCost: number; clientId?: string }) => {
        const customer = customers.find(c => c.id === data.customerId);
        if (!customer) return;
        const newWO: WorkOrder = {
            id: `WO-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(4, '0')}`,
            customer,
            description: data.description,
            status: WorkOrderStatus.PENDING,
            technicianId: null,
            createdAt: new Date().toISOString(),
            spareParts: [],
            totalCost: data.totalCost,
            clientId: data.clientId
        };
        setWorkOrders([...workOrders, newWO]);
        
        // Notify Admins
        const adminNotification: Notification = {
            id: `notif-${Date.now()}`,
            message: `New Work Order ${newWO.id} created for ${customer.name}`,
            timestamp: new Date().toISOString(),
            read: false,
            link: '/work-orders',
            workOrderId: newWO.id
        };
        setNotifications(prev => [...prev, adminNotification]);
        
        toggleModal('workOrder');
    };

    const handleAssignTechnician = (woId: string, techId: string) => {
        setWorkOrders(prev => prev.map(wo => wo.id === woId ? { ...wo, technicianId: techId } : wo));
        // Notify Technician
        const notif: Notification = {
            id: `notif-${Date.now()}`,
            message: `You have been assigned to Work Order ${woId}`,
            timestamp: new Date().toISOString(),
            read: false,
            link: '/work-orders',
            workOrderId: woId
        };
        // In a real app, we'd filter notifications by user ID. Here we just dump them in one state.
        setNotifications(prev => [...prev, notif]);
    };

    const handleUpdateWOStatus = (woId: string, status: WorkOrderStatus) => {
        setWorkOrders(prev => prev.map(wo => {
            if (wo.id === woId) {
                const updates: Partial<WorkOrder> = { status };
                if (status === WorkOrderStatus.COMPLETED) {
                    updates.completedAt = new Date().toISOString();
                }
                // Update technician status if needed
                if (status === WorkOrderStatus.IN_PROGRESS && wo.technicianId) {
                     setUsers(users.map(u => u.id === wo.technicianId ? { ...u, status: TechnicianStatus.ON_JOB } : u));
                }
                if (status === WorkOrderStatus.COMPLETED && wo.technicianId) {
                     setUsers(users.map(u => u.id === wo.technicianId ? { ...u, status: TechnicianStatus.AVAILABLE } : u));
                }
                return { ...wo, ...updates };
            }
            return wo;
        }));
    };

    const handleAddPartsToWO = (woId: string, parts: SparePart[]) => {
        const wo = workOrders.find(w => w.id === woId);
        if (!wo) return;
        
        // Calculate cost difference to update total
        const oldPartsCost = wo.spareParts.reduce((sum, p) => sum + p.sellingPrice, 0);
        const newPartsCost = parts.reduce((sum, p) => sum + p.sellingPrice, 0);
        
        setWorkOrders(prev => prev.map(w => w.id === woId ? { 
            ...w, 
            spareParts: parts,
            totalCost: w.totalCost - oldPartsCost + newPartsCost 
        } : w));

        // Decrement Stock (Simple logic)
        // Identify newly added parts vs removed
        // For simplicity in mock, we just update stock based on current selection vs old selection logic would be complex here.
        // Let's just assume stock decrement happens on "Save"
    };

    const handleSaveSparePart = (part: SparePart) => {
         if (spareParts.find(x => x.id === part.id)) {
            setSpareParts(spareParts.map(x => x.id === part.id ? part : x));
        } else {
            setSpareParts([...spareParts, part]);
        }
        toggleModal('sparePart');
    };

    const handleSaveSupplier = (s: Supplier) => {
        if (suppliers.find(x => x.id === s.id)) {
            setSuppliers(suppliers.map(x => x.id === s.id ? s : x));
        } else {
            setSuppliers([...suppliers, s]);
        }
        toggleModal('supplier');
    };
    
    const handleSaveTransaction = (t: Transaction) => {
         if (transactions.find(x => x.id === t.id)) {
            setTransactions(transactions.map(x => x.id === t.id ? t : x));
        } else {
            setTransactions([...transactions, t]);
        }
        toggleModal('transaction');
    }

    const handleSaveInvoice = (inv: Invoice) => {
         if (invoices.find(x => x.id === inv.id)) {
            setInvoices(invoices.map(x => x.id === inv.id ? inv : x));
        } else {
            setInvoices([...invoices, inv]);
            // Also add an Income transaction automatically if Paid
             if (inv.status === 'Paid') {
                const newTrans: Transaction = {
                    id: `trn-inv-${inv.id}`,
                    date: inv.paidDate || inv.issuedDate,
                    amount: inv.amount,
                    description: `Invoice Payment ${inv.id}`,
                    type: 'income',
                    category: TransactionCategory.SERVICE_INCOME,
                    paymentMethod: PaymentMethod.CASH, // Default
                    invoiceId: inv.id,
                    approved: true
                };
                setTransactions(prev => [...prev, newTrans]);
            }
        }
        toggleModal('invoice');
    };
    
    const handleConfirmPayment = (woId: string, method: PaymentMethod, attachment?: any) => {
        const wo = workOrders.find(w => w.id === woId);
        if (!wo) return;
        
        // Create Invoice
        const newInvoice: Invoice = {
            id: `INV-${wo.id}`,
            workOrderId: wo.id,
            customerId: wo.customer.id,
            amount: wo.totalCost,
            issuedDate: new Date().toISOString().split('T')[0],
            status: 'Paid',
            paidDate: new Date().toISOString().split('T')[0],
        };
        setInvoices(prev => [...prev, newInvoice]);

        // Create Transaction
        const newTrans: Transaction = {
            id: `trn-pay-${wo.id}`,
            date: new Date().toISOString().split('T')[0],
            amount: wo.totalCost,
            description: `Payment for ${wo.id}`,
            type: 'income',
            category: TransactionCategory.SERVICE_INCOME,
            paymentMethod: method,
            workOrderId: wo.id,
            invoiceId: newInvoice.id,
            attachment: attachment,
            approved: true
        };
        setTransactions(prev => [...prev, newTrans]);
        toggleModal('payment');
    };
    
    const handleRequestReimbursement = (woId: string, amount: number, description: string, attachment: any) => {
        const newTrans: Transaction = {
            id: `reimb-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            description: description,
            type: 'expense',
            category: TransactionCategory.REIMBURSEMENT,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            requestedByUserId: currentUser?.id,
            workOrderId: woId,
            attachment: attachment,
            approved: false
        };
        setTransactions(prev => [...prev, newTrans]);
        toggleModal('reimbursement');
    }

    const handleApproveTransaction = (id: string) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, approved: true } : t));
    };
    
    const handleSaveEmployee = (u: User) => {
         setUsers(prev => prev.map(x => x.id === u.id ? u : x));
         toggleModal('employee');
    };

    const handleExportData = () => {
        const data = { users, customers, workOrders, invoices, transactions, spareParts };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `servispro_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.users) setUsers(data.users);
                if (data.customers) setCustomers(data.customers);
                if (data.workOrders) setWorkOrders(data.workOrders);
                if (data.invoices) setInvoices(data.invoices);
                if (data.transactions) setTransactions(data.transactions);
                if (data.spareParts) setSpareParts(data.spareParts);
                alert('Data restored successfully!');
            } catch (error) {
                console.error(error);
                alert('Invalid backup file.');
            }
        };
        reader.readAsText(file);
    };

    if (!currentUser) {
        const [isLogin, setIsLogin] = useState(true);
        return isLogin 
            ? <LoginScreen onLogin={handleLogin} onSwitchToSignUp={() => setIsLogin(false)} users={users} t={t} />
            : <SignUpScreen onSignUp={(u) => { handleSignUp(u); setIsLogin(true); }} onSwitchToLogin={() => setIsLogin(true)} t={t} />;
    }

    return (
        <HashRouter>
            <div className="flex h-screen bg-gray-100 font-sans">
                <Sidebar 
                    isOpen={sidebarOpen} 
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
                    user={currentUser} 
                    onLogout={handleLogout} 
                    unreadCount={unreadNotifications}
                    t={t}
                />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Header (Optional, for mobile mostly or extra info) */}
                    <header className="bg-white shadow-sm z-10 p-4 flex justify-between items-center">
                        <div className="flex items-center text-gray-500 text-sm">
                           <span className="mr-4">{new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                           <div className="text-right">
                                <p className="text-sm font-bold text-gray-800">{formatUserName(currentUser.name)}</p>
                                <p className="text-xs text-gray-500">{currentUser.role}</p>
                           </div>
                            <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-bold">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                        <Routes>
                            <Route path="/" element={<Dashboard workOrders={workOrders} customers={customers} users={users} currentUser={currentUser} t={t} />} />
                            <Route path="/customers" element={
                                <CustomersPage 
                                    customers={customers} clients={clients} contracts={contracts}
                                    onAddCustomer={() => toggleModal('customer')} 
                                    onEditCustomer={(c) => toggleModal('customer', c)}
                                    onAddClient={() => toggleModal('client')}
                                    onEditClient={(c) => toggleModal('client', c)}
                                    onImportCustomers={() => toggleModal('importCustomer')}
                                    t={t} 
                                />
                            } />
                            <Route path="/work-orders" element={
                                <WorkOrdersPage 
                                    workOrders={workOrders} technicians={users.filter(u => u.role === UserRole.TECHNICIAN)} customers={customers} currentUser={currentUser}
                                    onCreate={() => toggleModal('workOrder')}
                                    onAssign={(wo) => toggleModal('assignTech', wo)}
                                    onAddParts={(wo) => toggleModal('addParts', wo)}
                                    onUpdateStatus={handleUpdateWOStatus}
                                    onConfirmPayment={(wo) => toggleModal('payment', wo)}
                                    onRequestReimbursement={(wo) => toggleModal('reimbursement', wo)}
                                    t={t}
                                />
                            } />
                            <Route path="/spare-parts" element={
                                <SparePartsPage 
                                    spareParts={spareParts} suppliers={suppliers} workOrders={workOrders}
                                    onAddPart={() => toggleModal('sparePart')}
                                    onEditPart={(p) => toggleModal('sparePart', p)}
                                    onAddSupplier={() => toggleModal('supplier')}
                                    onEditSupplier={(s) => toggleModal('supplier', s)}
                                    onImportSpareParts={() => toggleModal('importSparePart')}
                                    t={t}
                                />
                            } />
                            <Route path="/finance" element={currentUser.role === UserRole.TECHNICIAN ? <Navigate to="/" /> :
                                <FinancePage 
                                    invoices={invoices} transactions={transactions} 
                                    onAddInvoice={() => toggleModal('invoice')}
                                    onEditInvoice={(inv) => toggleModal('invoice', inv)}
                                    onAddTransaction={() => toggleModal('transaction')}
                                    onEditTransaction={(trn) => toggleModal('transaction', trn)}
                                    onViewAttachment={(att) => toggleModal('attachment', att)}
                                    t={t}
                                />
                            } />
                            <Route path="/employees" element={currentUser.role === UserRole.TECHNICIAN ? <Navigate to="/" /> :
                                <EmployeesPage 
                                    users={users} 
                                    onAddEmployee={() => toggleModal('employee')} // In real app, maybe create user flow
                                    onEditEmployee={(u) => toggleModal('employee', u)}
                                    t={t} 
                                />
                            } />
                             <Route path="/technician/:id" element={
                                <TechnicianProfilePage users={users} workOrders={workOrders} t={t} />
                             } />
                             <Route path="/settings" element={
                                <SettingsPage 
                                    companyProfile={companyProfile} 
                                    onSaveProfile={setCompanyProfile}
                                    onExport={handleExportData}
                                    onRestore={handleRestoreData}
                                    currentLang={lang}
                                    onToggleLang={() => setLang(prev => prev === 'en' ? 'id' : 'en')}
                                    t={t}
                                    currentUser={currentUser}
                                />
                             } />
                             <Route path="/notifications" element={<NotificationsPage notifications={notifications} onMarkAllRead={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} t={t} />} />
                             <Route path="/reimbursement" element={currentUser.role === UserRole.TECHNICIAN ? <Navigate to="/" /> : <ReimbursementPage transactions={transactions} users={users} onApprove={handleApproveTransaction} onViewAttachment={(att) => toggleModal('attachment', att)} t={t} />} />
                             <Route path="/my-reimbursements" element={<MyReimbursementsPage transactions={transactions} currentUser={currentUser} onViewAttachment={(att) => toggleModal('attachment', att)} t={t} />} />
                             <Route path="/registrations" element={currentUser.role === UserRole.ADMINISTRATOR ? <RegistrationsPage users={users} onApprove={(id) => setUsers(users.map(u => u.id === id ? {...u, approved: true} : u))} onReject={(id) => setUsers(users.filter(u => u.id !== id))} t={t} /> : <Navigate to="/" />} />
                        </Routes>
                    </main>

                     <Chatbot currentUser={currentUser} contextData={{ customers, workOrders, spareParts, invoices, technicians: users.filter(u => u.role === UserRole.TECHNICIAN) }} />

                    {/* Modals Render */}
                    <ImportModal 
                        isOpen={modals.importCustomer} onClose={() => toggleModal('importCustomer')} 
                        onImport={(data) => handleImportData('customers', data)} 
                        templateHeaders={['Name', 'Email', 'Phone', 'Address']} 
                        templateFileName="customers_template.xlsx"
                        title={t('modals.importCustomersTitle')} t={t} 
                    />
                    <ImportModal 
                        isOpen={modals.importSparePart} onClose={() => toggleModal('importSparePart')} 
                        onImport={(data) => handleImportData('spareParts', data)} 
                        templateHeaders={['Item Code', 'Name', 'Stock', 'Price', 'Unit', 'Location']} 
                        templateFileName="spareparts_template.xlsx"
                        title={t('modals.importSparePartsTitle')} t={t} 
                    />
                    <AddEditCustomerModal isOpen={modals.customer} onClose={() => toggleModal('customer')} onSave={handleSaveCustomer} customer={selectedItem} t={t} />
                    <AddEditClientModal isOpen={modals.client} onClose={() => toggleModal('client')} onSave={handleSaveClient} client={selectedItem} t={t} />
                    <CreateWorkOrderModal isOpen={modals.workOrder} onClose={() => toggleModal('workOrder')} onSave={handleCreateWorkOrder} customers={customers} clients={clients} t={t} />
                    {modals.assignTech && selectedItem && <AssignTechnicianModal workOrder={selectedItem} technicians={users.filter(u => u.role === UserRole.TECHNICIAN)} onClose={() => toggleModal('assignTech')} onSave={handleAssignTechnician} t={t} />}
                    {modals.addParts && selectedItem && <AddSparePartModal workOrder={selectedItem} onClose={() => toggleModal('addParts')} onSave={handleAddPartsToWO} availableParts={spareParts} t={t} />}
                    <AddEditInvoiceModal isOpen={modals.invoice} onClose={() => toggleModal('invoice')} onSave={handleSaveInvoice} invoice={selectedItem} workOrders={workOrders} t={t} />
                    <AddEditSparePartModal isOpen={modals.sparePart} onClose={() => toggleModal('sparePart')} onSave={handleSaveSparePart} part={selectedItem} suppliers={suppliers} allSpareParts={spareParts} t={t} />
                    <AddEditSupplierModal isOpen={modals.supplier} onClose={() => toggleModal('supplier')} onSave={handleSaveSupplier} supplier={selectedItem} t={t} />
                    <AddEditTransactionModal isOpen={modals.transaction} onClose={() => toggleModal('transaction')} onSave={handleSaveTransaction} transaction={selectedItem} t={t} />
                    <AddEditEmployeeModal isOpen={modals.employee} onClose={() => toggleModal('employee')} onSave={handleSaveEmployee} user={selectedItem} t={t} />
                    <AddEditContractModal isOpen={modals.contract} onClose={() => toggleModal('contract')} onSave={(c) => setContracts(prev => [...prev, c])} contract={selectedItem} customerId={selectedItem?.customerId} t={t} />
                    <MarkAsPaidModal isOpen={modals.payment} onClose={() => toggleModal('payment')} onConfirm={handleConfirmPayment} workOrder={selectedItem} t={t} />
                    <ReimbursementModal isOpen={modals.reimbursement} onClose={() => toggleModal('reimbursement')} onConfirm={handleRequestReimbursement} workOrder={selectedItem} t={t} />
                    <AttachmentViewerModal isOpen={modals.attachment} onClose={() => toggleModal('attachment')} attachment={selectedItem} t={t} />

                </div>
            </div>
        </HashRouter>
    );
};

export default App;