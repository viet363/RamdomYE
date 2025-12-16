import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import Confetti from "react-confetti";

const PRIZES = [
  "Giải Cống hiến",
  "Giải Đặc biệt",
  "Giải Nhất",
  "Giải Nhì",
  "Giải Ba",
  "Giải Tư",
  "Giải Năm",
  "Giải Khuyến Khích",
];

const SHEET_MAP = {
  "Giải Cống hiến": "Cống hiến",

  "Giải Đặc biệt": "Giải đặc biệt - Giải nhất",
  "Giải Nhất": "Giải đặc biệt - Giải nhất",

  "Giải Nhì": "Giải ba - Giải nhì",
  "Giải Ba": "Giải ba - Giải nhì",

  "Giải Tư": "Giải khuyến khích - Giải Tư",
  "Giải Năm": "Giải khuyến khích - Giải Tư",
  "Giải Khuyến Khích": "Giải khuyến khích - Giải Tư",
};

const ALLOW_REPEAT_PRIZE = ["Giải Cống hiến"];

export default function App() {
  const [dataBySheet, setDataBySheet] = useState({});
  const [current, setCurrent] = useState(null);
  const [running, setRunning] = useState(false);
  const [prize, setPrize] = useState("Giải Nhất");
  const [winners, setWinners] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [openPrize, setOpenPrize] = useState(false);

  const timer = useRef(null);


  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "F11") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);


  const importExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });

      const sheetsData = {};

      wb.SheetNames.forEach((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        sheetsData[sheetName] = rows
          .map((row) => ({
            lucky: row["Mã số may mắn"],
            name: row["Họ tên"],
            department: row["Bộ phận/Phòng ban"],
          }))
          .filter((p) => p.lucky && p.name);
      });

      setDataBySheet(sheetsData);
    };

    reader.readAsArrayBuffer(file);
  };


  const startDraw = () => {
    if (running) return;

    const sheetName = SHEET_MAP[prize];
    const list = dataBySheet[sheetName] || [];

    if (list.length === 0) {
      alert("Sheet này đã hết người để quay!");
      return;
    }

    setRunning(true);
    setCurrent(null);

    let count = 0;
    let selected = null;

    timer.current = setInterval(() => {
      selected = list[Math.floor(Math.random() * list.length)];
      setCurrent(selected);
      count++;

      if (count > 30) {
        clearInterval(timer.current);
        setRunning(false);

        setWinners((prev) => ({
          ...prev,
          [prize]: prev[prize] ? [...prev[prize], selected] : [selected],
        }));

        if (!ALLOW_REPEAT_PRIZE.includes(prize)) {
          setDataBySheet((prev) => {
            const updated = {};
            Object.keys(prev).forEach((s) => {
              updated[s] = prev[s].filter(
                (p) => p.lucky !== selected.lucky
              );
            });
            return updated;
          });
        }

        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
      }
    }, 100);
  };


  const exportExcel = () => {
    const data = [];
    Object.keys(winners).forEach((p) => {
      winners[p].forEach((w) => {
        data.push({
          Giải: p,
          "Mã số may mắn": w.lucky,
          "Họ tên": w.name,
          "Phòng ban": w.department,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KetQua");
    XLSX.writeFile(wb, "KetQua_YearEnd.xlsx");
  };


  return (
    <div className="min-h-screen bg-cover bg-center bg-rose-500">
      <div className="min-h-screen bg-black/40 text-white relative">
        {showConfetti && (
          <Confetti width={window.innerWidth} height={window.innerHeight} />
        )}

        <div className="text-center p-6">
          <h1 className="text-7xl font-extrabold mt-20">
            🎉 Bốc thăm trúng thưởng 🎉
          </h1>

          <h1 className="text-purple-300 text-7xl font-extrabold mt-20">
            {prize}
          </h1>

          {!isFullscreen && (
            <input
              type="file"
              onChange={importExcel}
              className="mt-4 mx-auto block"
            />
          )}

          <div className="flex justify-center gap-4 mt-6">
            <div className="relative">
              <button
                onClick={() => setOpenPrize(!openPrize)}
                className="px-6 py-2 rounded-xl border border-white/40
                           bg-white/10 backdrop-blur-lg text-white
                           hover:bg-white/20 transition flex items-center gap-2"
              >
                 {prize}
                <span>▾</span>
              </button>

              {openPrize && (
                <ul
                  className="absolute z-50 mt-2 w-full rounded-xl
                             bg-white/10 backdrop-blur-xl
                             border border-white/30 overflow-hidden"
                >
                  {PRIZES.map((p) => (
                    <li
                      key={p}
                      onClick={() => {
                        setPrize(p);
                        setOpenPrize(false);
                      }}
                      className={`px-4 py-2 cursor-pointer
                        hover:bg-white/20 transition
                        ${p === prize ? "bg-white/20 font-semibold" : ""}`}
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!isFullscreen && (
              <button
                onClick={exportExcel}
                className="bg-yellow-400 text-black px-6 py-2 rounded-xl"
              >
                 Xuất báo cáo
              </button>
            )}
          </div>

          {current && (
            <div className="mt-12">
              <div className="text-[120px] text-yellow-300 font-extrabold">
                {current.lucky}
              </div>

              {!running && (
                <>
                  <div className="text-5xl mt-4">
                    🎉 {current.name}
                  </div>
                  <div className="text-2xl mt-2">
                    {current.department}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={startDraw}
            className="mt-20 px-20 py-8 bg-green-500 rounded-full text-4xl font-bold"
          >
            QUAY
          </button>
        </div>

        {Object.keys(winners).length > 0 && (
          <div className="fixed top-1/2 right-6 -translate-y-1/2 w-80 max-h-[80vh] overflow-y-auto bg-black/60 backdrop-blur-lg rounded-2xl p-5">
            <h3 className="text-2xl font-bold text-yellow-300 mb-4">
              🏆 Người trúng thưởng
            </h3>

            {Object.keys(winners).map((p) => (
              <div key={p} className="mb-4">
                <div className="font-semibold text-lg">{p}</div>
                <ul className="ml-4 mt-1 space-y-1">
                  {winners[p].map((w, i) => (
                    <li key={i}>
                      • {w.name} - {w.department}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
