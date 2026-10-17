"use client";
import React, { useState } from "react";
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
  // step 1: Chọn món | step 2: Hiện QR Thanh toán | step 3: Hoàn tất & Đã lưu Sheets
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE DỮ LIỆU ---
  const [formData, setFormData] = useState({
    name: "",
    socialLink: "",
    phone: "",
    orderDate: weekDays[0], // Tự động lấy Thứ 2 làm mặc định
    deliveryMethod: "Tự đến lấy tại 161C Đại La",
    deliveryTime: "Sáng 8:30",
    customTime: "",
  });

  const [cart, setCart] = useState({ bmm: 1, combo30k: 0, combo40k: 0 });

  // Topping lưu dạng mảng để chọn được nhiều option cùng lúc
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

  // --- THÔNG TIN VIETQR ---
  const BANK_ID = "PVcomBank";
  const ACCOUNT_NO = "105004043276";
  const ACCOUNT_NAME = "PHẠM HÀ THANH";

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
    `${cleanName} ${formData.phone} ${totalQuantity} SUAT`.trim(),
  );
  // --- LOGIC: KIỂM TRA CHO PHÉP NHẬP GIỜ KHÁC KHÔNG ---
  const isFlexibleTime =
    formData.deliveryMethod === "Tự đến lấy tại 161C Đại La" ||
    formData.deliveryMethod === "Đặt ship";
  const timeOptions = isFlexibleTime
    ? ["Sáng 8:30", "Trưa 12:15", "Khác"]
    : ["Sáng 8:30", "Trưa 12:15"];
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${totalAmount}&addInfo=${transferContent}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  // --- HÀM XỬ LÝ SỰ KIỆN ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Nếu đổi phương thức giao hàng sang loại CỐ ĐỊNH, mà giờ đang chọn là "Khác" -> reset về 8:30
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

  // Toggle Topping (Thêm/Bỏ khỏi mảng)
  const toggleTopping = (topping) => {
    setSelectedToppings((prev) =>
      prev.includes(topping)
        ? prev.filter((t) => t !== topping)
        : [...prev, topping],
    );
  };

  // Bước 1 -> Bước 2: Chuyển sang quét QR (CHƯA LƯU SHEETS)
  const handleGoToPayment = (e) => {
    e.preventDefault();
    if (totalQuantity === 0) {
      alert("Bạn chưa chọn món nào!");
      return;
    }
    setStep(2);
  };

  // Bước 2 -> Bước 3: Xác nhận đã chuyển khoản & LƯU SHEETS
  const handleConfirmAndSubmit = async () => {
    setIsLoading(true);

    const finalOrder = {
      ...formData,
      quantity: orderSummary,
      // Nếu mảng rỗng thì để "Đầy đủ", nếu có chọn thì nối lại (VD: "Bỏ rau thơm, Không cay")
      toppingNote:
        selectedToppings.length > 0 ? selectedToppings.join(", ") : "Đầy đủ",
      finalDate:
        formData.orderDate === "Khác"
          ? formData.customDate
          : formData.orderDate,
      finalTime:
        formData.deliveryTime === "Khác"
          ? formData.customTime
          : formData.deliveryTime,
      totalPrice: totalAmount,
      createdAt: new Date().toLocaleString("vi-VN"),
    };

    try {
      const GOOGLE_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwr79cKF11Q78DFNEncaQ5JV5wF6NaEcEE3VuPs6RP1Kd3RtO74W0WnOJPkssOAOogM/exec";
      if (GOOGLE_SCRIPT_URL.startsWith("https://")) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalOrder),
        });
      }
      setStep(3); // Chuyển sang màn hình Thành công
    } catch (error) {
      alert("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI COMPONENTS ---
  const MenuItem = ({ id, name, desc, price }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FDF1C3] border border-[#D87E33]/30 mb-4 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D87E33]"></div>
      <div className="pl-2">
        <h3 className="font-bold text-[#4B692E] text-base">{name}</h3>
        {desc && (
          <p className="text-xs text-[#6A8152] mt-0.5 font-medium">{desc}</p>
        )}
        <p className="text-[#D87E33] font-black mt-1.5 text-lg">
          {price.toLocaleString("vi-VN")}K
        </p>
      </div>
      <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4B692E]/20 shadow-sm">
        <button
          type="button"
          onClick={() => adjustQuantity(id, -1)}
          className="w-7 h-7 rounded-lg bg-[#E6EFD9] text-[#4B692E] font-bold flex items-center justify-center hover:bg-[#D0E3B6]"
        >
          <Minus size={14} strokeWidth={3} />
        </button>
        <span className="font-bold text-[#40240C] text-base w-4 text-center">
          {cart[id]}
        </span>
        <button
          type="button"
          onClick={() => adjustQuantity(id, 1)}
          className="w-7 h-7 rounded-lg bg-[#4B692E] text-white font-bold flex items-center justify-center hover:bg-[#344E1D]"
        >
          <Plus size={14} strokeWidth={3} />
        </button>
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
          <h1
            className="text-5xl font-black tracking-tight text-[#FDF1C3] drop-shadow-md mb-1"
            style={{ fontFamily: "Impact, sans-serif" }}
          >
            PATU. BREAD
          </h1>
          <p className="text-sm text-[#E6EFD9] font-medium">
            Bánh mì miến — Nóng giòn mỗi ngày
          </p>
        </div>

        {/* BƯỚC 3: ĐÃ GỬI ĐƠN HÀNG */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-[#4B692E]/10 text-center space-y-5">
            <div className="w-16 h-16 bg-[#D0E3B6] text-[#4B692E] rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-[#4B692E] uppercase">
              Đã gửi đơn tới bếp!
            </h2>
            <p className="text-sm text-[#6A8152] font-medium px-4">
              Cảm ơn bạn đã đặt bánh. Tiệm đã ghi nhận đơn hàng và sẽ chuẩn bị
              cho bạn đúng giờ nhé.
            </p>
            <button
              onClick={() => {
                setStep(1);
                setCart({ bmm: 1, combo30k: 0, combo40k: 0 });
                setSelectedToppings([]);
              }}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#E6EFD9] text-[#4B692E] font-bold text-sm hover:bg-[#D0E3B6] transition border-2 border-[#4B692E]/20"
            >
              Đặt thêm đơn mới
            </button>
          </div>
        )}

        {/* BƯỚC 2: QUÉT QR THANH TOÁN (Chưa lưu) */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-5 text-center">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm font-bold text-[#6A8152] hover:text-[#4B692E] bg-[#E6EFD9] px-3 py-1.5 rounded-lg transition"
              >
                <ArrowLeft size={16} /> Sửa đơn
              </button>
              <span className="text-sm font-black text-[#D87E33] uppercase tracking-wider">
                Thanh toán
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#40240C]">
                Quét mã QR để hoàn tất
              </h2>
              <p className="text-xs text-[#6A8152] mt-1.5">
                Vui lòng chuyển khoản trước khi gửi đơn để tiệm chốt số lượng
                nhé.
              </p>
            </div>

            <div className="bg-[#FDF1C3] p-4 rounded-2xl border-2 border-[#D87E33]/20 mx-auto max-w-sm">
              <img
                src={qrUrl}
                alt="Mã VietQR"
                className="w-full mx-auto rounded-xl shadow-sm"
              />
              <div className="mt-4 text-sm text-[#40240C] space-y-1.5 bg-white py-2 rounded-xl text-center">
                <p>
                  Số tiền:{" "}
                  <strong className="text-[#D87E33] text-lg">
                    {totalAmount.toLocaleString("vi-VN")}đ
                  </strong>
                </p>
                <p>
                  Nội dung:{" "}
                  <strong className="text-[#4B692E] font-mono bg-[#E6EFD9] px-2 py-0.5 rounded text-xs">
                    {decodeURIComponent(transferContent)}
                  </strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-[#D87E33] italic font-medium">
              *Nhớ cap màn hình bill lại bạn nhé!
            </p>

            {/* Nút này mới gọi API lưu Sheets */}
            <button
              onClick={handleConfirmAndSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-[#4B692E] text-white font-black uppercase tracking-wider hover:bg-[#344E1D] transition shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? (
                "Đang gửi đơn..."
              ) : (
                <>
                  <CheckCircle2 size={20} /> TÔI ĐÃ CHUYỂN KHOẢN
                </>
              )}
            </button>
          </div>
        )}

        {/* BƯỚC 1: FORM ĐẶT HÀNG */}
        {step === 1 && (
          <form onSubmit={handleGoToPayment} className="space-y-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10">
              <div className="flex items-center gap-2 font-black text-xl mb-5 text-[#D87E33]">
                <ShoppingBag size={24} />{" "}
                <span className="uppercase tracking-wide">Chọn món</span>
              </div>

              <MenuItem
                id="bmm"
                name="Bánh mì miến"
                desc="Nhân miến xào đậm đà, vỏ nướng giòn"
                price={25}
              />
              <div className="relative mt-6 mb-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-[#D0E3B6]"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs font-bold uppercase tracking-widest text-[#4B692E] rounded-full border border-[#D0E3B6]">
                    Combo Tiện Lợi
                  </span>
                </div>
              </div>
              <MenuItem
                id="combo30k"
                name="Combo 30K"
                desc="• 1 Bánh mì miến &bull; 1 Teago"
                price={30}
              />
              <MenuItem
                id="combo40k"
                name="Combo 40K"
                desc="• 1 Bánh mì miến &bull; 1 Sữa đậu"
                price={40}
              />

              {/* Tùy chọn Topping (Multi-select) */}
              <div className="mt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6A8152] mb-2">
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
                          ? "bg-[#4B692E] text-white border-[#4B692E]"
                          : "bg-white text-[#40240C] border-[#E6EFD9] hover:border-[#D0E3B6]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {/* Hiển thị trạng thái realtime cho khách an tâm */}
                <p className="mt-2 text-xs text-[#6A8152] italic">
                  Trạng thái:{" "}
                  {selectedToppings.length === 0
                    ? "Bánh sẽ làm Đầy đủ"
                    : `Đã lưu ý: ${selectedToppings.join(", ")}`}
                </p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-5">
              <div className="flex items-center gap-2 font-black text-xl text-[#D87E33] mb-2">
                <MapPin size={24} />{" "}
                <span className="uppercase tracking-wide">Giao nhận</span>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold mb-2 text-[#40240C]">
                  <Calendar size={16} className="text-[#4B692E]" /> Ngày đặt
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
                      className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 transition ${formData.orderDate === date ? "bg-[#D87E33] text-white border-[#D87E33]" : "bg-white border-[#E6EFD9] text-[#6A8152]"}`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-[#40240C]">
                  Phương thức nhận hàng *
                </label>
                <select
                  name="deliveryMethod"
                  value={formData.deliveryMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#FDF1C3]/30 border-2 border-[#E6EFD9] focus:outline-none focus:border-[#D87E33] font-medium text-sm"
                >
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
                  <option value="Tự đến lấy tại 161C Đại La">
                    🏠 Tự lấy tại 161C Đại La
                  </option>
                  <option value="Đặt ship">🛵 Đặt ship ngoài</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold mb-2 text-[#40240C]">
                  <Clock size={16} className="text-[#4B692E]" /> Thời gian nhận
                  *
                </label>
                {isFlexibleTime && (
                  <p className="text-xs text-[#6A8152] mb-2">
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
                      className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition ${formData.deliveryTime === time ? "bg-[#D87E33] text-white border-[#D87E33]" : "bg-white border-[#E6EFD9]"}`}
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
                    className="mt-2.5 w-full px-4 py-3 rounded-xl bg-[#FDF1C3]/30 border-2 border-[#E6EFD9] focus:outline-none focus:border-[#D87E33] font-medium"
                  />
                )}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-4">
              <div className="font-black text-xl text-[#D87E33] uppercase tracking-wide mb-2">
                Thông tin liên hệ
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#40240C]">
                  Tên của bạn *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="VD: PATU"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#FDF1C3]/30 border-2 border-[#E6EFD9] focus:outline-none focus:border-[#D87E33] font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#40240C]">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="VD: 0987654321"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#FDF1C3]/30 border-2 border-[#E6EFD9] focus:outline-none focus:border-[#D87E33] font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#40240C]">
                  Link FB / IG *
                </label>
                <input
                  type="text"
                  name="socialLink"
                  required
                  placeholder="@username..."
                  value={formData.socialLink}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#FDF1C3]/30 border-2 border-[#E6EFD9] focus:outline-none focus:border-[#D87E33] font-medium"
                />
              </div>
            </div>

            <div className="bg-[#4B692E] text-white p-5 rounded-3xl flex items-center justify-between shadow-xl border-2 border-[#D0E3B6] sticky bottom-4 z-10">
              <div>
                <p className="text-xs text-[#D0E3B6] font-bold uppercase tracking-wider">
                  Tổng ({totalQuantity} phần)
                </p>
                <p className="text-2xl font-black text-[#FDF1C3]">
                  {totalAmount.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <button
                type="submit"
                className="bg-[#D87E33] hover:bg-[#C26B29] text-white font-bold px-5 py-4 rounded-2xl transition shadow-md flex items-center gap-2"
              >
                <QrCode size={20} /> Tạo mã thanh toán
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
