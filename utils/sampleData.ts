
import { HospitalRecord } from '../types';

const KHOAS = ["Nội Tổng hợp", "Ngoại Thần kinh", "Sản", "Nhi", "Hồi sức tích cực", "Cấp cứu", "Tim mạch"];
const BAC_SYS = [
  { name: "Nguyễn Văn A", id: "BS001", dept: "Nội Tổng hợp" },
  { name: "Lê Thị B", id: "BS002", dept: "Ngoại Thần kinh" },
  { name: "Trần Văn C", id: "BS003", dept: "Sản" },
  { name: "Phạm Minh D", id: "BS004", dept: "Nhi" },
  { name: "Hoàng Anh E", id: "BS005", dept: "Hồi sức tích cực" },
];
const DICH_VUS = [
  { name: "Siêu âm bụng", group: "Chẩn đoán hình ảnh", price: 250000 },
  { name: "Chụp CT-Scanner", group: "Chẩn đoán hình ảnh", price: 1500000 },
  { name: "Xét nghiệm máu tổng quát", group: "Xét nghiệm", price: 500000 },
  { name: "Nội soi dạ dày", group: "Thủ thuật", price: 800000 },
  { name: "Phẫu thuật nội soi", group: "Phẫu thuật", price: 12000000 },
];

export const generateSampleData = (count: number = 100): HospitalRecord[] => {
  const records: HospitalRecord[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const bs = BAC_SYS[Math.floor(Math.random() * BAC_SYS.length)];
    const dv = DICH_VUS[Math.floor(Math.random() * DICH_VUS.length)];
    const soNgay = Math.floor(Math.random() * 15) + 1;
    const ketQua = ["Khỏi", "Đỡ", "Giảm", "Chuyển viện", "Tử vong"][Math.floor(Math.random() * 5)];
    
    // Random date within the last 180 days
    const randomDaysAgo = Math.floor(Math.random() * 180);
    const dateVao = new Date(now.getTime() - (randomDaysAgo + soNgay) * 24 * 60 * 60 * 1000);
    const dateRa = new Date(dateVao.getTime() + soNgay * 24 * 60 * 60 * 1000);
    const dateTT = new Date(dateRa.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Fix: Corrected property name from THAN_TIEN to THANH_TIEN to match HospitalRecord interface
    records.push({
      MA_BN: `BN${1000 + i}`,
      MA_BA: `BA${2000 + i}`,
      SO_VAO_VIEN: `VV${3000 + i}`,
      DOI_TUONG: Math.random() > 0.3 ? "Bảo hiểm" : "Dịch vụ",
      NGAY_VAO_VIEN: dateVao.toISOString().split('T')[0],
      NGAY_VAO_KHOA: dateVao.toISOString().split('T')[0],
      NGAY_RA_VIEN: dateRa.toISOString().split('T')[0],
      NGAY_THANH_TOAN: dateTT.toISOString().split('T')[0],
      KHOA: bs.dept,
      MA_KHOA_CHI_DINH: "K001",
      BAC_SY: bs.name,
      MA_BAC_SY: bs.id,
      CHAN_DOAN: "Viêm dạ dày cấp",
      MA_BENH: "K29.0",
      CHAN_DOAN_KHAC: "",
      TEN_NHOM: dv.group,
      DICH_VU: dv.name,
      THANH_TIEN: dv.price + (Math.random() * 200000),
      KET_QUA_DTRI: ketQua,
      TINH_TRANG_RV: "Ổn định",
      SO_NGAY_DTRI: soNgay,
    });
  }
  return records;
};
