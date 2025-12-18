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
  const [drawCount, setDrawCount] = useState(1);
  const [finalWinners, setFinalWinners] = useState([]);
  const [showWinnersPanel, setShowWinnersPanel] = useState(false);
  const [flippedCards, setFlippedCards] = useState([]);

  const timer = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "f") {
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
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
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

    if (list.length < drawCount) {
      alert("Không đủ số người để quay!");
      return;
    }

    setRunning(true);
    setCurrent(null);
    setFinalWinners([]);
    setFlippedCards([]);

    const shuffled = [...list].sort(() => 0.5 - Math.random());
    const selectedList = shuffled.slice(0, drawCount);

    let count = 0;

    timer.current = setInterval(() => {
      const temp = list[Math.floor(Math.random() * list.length)];
      setCurrent(temp);

      count++;
      if (count > 30) {
        clearInterval(timer.current);
        setRunning(false);

        setFinalWinners(selectedList);
        setCurrent(null);

        setWinners((prev) => ({
          ...prev,
          [prize]: prev[prize]
            ? [...prev[prize], ...selectedList]
            : selectedList,
        }));

        if (!ALLOW_REPEAT_PRIZE.includes(prize)) {
          setDataBySheet((prev) => {
            const updated = {};
            Object.keys(prev).forEach((s) => {
              updated[s] = prev[s].filter(
                (p) => !selectedList.some((w) => w.lucky === p.lucky)
              );
            });
            return updated;
          });
        }

        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }, 100);
  };

  const flipCard = (index) => {
    setFlippedCards(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-700 to-red-600">
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        html, body, #root {
          height: 100%;
          width: 100%;
          overflow: auto;
        }
        
        .scrollable-container {
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        
        .panel-scrollable {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .flip-card {
          perspective: 1000px;
          width: 100%;
          height: 200px;
          cursor: pointer;
        }

        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.8s;
          transform-style: preserve-3d;
        }

        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }

        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 1.5rem;
        }

        .flip-card-front {
          background: linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08));
          backdrop-filter: blur(12px);
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          font-size: 3rem;
          color: #fbbf24;
        }

        .flip-card-back {
          background: linear-gradient(145deg, rgba(255,215,0,0.2), rgba(255,140,0,0.15));
          backdrop-filter: blur(15px);
          border: 2px solid rgba(255,215,0,0.5);
          box-shadow: 0 10px 30px rgba(255,215,0,0.2);
          transform: rotateY(180deg);
          color: white;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        .animate-pulse-custom {
          animation: pulse 0.5s ease-in-out infinite;
        }
        
        @media (min-width: 1024px) {
          .flip-card {
            height: 220px;
          }
          
          .flip-card-front {
            font-size: 3.5rem;
          }
          
          .flip-card-back {
            padding: 2rem;
          }
        }
        
        @media (min-width: 1280px) {
          .flip-card {
            height: 240px;
          }
          
          .flip-card-front {
            font-size: 4rem;
          }
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .glass-effect-heavy {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .gradient-text {
          background: linear-gradient(90deg, #fbbf24, #f472b6, #fbbf24);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 3s linear infinite;
        }
        
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
      `}</style>

      <div className="scrollable-container no-scrollbar">
        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={300}
            gravity={0.15}
            colors={['#fbbf24', '#f472b6', '#60a5fa', '#34d399']}
          />
        )}

        {!running && !isFullscreen && (
          <div className="fixed bottom-6 left-6 z-50">
            <div className="glass-effect p-4 rounded-2xl shadow-2xl">
              <label className="text-sm font-medium block mb-2 text-white/90">Số lượng quay</label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setDrawCount(prev => Math.max(0, prev - 1))}
                  className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={drawCount}
                  onChange={(e) => setDrawCount(Math.max(0, Number(e.target.value)))}
                  className="w-20 text-center text-black px-3 py-2 rounded-lg font-semibold text-lg bg-white"
                />
                <button 
                  onClick={() => setDrawCount(prev => Math.min(30, prev + 1))}
                  className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="min-h-screen flex flex-col py-8">
          <div className="px-4 text-center mb-8">
            <h1 className="gradient-text font-black text-4xl md:text-5xl lg:text-6xl xl:text-7xl mb-2">
              🎉 BỐC THĂM TRÚNG THƯỞNG 🎉
            </h1>
            <p className="text-white/80 text-lg md:text-xl lg:text-2xl font-light">
              Chương trình tổng kết cuối năm
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start px-4">
            <div className="max-w-6xl w-full mx-auto">
              <div className="text-center mb-8 lg:mb-12">              
                <h2 className="gradient-text font-black text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-6 animate-pulse-custom">
                  {prize}
                </h2>
                
                <div className="flex justify-center mb-8">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setOpenPrize(!openPrize)}
                      className="glass-effect px-8 py-4 rounded-xl hover:bg-white/20 transition-all flex items-center gap-3 text-xl font-semibold group"
                    >
                      <span>🎯</span>
                      {prize}
                      <span className={`transition-transform ${openPrize ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {openPrize && (
                      <div className="absolute z-50 mt-2 w-80 rounded-2xl glass-effect-heavy shadow-2xl">
                        <ul className="max-h-96 panel-scrollable no-scrollbar py-2">
                          {PRIZES.map((p) => (
                            <li
                              key={p}
                              onClick={() => {
                                setPrize(p);
                                setOpenPrize(false);
                              }}
                              className={`px-6 py-4 cursor-pointer hover:bg-white/10 transition-all border-b border-white/10 last:border-b-0 text-lg ${
                                p === prize
                                  ? "bg-gradient-to-r from-yellow-500/20 to-pink-500/20 text-yellow-300 font-bold"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">🏆</span>
                                <span>{p}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {!isFullscreen && (
                  <div className="mb-8">
                    <label className="glass-effect px-8 py-4 rounded-xl cursor-pointer hover:bg-white/20 transition-all inline-flex items-center gap-3 text-lg font-semibold group">
                      <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                      Chọn file Excel
                      <input
                        type="file"
                        onChange={importExcel}
                        accept=".xlsx,.xls"
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {running && current && (
                  <div className="mt-12">
                    <div className="text-4xl font-bold mb-6 text-white/80 flex items-center justify-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      Đang quay...
                    </div>
                    <div className="space-y-6">
                      <div className="glass-effect p-8 rounded-2xl max-w-2xl mx-auto">
                        <div className="text-6xl md:text-7xl lg:text-8xl font-black text-yellow-300 mb-4 tracking-wider">
                          {current.lucky}
                        </div>
                        <div className="text-3xl md:text-4xl font-bold text-white">
                          {current.name}
                        </div>
                        {current.department && (
                          <div className="text-xl text-white/70 mt-3">
                            {current.department}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!running && finalWinners.length > 0 && (
                  <div className="mt-12 mb-8">
                    <div className="text-3xl font-bold mb-8 text-white/90 flex items-center justify-center gap-3">
                      <span>🎊</span>
                      KẾT QUẢ {prize.toUpperCase()}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                      {finalWinners.map((w, i) => (
                        <div 
                          key={i} 
                          className={`flip-card ${flippedCards.includes(i) ? 'flipped' : ''}`}
                          onClick={() => flipCard(i)}
                        >
                          <div className="flip-card-inner">
                            <div className="flip-card-front">
                              <div className="text-6xl mb-4 animate-bounce">🎁</div>
                              <div className="text-xl font-bold text-white/90">
                                {prize}
                              </div>
                            </div>
                            <div className="flip-card-back">
                              <div className="text-yellow-300 font-black text-3xl mb-3 tracking-wider">
                                {w.lucky}
                              </div>
                              <div className="text-white font-bold text-xl mb-2">
                                {w.name}
                              </div>
                              <div className="text-white/80 text-lg">
                                {w.department}
                              </div>
                              <div className="mt-4 text-sm text-white/60">
                                Chúc mừng!
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-12 lg:mt-16">
                  <button
                    onClick={startDraw}
                    disabled={running || Object.keys(dataBySheet).length === 0}
                    className={`
                      relative overflow-hidden px-16 py-6 rounded-full text-2xl lg:text-3xl font-bold 
                      transition-all shadow-2xl w-full max-w-md mx-auto
                      ${running || Object.keys(dataBySheet).length === 0
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 hover:scale-105 active:scale-95'
                      }
                    `}
                  >
                    {running ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        ĐANG QUAY...
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl">🎲</span>
                        BẮT ĐẦU QUAY
                        <span className="text-3xl">🎲</span>
                      </div>
                    )}
                    
                    {!running && Object.keys(dataBySheet).length > 0 && (
                      <div className="absolute inset-0 -translate-x-full animate-[shine_2s_ease-in-out_infinite]">
                        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      </div>
                    )}
                  </button>
                  
                  {!isFullscreen && Object.keys(winners).length > 0 && (
                    <div className="mt-6">
                      <button
                        onClick={exportExcel}
                        className="glass-effect px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center gap-3 mx-auto text-lg"
                      >
                        Xuất báo cáo Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!isFullscreen && (
            <div className="py-4 text-center text-white/60 text-sm mt-8">
              <p>Nhấn <kbd className="px-2 py-1 bg-white/20 rounded ml-1">F</kbd> để chế độ toàn màn hình</p>
            </div>
          )}
        </div>

        {Object.keys(winners).length > 0 && showWinnersPanel && (
          <div className="fixed top-1/2 -translate-y-1/2 right-6 z-40">
            <div className="glass-effect-heavy w-80 h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-yellow-300 flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    Kết Quả
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowWinnersPanel(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70"
                      title="Ẩn bảng kết quả"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="text-white/60 text-sm mt-2">
                  Tổng: {Object.values(winners).flat().length} người trúng thưởng
                </p>
              </div>

              <div className="flex-1 panel-scrollable no-scrollbar p-4">
                <div className="space-y-4">
                  {Object.keys(winners).map((p) => (
                    <div key={p} className="mb-4 last:mb-0">
                      <div className="sticky top-0 bg-gradient-to-r from-yellow-500/20 to-pink-500/20 backdrop-blur-sm px-4 py-3 rounded-lg mb-2 z-10">
                        <div className="font-bold text-white flex items-center justify-between">
                          <span>{p}</span>
                          <span className="text-yellow-300 text-sm">
                            {winners[p].length} người
                          </span>
                        </div>
                      </div>
                      <ul className="space-y-2 ml-2">
                        {winners[p].map((w, i) => (
                          <li
                            key={i}
                            className="glass-effect px-4 py-3 rounded-lg hover:bg-white/10 transition-all group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 flex items-center justify-center bg-yellow-500/20 rounded-lg group-hover:bg-yellow-500/30 transition-colors">
                                <span className="text-yellow-300 font-bold">{i + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-yellow-200 text-sm mb-1 truncate">
                                  {w.lucky}
                                </div>
                                <div className="text-white font-medium truncate">
                                  {w.name}
                                </div>
                                <div className="text-white/60 text-sm truncate">
                                  {w.department}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-white/10">
                <button
                  onClick={exportExcel}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  Xuất Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {Object.keys(winners).length > 0 && !showWinnersPanel && (
          <button
            onClick={() => setShowWinnersPanel(true)}
            className="fixed right-6 top-1/2 -translate-y-1/2 z-40 glass-effect p-4 rounded-l-2xl shadow-lg hover:bg-white/20 transition-all group"
          >
            <div className="rotate-90 whitespace-nowrap font-semibold text-yellow-300 group-hover:scale-110 transition-transform">
              🏆 Kết quả
            </div>
          </button>
        )}

        {Object.keys(winners).length > 0 && (
          <button
            onClick={() => setShowWinnersPanel(!showWinnersPanel)}
            className="fixed bottom-6 right-6 z-50 bg-yellow-500 text-black px-6 py-3 rounded-full font-bold shadow-lg lg:hidden flex items-center gap-2"
          >
            <span>🏆</span>
            {showWinnersPanel ? "Đóng" : "Kết quả"}
          </button>
        )}
      </div>
    </div>
  );
}