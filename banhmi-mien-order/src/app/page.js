"use client";
import React, { useState, useEffect } from "react";
import { ShoppingBag, MapPin, Clock, Calendar, CheckCircle2, Sparkles, Plus, Minus, QrCode, ArrowLeft, Loader2 } from "lucide-react";

// --- HÀM TẠO NGÀY THỨ 2 -> THỨ 6 ---
// Tự động chuyển sang tuần sau nếu hôm nay là Thứ 7 hoặc Chủ nhật
const getCurrentWeekDays = () => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 là Chủ nhật, 1 là Thứ 2, ..., 6 là Thứ 7
  
  let diffToMonday;
  if (currentDay === 0) {
    diffToMonday = 1; // Chủ nhật -> bắt đầu từ Thứ 2 ngày mai
  } else if (currentDay === 6) {
    diffToMonday = 2; // Thứ 7 -> bắt đầu từ Thứ 2 tuần sau
  } else {
    diffToMonday = 1 - currentDay; // T2 đến T6 -> giữ nguyên lịch Thứ 2 tuần này
  }

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const days = [];
  const dayNames = ["T2", "T3", "T4", "T5", "T6"];
  
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(`${dayNames[i]} (${d.getDate()}/${d.getMonth() + 1})`);
  }
  return days; 
};

const weekDays = getCurrentWeekDays();

export default function BanhMiOrderPage() {
  // --- STATE QUẢN LÝ LUỒNG ---
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [orderCode, setOrderCode] = useState("");

  // --- CẤU HÌNH URL GOOGLE APPS SCRIPT & NGÂN HÀNG ---
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzevJPOpk3Mr4Pawo8XcV7j2KqPRgIs-EAJo_wNISc/dev";
  const BANK_ID = "MB"; // Nếu dùng SePay tự động, khuyên dùng MB, TPB, ICB, ACB, BIDV...
  const ACCOUNT_NO = "VQRQABBQD1296"; // Thay Số tài khoản của bạn
  const ACCOUNT_NAME = "PHAM HA THANH"; // Thay Tên chủ tài khoản của bạn

  // --- STATE DỮ LIỆU KHÁCH NHẬP ---
  const [formData, setFormData] = useState({
    name: "",
    socialLink: "",
    phone: "",
    orderDate: weekDays[0], // Mặc định chọn Thứ 2
    deliveryMethod: "Tự đến lấy tại 161C Đại La", // Mặc định là Tự đến lấy
    deliveryTime: "Sáng 8:30",
    customTime: "",
  });

  const [cart, setCart] = useState({ bmm: 1, combo30k: 0, combo40k: 0 });
  const [selectedToppings, setSelectedToppings] = useState([]);

  // --- TÍNH TOÁN TIỀN & ĐƠN HÀNG ---
  const PRICES = { bmm: 25000, combo30k: 30000, combo40k: 40000 };
  const totalAmount = cart.bmm * PRICES.bmm + cart.combo30k * PRICES.combo30k + cart.combo40k * PRICES.combo40k;
  const totalQuantity = cart.bmm + cart.combo30k + cart.combo40k;

  const orderSummary = [
    cart.bmm > 0 ? `${cart.bmm} BMM` : "",
    cart.combo30k > 0 ? `${cart.combo30k} Combo 30K` : "",
    cart.combo40k > 0 ? `${cart.combo40k} Combo 40K` : ""
  ].filter(Boolean).join(", ");

  // --- TẠO MÃ VIETQR NHÚNG MÃ ĐƠN PATUxxxx ---
  const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  const cleanName = removeAccents(formData.name).toUpperCase().replace(/[^A-Z0-9 ]/g, "");
  const transferContent = encodeURIComponent(`${orderCode} ${cleanName} ${formData.phone}`.trim());
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${totalAmount}&addInfo=${transferContent}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  // --- LOGIC: CHỈ CHO CHỌN GIỜ KHÁC KHI TỰ LẤY HOẶC ĐẶT SHIP ---
  const isFlexibleTime = formData.deliveryMethod === "Tự đến lấy tại 161C Đại La" || formData.deliveryMethod === "Đặt ship";
  const timeOptions = isFlexibleTime ? ["Sáng 8:30", "Trưa 12:15", "Khác"] : ["Sáng 8:30", "Trưa 12:15"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "deliveryMethod") {
        const isNowFlexible = value === "Tự đến lấy tại 161C Đại La" || value === "Đặt ship";
        if (!isNowFlexible && prev.deliveryTime === "Khác") {
          newData.deliveryTime = "Sáng 8:30";
        }
      }
      return newData;
    });
  };

  const adjustQuantity = (item, delta) => {
    setCart((prev) => ({ ...prev, [item]: Math.max(0, prev[item] + delta) }));
  };

  const toggleTopping = (topping) => {
    setSelectedToppings((prev) =>
      prev.includes(topping) ? prev.filter((t) => t !== topping) : [...prev, topping]
    );
  };

  // --- BƯỚC 1 -> BƯỚC 2: TẠO MÃ ĐƠN & LƯU NGẦM TRÊN APPS SCRIPT ---
  const handleGoToPayment = async (e) => {
    e.preventDefault();
    if (totalQuantity === 0) {
      alert("Bạn chưa chọn món nào!");
      return;
    }
    setIsLoading(true);
    const newCode = "PATU" + Math.floor(1000 + Math.random() * 9000);
    setOrderCode(newCode);

    const draftOrder = {
      action: "CREATE_ORDER",
      orderCode: newCode,
      ...formData,
      quantity: orderSummary,
      toppingNote: selectedToppings.length > 0 ? selectedToppings.join(", ") : "Đầy đủ",
      finalDate: formData.orderDate,
      finalTime: formData.deliveryTime === "Khác" ? formData.customTime : formData.deliveryTime,
      totalPrice: totalAmount,
      createdAt: new Date().toLocaleString("vi-VN"),
    };

    try {
      if (GOOGLE_SCRIPT_URL.startsWith("https://")) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftOrder),
        });
      }
      setStep(2);
    } catch (error) {
      alert("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  // --- BỘ LẮNG NGHE TỰ ĐỘNG (POLLING MỖI 3 GIÂY) ---
  useEffect(() => {
    if (step !== 2 || !orderCode || !GOOGLE_SCRIPT_URL.startsWith("https://")) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?orderCode=${orderCode}`);
        const data = await res.json();
        if (data.paid) {
          clearInterval(interval);
          setStep(3); // Tiền đã nổ -> Tự động nhảy sang màn hình thành công!
        }
      } catch (err) {
        // Bỏ qua lỗi mạng tạm thời trong lúc chờ
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, orderCode, GOOGLE_SCRIPT_URL]);

  // --- COMPONENT THẺ MÓN ĂN ---
  const MenuItem = ({ id, name, desc, price }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FDF1C3] border border-[#D87E33]/30 mb-4 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D87E33]"></div>
      <div className="pl-2">
        <h3 className="font-bold text-[#4B692E] text-base">{name}</h3>
        {desc && <p className="text-xs text-[#6A8152] mt-0.5 font-medium">{desc}</p>}
        <p className="text-[#D87E33] font-black mt-1.5 text-lg">{price.toLocaleString("vi-VN")}K</p>
      </div>
      <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4B692E]/20 shadow-sm">
        <button type="button" onClick={() => adjustQuantity(id, -1)} className="w-7 h-7 rounded-lg bg-[#E6EFD9] text-[#4B692E] font-bold flex items-center justify-center hover:bg-[#D0E3B6]"><Minus size={14} strokeWidth={3}/></button>
        <span className="font-bold text-[#40240C] text-base w-4 text-center">{cart[id]}</span>
        <button type="button" onClick={() => adjustQuantity(id, 1)} className="w-7 h-7 rounded-lg bg-[#4B692E] text-white font-bold flex items-center justify-center hover:bg-[#344E1D]"><Plus size={14} strokeWidth={3}/></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#D0E3B6] text-[#40240C] py-8 px-4 font-sans selection:bg-[#D87E33] selection:text-white">
      <div className="max-w-lg mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-8 bg-[#4B692E] py-7 px-4 rounded-[32px] shadow-lg border-4 border-[#FDF1C3] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#D87E33]"></div>
          <div className="inline-flex items-center gap-1.5 bg-[#D87E33] text-white px-4 py-1.5 rounded-full text-xs font-bold mb-3 uppercase tracking-widest shadow-sm">
            <Sparkles size={14} /> Menu
          </div>
          <h1 className="text-5xl font-black tracking-tight text-[#FDF1C3] drop-shadow-md mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
            PATU. BREAD
          </h1>
          <p className="text-sm text-[#E6EFD9] font-medium">Bánh mì miến — Nóng giòn mỗi sáng</p>
        </div>

        {/* BƯỚC 3: ĐÃ THANH TOÁN & GỬI ĐƠN THÀNH CÔNG */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-[#4B692E]/10 text-center space-y-5">
            <div className="w-16 h-16 bg-[#D0E3B6] text-[#4B692E] rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-[#4B692E] uppercase">Thanh toán thành công!</h2>
            <p className="text-sm text-[#6A8152] font-medium px-4">
              Hệ thống đã nhận được khoản thanh toán cho đơn <strong>{orderCode}</strong> và ghi vào danh sách chuẩn bị của bếp. Cảm ơn bạn nhé!
            </p>
            <button onClick={() => { setStep(1); setCart({bmm:1, combo30k:0, combo40k:0}); setSelectedToppings([]); }} className="mt-4 w-full py-3.5 rounded-xl bg-[#E6EFD9] text-[#4B692E] font-bold text-sm hover:bg-[#D0E3B6] transition border-2 border-[#4B692E]/20">
              Đặt thêm đơn mới
            </button>
          </div>
        )}

        {/* BƯỚC 2: QUÉT QR & CHỜ HỆ THỐNG TỰ ĐỘNG DUYỆT */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-5 text-center">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm font-bold text-[#6A8152] hover:text-[#4B692E] bg-[#E6EFD9] px-3 py-1.5 rounded-lg transition">
                <ArrowLeft size={16} /> Sửa đơn
              </button>
              <span className="text-sm font-black text-[#D87E33] uppercase tracking-wider">Mã đơn: {orderCode}</span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#40240C]">Quét mã QR để thanh toán</h2>
              <p className="text-xs text-[#6A8152] mt-1.5">Giữ nguyên nội dung chuyển khoản để hệ thống tự động duyệt đơn ngay lập tức.</p>
            </div>

            <div className="bg-[#FDF1C3] p-4 rounded-2xl border-2 border-[#D87E33]/20 mx-auto max-w-sm">
              <img src={qrUrl} alt="Mã VietQR" className="w-full mx-auto rounded-xl shadow-sm" />
              <div className="mt-4 text-sm text-[#40240C] space-y-1.5 bg-white py-2.5 px-3 rounded-xl text-center">
                <p>Số tiền: <strong className="text-[#D87E33] text-lg">{totalAmount.toLocaleString("vi-VN")}đ</strong></p>
                <p>Nội dung: <strong className="text-[#4B692E] font-mono bg-[#E6EFD9] px-2 py-0.5 rounded text-xs">{decodeURIComponent(transferContent)}</strong></p>
              </div>
            </div>

            {/* Trạng thái chờ tự động */}
            <div className="w-full py-4 px-3 rounded-2xl bg-[#E6EFD9] text-[#4B692E] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border-2 border-[#4B692E]/20">
              <Loader2 size={20} className="animate-spin" />
              <span>Đang chờ xác nhận thanh toán...</span>
            </div>
          </div>
        )}

        {/* BƯỚC 1: FORM CHÍNH */}
        {step === 1 && (
          <form className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-5" onSubmit={handleGoToPayment}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#D0E3B6] text-[#4B692E]">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] font-black text-[#6A8152]">Đặt bánh mì</p>
                <h2 className="text-2xl font-black text-[#40240C]">Chọn món & thời gian</h2>
              </div>
            </div>

            <div className="space-y-3">
              <MenuItem id="bmm" name="BMM" desc="Bánh mì miến nóng giòn" price={PRICES.bmm} />
              <MenuItem id="combo30k" name="Combo 30K" desc="2 món cơ bản + nước" price={PRICES.combo30k} />
              <MenuItem id="combo40k" name="Combo 40K" desc="Thêm khoai tây + nước" price={PRICES.combo40k} />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-[#4B692E] font-bold">
                <Calendar size={18} />
                <span>Ngày nhận đơn</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {weekDays.map((day) => (
                  <button
                    type="button"
                    key={day}
                    onClick={() => setFormData((prev) => ({ ...prev, orderDate: day }))}
                    className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                      formData.orderDate === day
                        ? "bg-[#4B692E] text-white border-[#4B692E] shadow-sm"
                        : "bg-[#E6EFD9] text-[#4B692E] border-[#4B692E]/20 hover:bg-[#D0E3B6]"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#4B692E] font-bold">
                <Clock size={18} />
                <span>Thời gian nhận</span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-[#6A8152]">Phương thức nhận món</label>
                <select
                  name="deliveryMethod"
                  value={formData.deliveryMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-3 rounded-xl border-2 border-[#D87E33]/20 bg-[#FDF1C3] text-[#40240C] font-medium focus:outline-none focus:ring-2 focus:ring-[#D87E33]/40"
                >
                  <option>Tự đến lấy tại 161C Đại La</option>
                  <option>Đặt ship</option>
                  <option>Nhận tại quầy</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-[#6A8152]">Giờ nhận</label>
                <div className="grid grid-cols-2 gap-2">
                  {timeOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setFormData((prev) => ({ ...prev, deliveryTime: option }))}
                      className={`px-3 py-2 rounded-xl border text-sm font-bold transition ${
                        formData.deliveryTime === option
                          ? "bg-[#D87E33] text-white border-[#D87E33] shadow-sm"
                          : "bg-[#FDF1C3] text-[#40240C] border-[#D87E33]/20 hover:bg-[#F8E6B5]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {formData.deliveryTime === "Khác" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#6A8152]">Thời gian khác</label>
                  <input
                    type="text"
                    name="customTime"
                    value={formData.customTime}
                    onChange={handleChange}
                    placeholder="VD: 17:30"
                    className="w-full px-3 py-3 rounded-xl border-2 border-[#D87E33]/20 bg-[#FDF1C3] text-[#40240C] font-medium focus:outline-none focus:ring-2 focus:ring-[#D87E33]/40"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-[#4B692E] font-bold">
                <MapPin size={18} />
                <span>Thông tin khách hàng</span>
              </div>

              <div className="grid gap-3">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#6A8152]">Tên</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Thanh"
                    className="w-full px-3 py-3 rounded-xl border-2 border-[#D87E33]/20 bg-[#FDF1C3] text-[#40240C] font-medium focus:outline-none focus:ring-2 focus:ring-[#D87E33]/40"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#6A8152]">Link social / Mã cơ sở</label>
                  <input
                    type="text"
                    name="socialLink"
                    value={formData.socialLink}
                    onChange={handleChange}
                    placeholder="Tiktok, IG, Facebook..."
                    className="w-full px-3 py-3 rounded-xl border-2 border-[#D87E33]/20 bg-[#FDF1C3] text-[#40240C] font-medium focus:outline-none focus:ring-2 focus:ring-[#D87E33]/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#6A8152]">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0987654321"
                    className="w-full px-3 py-3 rounded-xl border-2 border-[#D87E33]/20 bg-[#FDF1C3] text-[#40240C] font-medium focus:outline-none focus:ring-2 focus:ring-[#D87E33]/40"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#E6EFD9] border border-[#4B692E]/20 p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-[#4B692E]">Tổng đơn</span>
                <span className="font-black text-[#D87E33] text-xl">{totalAmount.toLocaleString("vi-VN")}đ</span>
              </div>
              <p className="text-xs text-[#6A8152] font-medium">{orderSummary || "Chưa có món nào được chọn"}</p>
            </div>

            <button
              type="submit"
              disabled={isLoading || totalQuantity === 0}
              className="w-full py-3.5 rounded-xl bg-[#D87E33] text-white font-black text-base shadow-md hover:bg-[#BF6C21] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Đang tạo đơn...</> : <><QrCode size={18} /> Tạo QR thanh toán</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
