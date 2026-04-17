import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { wsUrl } from "../lib/api";
import type { AgentState } from "../lib/types";

interface XTerminalProps {
  target: string;
  onClose: () => void;
  onNavigate: (dir: -1 | 1) => void;
  siblings: AgentState[];
  onSelectSibling: (agent: AgentState) => void;
  readOnly?: boolean;
}

// Catppuccin Mocha palette (matches AC array in ansi.ts)
const THEME = {
  background: "#0a0a0f",
  foreground: "#cdd6f4",
  cursor: "#22d3ee",
  cursorAccent: "#0a0a0f",
  selectionBackground: "#585b7066",
  black: "#0a0a0f",
  red: "#f38ba8",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  blue: "#89b4fa",
  magenta: "#cba6f7",
  cyan: "#94e2d5",
  white: "#cdd6f4",
  brightBlack: "#585b70",
  brightRed: "#f38ba8",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#cba6f7",
  brightCyan: "#94e2d5",
  brightWhite: "#ffffff",
};

// Viewport-lock scroll (#27 v2): when user touch-scrolls up, lock viewport
// for 10s. On each write, xterm follows cursor (can't prevent) — but the
// write callback immediately snaps viewport back to the saved line via
// term.scrollToLine(). Lock clears early if user scrolls back to bottom.
const STICKY_THRESHOLD_LINES = 5;
const VIEWPORT_LOCK_MS = 10_000;

export function XTerminal({ target, onClose, onNavigate, siblings, onSelectSibling, readOnly = false }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep callbacks in refs so terminal effect doesn't re-run on every render
  const onCloseRef = useRef(onClose);
  const onNavigateRef = useRef(onNavigate);
  const siblingsRef = useRef(siblings);
  const onSelectSiblingRef = useRef(onSelectSibling);
  // Viewport lock state — survives across effect re-runs via ref.
  const lockedUntilRef = useRef(0);
  const savedViewportYRef = useRef(0);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { siblingsRef.current = siblings; }, [siblings]);
  useEffect(() => { onSelectSiblingRef.current = onSelectSibling; }, [onSelectSibling]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Responsive font size — 16px on mobile prevents iOS auto-zoom on focus
    const isMobile = window.innerWidth < 640;

    const term = new Terminal({
      theme: THEME,
      fontFamily: "Monaco, 'Cascadia Code', 'Fira Code', monospace",
      fontSize: isMobile ? 16 : 13,
      lineHeight: isMobile ? 1.2 : 1.35,
      cursorBlink: !readOnly,
      cursorStyle: readOnly ? "underline" : "bar",
      disableStdin: readOnly,
      scrollback: 10000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    // Clear viewport lock when user scrolls back to bottom.
    term.onScroll(() => {
      const buf = term.buffer.active;
      if ((buf.baseY - buf.viewportY) <= STICKY_THRESHOLD_LINES) {
        lockedUntilRef.current = 0;
      }
    });

    // Touch scroll-up detection: when user swipes up, lock viewport for 10s
    // and save the current viewportY so writes can snap back to it.
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 10) {
        // Finger moved down on screen = scrolling UP in terminal
        savedViewportYRef.current = term.buffer.active.viewportY;
        lockedUntilRef.current = Date.now() + VIEWPORT_LOCK_MS;
      }
    };
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });

    // Write wrapper: let xterm render + follow cursor, then snap viewport
    // back to saved position if lock is active. Uses absolute scrollToLine
    // instead of relative scrollLines — immune to cursor-positioning sequences.
    const writeWithStickyBottom = (data: Uint8Array | string) => {
      term.write(data, () => {
        if (Date.now() < lockedUntilRef.current) {
          term.scrollToLine(savedViewportYRef.current);
        }
      });
    };

    let ws: WebSocket | null = null;
    let dataSub: { dispose: () => void } | null = null;
    let binSub: { dispose: () => void } | null = null;
    let resizeTimer: ReturnType<typeof setTimeout>;
    let resizeObserver: ResizeObserver | null = null;

    // Defer open until container has dimensions (avoids "dimensions" crash on first render)
    const openTimer = setTimeout(() => {
      try {
        term.open(container);
        fit.fit();
        term.focus();
      } catch { return; }

      // Connect to PTY WebSocket
      ws = new WebSocket(wsUrl("/ws/pty"));
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        ws!.send(JSON.stringify({
          type: "attach",
          target,
          cols: term.cols,
          rows: term.rows,
        }));
      };

      ws.onmessage = (e) => {
        if (typeof e.data === "string") {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "attached") {
              // Fit terminal to container — server ignores resize for grouped sessions
              try { fit.fit(); } catch {}
            }
            if (msg.type === "detached") {
              writeWithStickyBottom("\r\n\x1b[33m[session detached]\x1b[0m\r\n");
            }
          } catch {}
        } else {
          // Binary PTY data → render in xterm.js
          writeWithStickyBottom(new Uint8Array(e.data));
        }
      };

      ws.onclose = () => {
        writeWithStickyBottom("\r\n\x1b[31m[connection closed]\x1b[0m\r\n");
      };

      if (!readOnly) {
        // Keystrokes → binary to PTY stdin
        const encoder = new TextEncoder();
        dataSub = term.onData((data) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(encoder.encode(data));
          }
        });

        binSub = term.onBinary((data) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            const bytes = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
            ws.send(bytes);
          }
        });
      }

      // Navigation shortcuts (work in both read-only and interactive)
      term.attachCustomKeyEventHandler((e) => {
        if (e.type !== "keydown") return true;
        if (readOnly) return false; // Block all keys in read-only
        if (e.altKey && e.key === "ArrowLeft") { onNavigateRef.current(-1); return false; }
        if (e.altKey && e.key === "ArrowRight") { onNavigateRef.current(1); return false; }
        if (e.altKey && e.key >= "1" && e.key <= "9") {
          const idx = parseInt(e.key) - 1;
          if (idx < siblingsRef.current.length) onSelectSiblingRef.current(siblingsRef.current[idx]);
          return false;
        }
        return true;
      });

      // Auto-resize with debounce
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          try {
            fit.fit();
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
            }
          } catch {}
        }, 200);
      });
      resizeObserver.observe(container);
    }, 50);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      clearTimeout(openTimer);
      clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      dataSub?.dispose();
      binSub?.dispose();
      ws?.close();
      term.dispose();
    };
  }, [target]);

  return <div ref={containerRef} className="w-full h-full" />;
}
