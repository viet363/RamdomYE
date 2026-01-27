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
const PRIZE_IMAGES = {
  "Giải Cống hiến": ["/prizes/cong-hien.png",
    "/prizes/cong-hien-1.png",
    "/prizes/cong-hien-2.png",
    "/prizes/cong-hien-3.png",
    "/prizes/cong-hien-4.png",
    "/prizes/cong-hien-5.png",],
  "Giải Đặc biệt":
    ["/prizes/giai-dac-biet.png"],
  "Giải Nhất": ["/prizes/giai-1.png"],
  "Giải Nhì": ["/prizes/giai-2.png",
    "/prizes/giai-2-1.png",
    "/prizes/giai-2-2.png",
    "/prizes/giai-2-3.png",],
  "Giải Ba": ["/prizes/giai-3.png"],
  "Giải Tư": ["/prizes/giai-4.png"],
  "Giải Năm": ["/prizes/giai-5.png"],
  "Giải Khuyến Khích": ["/prizes/giai-khuyen-khich.png"],
};
const SHEET_MAP = {
  "Giải Cống hiến": "Giải cống hiến",
  "Giải Đặc biệt": "Giải Nhất - Giải Đặc Biệt",
  "Giải Nhất": "Giải Nhất - Giải Đặc Biệt",
  "Giải Nhì": "Giải Ba - Giải Nhì",
  "Giải Ba": "Giải Ba - Giải Nhì",
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
  const [currentWinners, setCurrentWinners] = useState([]);
  const [showWinnersPanel, setShowWinnersPanel] = useState(false);
  const [flippedCards, setFlippedCards] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [prevPrize, setPrevPrize] = useState(null);
  const [, setPrizeConfirmedIndex] = useState({});
  const [prizeImageIndex, setPrizeImageIndex] = useState({});
  const timer = useRef(null);

  useEffect(() => {
    if (prevPrize && prevPrize !== prize && currentWinners.length > 0) {
      setWinners((prev) => ({
        ...prev,
        [prevPrize]: prev[prevPrize]
          ? [...prev[prevPrize], ...currentWinners]
          : currentWinners,
      }));

      setPrizeConfirmedIndex(prev => ({
        ...prev,
        [prevPrize]: (prev[prevPrize] || 0) + currentWinners.length,
      }));

      setCurrentWinners([]);
      setFlippedCards([]);
    }
    setPrevPrize(prize);
  }, [prize, currentWinners, prevPrize]);

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

  const currentPrizeImage = (() => {
    const images = PRIZE_IMAGES[prize];
    if (!images || images.length === 0) return null;

    const index = prizeImageIndex[prize] || 0;
    return images[index % images.length];
  })();


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

  const removeWinner = (prizeName, indexToRemove) => {
    setWinners((prev) => {
      const updatedWinners = { ...prev };
      const winnerToRemove = updatedWinners[prizeName][indexToRemove];

      updatedWinners[prizeName] = updatedWinners[prizeName].filter(
        (_, index) => index !== indexToRemove
      );

      if (updatedWinners[prizeName].length === 0) {
        delete updatedWinners[prizeName];
      }

      if (ALLOW_REPEAT_PRIZE.includes(prizeName)) {
        const sheetName = SHEET_MAP[prizeName];
        setDataBySheet((prevData) => {
          const updatedData = { ...prevData };
          if (updatedData[sheetName]) {
            const exists = updatedData[sheetName].some(
              (person) => person.lucky === winnerToRemove.lucky
            );

            if (!exists) {
              updatedData[sheetName] = [...updatedData[sheetName], winnerToRemove];
            }
          }
          return updatedData;
        });
      }
      return updatedWinners;
    });

    setShowDeleteConfirm(null);
  };

  const removeCurrentWinner = (index) => {
    const winnerToRemove = currentWinners[index];

    setCurrentWinners((prev) => prev.filter((_, i) => i !== index));

    if (ALLOW_REPEAT_PRIZE.includes(prize)) {
      const sheetName = SHEET_MAP[prize];
      setDataBySheet((prevData) => {
        const updatedData = { ...prevData };
        if (updatedData[sheetName]) {
          const exists = updatedData[sheetName].some(
            (person) => person.lucky === winnerToRemove.lucky
          );

          if (!exists) {
            updatedData[sheetName] = [...updatedData[sheetName], winnerToRemove];
          }
        }
        return updatedData;
      });
    }
  };

  const startDraw = () => {
    if (running) return;

    const sheetName = SHEET_MAP[prize];
    const list = dataBySheet[sheetName] || [];
    setPrizeImageIndex(prev => ({
      ...prev,
      [prize]: (prev[prize] || 0) + 1,
    }));
    if (list.length < drawCount) {
      alert("Không đủ số người để quay!");
      return;
    }

    setRunning(true);
    setCurrent(null);

    const shuffled = [...list].sort(() => 0.5 - Math.random());
    const baseIndex = (winners[prize]?.length || 0) + currentWinners.length;
    const selectedList = shuffled.slice(0, drawCount).map((p, i) => ({
      ...p,
      prizeTitle: `${prize} ${baseIndex + i + 1}`,
    }));

    let count = 0;

    timer.current = setInterval(() => {
      const temp = list[Math.floor(Math.random() * list.length)];
      setCurrent(temp);

      count++;
      if (count > 30) {
        clearInterval(timer.current);
        setRunning(false);

        const sheetName = SHEET_MAP[prize];
        const list = dataBySheet[sheetName] || [];

        if (list.length < drawCount) {
          alert("Không đủ số người để quay!");
          return;
        }
        setCurrentWinners((prev) => {
          return [...prev, ...selectedList];
        });

        setCurrent(null);

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
    const allWinners = { ...winners };

    if (currentWinners.length > 0) {
      allWinners[prize] = allWinners[prize]
        ? [...allWinners[prize], ...currentWinners]
        : currentWinners;
    }

    const data = [];
    Object.keys(allWinners).forEach((p) => {
      allWinners[p].forEach((w) => {
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
    <div
      className="min-h-screen relative w-full"
      style={{
        backgroundImage: "url('/BG2.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br"></div>
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
          width: 280px;
          height: 180px;
          cursor: pointer;
          transition: all 0.3s ease;
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
          padding: 1rem;
        }

        .flip-card-front {
          background: linear-gradient(145deg, rgba(255,255,255,0.25), rgba(255,255,255,0.15));
          backdrop-filter: blur(15px);
          border: 2px solid rgba(255,255,255,0.35);
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          font-size: 2.5rem;
          color: #fbbf24;
        }

        .flip-card-back {
          background: linear-gradient(145deg, rgba(255,215,0,0.3), rgba(255,140,0,0.25));
          backdrop-filter: blur(15px);
          border: 2px solid rgba(255,215,0,0.6);
          box-shadow: 0 10px 30px rgba(255,215,0,0.3);
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
            height: 200px;
            width: 300px;
            border-radius: 15px;
          }
          
          .flip-card-front {
            font-size: 3rem;
          }
          
          .flip-card-back {
            padding: 1.5rem;
          }
        }
        
        @media (min-width: 1280px) {
          .flip-card {
            height: 220px;
            width: 320px;
          }
          
          .flip-card-front {
            font-size: 3.5rem;
          }
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .glass-effect-heavy {
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        
        .gradient-text {
          background: linear-gradient(90deg, #FF00FF, #FF0000, #FF00FF);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 3s linear infinite;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
        
        .winner-container {
          min-height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .slide-in {
          animation: slideIn 0.5s ease-out forwards;
        }
        
        /* Grid layout cho 2 hàng */
        .winner-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        /* Hiển thị theo 2 hàng */
        @media (min-width: 768px) {
          .winner-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        /* Hiển thị theo 3 hoặc 4 cột trên màn hình lớn */
        @media (min-width: 1024px) {
          .winner-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (min-width: 1400px) {
          .winner-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        /* Highlight cho card mới nhất */
        .newest-card {
          animation: glow 2s ease-in-out infinite;
          border: 3px solid #fbbf24;
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(251, 191, 36, 0.6);
          }
        }
      `}</style>

      <div className="scrollable-container no-scrollbar relative z-10">
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

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
            <div className="glass-effect-heavy max-w-md w-full rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-white mb-4">Xác nhận xóa</h3>
              <p className="text-white/80 mb-2">
                Bạn có chắc muốn xóa người trúng thưởng này?
              </p>
              <div className="glass-effect p-4 rounded-lg mb-4">
                <div className="text-yellow-300 font-bold text-lg">
                  {winners[showDeleteConfirm.prize][showDeleteConfirm.index].name}
                </div>
                <div className="text-white/70">
                  Mã số: {winners[showDeleteConfirm.prize][showDeleteConfirm.index].lucky}
                </div>
                <div className="text-white/60 text-sm">
                  {winners[showDeleteConfirm.prize][showDeleteConfirm.index].department}
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 glass-effect px-4 py-3 rounded-lg hover:bg-white/20 transition-colors text-white font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={() => removeWinner(showDeleteConfirm.prize, showDeleteConfirm.index)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-all"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {!running && !isFullscreen && (
          <div className="fixed bottom-6 left-6 z-50">
            <div className="glass-effect p-4 rounded-2xl shadow-2xl">
              <label className="text-sm font-medium block mb-2 text-white/90 ">Số lượng quay</label>
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

        <div className="min-h-screen flex flex-col py-4">
          <div className="px-4 text-center ">
            <h1 className="font-black text-4xl md:text-5xl lg:text-6xl xl:text-7xl mt-8 drop-shadow-lg text-amber-400">
              BỐC THĂM TRÚNG THƯỞNG
            </h1>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start px-4">
            <div className="max-w-10xl w-full mx-auto h-auto">
              <div className="text-center  ">
                <h2 className="gradient-text h-20 text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl animate-pulse-custom drop-shadow-lg">
                  {prize}
                </h2>
                {currentPrizeImage && (
                  <div className="flex justify-center ">
                    <img
                      src={currentPrizeImage}
                      alt={prize}
                      className="h-48 md:h-56 lg:h-64 rounded-2xl shadow-2xl border-4 border-yellow-400/60 transition-all duration-700" />
                  </div>
                )}
                <div className="flex justify-center ">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setOpenPrize(!openPrize)}
                      className="glass-effect px-8 py-2 mt-4 rounded-xl text-white hover:bg-white/30 transition-all flex items-center  text-xl font-semibold group shadow-lg">
                      {prize}
                      <span className={`transition-transform ${openPrize ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {openPrize && (
                      <div className="absolute z-50 w-80 rounded-2xl glass-effect-heavy shadow-2xl">
                        <ul className="max-h-96 panel-scrollable no-scrollbar py-2">
                          {PRIZES.map((p) => (
                            <li
                              key={p}
                              onClick={() => {
                                setPrize(p);
                                setOpenPrize(false);
                              }}
                              className={`px-6 py-4 cursor-pointer hover:bg-white/10 transition-all border-b border-white/10 last:border-b-0 text-lg ${p === prize
                                ? "bg-gradient-to-r from-yellow-500/30 to-pink-500/30 text-yellow-300 font-bold"
                                : "text-white"
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
                  <div className=" mt-8">
                    <label className="glass-effect px-8 py-4 rounded-xl cursor-pointer hover:bg-white/30 transition-all inline-flex items-center gap-3 text-lg font-semibold group shadow-lg">
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
                  <div className="">
                    <div className="text-4xl font-bold mb-6 text-white/90 flex items-center justify-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      Đang quay...
                    </div>
                    <div className="space-y-6">
                      <div className="glass-effect p-8 rounded-2xl max-w-2xl mx-auto border-2 border-yellow-400/50 shadow-2xl">
                        <div className="text-6xl md:text-7xl lg:text-8xl font-black text-yellow-300 mb-4 tracking-wider drop-shadow-lg">
                          {current.lucky}
                        </div>
                        <div className="text-3xl md:text-4xl font-bold text-white drop-shadow">
                          {current.name}
                        </div>
                        {current.department && (
                          <div className="text-xl text-white/80  drop-shadow">
                            {current.department}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {!running && currentWinners.length > 0 && (
                  <div className=" mb-8 mr-80">
                    <div className="winner-container mb-8 ">
                      <div className="winner-grid">
                        {[...currentWinners].reverse().map((winner, reverseIndex) => {
                          const originalIndex = currentWinners.length - 1 - reverseIndex;
                          const isNewest = reverseIndex === 0;

                          return (
                            <div
                              key={originalIndex}
                              className={`flip-card ${flippedCards.includes(originalIndex) ? 'flipped' : ''} ${isNewest ? 'newest-card slide-in' : ''}`}
                              onClick={() => flipCard(originalIndex)}
                            >
                              <div className="flip-card-inner">
                                <div className="flip-card-front">
                                  <div className="text-4xl mb-3">🎁</div>
                                  <div className="text-3xl font-bold text-white/90">
                                    {winner.prizeTitle}
                                  </div>
                                </div>
                                <div className="flip-card-back relative ">
                                  <div className="text-yellow-300 font-black text-xl mb-2 tracking-wider ">
                                    {winner.lucky}
                                  </div>
                                  <div className="text-white font-bold text-md mb-1">
                                    {winner.name}
                                  </div>
                                  <div className="text-white/80 text-sm">
                                    {winner.department}
                                  </div>
                                  <div className="mt-2 text-xs text-white/60">
                                    Chúc mừng!
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeCurrentWinner(originalIndex);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-50"
                                    title="Xóa người không có mặt"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-12 lg:mt-16">
                  <button
                    onClick={startDraw}
                    disabled={running || Object.keys(dataBySheet).length === 0}
                    className={`
                      relative overflow-hidden px-16 py-6 rounded-full text-2xl lg:text-3xl font-bold 
                      transition-all shadow-2xl w-full max-w-md mx-auto border-2 border-yellow-400/50
                      ${running || Object.keys(dataBySheet).length === 0
                        ? 'bg-gray-600/80 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-700 hover:via-emerald-700 hover:to-green-800 hover:scale-105 active:scale-95'
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
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl">🎲</span>
                        BẮT ĐẦU QUAY
                        <span className="text-3xl">🎲</span>
                      </div>
                    )}

                    {!running && Object.keys(dataBySheet).length > 0 && (
                      <div className="absolute inset-0 -translate-x-full animate-[shine_2s_ease-in-out_infinite]">
                        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                      </div>
                    )}
                  </button>

                  {!isFullscreen && (Object.keys(winners).length > 0 || currentWinners.length > 0) && (
                    <div className="mt-6">
                      <button
                        onClick={exportExcel}
                        className="glass-effect px-8 py-4 rounded-xl font-semibold hover:bg-white/30 transition-all flex items-center gap-3 mx-auto text-lg shadow-lg"
                      >
                        Xuất báo cáo Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {Object.keys(winners).length > 0 && showWinnersPanel && (
          <div className="fixed top-1/2 -translate-y-1/2 right-6 z-40">
            <div className="glass-effect-heavy w-80 h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
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
                <p className="text-white/60 text-sm">
                  Tổng: {Object.values(winners).flat().length} người trúng thưởng
                </p>
              </div>

              <div className="flex-1 panel-scrollable no-scrollbar p-4">
                <div className="space-y-4">
                  {Object.keys(winners).map((p) => (
                    <div key={p} className="mb-4 last:mb-0">
                      <div className="sticky top-0 bg-gradient-to-r from-yellow-500/30 to-pink-500/30 backdrop-blur-sm px-4 py-3 rounded-lg mb-2 z-10 border border-white/10">
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
                            className="glass-effect px-4 py-3 rounded-lg hover:bg-white/10 transition-all group relative border border-white/10"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 flex items-center justify-center bg-yellow-500/30 rounded-lg group-hover:bg-yellow-500/40 transition-colors">
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm({ prize: p, index: i });
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/30 text-red-300 hover:text-red-200"
                                title="Xóa người trúng thưởng"
                              >
                                ×
                              </button>
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
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span></span>
                  Xuất Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {Object.keys(winners).length > 0 && !showWinnersPanel && (
          <button
            onClick={() => setShowWinnersPanel(true)}
            className="fixed right-6 top-1/2 -translate-y-1/2 z-40 glass-effect p-4 rounded-l-2xl shadow-lg hover:bg-white/30 transition-all group border border-white/20"
          >
            <div className="rotate-90 whitespace-nowrap font-semibold text-yellow-300 group-hover:scale-110 transition-transform">
              🏆 Kết quả
            </div>
          </button>
        )}

        {Object.keys(winners).length > 0 && (
          <button
            onClick={() => setShowWinnersPanel(!showWinnersPanel)}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-6 py-3 rounded-full font-bold shadow-lg lg:hidden flex items-center gap-2 border border-yellow-400/50"
          >
            <span>🏆</span>
            {showWinnersPanel ? "Đóng" : "Kết quả"}
          </button>
        )}
      </div>
    </div>
  );
}