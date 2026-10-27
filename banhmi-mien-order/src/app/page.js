"use client";
import React, { useState, useEffect } from "react";
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
  const [proofImage, setProofImage] = useState(null);
  const [fileName, setFileName] = useState("");

  // ================= CẤU HÌNH CỦA BẠN =================
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxkBbQ0UE5mLENmQDixDVzctLdRVbkfh30ZWFafvSlQ_IdRONJqqaSLs9e6gCylhQKf/exec";
  const BANK_ID = "PVcomBank";
  const ACCOUNT_NO = "105004043276";
  const ACCOUNT_NAME = "PHẠM HÀ THANH";
  // ====================================================

  const [formData, setFormData] = useState({
    name: "",
    socialLink: "",
    phone: "",
    orderDate: weekDays[0],
    deliveryMethod: "Tự đến lấy tại 161C Đại La",
    deliveryTime: "Sáng 8:30",
    customTime: "",
    detailedNote: "", // Ghi chú chi tiết topping
    shippingAddress: "", // Địa chỉ ship
  });

  // STATE MENU MỚI THEO ẢNH
  const [cart, setCart] = useState({
    banh: 1,
    mien: 0,
    nuoc: 0,
    combo1: 0,
    combo2: 0,
    comboBanThan: 0,
  });

  const PRICES = {
    banh: 25000,
    mien: 39000,
    nuoc: 5000,
    combo1: 28000,
    combo2: 42000,
    comboBanThan: 67000,
  };

  const totalAmount =
    cart.banh * PRICES.banh +
    cart.mien * PRICES.mien +
    cart.nuoc * PRICES.nuoc +
    cart.combo1 * PRICES.combo1 +
    cart.combo2 * PRICES.combo2 +
    cart.comboBanThan * PRICES.comboBanThan;

  const totalQuantity =
    cart.banh +
    cart.mien +
    cart.nuoc +
    cart.combo1 +
    cart.combo2 +
    cart.comboBanThan;

  const orderSummary = [
    cart.banh > 0 ? `${cart.banh} Bánh` : "",
    cart.mien > 0 ? `${cart.mien} Miến` : "",
    cart.nuoc > 0 ? `${cart.nuoc} Nước` : "",
    cart.combo1 > 0 ? `${cart.combo1} Combo 1` : "",
    cart.combo2 > 0 ? `${cart.combo2} Combo 2` : "",
    cart.comboBanThan > 0 ? `${cart.comboBanThan} Combo Bạn Thân` : "",
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
    formData.deliveryMethod === "Tự đặt ship";
  const timeOptions = isFlexibleTime
    ? ["Sáng 8:30", "Trưa 12:15", "Khác"]
    : ["Sáng 8:30", "Trưa 12:15"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (
        name === "deliveryMethod" &&
        !(value === "Tự đến lấy tại 161C Đại La" || value === "Tự đặt ship") &&
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
          setProofImage({
            base64: compressedDataUrl.replace("data:image/jpeg;base64,", ""),
            type: "image/jpeg",
          });
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

    // Gộp địa chỉ vào cột Giao nhận để không làm hỏng file Sheets cũ
    const finalDelivery =
      formData.deliveryMethod === "Tự đặt ship"
        ? `Tự đặt ship - Đ/c: ${formData.shippingAddress}`
        : formData.deliveryMethod;

    const finalOrder = {
      ...formData,
      quantity: orderSummary,
      toppingNote: formData.detailedNote || "Đầy đủ", // Lưu ghi chú chi tiết
      finalDate: formData.orderDate,
      finalTime:
        formData.deliveryTime === "Khác"
          ? formData.customTime
          : formData.deliveryTime,
      totalPrice: totalAmount,
      deliveryMethod: finalDelivery,
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

  // Component hiển thị Món ăn cho gọn code
  const MenuItem = ({ id, name, desc, price }) => (
    <div className="flex justify-between items-center bg-[#fdf1c3] p-4 rounded-2xl border border-[#d87e33]/30 mb-3 border-l-4 border-l-[#d87e33]">
      <div>
        <h3 className="font-bold text-[#4b692e]">{name}</h3>
        {desc && <p className="text-xs text-[#6a8152] mt-0.5">{desc}</p>}
        <p className="text-[#d87e33] font-black mt-1">{price}K</p>
      </div>
      <div className="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-[#4b692e]/20">
        <button
          type="button"
          onClick={() =>
            setCart((p) => ({ ...p, [id]: Math.max(0, p[id] - 1) }))
          }
          className="w-7 h-7 bg-[#e6efd9] text-[#4b692e] rounded font-bold"
        >
          <Minus size={14} />
        </button>
        <span className="font-bold w-4 text-center">{cart[id]}</span>
        <button
          type="button"
          onClick={() => setCart((p) => ({ ...p, [id]: p[id] + 1 }))}
          className="w-7 h-7 bg-[#4b692e] text-white rounded font-bold"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#d0e3b6] text-[#40240c] py-8 px-4 font-sans selection:bg-[#d87e33] selection:text-white">
      <div className="max-w-lg mx-auto">
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

        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-[#4b692e]/10 text-center space-y-5">
            <div className="w-16 h-16 bg-[#d0e3b6] text-[#4b692e] rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-[#4b692e] uppercase">
              Đã gửi đơn tới bếp!
            </h2>
            <p className="text-sm text-[#6a8152] font-medium px-4">
              Cảm ơn bạn nhé!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#e6efd9] text-[#4b692e] font-bold hover:bg-[#d0e3b6]"
            >
              Đặt thêm đơn mới
            </button>
          </div>
        )}

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
                  {fileName ? fileName : "Bấm tải ảnh chụp chuyển khoản"}
                </span>
              </div>
            </div>
            <button
              onClick={handleConfirmAndSubmit}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-[#4b692e] text-white font-black hover:bg-[#344e1d] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                "Đang xử lý..."
              ) : (
                <>
                  <CheckCircle2 size={20} /> XÁC NHẬN CHUYỂN KHOẢN
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
                alert("Bạn chưa chọn món!");
                return;
              }
              setStep(2);
            }}
            className="space-y-6"
          >
            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10">
              <div className="flex items-center gap-2 font-black text-xl text-[#d87e33] mb-4">
                <Calendar size={24} />{" "}
                <span className="uppercase">Ngày đặt hàng</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {weekDays.map((date) => (
                  <button
                    type="button"
                    key={date}
                    onClick={() =>
                      setFormData({ ...formData, orderDate: date })
                    }
                    className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold border-2 transition ${
                      formData.orderDate === date
                        ? "bg-[#d87e33] text-white border-[#d87e33]"
                        : "bg-white border-[#e6efd9] text-[#6a8152] hover:border-[#d0e3b6]"
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10">
              <div className="flex items-center gap-2 font-black text-xl mb-5 text-[#d87e33]">
                <ShoppingBag size={24} />{" "}
                <span className="uppercase">Menu</span>
              </div>

              {/* NHÓM MÓN LẺ */}
              <div className="mb-2">
                <span className="bg-[#e6efd9] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#4b692e] rounded-lg">
                  Món lẻ
                </span>
              </div>
              <MenuItem id="banh" name="Bánh mì miến" price={25} />
              <MenuItem id="mien" name="Miến xào" price={39} />
              <MenuItem id="nuoc" name="Teago" price={5} />

              {/* NHÓM COMBO */}
              <div className="mt-6 mb-2">
                <span className="bg-[#e6efd9] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#4b692e] rounded-lg">
                  Combo Tiết Kiệm
                </span>
              </div>
              <MenuItem
                id="combo1"
                name="Combo PAPA"
                desc="Bánh mì miến + Teago"
                price={28}
              />
              <MenuItem
                id="combo2"
                name="Combo TUTU"
                desc="Miến xào + Teago"
                price={42}
              />
              <MenuItem
                id="comboBanThan"
                name="Combo PAPATUTU"
                desc="Bánh mì miến + Miến xào + 2 Teago"
                price={67}
              />

              {/* Ô GHI CHÚ TOPPING TỰ DO */}
              <div className="mt-5 border-t-2 border-dashed border-[#e6efd9] pt-4">
                <label className="block text-xs font-bold uppercase text-[#6a8152] mb-2">
                  Ghi chú chi tiết cho từng phần
                </label>
                <textarea
                  name="detailedNote"
                  rows="3"
                  placeholder="VD: Bánh 1 không cay, Bánh 2 bỏ rau thơm..."
                  value={formData.detailedNote}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#fdf1c3]/30 border-2 border-[#e6efd9] text-sm focus:outline-none focus:border-[#d87e33] font-medium placeholder:text-[#a3b19b]"
                ></textarea>
              </div>
            </div>

            <div className="bg-white/95 rounded-3xl p-6 shadow-lg border-2 border-[#4b692e]/10 space-y-5">
              <div className="flex items-center gap-2 font-black text-xl text-[#d87e33] mb-2">
                <MapPin size={24} />{" "}
                <span className="uppercase">Giao nhận</span>
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
                  <option value="Tự đặt ship">🛵 Tự đặt ship</option>
                </select>
              </div>

              {/* HIỆN Ô ĐỊA CHỈ NẾU CHỌN TỰ ĐẶT SHIP */}
              {formData.deliveryMethod === "Tự đặt ship" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-bold mb-2 text-[#d87e33]">
                    Địa chỉ nhận hàng chi tiết *
                  </label>
                  <input
                    type="text"
                    name="shippingAddress"
                    required
                    placeholder="Nhập địa chỉ nhà, tòa nhà..."
                    value={formData.shippingAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#d87e33]/50 focus:outline-none focus:border-[#d87e33]"
                  />
                </div>
              )}

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

            <div className="bg-[#4b692e] p-5 rounded-3xl flex items-center justify-between sticky bottom-4 shadow-xl z-10 border-2 border-[#d0e3b6]">
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
                className="bg-[#d87e33] text-white font-bold px-5 py-4 rounded-2xl flex items-center gap-2 hover:bg-[#c26b29] transition"
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
