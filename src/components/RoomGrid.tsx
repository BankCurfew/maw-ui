import { memo, useMemo, useState, useEffect } from "react";
import { roomStyle } from "../lib/constants";
import { apiUrl } from "../lib/api";
import { AgentCard } from "./AgentCard";
import type { AgentState, Session } from "../lib/types";

interface RoomConfig {
  id: string; label: string; emoji: string; description: string;
  lead: string; members: string[]; accent: string; floor: string; wall: string;
}

function matchAgentToRoom(agent: AgentState, memberName: string): boolean {
  const a = agent.name.toLowerCase();
  const m = memberName.toLowerCase();
  return a === m || a === m.replace(/-oracle$/, "") || `${a}-oracle` === m;
}

interface RoomGridProps {
  sessions: Session[];
  agents: AgentState[];
  onSelectAgent: (agent: AgentState) => void;
}

export const RoomGrid = memo(function RoomGrid({ sessions, agents, onSelectAgent }: RoomGridProps) {
  const [roomsConfig, setRoomsConfig] = useState<RoomConfig[]>([]);
  useEffect(() => {
    fetch(apiUrl("/api/rooms")).then(r => r.json()).then(d => {
      if (d.rooms?.length > 0) setRoomsConfig(d.rooms);
    }).catch(() => {});
  }, []);

  // Group agents by room config, or fall back to tmux session grouping
  const layout = useMemo(() => {
    type LayoutItem = {
      key: string;
      agents: AgentState[];
      style: { accent: string; floor: string; wall: string; label: string; description?: string };
      source?: string;
    };

    if (roomsConfig.length > 0) {
      const assigned = new Set<string>();
      const rooms: LayoutItem[] = roomsConfig.map(room => {
        const roomAgents: AgentState[] = [];
        for (const memberName of room.members) {
          const agent = agents.find(a => matchAgentToRoom(a, memberName));
          if (agent) { roomAgents.push(agent); assigned.add(agent.target); }
        }
        return {
          key: room.id,
          agents: roomAgents,
          style: { accent: room.accent, floor: room.floor, wall: room.wall, label: room.label, description: room.description },
        };
      });
      // Unassigned agents go into an "Other" room
      const unassigned = agents.filter(a => !assigned.has(a.target));
      if (unassigned.length > 0) {
        rooms.push({
          key: "_unassigned",
          agents: unassigned,
          style: { accent: "#78909c", floor: "#1a1a1e", wall: "#121216", label: "Other" },
        });
      }
      return rooms;
    }

    // Fallback: group by tmux session (old behavior)
    const sessionAgents = new Map<string, AgentState[]>();
    for (const a of agents) {
      const arr = sessionAgents.get(a.session) || [];
      arr.push(a);
      sessionAgents.set(a.session, arr);
    }
    return sessions.map(s => ({
      key: s.name,
      agents: sessionAgents.get(s.name) || [],
      style: roomStyle(s.name),
      source: s.source,
    }));
  }, [agents, sessions, roomsConfig]);

  const busyCount = agents.filter(a => a.status === "busy").length;

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-12">
      {/* Power bar */}
      <div className="flex items-center gap-3 mb-5 px-1">
        <span className="text-[10px] text-white/50 tracking-widest uppercase">Power Level</span>
        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (busyCount / Math.max(1, agents.length)) * 100)}%`,
              background: busyCount > 5 ? "#ef5350" : busyCount > 2 ? "#ffa726" : "#4caf50",
            }}
          />
        </div>
        <span className="text-[10px] text-white/50 tabular-nums">{busyCount}/{agents.length}</span>
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {layout.filter(room => room.agents.length > 0).map((room) => {
          const hasBusy = room.agents.some(a => a.status === "busy");

          return (
            <div
              key={room.key}
              className="rounded-3xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: `${room.style.floor}88`,
                borderColor: hasBusy ? `${room.style.accent}40` : `${room.style.accent}12`,
                boxShadow: hasBusy
                  ? `0 8px 32px ${room.style.accent}15, 0 0 60px ${room.style.accent}08, inset 0 1px 0 rgba(255,255,255,0.05)`
                  : `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
            >
              {/* Room header */}
              <div
                className="flex items-center justify-between px-5 py-3 rounded-t-3xl border-b"
                style={{ background: `${room.style.wall}dd`, borderColor: `${room.style.accent}15` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold tracking-[2px] uppercase"
                    style={{ color: room.style.accent }}
                  >
                    {room.style.label}
                  </span>
                  {room.style.description && (
                    <span className="text-[9px] text-white/30 font-mono hidden sm:inline">
                      {room.style.description}
                    </span>
                  )}
                  {room.source ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc" }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: "#c084fc" }} />
                      {(() => { try { return new URL(room.source).hostname; } catch { return room.source; } })()}
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: "rgba(76,175,80,0.15)", color: "#66bb6a" }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: "#66bb6a" }} />
                      local
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ color: room.style.accent, background: `${room.style.accent}15` }}
                >
                  {room.agents.length}
                </span>
              </div>

              {/* Accent line */}
              <div className="h-[2px] opacity-50" style={{ background: room.style.accent }} />

              {/* Agent grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-5 min-h-[140px]">
                {room.agents.map((agent) => (
                  <AgentCard
                    key={agent.target}
                    agent={agent}
                    accent={room.style.accent}
                    onClick={() => onSelectAgent(agent)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
