"use client";
import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Sparkles,
  Plus,
  Minus,
  QrCode,
  ArrowLeft,
  Loader2,
} from "lucide-react";

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
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzevJPOpk3Mr4Pawo8XcV7j2KqPRgIs-EAJo_wNISc/dev";
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
  const totalAmount =
    cart.bmm * PRICES.bmm +
    cart.combo30k * PRICES.combo30k +
    cart.combo40k * PRICES.combo40k;
  const totalQuantity = cart.bmm + cart.combo30k + cart.combo40k;

  const orderSummary = [
    cart.bmm > 0 ? `${cart.bmm} BMM` : "",
    cart.combo30k > 0 ? `${cart.combo30k} Combo 30K` : "",
    cart.combo40k > 0 ? `${cart.combo40k} Combo 40K` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // --- TẠO MÃ VIETQR NHÚNG MÃ ĐƠN PATUxxxx ---
  const removeAccents = (str) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  const cleanName = removeAccents(formData.name)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "");
  const transferContent = encodeURIComponent(
    `${orderCode} ${cleanName} ${formData.phone}`.trim(),
  );
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${totalAmount}&addInfo=${transferContent}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  // --- LOGIC: CHỈ CHO CHỌN GIỜ KHÁC KHI TỰ LẤY HOẶC ĐẶT SHIP ---
  const isFlexibleTime =
    formData.deliveryMethod === "Tự đến lấy tại 161C Đại La" ||
    formData.deliveryMethod === "Đặt ship";
  const timeOptions = isFlexibleTime
    ? ["Sáng 8:30", "Trưa 12:15", "Khác"]
    : ["Sáng 8:30", "Trưa 12:15"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "deliveryMethod") {
        const isNowFlexible =
          value === "Tự đến lấy tại 161C Đại La" || value === "Đặt ship";
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
      prev.includes(topping)
        ? prev.filter((t) => t !== topping)
        : [...prev, topping],
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
      toppingNote:
        selectedToppings.length > 0 ? selectedToppings.join(", ") : "Đầy đủ",
      finalDate: formData.orderDate,
      finalTime:
        formData.deliveryTime === "Khác"
          ? formData.customTime
          : formData.deliveryTime,
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
    if (step !== 2 || !orderCode || !GOOGLE_SCRIPT_URL.startsWith("https://"))
      return;

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
    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#fdf1c3] border border-[#d87e33]/30 mb-4 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#d87e33]"></div>
      <div className="pl-2">
        <h3 className="font-bold text-[#4b692e] text-base">{name}</h3>
        {desc && (
          <p className="text-xs text-[#6a8152] mt-0.5 font-medium">{desc}</p>
        )}
        <p className="text-[#d87e33] font-black mt-1.5 text-lg">
          {price.toLocaleString("vi-VN")}K
        </p>
      </div>
      <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4b692e]/20 shadow-sm">
        <button
          type="button"
          onClick={() => adjustQuantity(id, -1)}
          className="w-7 h-7 rounded-lg bg-[#e6efd9] text-[#4b692e] font-bold flex items-center justify-center hover:bg-[#d0e3b6]"
        >
          <Minus size={14} strokeWidth={3} />
        </button>
        <span className="font-bold text-[#40240c] text-base w-4 text-center">
          {cart[id]}
        </span>
        <button
          type="button"
          onClick={() => adjustQuantity(id, 1)}
          className="w-7 h-7 rounded-lg bg-[#4b692e] text-white font-bold flex items-center justify-center hover:bg-[#344e1d]"
        >
          <Plus size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#d0e3b6] text-[#40240c] py-8 px-4 font-sans selection:bg-[#d87e33] selection:text-white">
      <div className="max-w-lg mx-auto">
        {/* HEADER */}
        <div className="text-center mb-8 bg-[#4b692e] py-7 px-4 rounded-[32px] shadow-lg border-4 border-[#fdf1c3] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#d87e33]"></div>
          <div className="inline-flex items-center gap-1.5 bg-[#d87e33] text-white px-4 py-1.5 rounded-full text-xs font-bold mb-3 uppercase tracking-widest shadow-sm">
            <Sparkles size={14} /> Menu
          </div>
          <h1
            className="text-5xl font-black tracking-tight text-[#fdf1c3] drop-shadow-md mb-1"
            style={{ fontFamily: "Impact, sans-serif" }}
          >
            PATU. BREAD
          </h1>
          <p className="text-sm text-[#e6efd9] font-medium">
            Bánh mì miến — Nóng giòn mỗi sáng
          </p>
        </div>

        {/* BƯỚC 3: ĐÃ THANH TOÁN & GỬI ĐƠN THÀNH CÔNG */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-[#4b692e]/10 text-center space-y-5">
            <div className="w-16 h-16 bg-[#d0e3b6] text-[#4b692e] rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-[#4b692e] uppercase">
              Thanh toán thành công!
            </h2>
            <p className="text-sm text-[#6a8152] font-medium px-4">
              Hệ thống đã nhận được khoản thanh toán cho đơn{" "}
              <strong>{orderCode}</strong> và ghi vào danh sách chuẩn bị của
              bếp. Cảm ơn bạn nhé!
            </p>
            <button
              onClick={() => {
                setStep(1);
                setCart({ bmm: 1, combo30k: 0, combo40k: 0 });
                setSelectedToppings([]);
              }}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#e6efd9] text-[#4b692e] font-bold text-sm hover:bg-[#d0e3b6] transition border-2 border-[#4b692e]/20"
            >
              Đặt thêm đơn mới
            </button>
          </div>
        )}

        {/* BƯỚC 2: QUÉT QR & CHỜ HỆ THỐNG TỰ ĐỘNG DUYỆT */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10 space-y-5 text-center">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm font-bold text-[#6a8152] hover:text-[#4b692e] bg-[#e6efd9] px-3 py-1.5 rounded-lg transition"
              >
                <ArrowLeft size={16} /> Sửa đơn
              </button>
              <span className="text-sm font-black text-[#d87e33] uppercase tracking-wider">
                Mã đơn: {orderCode}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#40240c]">
                Quét mã QR để thanh toán
              </h2>
              <p className="text-xs text-[#6a8152] mt-1.5">
                Giữ nguyên nội dung chuyển khoản để hệ thống tự động duyệt đơn
                ngay lập tức.
              </p>
            </div>

            <div className="bg-[#fdf1c3] p-4 rounded-2xl border-2 border-[#d87e33]/20 mx-auto max-w-sm">
              <img
                src={qrUrl}
                alt="Mã VietQR"
                className="w-full mx-auto rounded-xl shadow-sm"
              />
              <div className="mt-4 text-sm text-[#40240c] space-y-1.5 bg-white py-2.5 px-3 rounded-xl text-center">
                <p>
                  Số tiền:{" "}
                  <strong className="text-[#d87e33] text-lg">
                    {totalAmount.toLocaleString("vi-VN")}đ
                  </strong>
                </p>
                <p>
                  Nội dung:{" "}
                  <strong className="text-[#4b692e] font-mono bg-[#e6efd9] px-2 py-0.5 rounded text-xs">
                    {decodeURIComponent(transferContent)}
                  </strong>
                </p>
              </div>
            </div>

            {/* Trạng thái chờ tự động */}
            <div className="w-full py-4 px-3 rounded-2xl bg-[#e6efd9] text-[#4b692e] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border-2 border-[#4b692e]/20">
              <Loader2
                size={20}
                className="animate-spin text-[#d87e33] shrink-0"
              />
              <span>Đang chờ hệ thống xác nhận thanh toán tự động...</span>
            </div>

            <p className="text-xs text-[#6a8152] italic">
              *Màn hình sẽ tự động chuyển ngay sau khi bạn chuyển khoản thành
              công (khoảng 3–5 giây).
            </p>
          </div>
        )}

        {/* BƯỚC 1: FORM ĐẶT HÀNG */}
        {step === 1 && (
          <form onSubmit={handleGoToPayment} className="space-y-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10">
              <div className="flex items-center gap-2 font-black text-xl mb-5 text-[#d87e33]">
                <ShoppingBag size={24} />{" "}
                <span className="uppercase tracking-wide">Chọn món</span>
              </div>

              <MenuItem
                id="bmm"
                name="Bánh mì miến"
                desc="Nhân miến xào đậm đà, vỏ nướng giòn"
                price={25}
              />

              {/* Đã đổi thành Combo Tiện Lợi */}
              <div className="relative mt-6 mb-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-[#d0e3b6]"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs font-bold uppercase tracking-widest text-[#4b692e] rounded-full border border-[#d0e3b6]">
                    Combo Tiện Lợi
                  </span>
                </div>
              </div>

              <MenuItem
                id="combo30k"
                name="Combo 30K"
                desc="• 1 Bánh mì miến • 1 Teago"
                price={30}
              />
              <MenuItem
                id="combo40k"
                name="Combo 40K"
                desc="• 1 Bánh mì miến • 1 Sữa đậu"
                price={40}
              />

              <div className="mt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6a8152] mb-2">
                  Ghi chú (Có thể chọn nhiều)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Bỏ rau thơm", "Không cay"].map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => toggleTopping(option)}
                      className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition shadow-sm ${
                        selectedToppings.includes(option)
                          ? "bg-[#4b692e] text-white border-[#4b692e]"
                          : "bg-white text-[#40240c] border-[#e6efd9] hover:border-[#d0e3b6]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#6a8152] italic">
                  Trạng thái:{" "}
                  {selectedToppings.length === 0
                    ? "Bánh sẽ làm Đầy đủ"
                    : `Đã lưu ý: ${selectedToppings.join(", ")}`}
                </p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10 space-y-5">
              <div className="flex items-center gap-2 font-black text-xl text-[#d87e33] mb-2">
                <MapPin size={24} />{" "}
                <span className="uppercase tracking-wide">Giao nhận</span>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold mb-2 text-[#40240c]">
                  <Calendar size={16} className="text-[#4b692e]" /> Ngày đặt
                  hàng *
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {weekDays.map((date) => (
                    <button
                      type="button"
                      key={date}
                      onClick={() =>
                        setFormData({ ...formData, orderDate: date })
                      }
                      className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 transition ${formData.orderDate === date ? "bg-[#d87e33] text-white border-[#d87e33]" : "bg-white border-[#e6efd9] text-[#6a8152]"}`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              {/* Đã đưa Tự đến lấy lên đầu làm mặc định */}
              <div>
                <label className="block text-sm font-bold mb-2 text-[#40240c]">
                  Phương thức nhận hàng *
                </label>
                <select
                  name="deliveryMethod"
                  value={formData.deliveryMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#fdf1c3]/30 border-2 border-[#e6efd9] focus:outline-none focus:border-[#d87e33] font-medium text-sm"
                >
                  <option value="Tự đến lấy tại 161C Đại La">
                    🏠 Tự lấy tại 161C Đại La
                  </option>
                  <option value="Ship tận nơi ở cổng HUST (đường Trần Đại Nghĩa)">
                    📍 Cổng HUST (Trần Đại Nghĩa)
                  </option>
                  <option value="Ship tận nơi ở cổng NEU (đường Trần Đại Nghĩa)">
                    📍 Cổng NEU (Trần Đại Nghĩa)
                  </option>
                  <option value="Ship tận nơi ở cổng HUCE (đường Trần Đại Nghĩa)">
                    📍 Cổng HUCE (Trần Đại Nghĩa)
                  </option>
                  <option value="Ship tận nơi ở nhà xe số 2 đối diện sảnh A2 NEU">
                    📍 Nhà xe số 2 sảnh A2 NEU
                  </option>
                  <option value="Đặt ship">🛵 Đặt ship ngoài</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold mb-2 text-[#40240c]">
                  <Clock size={16} className="text-[#4b692e]" /> Thời gian nhận
                  *
                </label>
                {isFlexibleTime && (
                  <p className="text-xs text-[#6a8152] mb-2">
                    (Với tự lấy hoặc đặt ship, bạn có thể linh hoạt giờ)
                  </p>
                )}

                <div
                  className={`grid ${isFlexibleTime ? "grid-cols-3" : "grid-cols-2"} gap-2.5`}
                >
                  {timeOptions.map((time) => (
                    <button
                      type="button"
                      key={time}
                      onClick={() =>
                        setFormData({ ...formData, deliveryTime: time })
                      }
                      className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition ${formData.deliveryTime === time ? "bg-[#d87e33] text-white border-[#d87e33]" : "bg-white border-[#e6efd9]"}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                {formData.deliveryTime === "Khác" && isFlexibleTime && (
                  <input
                    type="text"
                    name="customTime"
                    required
                    placeholder="Nhập giờ muốn nhận..."
                    value={formData.customTime}
                    onChange={handleChange}
                    className="mt-2.5 w-full px-4 py-3 rounded-xl bg-[#fdf1c3]/30 border-2 border-[#e6efd9] focus:outline-none focus:border-[#d87e33] font-medium"
                  />
                )}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10 space-y-4">
              <div className="font-black text-xl text-[#d87e33] uppercase tracking-wide mb-2">
                Thông tin liên hệ
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#40240c]">
                  Tên của bạn *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="VD: PATU"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#fdf1c3]/30 border-2 border-[#e6efd9] focus:outline-none focus:border-[#d87e33] font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#40240c]">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="VD: 0987654321"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#fdf1c3]/30 border-2 border-[#e6efd9] focus:outline-none focus:border-[#d87e33] font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#40240c]">
                  Link FB / IG *
                </label>
                <input
                  type="text"
                  name="socialLink"
                  required
                  placeholder="@username..."
                  value={formData.socialLink}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#fdf1c3]/30 border-2 border-[#e6efd9] focus:outline-none focus:border-[#d87e33] font-medium"
                />
              </div>
            </div>

            <div className="bg-[#4b692e] text-white p-5 rounded-3xl flex items-center justify-between shadow-xl border-2 border-[#d0e3b6] sticky bottom-4 z-10">
              <div>
                <p className="text-xs text-[#d0e3b6] font-bold uppercase tracking-wider">
                  Tổng ({totalQuantity} phần)
                </p>
                <p className="text-2xl font-black text-[#fdf1c3]">
                  {totalAmount.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#d87e33] hover:bg-[#c26b29] text-white font-bold px-5 py-4 rounded-2xl transition shadow-md flex items-center gap-2"
              >
                {isLoading ? (
                  "Đang tạo mã..."
                ) : (
                  <>
                    <QrCode size={20} /> Tạo mã thanh toán
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
