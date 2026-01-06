
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  TrendingUp, 
  Stethoscope, 
  Calendar, 
  FileSpreadsheet, 
  MessageCircle, 
  X,
  Trash2,
  Database,
  Cloud,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Palette,
  Activity,
  Send,
  Sparkles,
  ChevronDown,
  Info,
  Link,
  Unlink,
  ClipboardList,
  RotateCcw,
  LayoutGrid,
  Monitor,
  HeartPulse,
  Briefcase,
  Layers,
  ArrowUpRight,
  BarChart3,
  Filter,
  Search,
  Moon,
  Sun,
  Upload,
  UserCheck,
  Stethoscope as StethoscopeIcon,
  Tag,
  Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Line, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { generateSampleData } from './utils/sampleData';
import { HospitalRecord } from './types';
import { aiService } from './services/geminiService';

const THEMES = {
  ocean: { 
    name: 'Đại dương',
    primary: '#0284c7', 
    secondary: '#f0f9ff', 
    darkSecondary: '#0c4a6e',
    accent: '#0369a1', 
    bg: 'bg-sky-600', 
    text: 'text-sky-600', 
    border: 'border-sky-100',
    chart: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#0284c7', '#0369a1']
  },
  medical: { 
    name: 'Y tế',
    primary: '#10b981', 
    secondary: '#f0fdf4', 
    darkSecondary: '#064e3b',
    accent: '#047857', 
    bg: 'bg-emerald-600', 
    text: 'text-emerald-600', 
    border: 'border-emerald-100',
    chart: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857']
  },
  royal: { 
    name: 'Hoàng gia',
    primary: '#6366f1', 
    secondary: '#f5f3ff', 
    darkSecondary: '#312e81',
    accent: '#4338ca', 
    bg: 'bg-indigo-600', 
    text: 'text-indigo-600', 
    border: 'border-indigo-100',
    chart: ['#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#4338ca']
  },
  slate: { 
    name: 'Thanh lịch',
    primary: '#475569', 
    secondary: '#f8fafc', 
    darkSecondary: '#1e293b',
    accent: '#1e293b', 
    bg: 'bg-slate-600', 
    text: 'text-slate-600', 
    border: 'border-slate-200',
    chart: ['#475569', '#64748b', '#94a3b8', '#334155', '#1e293b']
  },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const parseHospitalDate = (dateStr: any): string => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr instanceof Date) return dateStr.toISOString();
  const str = String(dateStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const date = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  const date = new Date(str);
  return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
};

const App: React.FC = () => {
  const [data, setData] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [isConnectedToSheet, setIsConnectedToSheet] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'analytics' | 'diagnostic'>('analytics');
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [sheetId, setSheetId] = useState<string>(localStorage.getItem('h_sheet_id') || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);

  const [uiSettings, setUiSettings] = useState(() => {
    const saved = localStorage.getItem('h_ui_settings');
    return saved ? JSON.parse(saved) : {
      theme: 'ocean',
      density: 'comfortable',
      isDarkMode: false,
      showKPIs: true,
      showTrends: true,
      showDiseaseAnalysis: true,
      showServiceAnalysis: true,
      showDepartmentAnalysis: true,
      showDoctorTable: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('h_ui_settings', JSON.stringify(uiSettings));
    if (uiSettings.isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [uiSettings]);

  const activeTheme = THEMES[uiSettings.theme as keyof typeof THEMES] || THEMES.ocean;
  const isCompact = uiSettings.density === 'compact';
  const isDark = uiSettings.isDarkMode;

  // Filter States
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filterDept, setFilterDept] = useState("Tất cả");
  const [filterType, setFilterType] = useState("Tất cả");
  const [filterGroup, setFilterGroup] = useState("Tất cả");
  const [filterDoctors, setFilterDoctors] = useState<string[]>(["Tất cả"]);
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('h_sheet_id');
    if (savedId) fetchFromGoogleSheet(savedId);
    else {
      setData(generateSampleData(500));
    }
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiLoading]);

  // Click outside handler for custom dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target as Node)) {
        setIsDoctorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unique Lists for Selects
  const uniqueDepts = useMemo(() => ["Tất cả", ...new Set(data.map(d => d.KHOA))].filter(Boolean), [data]);
  const uniqueTypes = useMemo(() => ["Tất cả", ...new Set(data.map(d => d.DOI_TUONG))].filter(Boolean), [data]);
  const uniqueGroups = useMemo(() => ["Tất cả", ...new Set(data.map(d => d.TEN_NHOM))].filter(Boolean), [data]);
  const uniqueDoctors = useMemo(() => [...new Set(data.map(d => d.BAC_SY))].filter(Boolean).sort(), [data]);

  const filteredDoctorsList = useMemo(() => {
    return uniqueDoctors.filter(d => d.toLowerCase().includes(doctorSearch.toLowerCase()));
  }, [uniqueDoctors, doctorSearch]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchDept = filterDept === "Tất cả" || item.KHOA?.trim() === filterDept;
      const matchType = filterType === "Tất cả" || item.DOI_TUONG?.trim() === filterType;
      const matchGroup = filterGroup === "Tất cả" || item.TEN_NHOM?.trim() === filterGroup;
      
      const matchDoctor = filterDoctors.includes("Tất cả") || filterDoctors.includes(item.BAC_SY?.trim());

      const itemDate = new Date(item.NGAY_THANH_TOAN);
      const now = new Date();
      let matchDate = true;
      if (filterPeriod === "7days") matchDate = itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (filterPeriod === "30days") matchDate = itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (filterPeriod === "thisMonth") matchDate = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      else if (filterPeriod === "custom") {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          matchDate = matchDate && itemDate >= start;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          matchDate = matchDate && itemDate <= end;
        }
      }
      return matchDept && matchType && matchGroup && matchDoctor && matchDate;
    });
  }, [data, filterDept, filterType, filterGroup, filterDoctors, filterPeriod, customStartDate, customEndDate]);

  const stats = useMemo(() => {
    const totalPatients = new Set(filteredData.map(d => d.MA_BN)).size;
    const totalCost = filteredData.reduce((acc, curr) => acc + (Number(curr.THANH_TIEN) || 0), 0);
    const totalDays = filteredData.reduce((acc, curr) => acc + (Number(curr.SO_NGAY_DTRI) || 0), 0);
    const outcomeCounts: Record<string, number> = {};
    filteredData.forEach(d => {
      const k = d.KET_QUA_DTRI || "Khác";
      outcomeCounts[k] = (outcomeCounts[k] || 0) + 1;
    });
    return {
      totalPatients, totalCost,
      avgDays: filteredData.length > 0 ? totalDays / filteredData.length : 0,
      avgCostPerPatient: totalPatients > 0 ? totalCost / totalPatients : 0,
      outcomeRatios: Object.entries(outcomeCounts).map(([name, value]) => ({ name, value }))
    };
  }, [filteredData]);

  const serviceStats = useMemo(() => {
    const services: Record<string, { name: string; group: string; count: number; totalCost: number }> = {};
    filteredData.forEach(item => {
      const sName = item.DICH_VU || 'Khác';
      if (!services[sName]) {
        services[sName] = { name: sName, group: item.TEN_NHOM || 'Khác', count: 0, totalCost: 0 };
      }
      services[sName].count += 1;
      services[sName].totalCost += (Number(item.THANH_TIEN) || 0);
    });
    return Object.values(services)
      .map(s => ({
        ...s,
        avgCost: s.count > 0 ? Math.round(s.totalCost / s.count) : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredData]);

  const serviceGroupStats = useMemo(() => {
    const groups: Record<string, { name: string; count: number; totalCost: number }> = {};
    filteredData.forEach(item => {
      const gName = item.TEN_NHOM || 'Khác';
      if (!groups[gName]) {
        groups[gName] = { name: gName, count: 0, totalCost: 0 };
      }
      groups[gName].count += 1;
      groups[gName].totalCost += (Number(item.THANH_TIEN) || 0);
    });
    return Object.values(groups)
      .map(g => ({
        ...g,
        avgCostPerGroup: g.count > 0 ? Math.round(g.totalCost / g.count) : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredData]);

  const departmentStats = useMemo(() => {
    const depts: Record<string, any> = {};
    filteredData.forEach(item => {
      const k = item.KHOA || "Chưa xác định";
      if (!depts[k]) depts[k] = { name: k, totalCost: 0, visitCount: 0 };
      depts[k].totalCost += (Number(item.THANH_TIEN) || 0);
      depts[k].visitCount += 1;
    });
    return Object.values(depts).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredData]);

  const diseaseStats = useMemo(() => {
    const diseases: Record<string, { code: string; name: string; count: number; totalCost: number }> = {};
    filteredData.forEach(item => {
      const code = item.MA_BENH || 'N/A';
      if (!diseases[code]) {
        diseases[code] = { code, name: item.CHAN_DOAN || 'Không rõ', count: 0, totalCost: 0 };
      }
      diseases[code].count += 1;
      diseases[code].totalCost += (Number(item.THANH_TIEN) || 0);
    });
    return Object.values(diseases)
      .map(d => ({
        ...d,
        avgCost: d.count > 0 ? Math.round(d.totalCost / d.count) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingText("Đang phân tích file Excel...");
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws);
        
        if (rawJson.length === 0) throw new Error("File Excel không có dữ liệu.");
        
        const mappedData = rawJson.map(mapRowToRecord);
        setData(mappedData);
        setIsConnectedToSheet(false);
        setLoading(false);
        alert(`Đã nhập thành công ${mappedData.length} bản ghi dịch vụ.`);
      } catch (err: any) {
        alert("Lỗi đọc file: " + err.message);
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const fetchFromGoogleSheet = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setLoading(true);
    setLoadingText("Đồng bộ dữ liệu thời gian thực...");
    try {
      const url = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv&id=${cleanId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Không thể kết nối. Kiểm tra quyền chia sẻ công khai.");
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.data?.length > 0) {
            setData(results.data.filter((r: any) => r.MA_BN).map(mapRowToRecord));
            setIsConnectedToSheet(true);
            localStorage.setItem('h_sheet_id', cleanId);
          }
          setLoading(false);
        }
      });
    } catch (e: any) {
      alert(e.message);
      setLoading(false);
      setIsConnectedToSheet(false);
    }
  };

  const mapRowToRecord = (row: any): HospitalRecord => {
    const findValue = (keys: string[]) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return row[key];
        const foundKey = Object.keys(row).find(k => k.toUpperCase().replace(/\s/g, '_') === key.toUpperCase().replace(/\s/g, '_'));
        if (foundKey) return row[foundKey];
      }
      return undefined;
    };
    return {
      MA_BN: String(findValue(['MA_BN', 'MABN', 'Mã BN', 'Ma BN']) || ''),
      MA_BA: String(findValue(['MA_BA', 'MABA', 'Mã BA', 'Ma BA']) || ''),
      SO_VAO_VIEN: String(findValue(['SO_VAO_VIEN', 'Số vào viện']) || ''),
      DOI_TUONG: String(findValue(['DOI_TUONG', 'Đối tượng']) || 'Chưa xác định'),
      NGAY_VAO_VIEN: parseHospitalDate(findValue(['NGAY_VAO_VIEN', 'Ngày vào viện'])),
      NGAY_VAO_KHOA: parseHospitalDate(findValue(['NGAY_VAO_KHOA', 'Ngày vào khoa'])),
      NGAY_RA_VIEN: parseHospitalDate(findValue(['NGAY_RA_VIEN', 'Ngày ra viện'])),
      NGAY_THANH_TOAN: parseHospitalDate(findValue(['NGAY_THANH_TOAN', 'Ngày thanh toán'])),
      KHOA: String(findValue(['KHOA', 'Khoa']) || 'Chưa xác định'),
      MA_KHOA_CHI_DINH: String(findValue(['MA_KHOA_CHI_DINH', 'Mã khoa chỉ định']) || ''),
      BAC_SY: String(findValue(['BAC_SY', 'Bác sĩ', 'BAC_SI', 'Bac si']) || 'Ẩn danh'),
      MA_BAC_SY: String(findValue(['MA_BAC_SY', 'Mã bác sĩ']) || ''),
      CHAN_DOAN: String(findValue(['CHAN_DOAN', 'Chẩn đoán']) || ''),
      MA_BENH: String(findValue(['MA_BENH', 'Mã bệnh']) || 'N/A'),
      CHAN_DOAN_KHAC: String(findValue(['CHAN_DOAN_KHAC', 'Chẩn đoán khác']) || ''),
      TEN_NHOM: String(findValue(['TEN_NHOM', 'Tên nhóm', 'Nhom dịch vụ']) || 'Khác'),
      DICH_VU: String(findValue(['DICH_VU', 'Dịch vụ', 'Tên dịch vụ']) || ''),
      THANH_TIEN: Number(findValue(['THANH_TIEN', 'Thành tiền', 'Gia tiền']) || 0),
      KET_QUA_DTRI: String(findValue(['KET_QUA_DTRI', 'Kết quả điều trị']) || 'Khác'),
      TINH_TRANG_RV: String(findValue(['TINH_TRANG_RV', 'Tình trạng ra viện']) || ''),
      SO_NGAY_DTRI: Number(findValue(['SO_NGAY_DTRI', 'Số ngày điều trị']) || 0),
    };
  };

  const handleAskAi = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput("");
    setIsAiLoading(true);
    const topServices = serviceStats.slice(0, 3).map(s => `${s.name} (${(s.totalCost/1e6).toFixed(1)}M)`).join(', ');
    const context = `Tổng viện phí: ${stats.totalCost.toLocaleString()} đ, BN: ${stats.totalPatients}. Top dịch vụ: ${topServices}.`;
    const aiResponse = chatMode === 'analytics' 
      ? await aiService.queryDashboard(userMsg, context)
      : await aiService.getDiagnosticSuggestions(userMsg);
    setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse || "Lỗi AI" }]);
    setIsAiLoading(false);
  };

  const handleResetSettings = () => {
    const defaults = {
      theme: 'ocean',
      density: 'comfortable',
      isDarkMode: false,
      showKPIs: true,
      showTrends: true,
      showDiseaseAnalysis: true,
      showServiceAnalysis: true,
      showDepartmentAnalysis: true,
      showDoctorTable: true,
    };
    setUiSettings(defaults);
    localStorage.setItem('h_ui_settings', JSON.stringify(defaults));
  };

  const handleResetFilters = () => {
    setFilterPeriod("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setFilterDept("Tất cả");
    setFilterType("Tất cả");
    setFilterGroup("Tất cả");
    setFilterDoctors(["Tất cả"]);
  };

  const toggleDoctorSelection = (name: string) => {
    setFilterDoctors(prev => {
      if (name === "Tất cả") return ["Tất cả"];
      const newSelection = prev.includes(name) 
        ? prev.filter(n => n !== name) 
        : [...prev.filter(n => n !== "Tất cả"), name];
      return newSelection.length === 0 ? ["Tất cả"] : newSelection;
    });
  };

  const selectClassName = `w-full border rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`;

  return (
    <div className={`min-h-screen pb-12 transition-all duration-300 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} ${isCompact ? 'text-xs' : 'text-sm'}`}>
      <header className={`border-b sticky top-0 z-30 shadow-sm transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between ${isCompact ? 'h-12' : 'h-16'}`}>
          <div className="flex items-center space-x-3">
            <div className={`${activeTheme.bg} p-2 rounded-lg text-white shadow-md shadow-sky-100 transition-all`}><Activity className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'}`} /></div>
            <h1 className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>SmartHIS <span className={activeTheme.text}>Tịnh Biên</span></h1>
            {isConnectedToSheet && (
              <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 animate-pulse">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div> Live Sync
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg transition-all border ${isDark ? 'bg-slate-700 text-indigo-400 border-slate-600 hover:bg-slate-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`} title="Nhập dữ liệu từ Excel">
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <button onClick={() => setUiSettings({...uiSettings, isDarkMode: !uiSettings.isDarkMode})} className={`p-2 rounded-lg transition-all border ${isDark ? 'bg-slate-700 text-amber-400 border-slate-600 hover:bg-slate-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`} title={isDark ? "Chế độ sáng" : "Chế độ tối"}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`} title="Tùy chỉnh giao diện">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => setIsConfigOpen(true)} className={`p-2 rounded-lg border transition-all ${isConnectedToSheet ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : (isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}`} title="Kết nối Sheets">
              <Cloud className="w-5 h-5" />
            </button>
            <button onClick={() => fetchFromGoogleSheet(sheetId)} disabled={loading} className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all ${isCompact ? 'py-4 space-y-4' : 'py-8 space-y-8'}`}>
        
        {/* --- DYNAMIC FILTER BAR --- */}
        <section className={`p-6 rounded-3xl shadow-sm border flex flex-col gap-6 animate-in slide-in-from-top duration-500 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                 <Filter className="w-4 h-4 text-indigo-500" /> Phễu lọc hiệu quả chuyên sâu
              </h3>
              <button 
                onClick={handleResetFilters}
                className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đặt lại phễu
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Report Period */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                   <Calendar className="w-3 h-3" /> Thời gian
                </label>
                <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className={selectClassName}>
                   <option value="all">Tất cả dữ liệu</option>
                   <option value="7days">7 ngày qua</option>
                   <option value="30days">30 ngày qua</option>
                   <option value="thisMonth">Tháng này</option>
                   <option value="custom">Khoảng ngày tùy chỉnh...</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                   <StethoscopeIcon className="w-3 h-3" /> Khoa phòng
                </label>
                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className={selectClassName}>
                   {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Doctor Multi-select Filter */}
              <div className="space-y-1.5 relative" ref={doctorDropdownRef}>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                   <Users className="w-3 h-3" /> Bác sĩ (Chọn nhiều)
                </label>
                <button 
                  onClick={() => setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-[11px] font-bold text-left flex items-center justify-between transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <span className="truncate">
                    {filterDoctors.length === 1 ? filterDoctors[0] : `${filterDoctors.length} bác sĩ đã chọn`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDoctorDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDoctorDropdownOpen && (
                  <div className={`absolute top-full left-0 w-full mt-2 rounded-2xl shadow-2xl z-[45] border animate-in slide-in-from-top-2 duration-200 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          value={doctorSearch} 
                          onChange={(e) => setDoctorSearch(e.target.value)}
                          placeholder="Tìm bác sĩ..."
                          className={`w-full pl-9 pr-4 py-2 text-[10px] rounded-lg outline-none border focus:ring-2 focus:ring-indigo-500 transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
                        />
                      </div>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                       <button 
                        onClick={() => toggleDoctorSelection("Tất cả")}
                        className={`w-full px-4 py-2.5 text-left text-[10px] font-bold flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${filterDoctors.includes("Tất cả") ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        <span>Tất cả</span>
                        {filterDoctors.includes("Tất cả") && <Check className="w-3.5 h-3.5" />}
                      </button>
                      {filteredDoctorsList.map(doc => (
                        <button 
                          key={doc}
                          onClick={() => toggleDoctorSelection(doc)}
                          className={`w-full px-4 py-2.5 text-left text-[10px] font-bold flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${filterDoctors.includes(doc) ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                          <span>{doc}</span>
                          {filterDoctors.includes(doc) && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Patient Object Filter */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                   <UserCheck className="w-3 h-3" /> Đối tượng
                </label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClassName}>
                   {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Service Group Filter */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                   <Tag className="w-3 h-3" /> Nhóm dịch vụ
                </label>
                <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className={selectClassName}>
                   {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
           </div>

           {filterPeriod === 'custom' && (
             <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Từ ngày</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className={selectClassName} />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Đến ngày</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className={selectClassName} />
               </div>
             </div>
           )}

           {filterDoctors.length > 1 && !filterDoctors.includes("Tất cả") && (
             <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-300">
                {filterDoctors.map(doc => (
                  <div key={doc} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold ${activeTheme.bg} text-white`}>
                    {doc}
                    <button onClick={() => toggleDoctorSelection(doc)} className="hover:text-amber-300 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
             </div>
           )}
        </section>

        {/* KPIs */}
        {uiSettings.showKPIs && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500`}>
            <KPICard title="Tổng BN" value={stats.totalPatients.toLocaleString()} icon={<Users />} theme={activeTheme} compact={isCompact} dark={isDark} trend={filteredData.length > 0 ? "+1.2%" : undefined} />
            <KPICard title="Tổng Viện phí" value={`${(stats.totalCost / 1e6).toFixed(1)}M`} icon={<TrendingUp />} theme={activeTheme} compact={isCompact} dark={isDark} trend={filteredData.length > 0 ? "+5.4%" : undefined} />
            <KPICard title="Ngày Điều trị TB" value={stats.avgDays.toFixed(1)} icon={<Calendar />} theme={activeTheme} compact={isCompact} dark={isDark} trend={filteredData.length > 0 ? "-0.3" : undefined} />
            <KPICard title="Chi phí TB/BN" value={`${(stats.avgCostPerPatient / 1000).toFixed(0)}k`} icon={<Stethoscope />} theme={activeTheme} compact={isCompact} dark={isDark} trend={filteredData.length > 0 ? "+2.1%" : undefined} />
          </div>
        )}

        {/* Service Analysis */}
        {uiSettings.showServiceAnalysis && (
          <section className="animate-in fade-in duration-700 delay-150">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-6 rounded-full ${activeTheme.bg}`}></div>
                <h3 className={`font-black uppercase tracking-widest text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Phân tích Dịch vụ Kỹ thuật & Hiệu quả</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-1">
                <ChartBox title="Cơ cấu Nhóm Dịch vụ" theme={activeTheme} compact={isCompact} dark={isDark}>
                  <div className="h-[300px] w-full flex flex-col items-center">
                    <ResponsiveContainer width="100%" height="70%">
                      <PieChart>
                        <Pie data={serviceGroupStats} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="totalCost">
                          {serviceGroupStats.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={isDark ? {backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'} : undefined} formatter={(v: number) => v.toLocaleString() + ' đ'} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full space-y-1.5 overflow-y-auto mt-2 max-h-[80px] custom-scrollbar">
                      {serviceGroupStats.slice(0, 4).map((g, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                           <div className="flex items-center gap-2 truncate max-w-[70%]">
                             <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: CHART_COLORS[i % CHART_COLORS.length]}}></div>
                             <span className={`font-bold truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{g.name}</span>
                           </div>
                           <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{(g.totalCost / 1e6).toFixed(1)}M</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartBox>
              </div>

              <div className="xl:col-span-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceStats.slice(0, 3).map((s, i) => (
                    <div key={i} className={`p-5 rounded-2xl border shadow-sm transition-all group relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400'}`}>
                       <div className={`absolute top-0 right-0 ${activeTheme.bg} text-white px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase`}>Top #{i+1}</div>
                       <div className="flex items-center gap-3 mb-4">
                         <div className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-slate-700 text-slate-400 group-hover:text-indigo-400' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600'}`}>
                           <Briefcase className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{s.group}</p>
                            <h4 className={`text-xs font-black line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                         </div>
                       </div>
                       <div className={`grid grid-cols-3 gap-2 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-50'}`}>
                          <div>
                             <p className="text-[9px] text-slate-400 uppercase font-bold">Số lượt</p>
                             <p className={`text-sm font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{s.count}</p>
                          </div>
                          <div>
                             <p className="text-[9px] text-slate-400 uppercase font-bold">Tổng thu</p>
                             <p className="text-sm font-black text-emerald-500">{(s.totalCost / 1e6).toFixed(1)}M</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] text-slate-400 uppercase font-bold">Giá TB</p>
                             <p className={`text-[11px] font-black ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{s.avgCost.toLocaleString()}</p>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
                <ChartBox title="So sánh Doanh thu Dịch vụ kỹ thuật (Top 10)" theme={activeTheme} compact={isCompact} dark={isDark}>
                  <ResponsiveContainer width="100%" height={isCompact ? 250 : 350}>
                    <BarChart data={serviceStats.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} axisLine={false} />
                      <Tooltip contentStyle={isDark ? {backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'} : undefined} formatter={(value: number) => value.toLocaleString() + ' đ'} />
                      <Bar dataKey="totalCost" name="Doanh thu" fill={activeTheme.primary} radius={[0, 4, 4, 0]} barSize={16}>
                        {serviceStats.slice(0, 10).map((_, index) => (
                           <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartBox>
              </div>
            </div>
          </section>
        )}

        {/* Dept & Disease Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {uiSettings.showDepartmentAnalysis && (
              <ChartBox title="Hiệu quả theo Chuyên Khoa" theme={activeTheme} compact={isCompact} dark={isDark}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={departmentStats.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: isDark ? '#cbd5e1' : '#1e293b' }} axisLine={false} />
                    <Tooltip contentStyle={isDark ? {backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'} : undefined} />
                    <Bar dataKey="totalCost" fill={activeTheme.primary} radius={[0, 4, 4, 0]} barSize={20} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartBox>
           )}
           {uiSettings.showDiseaseAnalysis && (
              <ChartBox title="Mô hình Bệnh tật ICD-10" theme={activeTheme} compact={isCompact} dark={isDark}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={diseaseStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="code" type="category" width={60} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDark ? '#cbd5e1' : '#1e293b' }} axisLine={false} />
                    <Tooltip contentStyle={isDark ? {backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'} : undefined} />
                    <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>
           )}
        </div>

        {/* Doctor Performance */}
        {uiSettings.showDoctorTable && (
          <section className={`rounded-3xl shadow-sm border overflow-hidden animate-in fade-in duration-700 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-6 py-5 border-b flex items-center justify-between ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`font-black uppercase tracking-widest text-sm flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Users className="w-5 h-5 text-indigo-600" /> Bảng xếp hạng hiệu quả công tác
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`uppercase text-[10px] font-black border-b ${isDark ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  <tr>
                    <th className="px-8 py-5">Họ tên Bác sĩ / Chuyên khoa</th>
                    <th className="px-8 py-5 text-right">Lượt ĐT</th>
                    <th className="px-8 py-5 text-right">Chi phí TB</th>
                    <th className="px-8 py-5 text-right">Tổng viện phí</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                  {Array.from(new Set(filteredData.map(d => d.BAC_SY))).slice(0, 10).map((name, idx) => {
                    const docData = filteredData.filter(d => d.BAC_SY === name);
                    const total = docData.reduce((acc, curr) => acc + (Number(curr.THANH_TIEN) || 0), 0);
                    const avg = docData.length > 0 ? total / docData.length : 0;
                    return (
                      <tr key={idx} className={`transition-colors group ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/80'}`}>
                        <td className="px-8 py-5">
                          <div className={`font-bold transition-colors ${isDark ? 'text-slate-100 group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'}`}>{name}</div>
                          <div className={`text-[10px] ${activeTheme.text} font-black uppercase tracking-tighter`}>{docData[0]?.KHOA}</div>
                        </td>
                        <td className={`px-8 py-5 text-right font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{docData.length}</td>
                        <td className={`px-8 py-5 text-right font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{Math.round(avg).toLocaleString()} đ</td>
                        <td className="px-8 py-5 text-right font-black text-emerald-500">{total.toLocaleString()} đ</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Panels & Modals */}
      <div className={`fixed inset-y-0 right-0 w-85 bg-white shadow-2xl z-50 transform transition-transform duration-400 ease-in-out border-l ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <h3 className={`font-black flex items-center gap-2 uppercase tracking-widest text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <Palette className="w-5 h-5 text-indigo-600" /> Cấu hình giao diện
            </h3>
            <button onClick={() => setIsSettingsOpen(false)} className={`p-2 rounded-full transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Moon className="w-3 h-3" /> Chế độ hiển thị</label>
              <button onClick={() => setUiSettings({...uiSettings, isDarkMode: !uiSettings.isDarkMode})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isDark ? 'border-indigo-500 bg-indigo-900/20 text-indigo-400' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <span className="text-xs font-bold">{isDark ? "Chế độ tối đang bật" : "Chế độ sáng đang bật"}</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-all ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isDark ? 'right-1' : 'left-1'}`}></div>
                </div>
              </button>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3 h-3" /> Chủ đề màu sắc</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button key={key} onClick={() => setUiSettings({...uiSettings, theme: key})} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${uiSettings.theme === key ? 'border-indigo-600 bg-indigo-50/10 shadow-md' : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white hover:border-slate-200')}`}>
                    <div className={`w-12 h-12 rounded-full ${theme.bg} shadow-inner flex items-center justify-center`}>
                      {uiSettings.theme === key && <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>}
                    </div>
                    <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={`p-6 border-t space-y-3 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <button onClick={handleResetSettings} className={`w-full py-3 border text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
              <RotateCcw className="w-4 h-4" /> Đặt lại mặc định
            </button>
            <button onClick={() => setIsSettingsOpen(false)} className={`w-full py-3 ${activeTheme.bg} text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg`}>Áp dụng thay đổi</button>
          </div>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className={`text-2xl font-black flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}><Database className="w-6 h-6 text-blue-600" /> Kết nối HIS Sync</h3>
                  <p className="text-slate-500 text-sm">Đồng bộ dữ liệu thời gian thực từ Google Sheets của bệnh viện.</p>
                </div>
                <button onClick={() => setIsConfigOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input type="text" value={sheetId} onChange={(e) => setSheetId(e.target.value)} placeholder="Dán Sheet ID vào đây..." className={`w-full border-2 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500'}`} />
                </div>
                <button onClick={() => { fetchFromGoogleSheet(sheetId); setIsConfigOpen(false); }} className={`w-full ${activeTheme.bg} text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform`}>
                   <RefreshCw className="w-5 h-5" /> {isConnectedToSheet ? 'Cập nhật dữ liệu' : 'Kết nối dữ liệu ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isChatOpen && (
        <button onClick={() => setIsChatOpen(true)} className={`fixed bottom-6 right-6 ${activeTheme.bg} text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group relative`}>
          <Sparkles className="w-7 h-7" />
        </button>
      )}

      {isChatOpen && (
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300`}>
          <div className={`rounded-3xl shadow-2xl border w-[420px] h-[650px] flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`${activeTheme.bg} p-5 text-white flex flex-col transition-colors`}>
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center space-x-2">
                   <Sparkles className="w-5 h-5 text-amber-300 fill-current" />
                   <span className="font-bold text-sm tracking-tight uppercase">Smart Assistant</span>
                 </div>
                 <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex bg-black/10 p-1 rounded-xl">
                <button onClick={() => setChatMode('analytics')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chatMode === 'analytics' ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-white/70 hover:text-white'}`}>Quản trị</button>
                <button onClick={() => setChatMode('diagnostic')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chatMode === 'diagnostic' ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-white/70 hover:text-white'}`}>Chẩn đoán</button>
              </div>
            </div>
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[11px] shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? `${activeTheme.bg} text-white rounded-tr-none font-bold` : (isDark ? 'bg-slate-700 text-slate-100 border-slate-600' : 'bg-white text-slate-800 border-slate-200 font-medium') + ' border rounded-tl-none'}`}>{msg.content}</div>
                </div>
              ))}
              {isAiLoading && <div className="text-[10px] text-slate-400 italic">H-AI đang xử lý...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className={`p-4 border-t flex items-center space-x-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskAi()} placeholder="Gõ yêu cầu của bạn..." className={`flex-1 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`} />
              <button onClick={handleAskAi} className={`${activeTheme.bg} p-2.5 rounded-xl text-white hover:opacity-90 transition-all shadow-lg`}><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center"><div className={`p-10 rounded-3xl shadow-2xl text-center space-y-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}><div className={`w-12 h-12 border-4 ${activeTheme.text} border-t-transparent rounded-full animate-spin mx-auto`}></div><p className={`font-black tracking-widest uppercase text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{loadingText}</p></div></div>}
    </div>
  );
};

const KPICard: React.FC<{ title: string, value: string, icon: React.ReactNode, theme: any, compact: boolean, dark: boolean, trend?: string }> = ({ title, value, icon, theme, compact, dark, trend }) => (
  <div className={`rounded-2xl shadow-sm border transition-all group overflow-hidden ${compact ? 'p-3' : 'p-6'} ${dark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400'}`}>
    <div className="flex justify-between items-start">
      <div className={`${compact ? 'p-1.5' : 'p-3'} rounded-xl transition-all ${dark ? 'bg-slate-700 text-slate-400 group-hover:bg-indigo-900/40 group-hover:text-indigo-400' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: compact ? 'w-4 h-4' : 'w-6 h-6' }) : icon}
      </div>
      {trend && <div className={`text-[10px] font-black px-2 py-0.5 rounded-md ${trend.startsWith('+') ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>{trend}</div>}
    </div>
    <div className={`mt-4 ${compact ? 'space-y-0.5' : 'space-y-1'}`}>
      <h3 className={`font-bold uppercase tracking-widest ${compact ? 'text-[8px]' : 'text-[10px]'} ${dark ? 'text-slate-500' : 'text-slate-500'}`}>{title}</h3>
      <p className={`font-black tracking-tight ${compact ? 'text-lg' : 'text-2xl'} ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  </div>
);

const ChartBox: React.FC<{ title: string, children: React.ReactNode, theme: any, compact: boolean, dark: boolean }> = ({ title, children, theme, compact, dark }) => (
  <div className={`rounded-2xl shadow-sm border overflow-hidden h-full ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
    <div className={`border-b flex items-center gap-3 ${compact ? 'p-3' : 'p-5'} ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
      <div className={`w-1.5 h-6 rounded-full ${theme.bg}`}></div>
      <h3 className={`font-black uppercase tracking-widest ${compact ? 'text-[10px]' : 'text-xs'} ${dark ? 'text-slate-300' : 'text-slate-800'}`}>{title}</h3>
    </div>
    <div className={`${compact ? 'p-4' : 'p-6'}`}>{children}</div>
  </div>
);

export default App;
