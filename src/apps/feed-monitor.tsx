import { createRoot } from "react-dom/client";
import { useState, useCallback, useRef, useEffect } from "react";
import "../index.css";
import { useWebSocket } from "../hooks/useWebSocket";
import type { FeedEvent } from "../lib/feed";

const EVENT_COLORS: Record<string, string> = {
  PreToolUse: "#ffa726",
  PostToolUse: "#4caf50",
  PostToolUseFailure: "#ef4444",
  UserPromptSubmit: "#22d3ee",
  SubagentStart: "#a855f7",
  SubagentStop: "#c084fc",
  Stop: "#ef4444",
  SessionStart: "#22c55e",
  SessionEnd: "#666",
  Notification: "#fbbf24",
  TaskCompleted: "#4caf50",
};

const ORACLE_COLORS: Record<string, string> = {};
const PALETTE = ["#64b5f6", "#ffa726", "#ef5350", "#ab47bc", "#26c6da", "#66bb6a", "#ffa726", "#ec407a", "#7e57c2", "#42a5f5"];
let colorIdx = 0;
function oracleColor(name: string): string {
  if (!ORACLE_COLORS[name]) ORACLE_COLORS[name] = PALETTE[colorIdx++ % PALETTE.length];
  return ORACLE_COLORS[name];
}

function App() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(0);
  const rateWindow = useRef<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Rate calculation
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      rateWindow.current = rateWindow.current.filter(t => now - t < 10_000);
      setRate(Math.round(rateWindow.current.length / 10 * 10) / 10);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleMessage = useCallback((data: any) => {
    if (data.type === "feed") {
      const e = data.event as FeedEvent;
      rateWindow.current.push(Date.now());
      setTotal(n => n + 1);
      if (!pausedRef.current) {
        setEvents(prev => [...prev.slice(-999), e]);
      }
    } else if (data.type === "feed-history") {
      const hist = (data.events as FeedEvent[]) || [];
      setEvents(hist.slice(-200));
      setTotal(hist.length);
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

  // Auto-scroll
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, paused]);

  // Stats
  const oracleStats: Record<string, number> = {};
  const eventStats: Record<string, number> = {};
  const projectStats: Record<string, number> = {};
  for (const e of events) {
    oracleStats[e.oracle] = (oracleStats[e.oracle] || 0) + 1;
    eventStats[e.event] = (eventStats[e.event] || 0) + 1;
    const proj = e.project.split("/").pop() || e.project;
    projectStats[proj] = (projectStats[proj] || 0) + 1;
  }

  const filtered = filter
    ? events.filter(e => e.oracle.includes(filter) || e.event.includes(filter) || e.message.includes(filter) || e.project.includes(filter))
    : events;

  return (
    <div className="h-screen flex flex-col" style={{ background: "#020208", color: "#e0e0e0" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <h1 className="text-sm font-bold tracking-wider" style={{ color: "#22d3ee" }}>FEED MONITOR</h1>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${connected ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
        <span className="text-[10px] font-mono text-white/30">{total} total · {rate}/s · {events.length} buffered</span>

        <input
          type="text" value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="filter oracle/event/message..."
          className="ml-auto text-[11px] font-mono px-2 py-1 rounded outline-none w-[200px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-clear-button]:hidden"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", WebkitAppearance: "none" as const }}
        />
        <button
          onClick={() => setPaused(!paused)}
          className="text-[10px] font-mono px-2 py-1 rounded active:scale-95"
          style={{ background: paused ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: paused ? "#ef4444" : "#22c55e" }}
        >{paused ? "PAUSED" : "FLOWING"}</button>
        <button
          onClick={() => { setEvents([]); setTotal(0); }}
          className="text-[10px] font-mono px-2 py-1 rounded active:scale-95 text-white/30"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >CLEAR</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Feed stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[11px]">
          {filtered.map((e, i) => (
            <div key={i} className="flex gap-0 border-b hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
              <span className="text-white/15 px-2 py-1 w-[52px] flex-shrink-0 text-right">{e.timestamp.slice(11)}</span>
              <span className="px-2 py-1 w-[100px] flex-shrink-0 font-bold truncate" style={{ color: EVENT_COLORS[e.event] || "#666" }}>{e.event}</span>
              <span className="px-2 py-1 w-[120px] flex-shrink-0 font-bold truncate" style={{ color: oracleColor(e.oracle) }}>{e.oracle}</span>
              <span className="px-2 py-1 w-[150px] flex-shrink-0 text-white/20 truncate">{e.project.replace(/.*\//, "")}</span>
              <span className="px-2 py-1 text-white/50 truncate flex-1">{e.message}</span>
              <span className="px-2 py-1 w-[70px] flex-shrink-0 text-white/10 truncate text-right">{e.host}</span>
            </div>
          ))}
        </div>

        {/* Stats sidebar */}
        <div className="w-[220px] flex-shrink-0 border-l overflow-y-auto p-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="mb-4">
            <div className="text-[9px] font-mono text-white/20 uppercase tracking-wider mb-1">By Oracle</div>
            {Object.entries(oracleStats).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-white/[0.03] px-1 rounded" onClick={() => setFilter(name)}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: oracleColor(name) }} />
                <span className="text-[10px] text-white/60 truncate flex-1">{name}</span>
                <span className="text-[10px] text-white/25 font-mono">{count}</span>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <div className="text-[9px] font-mono text-white/20 uppercase tracking-wider mb-1">By Event</div>
            {Object.entries(eventStats).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-white/[0.03] px-1 rounded" onClick={() => setFilter(name)}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EVENT_COLORS[name] || "#666" }} />
                <span className="text-[10px] text-white/60 truncate flex-1">{name}</span>
                <span className="text-[10px] text-white/25 font-mono">{count}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[9px] font-mono text-white/20 uppercase tracking-wider mb-1">By Project</div>
            {Object.entries(projectStats).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-white/[0.03] px-1 rounded" onClick={() => setFilter(name)}>
                <span className="text-[10px] text-white/40 truncate flex-1">{name}</span>
                <span className="text-[10px] text-white/25 font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
