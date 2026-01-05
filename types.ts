
export interface HospitalRecord {
  MA_BN: string;
  MA_BA: string;
  SO_VAO_VIEN: string;
  DOI_TUONG: string;
  NGAY_VAO_VIEN: string;
  NGAY_VAO_KHOA: string;
  NGAY_RA_VIEN: string;
  NGAY_THANH_TOAN: string;
  KHOA: string;
  MA_KHOA_CHI_DINH: string;
  BAC_SY: string;
  MA_BAC_SY: string;
  CHAN_DOAN: string;
  MA_BENH: string;
  CHAN_DOAN_KHAC: string;
  TEN_NHOM: string;
  DICH_VU: string;
  THANH_TIEN: number;
  KET_QUA_DTRI: string;
  TINH_TRANG_RV: string;
  SO_NGAY_DTRI: number;
}

export interface SummaryStats {
  totalPatients: number;
  totalCost: number;
  avgDays: number;
  avgCostPerPatient: number;
  outcomeRatios: { name: string; value: number }[];
}

export interface DepartmentStats {
  name: string;
  patientCount: number;
  totalCost: number;
  avgCost: number;
  avgDays: number;
}

export interface ServiceStats {
  name: string;
  cost: number;
}

export interface DoctorStats {
  name: string;
  id: string;
  department: string;
  patientCount: number;
  totalCost: number;
  avgCost: number;
}
