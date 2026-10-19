"use client";
import React, { useState } from "react";
import {
  ShoppingBag,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  Minus,
  QrCode,
  ArrowLeft,
  UploadCloud,
} from "lucide-react";

// Tự động tính ngày Thứ 2 -> Thứ 6
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

  // State lưu trữ ảnh
  const [proofImage, setProofImage] = useState(null);
  const [fileName, setFileName] = useState("");

  // ================= CẤU HÌNH CỦA BẠN =================
  const GOOGLE_SCRIPT_URL = "DÁN_URL_GOOGLE_SCRIPT_CỦA_BẠN_VÀO_ĐÂY";
  const BANK_ID = "PVcomBank"; // VD: MB, TPB
  const ACCOUNT_NO = "0123456789";
  const ACCOUNT_NAME = "NGUYEN VAN A";
  // ====================================================

  const [formData, setFormData] = useState({
    name: "",
    socialLink: "",
    phone: "",
    orderDate: weekDays[0],
    deliveryMethod: "Tự đến lấy tại 161C Đại La",
    deliveryTime: "Sáng 8:30",
    customTime: "",
  });

  // Đã bỏ combo30k
  const [cart, setCart] = useState({ bmm: 1, combo40k: 0 });
  const [selectedToppings, setSelectedToppings] = useState([]);

  const PRICES = { bmm: 25000, combo40k: 40000 };
  const totalAmount = cart.bmm * PRICES.bmm + cart.combo40k * PRICES.combo40k;
  const totalQuantity = cart.bmm + cart.combo40k;

  const orderSummary = [
    cart.bmm > 0 ? `${cart.bmm} BMM (+Tặng Teago)` : "",
    cart.combo40k > 0 ? `${cart.combo40k} Combo 40K (+Tặng Teago)` : "",
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

  // Hàm nén ảnh tự động để không bị lỗi Google Drive
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          const base64String = compressedDataUrl.replace(
            "data:image/jpeg;base64,",
            "",
          );
          setProofImage({ base64: base64String, type: "image/jpeg" });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmAndSubmit = async () => {
    if (!proofImage) {
      alert("Bạn chưa tải ảnh chụp màn hình chuyển khoản lên kìa!");
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
      alert("Có lỗi kết nối, vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#d0e3b6] text-[#40240c] py-8 px-4 font-sans selection:bg-[#d87e33] selection:text-white">
      <div className="max-w-lg mx-auto">
        {/* HEADER */}
        <div className="text-center mb-8 bg-[#4b692e] py-7 px-4 rounded-[32px] shadow-lg border-4 border-[#fdf1c3] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#d87e33]"></div>
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

        {/* BƯỚC 3: THÀNH CÔNG */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-[#4b692e]/10 text-center space-y-5">
            <div className="w-16 h-16 bg-[#d0e3b6] text-[#4b692e] rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-[#4b692e] uppercase">
              Đã gửi đơn tới bếp!
            </h2>
            <p className="text-sm text-[#6a8152] font-medium px-4">
              Đơn hàng của bạn đã được ghi nhận cùng ảnh chuyển khoản. Cảm ơn
              bạn nhé!
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#e6efd9] text-[#4b692e] font-bold text-sm hover:bg-[#d0e3b6]"
            >
              Đặt thêm đơn mới
            </button>
          </div>
        )}

        {/* BƯỚC 2: THANH TOÁN VÀ UP ẢNH */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10 space-y-5 text-center">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm font-bold text-[#6a8152] bg-[#e6efd9] px-3 py-1.5 rounded-lg"
              >
                <ArrowLeft size={16} /> Sửa đơn
              </button>
              <span className="text-sm font-black text-[#d87e33] uppercase">
                Thanh toán
              </span>
            </div>

            <div className="bg-[#fdf1c3] p-4 rounded-2xl border-2 border-[#d87e33]/20 mx-auto max-w-sm">
              <img
                src={qrUrl}
                alt="Mã VietQR"
                className="w-full mx-auto rounded-xl shadow-sm"
              />
              <div className="mt-4 text-sm text-[#40240c] bg-white py-2.5 px-3 rounded-xl text-center">
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

            {/* UP ẢNH */}
            <div className="border-2 border-dashed border-[#4b692e]/30 rounded-2xl p-4 bg-[#f8f9fa] relative hover:bg-[#e6efd9] transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2 pointer-events-none text-[#6a8152]">
                <UploadCloud
                  size={32}
                  className={fileName ? "text-[#d87e33]" : "text-[#4b692e]"}
                />
                <span className="font-bold text-sm text-[#40240c] text-center px-2">
                  {fileName
                    ? "Đã chọn: " + fileName
                    : "Bấm vào đây để tải ảnh chụp chuyển khoản"}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmAndSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-[#4b692e] text-white font-black hover:bg-[#344e1d] transition flex items-center justify-center gap-2 shadow-md"
            >
              {isLoading ? (
                "Đang xử lý ảnh & gửi..."
              ) : (
                <>
                  <CheckCircle2 size={20} /> XÁC NHẬN ĐÃ CHUYỂN KHOẢN
                </>
              )}
            </button>
          </div>
        )}

        {/* BƯỚC 1: FORM */}
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
            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10">
              <div className="flex items-center gap-2 font-black text-xl mb-5 text-[#d87e33]">
                <ShoppingBag size={24} />{" "}
                <span className="uppercase">Chọn món</span>
              </div>

              {/* Bánh mì miến 25K tặng kèm 1 Teago */}
              <div className="flex justify-between items-center bg-[#fdf1c3] p-4 rounded-2xl border border-[#d87e33]/30 mb-4 border-l-4 border-l-[#d87e33]">
                <div>
                  <h3 className="font-bold text-[#4b692e]">Bánh mì miến</h3>
                  <p className="text-xs text-[#d87e33] font-bold mt-0.5">
                    🎁 Tặng kèm 1 Teago
                  </p>
                  <p className="text-[#d87e33] font-black mt-1">25K</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4b692e]/20">
                  <button
                    type="button"
                    onClick={() =>
                      setCart((p) => ({ ...p, bmm: Math.max(0, p.bmm - 1) }))
                    }
                    className="w-7 h-7 bg-[#e6efd9] text-[#4b692e] rounded font-bold"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold w-4 text-center">{cart.bmm}</span>
                  <button
                    type="button"
                    onClick={() => setCart((p) => ({ ...p, bmm: p.bmm + 1 }))}
                    className="w-7 h-7 bg-[#4b692e] text-white rounded font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Phân cách Combo Tiện Lợi */}
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

              {/* Combo 40K tặng kèm 1 Teago */}
              <div className="flex justify-between items-center bg-[#fdf1c3] p-4 rounded-2xl border border-[#d87e33]/30 mb-4 border-l-4 border-l-[#d87e33]">
                <div>
                  <h3 className="font-bold text-[#4b692e]">Combo 40K</h3>
                  <p className="text-xs text-[#6a8152]">1 Bánh + 1 Sữa đậu</p>
                  <p className="text-xs text-[#d87e33] font-bold mt-0.5">
                    🎁 Tặng kèm 1 Teago
                  </p>
                  <p className="text-[#d87e33] font-black mt-1">40K</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4b692e]/20">
                  <button
                    type="button"
                    onClick={() =>
                      setCart((p) => ({
                        ...p,
                        combo40k: Math.max(0, p.combo40k - 1),
                      }))
                    }
                    className="w-7 h-7 bg-[#e6efd9] text-[#4b692e] rounded font-bold"
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
                    className="w-7 h-7 bg-[#4b692e] text-white rounded font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-bold uppercase text-[#6a8152] mb-2">
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
                      className={`py-3 px-4 rounded-xl text-sm font-bold border-2 ${selectedToppings.includes(opt) ? "bg-[#4b692e] text-white border-[#4b692e]" : "bg-white text-[#40240c] border-[#e6efd9]"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10 space-y-5">
              <div className="flex items-center gap-2 font-black text-xl text-[#d87e33] mb-2">
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
                      className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 ${formData.orderDate === date ? "bg-[#d87e33] text-white border-[#d87e33]" : "bg-white border-[#e6efd9] text-[#6a8152]"}`}
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
                  className="w-full px-4 py-3 rounded-xl bg-[#fdf1c3]/30 border-2 border-[#e6efd9]"
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
                      className={`py-2 px-1 rounded-xl text-xs font-bold border-2 ${formData.deliveryTime === time ? "bg-[#d87e33] text-white border-[#d87e33]" : "bg-white border-[#e6efd9]"}`}
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
                    className="mt-2.5 w-full px-4 py-3 rounded-xl border-2 border-[#e6efd9]"
                  />
                )}
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10 space-y-4">
              <div className="font-black text-xl text-[#d87e33] uppercase">
                Thông tin liên hệ
              </div>
              <input
                type="text"
                name="name"
                required
                placeholder="Tên của bạn *"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e6efd9]"
              />
              <input
                type="tel"
                name="phone"
                required
                placeholder="Số điện thoại *"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e6efd9]"
              />
              <input
                type="text"
                name="socialLink"
                required
                placeholder="Link FB / IG *"
                value={formData.socialLink}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#e6efd9]"
              />
            </div>

            <div className="bg-[#4b692e] p-5 rounded-3xl flex items-center justify-between sticky bottom-4 shadow-xl border-2 border-[#d0e3b6] z-10">
              <div>
                <p className="text-xs text-[#d0e3b6] font-bold">
                  TỔNG ({totalQuantity})
                </p>
                <p className="text-2xl font-black text-[#fdf1c3]">
                  {totalAmount.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <button
                type="submit"
                className="bg-[#d87e33] text-white font-bold px-5 py-4 rounded-2xl flex items-center gap-2 shadow-md hover:bg-[#c26b29] transition"
              >
                <QrCode size={20} /> Thanh toán
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
