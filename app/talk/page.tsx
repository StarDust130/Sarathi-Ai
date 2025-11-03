"use client";

const Page = () => {
  return (
    <div className="page">
      <div className="card">
        <header className="top-bar">
          <button className="icon-button" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 5L8 12L15 19"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <span className="title">Voice Analysis</span>

          <button className="icon-button" aria-label="Open settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15A1.65 1.65 0 0 0 20 13.6 1.66 1.66 0 0 0 18.35 12 1.66 1.66 0 0 0 20 10.4 1.65 1.65 0 0 0 19.4 9"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.6 9A1.65 1.65 0 0 0 4 10.4 1.66 1.66 0 0 0 5.65 12 1.66 1.66 0 0 0 4 13.6 1.65 1.65 0 0 0 4.6 15"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <div className="body">
          <main className="content">
            <div className="blob-wrapper">
              <div className="blob" />
              <span className="status-text">Listening…</span>
            </div>
          </main>

          <section className="transcript">
            <h2 className="transcript-title">Latest transcript</h2>
            <p>
              Hello, I need to find an <strong>invoice</strong> for{" "}
              <strong>October 2024</strong>. There was also a{" "}
              <strong>calculation</strong> for the <strong>iScanner</strong>.
            </p>
          </section>
        </div>

        <footer className="controls">
          <div className="timer">00</div>
          <button className="mic-button" aria-label="Mute microphone">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 16C13.657 16 15 14.657 15 13V6C15 4.343 13.657 3 12 3C10.343 3 9 4.343 9 6V13C9 14.657 10.343 16 12 16Z"
                fill="#1A1A1A"
              />
              <path
                d="M6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 18V21"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M8 21H16"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background: radial-gradient(circle at 20% 20%, #ffe4c9, transparent),
            radial-gradient(circle at 80% 0%, #ffd4f0, transparent),
            linear-gradient(180deg, #faf5e7 0%, #f2c7b5 100%);
          font-family: "Poppins", "Inter", sans-serif;
        }

        .card {
          width: 100%;
          max-width: 1040px;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(22px);
          border-radius: 32px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          box-shadow: 0 28px 60px rgba(242, 146, 106, 0.22);
          color: #1a1a1a;
        }

        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .icon-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .icon-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
        }

        .title {
          font-weight: 600;
          font-size: 20px;
          color: #1a1a1a;
        }

        .body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .content {
          flex: 1;
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .blob-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          position: relative;
        }

        .blob {
          width: 220px;
          height: 220px;
          border-radius: 60% 40% 65% 35% / 55% 60% 40% 45%;
          background: radial-gradient(
              circle at 25% 25%,
              rgba(140, 234, 255, 0.85),
              rgba(85, 107, 255, 0.4)
            ),
            radial-gradient(
              circle at 75% 25%,
              rgba(255, 146, 221, 0.55),
              rgba(85, 223, 255, 0.35)
            );
          box-shadow: 0 24px 48px rgba(96, 128, 255, 0.32);
          animation: blobMorph 8s ease-in-out infinite,
            blobPulse 4.4s ease-in-out infinite;
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .blob::after {
          content: "";
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          filter: blur(12px);
        }

        .blob::before {
          content: "";
          position: absolute;
          inset: -40%;
          border-radius: 50%;
          background: conic-gradient(
            from 120deg,
            rgba(255, 255, 255, 0) 0deg,
            rgba(255, 255, 255, 0.42) 120deg,
            rgba(255, 255, 255, 0) 240deg
          );
          mix-blend-mode: screen;
          animation: blobAura 16s linear infinite;
        }

        @keyframes blobMorph {
          0% {
            border-radius: 60% 40% 65% 35% / 55% 60% 40% 45%;
            transform: scale(1);
          }
          50% {
            border-radius: 50% 62% 45% 55% / 60% 42% 65% 40%;
            transform: scale(1.07);
          }
          100% {
            border-radius: 65% 35% 60% 40% / 45% 55% 40% 60%;
            transform: scale(1);
          }
        }

        @keyframes blobPulse {
          0%,
          100% {
            filter: drop-shadow(0 18px 40px rgba(96, 128, 255, 0.35));
          }
          50% {
            filter: drop-shadow(0 28px 60px rgba(96, 128, 255, 0.5));
          }
        }

        @keyframes blobAura {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .status-text {
          font-size: 15px;
          color: #4a4a4a;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .transcript {
          margin: 0 auto;
          width: 100%;
          max-width: 520px;
          padding: 24px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 22px 48px rgba(255, 161, 115, 0.18);
          text-align: center;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .transcript:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 58px rgba(255, 161, 115, 0.22);
        }

        .transcript-title {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .transcript p {
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          color: #555555;
        }

        .transcript strong {
          color: #1a1a1a;
          font-weight: 600;
        }

        .controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 26px;
        }

        .timer {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: 4px solid #000;
          background: #ffffff;
          box-shadow: 4px 4px 0 #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
        }

        .mic-button {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid #000;
          background: linear-gradient(160deg, #fff 0%, #ffe6df 100%);
          box-shadow: 4px 4px 0 #000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .mic-button:hover {
          transform: translateY(-3px);
          box-shadow: 8px 10px 0 #000;
        }

        .mic-button svg {
          display: block;
        }

        @media (min-width: 768px) {
          .page {
            padding: 48px 36px;
          }

          .card {
            padding: 36px;
            gap: 32px;
            min-height: 640px;
          }

          .blob {
            width: 260px;
            height: 260px;
          }

          .status-text {
            font-size: 16px;
          }
        }

        @media (min-width: 1024px) {
          .page {
            padding: 64px;
          }

          .card {
            padding: 44px 48px;
            gap: 40px;
          }

          .body {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
            align-items: center;
            gap: 56px;
          }

          .content {
            min-height: 320px;
            justify-content: center;
          }

          .blob {
            width: 320px;
            height: 320px;
          }

          .transcript {
            max-width: none;
            text-align: left;
            padding: 32px;
            box-shadow: 0 28px 64px rgba(163, 106, 255, 0.16);
          }

          .transcript-title {
            font-size: 20px;
          }

          .transcript p {
            font-size: 18px;
          }

          .controls {
            justify-content: space-between;
          }

          .timer {
            width: 66px;
            height: 66px;
            font-size: 18px;
          }

          .mic-button {
            width: 92px;
            height: 92px;
          }
        }
      `}</style>
    </div>
  );
};

export default Page;