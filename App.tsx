
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
  HeartPulse
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Cell as RechartsCell
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
    accent: '#1e293b', 
    bg: 'bg-slate-600', 
    text: 'text-slate-600', 
    border: 'border-slate-200',
    chart: ['#475569', '#64748b', '#94a3b8', '#334155', '#1e293b']
  },
};

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
  const [isSampleData, setIsSampleData] = useState(true);
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

  const [uiSettings, setUiSettings] = useState(() => {
    const saved = localStorage.getItem('h_ui_settings');
    return saved ? JSON.parse(saved) : {
      theme: 'ocean',
      density: 'comfortable',
      showKPIs: true,
      showTrends: true,
      showDiseaseAnalysis: true,
      showDepartmentAnalysis: true,
      showDoctorTable: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('h_ui_settings', JSON.stringify(uiSettings));
  }, [uiSettings]);

  const activeTheme = THEMES[uiSettings.theme as keyof typeof THEMES] || THEMES.ocean;
  const isCompact = uiSettings.density === 'compact';

  const [filterDept, setFilterDept] = useState<string[]>(["Tất cả"]);
  const [filterType, setFilterType] = useState("Tất cả");
  const [filterDoctor, setFilterDoctor] = useState<string[]>(["Tất cả"]);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('h_sheet_id');
    if (savedId) fetchFromGoogleSheet(savedId);
    else {
      setData(generateSampleData(300));
      setIsSampleData(true);
    }
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiLoading]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchDept = filterDept.includes("Tất cả") || filterDept.includes(item.KHOA?.trim());
      const matchType = filterType === "Tất cả" || item.DOI_TUONG === filterType;
      const matchDoctor = filterDoctor.includes("Tất cả") || filterDoctor.includes(item.BAC_SY?.trim());
      
      const itemDate = new Date(item.NGAY_THANH_TOAN);
      const now = new Date();
      let matchDate = true;
      if (filterPeriod === "7days") matchDate = itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (filterPeriod === "30days") matchDate = itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (filterPeriod === "thisMonth") matchDate = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      else if (filterPeriod === "custom") {
        if (customStartDate) matchDate = matchDate && itemDate >= new Date(customStartDate);
        if (customEndDate) matchDate = matchDate && itemDate <= new Date(customEndDate);
      }
      return matchDept && matchType && matchDoctor && matchDate;
    });
  }, [data, filterDept, filterType, filterDoctor, filterPeriod, customStartDate, customEndDate]);

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

  // --- Logic Phân tích Bệnh (ICD-10) ---
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
      .slice(0, 10); // Lấy top 10 bệnh phổ biến nhất
  }, [filteredData]);

  const fetchFromGoogleSheet = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setLoading(true);
    setLoadingText("Đồng bộ Google Sheets...");
    try {
      const url = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv&id=${cleanId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Lỗi truy cập. Hãy kiểm tra quyền chia sẻ công khai.");
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.data?.length > 0) {
            setData(results.data.filter((r: any) => r.MA_BN).map(mapRowToRecord));
            setIsSampleData(false);
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
      MA_BN: String(findValue(['MA_BN', 'MABN']) || ''),
      MA_BA: String(findValue(['MA_BA', 'MABA']) || ''),
      SO_VAO_VIEN: String(findValue(['SO_VAO_VIEN']) || ''),
      DOI_TUONG: String(findValue(['DOI_TUONG']) || 'Chưa xác định'),
      NGAY_VAO_VIEN: parseHospitalDate(findValue(['NGAY_VAO_VIEN'])),
      NGAY_VAO_KHOA: parseHospitalDate(findValue(['NGAY_VAO_KHOA'])),
      NGAY_RA_VIEN: parseHospitalDate(findValue(['NGAY_RA_VIEN'])),
      NGAY_THANH_TOAN: parseHospitalDate(findValue(['NGAY_THANH_TOAN'])),
      KHOA: String(findValue(['KHOA']) || 'Chưa xác định'),
      MA_KHOA_CHI_DINH: String(findValue(['MA_KHOA_CHI_DINH']) || ''),
      BAC_SY: String(findValue(['BAC_SY']) || 'Ẩn danh'),
      MA_BAC_SY: String(findValue(['MA_BAC_SY']) || ''),
      CHAN_DOAN: String(findValue(['CHAN_DOAN']) || ''),
      MA_BENH: String(findValue(['MA_BENH']) || 'N/A'),
      CHAN_DOAN_KHAC: String(findValue(['CHAN_DOAN_KHAC']) || ''),
      TEN_NHOM: String(findValue(['TEN_NHOM']) || 'Khác'),
      DICH_VU: String(findValue(['DICH_VU']) || ''),
      THANH_TIEN: Number(findValue(['THANH_TIEN']) || 0),
      KET_QUA_DTRI: String(findValue(['KET_QUA_DTRI']) || 'Khác'),
      TINH_TRANG_RV: String(findValue(['TINH_TRANG_RV']) || ''),
      SO_NGAY_DTRI: Number(findValue(['SO_NGAY_DTRI']) || 0),
    };
  };

  const handleAskAi = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput("");
    setIsAiLoading(true);
    const aiResponse = chatMode === 'analytics' 
      ? await aiService.queryDashboard(userMsg, `Tổng viện phí: ${stats.totalCost.toLocaleString()} đ, BN: ${stats.totalPatients}`)
      : await aiService.getDiagnosticSuggestions(userMsg);
    setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse || "Lỗi AI" }]);
    setIsAiLoading(false);
  };

  const handleResetSettings = () => {
    const defaults = {
      theme: 'ocean',
      density: 'comfortable',
      showKPIs: true,
      showTrends: true,
      showDiseaseAnalysis: true,
      showDepartmentAnalysis: true,
      showDoctorTable: true,
    };
    setUiSettings(defaults);
    localStorage.setItem('h_ui_settings', JSON.stringify(defaults));
  };

  return (
    <div className={`min-h-screen pb-12 transition-all duration-300 ${activeTheme.secondary} ${isCompact ? 'text-xs' : 'text-sm'}`}>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm transition-all">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between ${isCompact ? 'h-12' : 'h-16'}`}>
          <div className="flex items-center space-x-3">
            <div className={`${activeTheme.bg} p-2 rounded-lg text-white transition-all`}><Activity className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'}`} /></div>
            <h1 className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold text-slate-900`}>SmartHIS <span className={activeTheme.text}>Dashboard</span></h1>
            {isConnectedToSheet && (
              <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 animate-pulse">Live</div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-200 transition-all border border-slate-200" title="Tùy chỉnh giao diện">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={() => setIsConfigOpen(true)} className={`p-2 rounded-lg border transition-all ${isConnectedToSheet ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`} title="Kết nối Sheets">
              <Cloud className="w-5 h-5" />
            </button>
            <button onClick={() => fetchFromGoogleSheet(sheetId)} disabled={loading} className={`p-2 ${activeTheme.secondary} ${activeTheme.text} rounded-lg border ${activeTheme.border} hover:opacity-80 transition-all`}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all ${isCompact ? 'py-4 space-y-4' : 'py-8 space-y-8'}`}>
        {uiSettings.showKPIs && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500`}>
            <KPICard title="Tổng BN" value={stats.totalPatients.toLocaleString()} icon={<Users />} theme={activeTheme} compact={isCompact} />
            <KPICard title="Viện phí" value={`${(stats.totalCost / 1e6).toFixed(1)}M`} icon={<TrendingUp />} theme={activeTheme} compact={isCompact} />
            <KPICard title="Ngày ĐT TB" value={stats.avgDays.toFixed(1)} icon={<Calendar />} theme={activeTheme} compact={isCompact} />
            <KPICard title="Trung bình/BN" value={`${(stats.avgCostPerPatient / 1000).toFixed(0)}k`} icon={<Stethoscope />} theme={activeTheme} compact={isCompact} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {uiSettings.showTrends && (
            <ChartBox title="Cơ cấu Viện phí theo Khoa" theme={activeTheme} compact={isCompact}>
              <ResponsiveContainer width="100%" height={isCompact ? 250 : 350}>
                <BarChart data={departmentStats.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: isCompact ? 10 : 12, fill: '#64748b' }} axisLine={false} />
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                  <Bar dataKey="totalCost" fill={activeTheme.primary} radius={[0, 4, 4, 0]} barSize={isCompact ? 14 : 24} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          )}

          {uiSettings.showDepartmentAnalysis && (
            <ChartBox title="Kết quả Điều trị" theme={activeTheme} compact={isCompact}>
              <ResponsiveContainer width="100%" height={isCompact ? 250 : 350}>
                <PieChart>
                  <Pie data={stats.outcomeRatios} innerRadius={isCompact ? 50 : 70} outerRadius={isCompact ? 70 : 90} paddingAngle={5} dataKey="value">
                    {stats.outcomeRatios.map((_, index) => <Cell key={`cell-${index}`} fill={activeTheme.chart[index % activeTheme.chart.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: isCompact ? '10px' : '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </div>

        {/* --- Phần Phân tích Bệnh tật (ICD-10) mới --- */}
        {uiSettings.showDiseaseAnalysis && (
          <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-700">
            <ChartBox title="Phân tích mô hình bệnh tật & Chi phí trung bình (Top 10 ICD-10)" theme={activeTheme} compact={isCompact}>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                  <ResponsiveContainer width="100%" height={isCompact ? 300 : 450}>
                    <ComposedChart data={diseaseStats} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="code" type="category" tick={{ fontSize: isCompact ? 10 : 12, fontWeight: 'bold' }} axisLine={false} />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-black text-slate-800">{data.code} - {data.name}</p>
                              <p className="text-slate-600">Số lượt: <span className="font-bold">{data.count}</span></p>
                              <p className="text-slate-600">Phí TB: <span className="font-bold text-emerald-600">{data.avgCost.toLocaleString()} đ</span></p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar dataKey="count" name="Số lượt bệnh" fill={activeTheme.primary} radius={[0, 4, 4, 0]} barSize={isCompact ? 12 : 20} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <HeartPulse className="w-3 h-3 text-rose-500" /> Chi tiết top bệnh tật
                  </h4>
                  <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {diseaseStats.map((d, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${activeTheme.bg} text-white`}>{d.code}</span>
                          <span className="text-[10px] font-bold text-slate-400">#{i+1}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 line-clamp-1 mb-2 group-hover:text-indigo-600 transition-colors">{d.name}</p>
                        <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                          <div className="text-[9px] text-slate-400">Lượt: <span className="font-black text-slate-800">{d.count}</span></div>
                          <div className="text-[9px] text-slate-400">TB: <span className="font-black text-emerald-600">{d.avgCost.toLocaleString()}đ</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ChartBox>
          </div>
        )}

        {uiSettings.showDoctorTable && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between`}>
              <h3 className="font-bold text-slate-900">Chi tiết nhân sự & Hiệu quả điều trị</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-900 uppercase text-[10px] font-black border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Bác sĩ / Khoa</th>
                    <th className="px-6 py-4 text-right">Lượt ĐT</th>
                    <th className="px-6 py-4 text-right">Tổng viện phí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Logic render bảng bác sĩ tương tự như trước nhưng với filteredData */}
                  {Array.from(new Set(filteredData.map(d => d.BAC_SY))).slice(0, 10).map((name, idx) => {
                    const docData = filteredData.filter(d => d.BAC_SY === name);
                    const total = docData.reduce((acc, curr) => acc + (Number(curr.THANH_TIEN) || 0), 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{name}</div>
                          <div className={`text-[10px] ${activeTheme.text} uppercase font-black`}>{docData[0]?.KHOA}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium">{docData.length}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{total.toLocaleString()} đ</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-sm">
              <Palette className="w-5 h-5 text-indigo-600" /> Tùy chỉnh UI
            </h3>
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Monitor className="w-3 h-3" /> Chủ đề màu sắc
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button 
                    key={key} 
                    onClick={() => setUiSettings({...uiSettings, theme: key})}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${uiSettings.theme === key ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-full ${theme.bg} shadow-inner`}></div>
                    <span className="text-[10px] font-bold text-slate-700">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> Mật độ hiển thị
              </label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => setUiSettings({...uiSettings, density: 'comfortable'})}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${uiSettings.density === 'comfortable' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Rộng rãi
                </button>
                <button 
                  onClick={() => setUiSettings({...uiSettings, density: 'compact'})}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${uiSettings.density === 'compact' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Gọn gàng
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cấu hình nội dung</label>
              <div className="space-y-2">
                {[
                  { id: 'showKPIs', label: 'Chỉ số KPI chính' },
                  { id: 'showTrends', label: 'Biểu đồ xu hướng' },
                  { id: 'showDepartmentAnalysis', label: 'Phân tích khoa phòng' },
                  { id: 'showDiseaseAnalysis', label: 'Phân tích mô hình bệnh tật' },
                  { id: 'showDoctorTable', label: 'Bảng chi tiết bác sĩ' },
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => setUiSettings({...uiSettings, [item.id]: !uiSettings[item.id as keyof typeof uiSettings]})}
                    className="flex items-center justify-between w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100"
                  >
                    <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                    {uiSettings[item.id as keyof typeof uiSettings] ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
            <button 
              onClick={handleResetSettings}
              className="w-full py-3 bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Đặt lại mặc định
            </button>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className={`w-full py-3 ${activeTheme.bg} text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg`}
            >
              Thoát cấu hình
            </button>
          </div>
        </div>
      </div>

      {!isChatOpen && (
        <button onClick={() => setIsChatOpen(true)} className={`fixed bottom-6 right-6 ${activeTheme.bg} text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group relative`}>
          <Sparkles className="w-7 h-7" />
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl">H-AI Assistant</div>
        </button>
      )}

      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${isChatOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-[420px] h-[600px] flex flex-col overflow-hidden">
          <div className={`${activeTheme.bg} p-4 text-white flex flex-col transition-colors`}>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center space-x-2">
                 <Sparkles className="w-5 h-5 text-amber-300 fill-current" />
                 <span className="font-bold text-sm tracking-tight uppercase">Smart Clinical Assistant</span>
               </div>
               <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex bg-black/10 p-1 rounded-xl">
              <button onClick={() => setChatMode('analytics')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chatMode === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'}`}>Quản trị</button>
              <button onClick={() => setChatMode('diagnostic')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chatMode === 'diagnostic' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'}`}>Chẩn đoán</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-[11px] shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? `${activeTheme.bg} text-white rounded-tr-none` : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 font-medium'}`}>{msg.content}</div>
              </div>
            ))}
            {isAiLoading && <div className="text-[10px] text-slate-400 italic animate-pulse">H-AI đang xử lý...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 bg-white border-t border-slate-100 flex items-center space-x-2">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskAi()} placeholder="Nhập câu hỏi..." className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            <button onClick={handleAskAi} className={`${activeTheme.bg} p-2.5 rounded-xl text-white hover:opacity-90 transition-all shadow-lg`}><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Database className="w-6 h-6 text-blue-600" /> Kết nối HIS Sync</h3>
                  <p className="text-slate-500 text-sm">Đồng bộ dữ liệu thời gian thực từ Google Sheets.</p>
                </div>
                <button onClick={() => setIsConfigOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input type="text" value={sheetId} onChange={(e) => setSheetId(e.target.value)} placeholder="Dán Sheet ID vào đây..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <button onClick={() => { fetchFromGoogleSheet(sheetId); setIsConfigOpen(false); }} className={`w-full ${activeTheme.bg} text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2`}>
                   <RefreshCw className="w-5 h-5" /> {isConnectedToSheet ? 'Làm mới kết nối' : 'Kết nối ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center"><div className="bg-white p-10 rounded-3xl shadow-2xl text-center space-y-4"><div className={`w-12 h-12 border-4 ${activeTheme.text} border-t-transparent rounded-full animate-spin mx-auto`}></div><p className="font-black text-slate-800 tracking-widest uppercase text-xs">{loadingText}</p></div></div>}
    </div>
  );
};

// --- Sub-components ---

const KPICard: React.FC<{ title: string, value: string, icon: React.ReactNode, theme: any, compact: boolean }> = ({ title, value, icon, theme, compact }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 transition-all group overflow-hidden ${compact ? 'p-3' : 'p-6'}`}>
    <div className="flex justify-between items-start">
      <div className={`text-slate-400 ${compact ? 'p-1.5' : 'p-3'} bg-slate-50 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all`}>
        {React.cloneElement(icon as React.ReactElement, { className: compact ? 'w-4 h-4' : 'w-6 h-6' })}
      </div>
    </div>
    <div className={`mt-4 ${compact ? 'space-y-0.5' : 'space-y-1'}`}>
      <h3 className={`text-slate-500 font-bold uppercase tracking-widest ${compact ? 'text-[8px]' : 'text-[10px]'}`}>{title}</h3>
      <p className={`font-black text-slate-900 tracking-tight ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p>
    </div>
  </div>
);

const ChartBox: React.FC<{ title: string, children: React.ReactNode, theme: any, compact: boolean }> = ({ title, children, theme, compact }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
    <div className={`border-b border-slate-100 bg-slate-50 flex items-center gap-3 ${compact ? 'p-3' : 'p-5'}`}>
      <div className={`w-1.5 h-6 rounded-full ${theme.bg}`}></div>
      <h3 className={`font-black text-slate-800 uppercase tracking-widest ${compact ? 'text-[10px]' : 'text-xs'}`}>{title}</h3>
    </div>
    <div className={`${compact ? 'p-4' : 'p-6'}`}>{children}</div>
  </div>
);

export default App;
