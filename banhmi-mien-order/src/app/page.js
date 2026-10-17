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
  UploadCloud,
} from "lucide-react";

const getCurrentWeekDays = () => {
  const today = new Date();
  const currentDay = today.getDay();
  let diffToMonday =
    currentDay === 0 ? 1 : currentDay === 6 ? 2 : 1 - currentDay;
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
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // State lưu ảnh Bill
  const [proofImage, setProofImage] = useState(null);
  const [fileName, setFileName] = useState("");

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxkBbQ0UE5mLENmQDixDVzctLdRVbkfh30ZWFafvSlQ_IdRONJqqaSLs9e6gCylhQKf/exec";
  const BANK_ID = "PVcomBank";
  const ACCOUNT_NO = "105004043276";
  const ACCOUNT_NAME = "PHẠM HÀ THANH";

  const [formData, setFormData] = useState({
    name: "",
    socialLink: "",
    phone: "",
    orderDate: weekDays[0],
    deliveryMethod: "Tự đến lấy tại 161C Đại La",
    deliveryTime: "Sáng 8:30",
    customTime: "",
  });

  const [cart, setCart] = useState({ bmm: 1, combo30k: 0, combo40k: 0 });
  const [selectedToppings, setSelectedToppings] = useState([]);

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
    `${cleanName} ${formData.phone}`.trim(),
  );
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${totalAmount}&addInfo=${transferContent}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

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
      if (
        name === "deliveryMethod" &&
        !(value === "Tự đến lấy tại 161C Đại La" || value === "Đặt ship") &&
        prev.deliveryTime === "Khác"
      ) {
        newData.deliveryTime = "Sáng 8:30";
      }
      return newData;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result
          .replace("data:", "")
          .replace(/^.+,/, "");
        setProofImage({ base64: base64String, type: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmAndSubmit = async () => {
    if (!proofImage) {
      alert("Bạn quên up ảnh bill chuyển khoản rồi nè!");
      return;
    }
    setIsLoading(true);

    const finalOrder = {
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
      proofImage: proofImage,
      createdAt: new Date().toLocaleString("vi-VN"),
    };

    try {
      if (GOOGLE_SCRIPT_URL.startsWith("https://")) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalOrder),
        });
      }
      setStep(3);
    } catch (error) {
      alert("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D0E3B6] text-[#40240C] py-8 px-4 font-sans selection:bg-[#D87E33] selection:text-white">
      <div className="max-w-lg mx-auto">
        {/* HEADER */}
        <div className="text-center mb-8 bg-[#4B692E] py-7 px-4 rounded-[32px] shadow-lg border-4 border-[#FDF1C3] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#D87E33]"></div>
          <h1
            className="text-5xl font-black tracking-tight text-[#FDF1C3] drop-shadow-md mb-1"
            style={{ fontFamily: "Impact, sans-serif" }}
          >
            PATU. BREAD
          </h1>
          <p className="text-sm text-[#E6EFD9] font-medium">
            Bánh mì miến — Nóng giòn mỗi sáng
          </p>
        </div>

        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-[#4B692E]/10 text-center space-y-5">
            <div className="w-16 h-16 bg-[#D0E3B6] text-[#4B692E] rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-[#4B692E] uppercase">
              Đã gửi đơn tới bếp!
            </h2>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#E6EFD9] text-[#4B692E] font-bold text-sm hover:bg-[#D0E3B6]"
            >
              Đặt thêm đơn mới
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-5 text-center">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm font-bold text-[#6A8152] bg-[#E6EFD9] px-3 py-1.5 rounded-lg"
              >
                <ArrowLeft size={16} /> Sửa đơn
              </button>
              <span className="text-sm font-black text-[#D87E33] uppercase">
                Thanh toán
              </span>
            </div>

            <div className="bg-[#FDF1C3] p-4 rounded-2xl border-2 border-[#D87E33]/20 mx-auto max-w-sm">
              <img
                src={qrUrl}
                alt="Mã VietQR"
                className="w-full mx-auto rounded-xl shadow-sm"
              />
              <div className="mt-4 text-sm text-[#40240C] bg-white py-2.5 px-3 rounded-xl text-center">
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

            {/* KHU VỰC TẢI ẢNH BILL */}
            <div className="border-2 border-dashed border-[#4B692E]/30 rounded-2xl p-4 bg-[#F8F9FA] relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2 pointer-events-none text-[#6A8152]">
                <UploadCloud
                  size={32}
                  className={fileName ? "text-[#D87E33]" : "text-[#4B692E]"}
                />
                <span className="font-bold text-sm text-[#40240C]">
                  {fileName
                    ? "Đã chọn ảnh: " + fileName
                    : "Bấm vào đây để tải ảnh Bill lên"}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmAndSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-[#4B692E] text-white font-black hover:bg-[#344E1D] transition flex items-center justify-center gap-2"
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

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (totalQuantity === 0) {
                alert("Bạn chưa chọn món nào!");
                return;
              }
              setStep(2);
            }}
            className="space-y-6"
          >
            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10">
              <div className="flex items-center gap-2 font-black text-xl mb-5 text-[#D87E33]">
                <ShoppingBag size={24} />{" "}
                <span className="uppercase">Chọn món</span>
              </div>

              <div className="flex justify-between items-center bg-[#FDF1C3] p-4 rounded-2xl border border-[#D87E33]/30 mb-4 border-l-4 border-l-[#D87E33]">
                <div>
                  <h3 className="font-bold text-[#4B692E]">Bánh mì miến</h3>
                  <p className="text-[#D87E33] font-black mt-1">25K</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4B692E]/20">
                  <button
                    type="button"
                    onClick={() =>
                      setCart((p) => ({ ...p, bmm: Math.max(0, p.bmm - 1) }))
                    }
                    className="w-7 h-7 bg-[#E6EFD9] text-[#4B692E] rounded font-bold"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold w-4 text-center">{cart.bmm}</span>
                  <button
                    type="button"
                    onClick={() => setCart((p) => ({ ...p, bmm: p.bmm + 1 }))}
                    className="w-7 h-7 bg-[#4B692E] text-white rounded font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center bg-[#FDF1C3] p-4 rounded-2xl border border-[#D87E33]/30 mb-4 border-l-4 border-l-[#D87E33]">
                <div>
                  <h3 className="font-bold text-[#4B692E]">Combo 30K</h3>
                  <p className="text-xs text-[#6A8152]">1 Bánh + 1 Teago</p>
                  <p className="text-[#D87E33] font-black mt-1">30K</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4B692E]/20">
                  <button
                    type="button"
                    onClick={() =>
                      setCart((p) => ({
                        ...p,
                        combo30k: Math.max(0, p.combo30k - 1),
                      }))
                    }
                    className="w-7 h-7 bg-[#E6EFD9] text-[#4B692E] rounded font-bold"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold w-4 text-center">
                    {cart.combo30k}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCart((p) => ({ ...p, combo30k: p.combo30k + 1 }))
                    }
                    className="w-7 h-7 bg-[#4B692E] text-white rounded font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center bg-[#FDF1C3] p-4 rounded-2xl border border-[#D87E33]/30 mb-4 border-l-4 border-l-[#D87E33]">
                <div>
                  <h3 className="font-bold text-[#4B692E]">Combo 40K</h3>
                  <p className="text-xs text-[#6A8152]">1 Bánh + 1 Sữa đậu</p>
                  <p className="text-[#D87E33] font-black mt-1">40K</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4B692E]/20">
                  <button
                    type="button"
                    onClick={() =>
                      setCart((p) => ({
                        ...p,
                        combo40k: Math.max(0, p.combo40k - 1),
                      }))
                    }
                    className="w-7 h-7 bg-[#E6EFD9] text-[#4B692E] rounded font-bold"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold w-4 text-center">
                    {cart.combo40k}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCart((p) => ({ ...p, combo40k: p.combo40k + 1 }))
                    }
                    className="w-7 h-7 bg-[#4B692E] text-white rounded font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-bold uppercase text-[#6A8152] mb-2">
                  Ghi chú (Có thể chọn nhiều)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Bỏ rau thơm", "Không cay"].map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() =>
                        setSelectedToppings((p) =>
                          p.includes(opt)
                            ? p.filter((t) => t !== opt)
                            : [...p, opt],
                        )
                      }
                      className={`py-3 px-4 rounded-xl text-sm font-bold border-2 ${selectedToppings.includes(opt) ? "bg-[#4B692E] text-white border-[#4B692E]" : "bg-white text-[#40240C] border-[#E6EFD9]"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-5">
              <div className="flex items-center gap-2 font-black text-xl text-[#D87E33] mb-2">
                <MapPin size={24} />{" "}
                <span className="uppercase">Giao nhận</span>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                  <Calendar size={16} /> Ngày đặt hàng *
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {weekDays.map((date) => (
                    <button
                      type="button"
                      key={date}
                      onClick={() =>
                        setFormData({ ...formData, orderDate: date })
                      }
                      className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 ${formData.orderDate === date ? "bg-[#D87E33] text-white border-[#D87E33]" : "bg-white border-[#E6EFD9] text-[#6A8152]"}`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Phương thức nhận hàng *
                </label>
                <select
                  name="deliveryMethod"
                  value={formData.deliveryMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#FDF1C3]/30 border-2 border-[#E6EFD9]"
                >
                  <option value="Tự đến lấy tại 161C Đại La">
                    🏠 Tự lấy tại 161C Đại La
                  </option>
                  <option value="Ship tận nơi ở cổng HUST (đường Trần Đại Nghĩa)">
                    📍 Cổng HUST
                  </option>
                  <option value="Ship tận nơi ở cổng NEU (đường Trần Đại Nghĩa)">
                    📍 Cổng NEU
                  </option>
                  <option value="Ship tận nơi ở cổng HUCE (đường Trần Đại Nghĩa)">
                    📍 Cổng HUCE
                  </option>
                  <option value="Đặt ship">🛵 Đặt ship ngoài</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold mb-2">
                  <Clock size={16} /> Thời gian nhận *
                </label>
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
                      className={`py-2 px-1 rounded-xl text-xs font-bold border-2 ${formData.deliveryTime === time ? "bg-[#D87E33] text-white border-[#D87E33]" : "bg-white border-[#E6EFD9]"}`}
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
                    className="mt-2.5 w-full px-4 py-3 rounded-xl border-2 border-[#E6EFD9]"
                  />
                )}
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4B692E]/10 space-y-4">
              <div className="font-black text-xl text-[#D87E33] uppercase">
                Thông tin liên hệ
              </div>
              <input
                type="text"
                name="name"
                required
                placeholder="Tên của bạn *"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#E6EFD9]"
              />
              <input
                type="tel"
                name="phone"
                required
                placeholder="Số điện thoại *"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#E6EFD9]"
              />
              <input
                type="text"
                name="socialLink"
                required
                placeholder="Link FB / IG *"
                value={formData.socialLink}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#E6EFD9]"
              />
            </div>

            <div className="bg-[#4B692E] p-5 rounded-3xl flex items-center justify-between sticky bottom-4">
              <div>
                <p className="text-xs text-[#D0E3B6] font-bold">
                  TỔNG ({totalQuantity})
                </p>
                <p className="text-2xl font-black text-[#FDF1C3]">
                  {totalAmount.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <button
                type="submit"
                className="bg-[#D87E33] text-white font-bold px-5 py-4 rounded-2xl flex items-center gap-2"
              >
                <QrCode size={20} /> Tạo mã
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
