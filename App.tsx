
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, TrendingUp, X, Activity, Moon, Sun, Target, Zap, 
  LayoutDashboard, BedDouble, UserPlus, Microscope, Save, Undo2, 
  Paintbrush, CloudUpload, BarChart3,
  AlertCircle, ClipboardList, Info, Link as LinkIcon, RefreshCw, 
  Search, Download, Filter, Calendar, CheckSquare, Square, ChevronDown,
  Stethoscope, Layers, Hash, DollarSign, ArrowUpRight, SortAsc, SortDesc, List,
  Clock, Trash2, CheckCircle2, Medal, Award, Trophy, User, HeartPulse,
  ChevronRight, ArrowRight, PieChart as PieIcon, Calculator, Timer, Flag
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, PieChart, Pie, Sector
} from 'recharts';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { generateSampleData } from './utils/sampleData';
import { HospitalRecord } from './types';

// --- HỆ THỐNG CHỈ TIÊU GỐC PL1-11 ---
const INITIAL_OFFICIAL_TARGETS_DEPT: Record<string, any> = {
  "Khoa Khám bệnh": { revenue: 20606498593, visits_opd: 99728, tests: 85803 },
  "Khoa Nội": { revenue: 8480403457, vol_inpatients: 4800, vol_inpatient_days: 21900 },
  "Khoa CSSKSS và Phụ sản": { revenue: 2884987882, vol_inpatients: 799, births: 332 },
  "Khoa Truyền Nhiễm": { revenue: 4316995785, vol_inpatients: 1896 },
  "Khoa Cấp cứu - HSTC - CĐ": { revenue: 4213870764, vol_inpatients: 3507 },
  "Khoa YHCT - PHCN": { revenue: 3834234538, vol_outpatients: 774 },
  "Khoa Xét nghiệm - KSNK": { revenue: 6640026000, vol_hematology: 55980, vol_biochemistry: 123880 },
  "Khoa Chẩn đoán hình ảnh": { revenue: 5163455040, vol_xray: 38950, vol_ultrasound: 24688 },
  "Khoa Ngoại - PT - GMHS": { revenue: 6236726840, vol_inpatients: 1779, vol_surgeries: 403 },
  "Khoa Nhi": { revenue: 4367344585, vol_inpatients: 3125 }
};

const INITIAL_OFFICIAL_TARGETS = {
  center: {
    beds_plan: 160, beds_real: 175, occupancy: 95, visits_general: 136961, health_checks: 2657,
    outpatients: 774, inpatients: 13906, inpatient_days: 72311, avg_days: 5.2, surgeries: 403,
    procedures: 40355, births: 332, tests: 171780, xray: 37041, ecg: 18609, ultrasound: 22902, 
    ent: 1834, digestive_endo: 734, revenue: 54941062444
  },
  departments: INITIAL_OFFICIAL_TARGETS_DEPT
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569', '#f97316', '#a855f7'];

const App: React.FC = () => {
  const [data, setData] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [sheetId, setSheetId] = useState(() => localStorage.getItem('h_sheet_id') || '1n0TB3V1_U9dyFWZ0en2aQjaD1XiqCBqIxEvea8xvnm0');
  
  // --- STATES BỘ LỌC ---
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTimePreset, setActiveTimePreset] = useState<string>('all');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedPatientObjects, setSelectedPatientObjects] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  
  // Chi tiết bác sĩ được chọn
  const [selectedDetailName, setSelectedDetailName] = useState<string | null>(null);

  // States cho Phân tích Dịch vụ
  const [activeServiceGroup, setActiveServiceGroup] = useState<string>('All');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [serviceSortBy, setServiceSortBy] = useState<'revenue' | 'count' | 'avg'>('revenue');

  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem('h_official_targets_vfinal_stable');
    return saved ? JSON.parse(saved) : INITIAL_OFFICIAL_TARGETS;
  });
  const [draftTargets, setDraftTargets] = useState(targets);

  const [uiSettings, setUiSettings] = useState(() => {
    const saved = localStorage.getItem('h_ui_settings_v7');
    return saved ? JSON.parse(saved) : { isDarkMode: true, primaryColor: '#0d9488' };
  });

  useEffect(() => {
    localStorage.setItem('h_ui_settings_v7', JSON.stringify(uiSettings));
    document.body.classList.toggle('dark', uiSettings.isDarkMode);
  }, [uiSettings]);

  useEffect(() => {
    const savedData = localStorage.getItem('h_last_data');
    if (savedData) {
      try { setData(JSON.parse(savedData)); } catch (e) { setData(generateSampleData(500)); }
    } else { 
      if (sheetId) fetchGoogleSheet();
      else setData(generateSampleData(500)); 
    }
  }, []);

  const filterOptions = useMemo(() => {
    return {
      depts: Array.from(new Set(data.map(r => r.KHOA).filter(Boolean))).sort(),
      doctors: Array.from(new Set(data.map(r => r.BAC_SY).filter(Boolean))).sort(),
      serviceGroups: Array.from(new Set(data.map(r => r.TEN_NHOM).filter(Boolean))).sort(),
      patientObjects: Array.from(new Set(data.map(r => r.DOI_TUONG).filter(Boolean))).sort(),
    };
  }, [data]);

  // --- HÀM XỬ LÝ PRESET THỜI GIAN ---
  const applyTimePreset = (preset: string) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    let start = '';
    let end = formatDate(today);

    switch(preset) {
      case 'today':
        start = formatDate(today);
        break;
      case 'week': {
        const firstDayOfWeek = new Date(today);
        const day = today.getDay() || 7; 
        firstDayOfWeek.setDate(today.getDate() - day + 1);
        start = formatDate(firstDayOfWeek);
        break;
      }
      case 'month':
        start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        break;
      case 'quarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        start = formatDate(new Date(today.getFullYear(), quarter * 3, 1));
        break;
      }
      case 'year':
        start = formatDate(new Date(today.getFullYear(), 0, 1));
        break;
      case 'custom':
        setActiveTimePreset('custom');
        return;
      case 'all':
      default:
        start = '';
        end = '';
        break;
    }

    setDateRange({ start, end });
    setActiveTimePreset(preset);
  };

  // --- LOGIC LỌC DỮ LIỆU TOÀN CỤC ---
  const filteredData = useMemo(() => {
    return data.filter(record => {
      const dateMatch = (!dateRange.start || record.NGAY_VAO_VIEN >= dateRange.start) &&
                        (!dateRange.end || record.NGAY_VAO_VIEN <= dateRange.end);
      const deptMatch = selectedDepts.length === 0 || selectedDepts.includes(record.KHOA);
      const doctorMatch = selectedDoctors.length === 0 || selectedDoctors.includes(record.BAC_SY);
      const objectMatch = selectedPatientObjects.length === 0 || selectedPatientObjects.includes(record.DOI_TUONG);
      
      return dateMatch && deptMatch && doctorMatch && objectMatch;
    });
  }, [data, dateRange, selectedDepts, selectedDoctors, selectedPatientObjects]);

  // --- PHÂN TÍCH MÔ HÌNH BỆNH TẬT (ICD-10) ---
  const icdAnalysis = useMemo(() => {
    const map: Record<string, { code: string, name: string, count: number, totalCost: number }> = {};
    filteredData.forEach(r => {
      if (!r.MA_BENH) return;
      if (!map[r.MA_BENH]) {
          map[r.MA_BENH] = { 
            code: r.MA_BENH, 
            name: r.CHAN_DOAN || 'Không xác định', 
            count: 0, 
            totalCost: 0 
          };
      }
      map[r.MA_BENH].count += 1;
      map[r.MA_BENH].totalCost += (Number(r.THANH_TIEN) || 0);
    });
    
    return Object.values(map)
      .map(item => ({
        ...item,
        avgCost: item.totalCost / item.count,
        revenueInMillions: Number((item.totalCost / 1e6).toFixed(2))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filteredData]);

  // --- LOGIC PHÂN TÍCH CHUNG ---
  const stats = useMemo(() => {
    const totalCost = filteredData.reduce((acc, curr) => acc + (Number(curr.THANH_TIEN) || 0), 0);
    const uniquePatients = new Set(filteredData.map(d => d.MA_BN)).size;
    const avgDays = filteredData.length > 0 ? filteredData.reduce((acc, curr) => acc + (Number(curr.SO_NGAY_DTRI) || 0), 0) / filteredData.length : 0;

    const deptMap: Record<string, number> = {};
    filteredData.forEach(d => { if (d.KHOA) deptMap[d.KHOA] = (deptMap[d.KHOA] || 0) + (Number(d.THANH_TIEN) || 0); });
    const deptRevenue = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    const doctorMap: Record<string, number> = {};
    filteredData.forEach(d => {
      if (d.BAC_SY) doctorMap[d.BAC_SY] = (doctorMap[d.BAC_SY] || 0) + (Number(d.THANH_TIEN) || 0);
    });
    const topDoctors = Object.entries(doctorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return { totalCost, uniquePatients, avgDays, deptRevenue, topDoctors };
  }, [filteredData]);

  // --- LOGIC TÍNH TOÁN TIẾN ĐỘ THỰC TẾ ---
  const progressStats = useMemo(() => {
    // 1. Center Actuals
    const centerActual = {
      revenue: stats.totalCost,
      visits_general: stats.uniquePatients,
      inpatients: new Set(filteredData.filter(r => r.SO_NGAY_DTRI > 0).map(r => r.MA_BN)).size,
      surgeries: filteredData.filter(r => r.TEN_NHOM === 'Phẫu thuật').length,
      procedures: filteredData.filter(r => r.TEN_NHOM === 'Thủ thuật').length,
      tests: filteredData.filter(r => r.TEN_NHOM === 'Xét nghiệm').length,
      xray: filteredData.filter(r => r.TEN_NHOM === 'Chẩn đoán hình ảnh' && r.DICH_VU.toLowerCase().includes('x-quang')).length,
      ultrasound: filteredData.filter(r => r.TEN_NHOM === 'Chẩn đoán hình ảnh' && r.DICH_VU.toLowerCase().includes('siêu âm')).length,
    };

    // 2. Department Actuals
    const deptActuals: Record<string, any> = {};
    filteredData.forEach(r => {
      if (!r.KHOA) return;
      if (!deptActuals[r.KHOA]) {
        deptActuals[r.KHOA] = { revenue: 0, inpatients: new Set(), visits: new Set(), tests: 0, surgeries: 0 };
      }
      deptActuals[r.KHOA].revenue += (Number(r.THANH_TIEN) || 0);
      deptActuals[r.KHOA].visits.add(r.MA_BN);
      if (r.SO_NGAY_DTRI > 0) deptActuals[r.KHOA].inpatients.add(r.MA_BN);
      if (r.TEN_NHOM === 'Xét nghiệm') deptActuals[r.KHOA].tests++;
      if (r.TEN_NHOM === 'Phẫu thuật') deptActuals[r.KHOA].surgeries++;
    });

    return { centerActual, deptActuals };
  }, [filteredData, stats]);

  // --- PHÂN TÍCH CHI TIẾT DỊCH VỤ CHO BÁC SĨ ĐƯỢC CHỌN ---
  const doctorDetailServices = useMemo(() => {
    if (!selectedDetailName) return [];
    const servicesMap: Record<string, { name: string, group: string, count: number, totalCost: number }> = {};
    filteredData.filter(r => r.BAC_SY === selectedDetailName).forEach(r => {
      if (!r.DICH_VU) return;
      const key = `${r.TEN_NHOM}::${r.DICH_VU}`;
      if (!servicesMap[key]) {
        servicesMap[key] = { name: r.DICH_VU, group: r.TEN_NHOM, count: 0, totalCost: 0 };
      }
      servicesMap[key].count += 1;
      servicesMap[key].totalCost += (Number(r.THANH_TIEN) || 0);
    });
    return Object.values(servicesMap).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredData, selectedDetailName]);

  const serviceAnalysis = useMemo(() => {
    const servicesMap: Record<string, { name: string, group: string, count: number, totalCost: number }> = {};
    filteredData.forEach(r => {
      if (!r.DICH_VU) return;
      const key = `${r.TEN_NHOM}::${r.DICH_VU}`;
      if (!servicesMap[key]) {
        servicesMap[key] = { name: r.DICH_VU, group: r.TEN_NHOM, count: 0, totalCost: 0 };
      }
      servicesMap[key].count += 1;
      servicesMap[key].totalCost += (Number(r.THANH_TIEN) || 0);
    });
    const statsArray = Object.values(servicesMap).map(s => ({ ...s, avgCost: s.totalCost / s.count }));
    const groups = ['All', ...Array.from(new Set(statsArray.map(s => s.group))).sort()];
    let result = statsArray;
    if (activeServiceGroup !== 'All') result = result.filter(s => s.group === activeServiceGroup);
    if (serviceSearchTerm) result = result.filter(s => s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()));
    result.sort((a, b) => {
      if (serviceSortBy === 'revenue') return b.totalCost - a.totalCost;
      if (serviceSortBy === 'count') return b.count - a.count;
      if (serviceSortBy === 'avg') return b.avgCost - a.avgCost;
      return 0;
    });
    return { filteredStats: result, groups };
  }, [filteredData, activeServiceGroup, serviceSearchTerm, serviceSortBy]);

  const targetPercent = (stats.totalCost / targets.center.revenue) * 100;

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as HospitalRecord[];
        processAndSetData(json);
      } catch (err) { alert("Lỗi đọc file Excel."); } finally { setLoading(false); }
    };
    reader.readAsBinaryString(file);
  };

  const fetchGoogleSheet = async () => {
    if (!sheetId) return alert("Nhập Sheet ID");
    setLoading(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(url);
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true, dynamicTyping: true, skipEmptyLines: true,
        complete: (results) => {
          processAndSetData(results.data as HospitalRecord[]);
          localStorage.setItem('h_sheet_id', sheetId);
          setLoading(false);
        }
      });
    } catch (err) { alert("Lỗi kết nối."); setLoading(false); }
  };

  const processAndSetData = (raw: HospitalRecord[]) => {
    const cleaned = raw.filter(r => r.MA_BN || r.MA_BA);
    setData(cleaned);
    localStorage.setItem('h_last_data', JSON.stringify(cleaned));
  };

  const toggleMultiSelect = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (list.includes(val)) setList(list.filter(i => i !== val));
    else setList([...list, val]);
  };

  const isDark = uiSettings.isDarkMode;
  const primaryColor = uiSettings.primaryColor;

  return (
    <div className={`min-h-screen pb-12 transition-all duration-300 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <header className={`border-b sticky top-0 z-40 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl text-white shadow-lg" style={{ backgroundColor: primaryColor }}><Activity className="w-6 h-6" /></div>
            <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>SmartHIS <span style={{ color: primaryColor }}>Tịnh Biên</span></h1>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <button onClick={() => setIsTargetOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border font-bold text-[10px] md:text-[11px] transition-all" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>
              <Target className="w-4 h-4" /> <span className="hidden xs:inline uppercase tracking-wider">Chỉ tiêu PL1-11</span>
            </button>
            <button onClick={() => setUiSettings({...uiSettings, isDarkMode: !isDark})} className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-slate-700 text-amber-400 border-slate-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Nguồn dữ liệu */}
        <div className="grid grid-cols-1 gap-6 no-print">
          <div className={`p-6 rounded-[2rem] border flex flex-col sm:flex-row gap-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
             <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-indigo-500">
                   <LinkIcon className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Google Sheets ID</span>
                </div>
                <div className="flex gap-2">
                   <input type="text" placeholder="ID bảng tính..." value={sheetId} onChange={(e) => setSheetId(e.target.value)} className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold border outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 focus:border-indigo-500'}`} />
                   <button onClick={fetchGoogleSheet} className="p-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                </div>
             </div>
             <div className={`hidden sm:block w-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
             <div className="flex-1 flex flex-col justify-center items-center text-center p-4 border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-700 hover:border-emerald-500 relative cursor-pointer">
                <CloudUpload className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-slate-400">Tải Excel/CSV</span>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
             </div>
          </div>
        </div>

        {/* --- KHU VỰC BỘ LỌC TOÀN CỤC --- */}
        <div className={`p-6 md:p-8 rounded-[2.5rem] border transition-all overflow-hidden no-print ${isDark ? 'bg-[#1a2332] border-[#2d3748] shadow-2xl' : 'bg-white border-slate-100 shadow-md'}`}>
          <div className="flex flex-col space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 flex items-center justify-center rounded-2xl border shadow-inner transition-colors ${isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                  <Filter className="w-7 h-7" />
                </div>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Bộ lọc Quản trị Chuyên sâu</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Tối ưu hóa dữ liệu theo nhu cầu quản trị</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(dateRange.start || selectedDepts.length > 0 || selectedDoctors.length > 0 || selectedPatientObjects.length > 0) && (
                   <button onClick={() => { setDateRange({start: '', end: ''}); setSelectedDepts([]); setSelectedDoctors([]); setSelectedPatientObjects([]); setActiveTimePreset('all'); }} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20">
                     <Trash2 className="w-4 h-4" /> Làm mới
                   </button>
                )}
                <button 
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                  className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl hover:scale-105 active:scale-95 ${isFilterExpanded ? (isDark ? 'bg-indigo-500' : 'bg-indigo-600') + ' text-white' : (isDark ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-slate-100 text-slate-700 border border-slate-200')}`}
                >
                  {isFilterExpanded ? 'Thu gọn' : 'Mở rộng'}
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isFilterExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <div className={`transition-all duration-500 overflow-hidden ${isFilterExpanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 pt-10 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                
                {/* BỘ LỌC THỜI GIAN CẢI TIẾN */}
                <div className="space-y-5">
                   <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                     <Calendar className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} /> Khoảng thời gian
                   </div>
                   
                   {/* Preset Chips */}
                   <div className="flex flex-wrap gap-2.5">
                     {[
                       { id: 'all', label: 'Toàn bộ' },
                       { id: 'today', label: 'Hôm nay' },
                       { id: 'week', label: 'Tuần này' },
                       { id: 'month', label: 'Tháng này' },
                       { id: 'quarter', label: 'Quý này' },
                       { id: 'year', label: 'Năm nay' },
                       { id: 'custom', label: 'Tùy chỉnh' },
                     ].map(p => (
                       <button 
                         key={p.id}
                         onClick={() => applyTimePreset(p.id)}
                         className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${activeTimePreset === p.id ? (isDark ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-600 border-indigo-600 text-white shadow-lg') : (isDark ? 'bg-[#111827] border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50')}`}
                       >
                         {p.label}
                       </button>
                     ))}
                   </div>

                   <div className={`grid grid-cols-2 gap-5 transition-all duration-500 ${activeTimePreset !== 'custom' && activeTimePreset !== 'all' ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}>
                      <div className="space-y-2">
                        <span className={`text-[10px] font-black px-1 uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Ngày bắt đầu</span>
                        <div className="relative group">
                          <input 
                            type="date" 
                            disabled={activeTimePreset !== 'custom' && activeTimePreset !== 'all'}
                            value={dateRange.start} 
                            onChange={(e) => { setDateRange({...dateRange, start: e.target.value}); setActiveTimePreset('custom'); }} 
                            className={`w-full p-4 text-[13px] font-black rounded-2xl border-2 outline-none transition-all ${isDark ? 'bg-[#0f172a] border-slate-800 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 group-hover:border-slate-300'}`} 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className={`text-[10px] font-black px-1 uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Ngày kết thúc</span>
                        <div className="relative group">
                          <input 
                            type="date" 
                            disabled={activeTimePreset !== 'custom' && activeTimePreset !== 'all'}
                            value={dateRange.end} 
                            onChange={(e) => { setDateRange({...dateRange, end: e.target.value}); setActiveTimePreset('custom'); }} 
                            className={`w-full p-4 text-[13px] font-black rounded-2xl border-2 outline-none transition-all ${isDark ? 'bg-[#0f172a] border-slate-800 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 group-hover:border-slate-300'}`} 
                          />
                        </div>
                      </div>
                   </div>
                </div>

                {/* Khoa phòng */}
                <SearchableMultiSelect 
                  label="Khoa phòng" 
                  options={filterOptions.depts} 
                  selected={selectedDepts} 
                  onToggle={(v) => toggleMultiSelect(selectedDepts, setSelectedDepts, v)} 
                  onSelectAll={() => setSelectedDepts([...filterOptions.depts])} 
                  onClearAll={() => setSelectedDepts([])} 
                  icon={<Layers className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />} 
                  dark={isDark} 
                />

                {/* Bác sĩ điều trị */}
                <SearchableMultiSelect 
                  label="Bác sĩ điều trị" 
                  options={filterOptions.doctors} 
                  selected={selectedDoctors} 
                  onToggle={(v) => toggleMultiSelect(selectedDoctors, setSelectedDoctors, v)} 
                  onSelectAll={() => setSelectedDoctors([...filterOptions.doctors])} 
                  onClearAll={() => setSelectedDoctors([])} 
                  icon={<Stethoscope className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />} 
                  dark={isDark} 
                />

                {/* Đối tượng */}
                <SearchableMultiSelect 
                  label="Đối tượng" 
                  options={filterOptions.patientObjects} 
                  selected={selectedPatientObjects} 
                  onToggle={(v) => toggleMultiSelect(selectedPatientObjects, setSelectedPatientObjects, v)} 
                  onSelectAll={() => setSelectedPatientObjects([...filterOptions.patientObjects])} 
                  onClearAll={() => setSelectedPatientObjects([])} 
                  icon={<Users className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />} 
                  dark={isDark} 
                />
              </div>

              {/* Filter Chips Display Area */}
              <div className={`flex flex-wrap gap-2.5 mt-10 pt-8 border-t ${isDark ? 'border-slate-700/30' : 'border-slate-200'}`}>
                 {selectedDepts.map(d => <FilterChip key={d} label={d} onRemove={() => toggleMultiSelect(selectedDepts, setSelectedDepts, d)} color={isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-2 border-emerald-200 shadow-sm"} />)}
                 {selectedDoctors.map(d => <FilterChip key={d} label={`BS. ${d}`} onRemove={() => toggleMultiSelect(selectedDoctors, setSelectedDoctors, d)} color={isDark ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-amber-50 text-amber-800 border-2 border-amber-200 shadow-sm"} />)}
                 {selectedPatientObjects.map(d => <FilterChip key={d} label={d} onRemove={() => toggleMultiSelect(selectedPatientObjects, setSelectedPatientObjects, d)} color={isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-cyan-50 text-cyan-800 border-2 border-cyan-200 shadow-sm"} />)}
                 {dateRange.start && <FilterChip label={`Từ: ${dateRange.start}`} onRemove={() => { setDateRange({...dateRange, start: ''}); setActiveTimePreset('custom'); }} color={isDark ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-indigo-50 text-indigo-800 border-2 border-indigo-200 shadow-sm"} />}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KPICard title="Bệnh nhân" value={stats.uniquePatients.toLocaleString()} icon={<Users />} primaryColor={primaryColor} dark={isDark} />
            <KPICard title="Doanh thu" value={`${(stats.totalCost / 1e6).toFixed(1)}M`} icon={<TrendingUp />} primaryColor={primaryColor} dark={isDark} />
            <KPICard title="Tiến độ năm" value={`${targetPercent.toFixed(1)}%`} icon={<Zap />} primaryColor={primaryColor} dark={isDark} />
            <KPICard title="Ngày ĐT/BN" value={stats.avgDays.toFixed(1)} icon={<ClipboardList />} primaryColor={primaryColor} dark={isDark} />
        </div>

        {/* --- BẢNG TIẾN ĐỘ CHỈ TIÊU TỔNG QUÁT --- */}
        <div className={`p-8 rounded-[3rem] border shadow-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 shadow-sm">
                <Flag className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-lg font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Tiến độ Thực hiện Chỉ tiêu PL1-11</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Giám sát mục tiêu toàn diện Trung tâm</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl flex items-center gap-3 border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <Timer className="w-4 h-4 text-indigo-400" />
              <span className={`text-[10px] font-black uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Thời gian: {dateRange.start || '---'} đến {dateRange.end || 'Hiện tại'}</span>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-transparent">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border-b dark:border-slate-700`}>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Chỉ tiêu</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Đơn vị</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Kế hoạch</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực hiện</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ (%)</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Còn lại</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700/50">
                <ProgressRow 
                  label="19. Tổng Doanh thu" 
                  unit="đ" 
                  plan={targets.center.revenue} 
                  actual={progressStats.centerActual.revenue} 
                  dark={isDark} 
                  isCurrency 
                />
                <ProgressRow 
                  label="4. Số lượt Khám chung" 
                  unit="Lượt" 
                  plan={targets.center.visits_general} 
                  actual={progressStats.centerActual.visits_general} 
                  dark={isDark} 
                />
                <ProgressRow 
                  label="7. Số BN Nội trú" 
                  unit="Lượt" 
                  plan={targets.center.inpatients} 
                  actual={progressStats.centerActual.inpatients} 
                  dark={isDark} 
                />
                <ProgressRow 
                  label="10. Số ca Phẫu thuật" 
                  unit="Ca" 
                  plan={targets.center.surgeries} 
                  actual={progressStats.centerActual.surgeries} 
                  dark={isDark} 
                />
                <ProgressRow 
                  label="11. Số ca Thủ thuật" 
                  unit="Ca" 
                  plan={targets.center.procedures} 
                  actual={progressStats.centerActual.procedures} 
                  dark={isDark} 
                />
                <ProgressRow 
                  label="13. Số lượt Xét nghiệm" 
                  unit="Lượt" 
                  plan={targets.center.tests} 
                  actual={progressStats.centerActual.tests} 
                  dark={isDark} 
                />
                <ProgressRow 
                  label="14. Chụp X-Quang" 
                  unit="Lượt" 
                  plan={targets.center.xray} 
                  actual={progressStats.centerActual.xray} 
                  dark={isDark} 
                />
                <ProgressRow 
                  label="16. Siêu âm" 
                  unit="Lượt" 
                  plan={targets.center.ultrasound} 
                  actual={progressStats.centerActual.ultrasound} 
                  dark={isDark} 
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* --- TIẾN ĐỘ KHOA PHÒNG --- */}
        <div className={`p-8 rounded-[3rem] border shadow-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-sm">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-lg font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Theo dõi tiến độ Khoa phòng</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Phân tích chi tiết doanh thu theo đơn vị giao khoán</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(targets.departments).map(([deptName, deptTarget]: [string, any]) => {
              const actual = progressStats.deptActuals[deptName]?.revenue || 0;
              const percent = (actual / deptTarget.revenue) * 100;
              const colorClass = percent < 50 ? 'bg-rose-500' : percent < 80 ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div key={deptName} className={`p-6 rounded-[2rem] border transition-all hover:shadow-lg ${isDark ? 'bg-slate-900/40 border-slate-700 hover:border-indigo-500/30' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                  <h4 className={`text-[12px] font-black mb-4 truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{deptName}</h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tiến độ Doanh thu</span>
                      <span className={`text-[11px] font-black ${percent < 50 ? 'text-rose-500' : percent < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>{percent.toFixed(1)}%</span>
                    </div>
                    
                    <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div className={`h-full transition-all duration-1000 ${colorClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">Kế hoạch</p>
                        <p className={`text-[11px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{(deptTarget.revenue / 1e6).toFixed(1)}M</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-slate-500 uppercase">Thực hiện</p>
                        <p className="text-[11px] font-black text-emerald-500">{(actual / 1e6).toFixed(1)}M</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- PHÂN TÍCH MÔ HÌNH BỆNH TẬT (ICD-10) --- */}
        <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
           <div className="flex flex-col lg:flex-row gap-10">
              {/* Biểu đồ Mô hình bệnh tật */}
              <div className="flex-[2]">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500"><HeartPulse className="w-5 h-5" /></div>
                    <div>
                       <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? '' : 'text-slate-800'}`}>Mô hình bệnh tật (ICD-10)</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Top 15 bệnh thường gặp nhất</p>
                    </div>
                 </div>
                 
                 <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart 
                          data={icdAnalysis} 
                          layout="vertical" 
                          margin={{ left: 60, right: 40 }}
                       >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                          <XAxis type="number" hide />
                          <YAxis 
                             dataKey="code" 
                             type="category" 
                             axisLine={false} 
                             tickLine={false} 
                             width={50}
                             tick={{ fontSize: 10, fontWeight: 800, fill: isDark ? '#f43f5e' : '#e11d48' }} 
                          />
                          <Tooltip 
                             cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                             contentStyle={{ 
                                borderRadius: '1rem', 
                                border: 'none', 
                                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                fontSize: '11px',
                                fontWeight: '700'
                             }}
                             content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className={`p-4 rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                                      <p className="text-rose-500 font-black mb-1">[{d.code}] {d.name}</p>
                                      <div className="space-y-1 border-t dark:border-slate-800 pt-2 mt-2">
                                        <p className="flex justify-between gap-10"><span>Số ca:</span> <span className={isDark ? "text-white" : "text-slate-900"}>{d.count} ca</span></p>
                                        <p className="flex justify-between gap-10"><span>Tổng CP:</span> <span className="text-emerald-500">{(d.totalCost / 1e6).toFixed(2)}M đ</span></p>
                                        <p className="flex justify-between gap-10"><span>CP TB/Ca:</span> <span className="text-indigo-400">{(d.avgCost / 1e6).toFixed(2)}M đ</span></p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                             }}
                          />
                          <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                             {icdAnalysis.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index < 3 ? '#f43f5e' : '#fb7185'} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* Bảng chi tiết doanh thu mô hình bệnh */}
              <div className="flex-1 space-y-6">
                 <div className={`p-5 rounded-[2rem] border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-black uppercase text-slate-400">Thống kê tài chính ICD</span>
                       <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="space-y-4 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
                       {icdAnalysis.map((item, idx) => (
                          <div key={idx} className={`group p-4 rounded-2xl border flex flex-col gap-2 transition-all hover:bg-white dark:hover:bg-slate-800 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                             <div className="flex justify-between items-start">
                                <span className="text-[11px] font-black text-rose-500">{item.code}</span>
                                <span className="text-[10px] font-black text-emerald-500">{(item.totalCost / 1e6).toFixed(1)}M</span>
                             </div>
                             <p className={`text-[9px] font-bold line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.name}</p>
                             <div className="flex items-center justify-between mt-1">
                                <div className="h-1 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full mr-4 overflow-hidden">
                                   <div className="h-full bg-rose-500" style={{ width: `${(item.count / icdAnalysis[0].count) * 100}%` }} />
                                </div>
                                <span className="text-[9px] font-black opacity-60">{item.count} ca</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* --- DASHBOARD DOANH THU TOP 5 CÁ NHÂN --- */}
        <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
           <div className="flex flex-col lg:flex-row gap-8">
              {/* Biểu đồ Doanh thu cá nhân */}
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Trophy className="w-5 h-5" /></div>
                    <div>
                       <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? '' : 'text-slate-800'}`}>Xếp hạng Doanh thu Cá nhân</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Top 5 Bác sĩ đóng góp cao nhất</p>
                    </div>
                 </div>
                 
                 <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart 
                          data={stats.topDoctors} 
                          layout="vertical" 
                          margin={{ left: 40, right: 40 }}
                       >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                          <XAxis type="number" hide />
                          <YAxis 
                             dataKey="name" 
                             type="category" 
                             axisLine={false} 
                             tickLine={false} 
                             width={120}
                             tick={{ fontSize: 10, fontWeight: 700, fill: isDark ? '#cbd5e1' : '#475569' }} 
                          />
                          <Tooltip 
                             cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                             contentStyle={{ 
                                borderRadius: '1rem', 
                                border: 'none', 
                                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
                             }}
                             formatter={(value: any) => [`${(Number(value) / 1e6).toFixed(2)}M VNĐ`, 'Doanh thu']}
                          />
                          <Bar 
                            dataKey="value" 
                            radius={[0, 10, 10, 0]} 
                            barSize={24}
                            onClick={(data) => setSelectedDetailName(data.name)}
                            cursor="pointer"
                          >
                             {stats.topDoctors.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : CHART_COLORS[index % CHART_COLORS.length]} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* Danh sách chi tiết cá nhân */}
              <div className="lg:w-96 space-y-4">
                 <div className={`p-4 rounded-2xl flex justify-between items-center ${isDark ? 'bg-slate-900/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                    <span className="text-[10px] font-black uppercase text-slate-400">Chi tiết đóng góp</span>
                    <Medal className="w-4 h-4 text-amber-500" />
                 </div>
                 
                 <div className="space-y-3">
                    {stats.topDoctors.map((doc, idx) => (
                       <div 
                        key={idx} 
                        onClick={() => setSelectedDetailName(doc.name)}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all hover:translate-x-1 cursor-pointer group ${isDark ? 'bg-slate-900 border-slate-700 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-sm'}`}
                       >
                          <div className="flex items-center gap-4">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                idx === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                                idx === 1 ? 'bg-slate-300 text-slate-600' : 
                                idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                             }`}>
                                {idx + 1}
                             </div>
                             <div>
                                <h4 className={`text-[11px] font-black group-hover:text-emerald-400 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>{doc.name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                   <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BS Điều trị</span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                             <div>
                                <p className="text-xs font-black text-emerald-500">{(doc.value / 1e6).toFixed(2)}M</p>
                                <p className="text-[8px] font-bold text-slate-400">{( (doc.value / stats.topDoctors.reduce((a,b) => a + b.value, 0)) * 100 ).toFixed(1)}% của Top 5</p>
                             </div>
                             <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* --- PHÂN TÍCH KHOA PHÒNG & DỊCH VỤ --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Biểu đồ Khoa phòng */}
           <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500"><BarChart3 className="w-5 h-5" /></div>
                <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? '' : 'text-slate-800'}`}>Doanh thu theo Khoa phòng</h3>
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.deptRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 800 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }} contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                      {stats.deptRevenue.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Top Dịch vụ */}
           <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-500"><Layers className="w-5 h-5" /></div>
                    <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? '' : 'text-slate-800'}`}>Kỹ thuật hiệu quả nhất</h3>
                 </div>
                 <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <button onClick={() => setServiceSortBy('revenue')} className={`p-2 rounded-lg transition-all ${serviceSortBy === 'revenue' ? (isDark ? 'bg-slate-700' : 'bg-white shadow-sm') + ' text-teal-500' : 'text-slate-400'}`}><DollarSign className="w-4 h-4" /></button>
                    <button onClick={() => setServiceSortBy('count')} className={`p-2 rounded-lg transition-all ${serviceSortBy === 'count' ? (isDark ? 'bg-slate-700' : 'bg-white shadow-sm') + ' text-teal-500' : 'text-slate-400'}`}><Hash className="w-4 h-4" /></button>
                 </div>
              </div>
              <div className="space-y-4">
                 {serviceAnalysis.filteredStats.slice(0, 5).map((s, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                       <div className="flex items-center gap-4 flex-1">
                          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-teal-500/10 text-teal-500' : 'bg-teal-50 text-teal-600'}`}><Microscope className="w-4 h-4" /></div>
                          <div className="min-w-0">
                             <p className={`text-[11px] font-black truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{s.name}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">{s.group}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-black text-teal-600">{(s.totalCost / 1e6).toFixed(2)}M</p>
                          <p className="text-[8px] font-bold text-slate-400">{s.count} lượt</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </main>

      {/* --- MODAL CHI TIẾT DỊCH VỤ BÁC SĨ --- */}
      {selectedDetailName && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
           <div className={`w-full max-w-6xl max-h-[90vh] rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`p-8 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-[#0f172a]/80' : 'border-slate-100 bg-slate-50/50'}`}>
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner">
                       <Stethoscope className="w-8 h-8" />
                    </div>
                    <div>
                       <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedDetailName}</h3>
                       <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                          <Layers className="w-3.5 h-3.5" /> 
                          <span>Phân tích chi tiết chỉ định & cơ cấu dịch vụ</span>
                       </div>
                    </div>
                 </div>
                 <button 
                  onClick={() => setSelectedDetailName(null)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all border ${isDark ? 'bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 border-slate-700/50' : 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200'}`}
                 >
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <div className="flex flex-col gap-12">
                    {/* BIỂU ĐỒ PHÂN TÍCH TRÒN TRONG MODAL */}
                    <div className="flex justify-center">
                       {/* DONUT: CƠ CẤU DOANH THU */}
                       <div className={`w-full max-w-2xl p-8 rounded-[3rem] border flex flex-col items-center ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100 shadow-inner'}`}>
                          <div className="flex items-center gap-3 mb-8 self-start">
                             <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400"><PieIcon className="w-5 h-5" /></div>
                             <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.15em]">Cơ cấu Doanh thu (Top 10)</span>
                          </div>
                          <div className="h-[350px] w-full relative">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                   <Pie
                                      data={doctorDetailServices.slice(0, 10)}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={85}
                                      outerRadius={120}
                                      paddingAngle={4}
                                      dataKey="totalCost"
                                      animationBegin={200}
                                      animationDuration={1500}
                                      stroke="none"
                                   >
                                      {doctorDetailServices.slice(0, 10).map((entry, idx) => (
                                         <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                      ))}
                                   </Pie>
                                   <Tooltip 
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const d = payload[0].payload;
                                          return (
                                            <div className={`p-5 rounded-[1.5rem] border shadow-2xl ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-100'}`}>
                                              <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">{d.group}</p>
                                              <p className={`text-[12px] font-black mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{d.name}</p>
                                              <p className="text-[14px] font-black text-emerald-500">{(d.totalCost / 1e6).toFixed(2)}M đ</p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                   />
                                   <Legend 
                                      verticalAlign="bottom" 
                                      align="center" 
                                      iconType="circle"
                                      formatter={(value, entry: any) => (
                                        <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">
                                          {entry.payload.name.length > 20 ? entry.payload.name.substring(0, 20) + '...' : entry.payload.name}
                                        </span>
                                      )}
                                   />
                                </PieChart>
                             </ResponsiveContainer>
                             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                                <DollarSign className="w-8 h-8 text-indigo-500 opacity-20 mb-1" />
                                <span className="text-[11px] font-black text-slate-500 uppercase">Doanh thu</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* DANH SÁCH CHI TIẾT DƯỚI BIỂU ĐỒ */}
                    <div className="grid grid-cols-1 gap-5">
                       <div className="flex items-center gap-4 px-2">
                          <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
                          <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Danh mục kỹ thuật chi tiết</span>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-4">
                          {doctorDetailServices.map((s, idx) => (
                             <div 
                              key={idx} 
                              className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all hover:translate-x-2 group ${isDark ? 'bg-[#0f172a] border-slate-800 hover:border-indigo-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}
                             >
                                <div className="flex items-center gap-6 flex-1">
                                   <div className={`w-14 h-14 flex items-center justify-center rounded-2xl border transition-colors ${isDark ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10' : 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                      <Microscope className="w-6 h-6" />
                                   </div>
                                   <div>
                                      <h4 className={`text-[14px] font-black mb-1.5 transition-colors ${isDark ? 'text-slate-100 group-hover:text-white' : 'text-slate-900 group-hover:text-indigo-600'}`}>{s.name}</h4>
                                      <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{s.group}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                        <span className="text-[10px] font-bold text-slate-500">{((s.totalCost / doctorDetailServices.reduce((a, b) => a + b.totalCost, 0)) * 100).toFixed(1)}% tỉ trọng</span>
                                      </div>
                                   </div>
                                </div>
                                
                                <div className="flex items-center gap-12 text-right">
                                   <div className="min-w-[80px]">
                                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Số lượt</p>
                                      <p className={`text-xl font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{s.count.toLocaleString()}</p>
                                   </div>
                                   <div className="min-w-[140px]">
                                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Doanh thu</p>
                                      <p className={`text-xl font-black text-emerald-500`}>{(s.totalCost / 1e6).toFixed(2)}M</p>
                                   </div>
                                   <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className={`p-10 border-t flex flex-col md:flex-row justify-between items-center gap-8 ${isDark ? 'border-slate-800 bg-[#0f172a]/95' : 'border-slate-100 bg-slate-50'}`}>
                 <div className="flex flex-wrap items-center gap-10">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tổng số kỹ thuật</p>
                       <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{doctorDetailServices.length} <span className="text-sm text-slate-500">Dịch vụ</span></p>
                    </div>
                    <div className="hidden md:block w-px h-10 bg-slate-700" />
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tổng Doanh thu BS</p>
                       <p className="text-2xl font-black text-emerald-500">
                         {(doctorDetailServices.reduce((a, b) => a + b.totalCost, 0) / 1e6).toFixed(2)} <span className="text-sm text-emerald-600/70">Triệu đ</span>
                       </p>
                    </div>
                 </div>
                 <button 
                  onClick={() => setSelectedDetailName(null)}
                  className={`px-12 py-5 rounded-[2rem] text-white font-black text-[12px] uppercase shadow-2xl transition-all flex items-center gap-4 hover:scale-105 active:scale-95 ${isDark ? 'bg-indigo-500 shadow-indigo-500/30 hover:bg-indigo-600' : 'bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-700'}`}
                 >
                    Hoàn tất phân tích <ArrowRight className="w-5 h-5" />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODALS CHỈ TIÊU */}
      {isTargetOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`w-full max-w-7xl max-h-[88vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
             <div className="p-8 border-b flex justify-between items-center">
                <div className="flex items-center gap-5">
                   <div className="p-4 rounded-2xl text-white shadow-xl" style={{ backgroundColor: primaryColor }}><Target className="w-8 h-8" /></div>
                   <div><h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Chỉ tiêu PL1-11</h3><p className="text-[10px] font-black text-slate-400 uppercase">SmartHIS Tịnh Biên</p></div>
                </div>
                <button onClick={() => setIsTargetOpen(false)} className={`p-3 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><X className="w-7 h-7" /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                   <TargetInput label="19. Doanh thu" value={draftTargets.center.revenue} onChange={(v) => setDraftTargets({...draftTargets, center: {...draftTargets.center, revenue: v}})} unit="VNĐ" dark={isDark} />
                   <TargetInput label="4. Khám chung" value={draftTargets.center.visits_general} onChange={(v) => setDraftTargets({...draftTargets, center: {...draftTargets.center, visits_general: v}})} unit="Lượt" dark={isDark} />
                   <TargetInput label="7. Nội trú" value={draftTargets.center.inpatients} onChange={(v) => setDraftTargets({...draftTargets, center: {...draftTargets.center, inpatients: v}})} unit="Lượt" dark={isDark} />
                </div>
             </div>
             <div className="p-8 border-t flex gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                <button onClick={() => setDraftTargets(INITIAL_OFFICIAL_TARGETS)} className={`px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase border-2 flex items-center gap-2 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}><Undo2 className="w-4 h-4"/> Reset</button>
                <div className="flex-1" />
                <button onClick={() => { setTargets(draftTargets); localStorage.setItem('h_official_targets_vfinal_stable', JSON.stringify(draftTargets)); setIsTargetOpen(false); }} className={`px-12 py-5 rounded-[1.5rem] font-black text-[11px] uppercase text-white shadow-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95`} style={{ backgroundColor: primaryColor }}><Save className="w-5 h-5"/> Lưu hệ thống</button>
             </div>
          </div>
        </div>
      )}

      {loading && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 p-12 rounded-[4rem] shadow-2xl space-y-8 text-center max-w-sm w-full animate-in zoom-in duration-300">
               <div className="relative mx-auto w-20 h-20"><div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><Activity className="absolute inset-0 m-auto w-8 h-8 text-emerald-500" /></div>
               <p className={`font-black text-lg uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Đang cập nhật số liệu...</p>
            </div>
         </div>
      )}
    </div>
  );
};

// --- COMPONENTS ---

const ProgressRow: React.FC<{ label: string, unit: string, plan: number, actual: number, dark: boolean, isCurrency?: boolean }> = ({ label, unit, plan, actual, dark, isCurrency }) => {
  const percent = plan > 0 ? (actual / plan) * 100 : 0;
  const remaining = Math.max(0, plan - actual);
  const colorClass = percent < 50 ? 'bg-rose-500' : percent < 80 ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = percent < 50 ? 'text-rose-500' : percent < 80 ? 'text-amber-500' : 'text-emerald-500';

  const formatVal = (val: number) => isCurrency ? (val / 1e6).toFixed(1) + 'M' : val.toLocaleString();

  return (
    <tr className={`transition-colors ${dark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
      <td className="px-6 py-4">
        <p className={`text-[11px] font-black ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{label}</p>
      </td>
      <td className="px-4 py-4 text-center">
        <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase ${dark ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{unit}</span>
      </td>
      <td className="px-4 py-4 text-right">
        <p className={`text-[11px] font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{formatVal(plan)}</p>
      </td>
      <td className="px-4 py-4 text-right">
        <p className={`text-[11px] font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{formatVal(actual)}</p>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`h-2 flex-1 rounded-full overflow-hidden ${dark ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <div className={`h-full transition-all duration-1000 ${colorClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
          <span className={`text-[10px] font-black min-w-[35px] ${textColor}`}>{percent.toFixed(1)}%</span>
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <p className={`text-[11px] font-bold ${remaining > 0 ? (dark ? 'text-slate-500' : 'text-slate-400') : 'text-emerald-500'}`}>
          {remaining > 0 ? formatVal(remaining) : <CheckCircle2 className="w-4 h-4 ml-auto" />}
        </p>
      </td>
    </tr>
  );
};

const SearchableMultiSelect: React.FC<{ label: string, options: string[], selected: string[], onToggle: (v: string) => void, onSelectAll?: () => void, onClearAll?: () => void, icon?: React.ReactNode, dark: boolean }> = ({ label, options, selected, onToggle, onSelectAll, onClearAll, icon, dark }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      <div className={`flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${dark ? 'text-slate-400' : 'text-slate-800'}`}>
        <div className="flex items-center gap-2">{icon} {label}</div>
        {selected.length > 0 && <span className="text-indigo-500 font-black">({selected.length})</span>}
      </div>
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)} 
          className={`w-full p-4 rounded-2xl border-2 flex flex-wrap gap-2 items-center min-h-[58px] cursor-pointer transition-all ${isOpen ? (dark ? 'ring-4 ring-indigo-500/10 border-indigo-500 bg-[#0f172a]' : 'ring-4 ring-indigo-500/5 border-indigo-500 bg-white') : (dark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300')}`}
        >
          <Search className="w-5 h-5 mr-1 text-slate-400" />
          <input 
            type="text" 
            placeholder={`Tìm ${label.toLowerCase()}...`} 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); if (!isOpen) setIsOpen(true); }} 
            className={`bg-transparent border-none outline-none text-[13px] font-black flex-1 placeholder-slate-500 ${dark ? 'text-white' : 'text-slate-900'}`} 
            onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} 
          />
          <ChevronDown className={`ml-auto w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        
        {isOpen && (
          <div className={`absolute z-[60] left-0 right-0 top-full mt-3 rounded-[2rem] border-2 shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in slide-in-from-top-4 duration-300 ${dark ? 'bg-[#1a2332] border-slate-800' : 'bg-white border-slate-200'}`}>
             <div className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${dark ? 'border-slate-800 bg-[#111827]/90' : 'border-slate-100 bg-slate-50/90'}`}>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{filtered.length} kết quả</span>
               <div className="flex gap-5">
                 {onSelectAll && <button onMouseDown={(e) => { e.preventDefault(); onSelectAll(); }} className="text-[10px] font-black text-indigo-500 uppercase hover:text-indigo-400 transition-colors">Tất cả</button>}
                 {onClearAll && selected.length > 0 && <button onMouseDown={(e) => { e.preventDefault(); onClearAll(); }} className="text-[10px] font-black text-rose-500 uppercase hover:text-rose-400 transition-colors">Bỏ chọn</button>}
               </div>
             </div>
             <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2.5">
                {filtered.map(opt => (
                   <div 
                    key={opt} 
                    onMouseDown={(e) => { e.preventDefault(); onToggle(opt); }} 
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${selected.includes(opt) ? 'bg-indigo-500/10 text-indigo-400' : (dark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-indigo-50 text-slate-600')}`}
                   >
                     <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selected.includes(opt) ? 'bg-indigo-500 border-indigo-500 shadow-md shadow-indigo-500/20' : (dark ? 'border-slate-700' : 'border-slate-200')}`}>
                       {selected.includes(opt) && <CheckCircle2 className="w-4 h-4 text-white" />}
                     </div>
                     <span className={`text-[12.5px] font-black ${selected.includes(opt) ? 'text-indigo-500' : ''}`}>{opt}</span>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FilterChip: React.FC<{ label: string, onRemove: () => void, color?: string }> = ({ label, onRemove, color = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" }) => (
  <div className={`${color} px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-left-4 transition-all hover:scale-105 active:scale-95`}>
    <div className="max-w-[180px] truncate">{label}</div>
    <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hover:bg-black/5 dark:hover:bg-white/10 rounded-full p-1.5 transition-colors">
      <X className="w-4 h-4" />
    </button>
  </div>
);

const KPICard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, primaryColor: string, dark: boolean }> = ({ title, value, icon, primaryColor, dark }) => (
  <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${dark ? 'bg-slate-800 border-slate-700 shadow-xl' : 'bg-white border-slate-200 shadow-sm hover:shadow-2xl'}`}><div className="p-4 w-fit rounded-2xl text-white mb-6 shadow-lg" style={{ backgroundColor: primaryColor }}>{icon}</div><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</h3><div className={`text-2xl font-black ${dark ? 'text-white' : 'text-slate-900'} truncate tracking-tighter`}>{value}</div></div>
);

const TargetInput: React.FC<{ label: string, value: number, onChange: (v: number) => void, unit: string, dark: boolean }> = ({ label, value, onChange, unit, dark }) => (
  <div className="space-y-3 w-full group"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label><div className="relative"><input type="text" inputMode="numeric" value={value.toLocaleString('vi-VN')} onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} className={`w-full px-6 py-5 rounded-3xl border-2 text-base font-black outline-none transition-all ${dark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-100 focus:border-indigo-600'}`} />{unit && <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">{unit}</span>}</div></div>
);

export default App;
