import { useState, useRef, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Label,
} from "recharts";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import "./index.css";

const EXAMPLE_QUERIES = [
  "LLM based bioagents",
  "CRISPR gene therapy",
  "quantum error correction",
  "transformer architecture NLP",
  "single cell RNA sequencing",
];

const CURRENT_YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/*  Themes                                                              */
/* ------------------------------------------------------------------ */

const darkTheme = {
  bgGradient: "linear-gradient(165deg, #0a0a0f 0%, #0f1019 40%, #111320 100%)",
  surface: "rgba(255,255,255,0.02)",
  surfaceMid: "rgba(255,255,255,0.025)",
  surfaceBorder: "rgba(255,255,255,0.05)",
  surfaceBorderAlt: "rgba(255,255,255,0.06)",
  surfaceBorderFaint: "rgba(255,255,255,0.03)",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.08)",
  dropdownBg: "#1a1a24",
  dropdownBorder: "rgba(255,255,255,0.1)",
  dropdownShadow: "0 12px 40px rgba(0,0,0,0.5)",
  text: "#e8e8ed",
  textStrong: "#f0f0f5",
  textMuted: "#9ca3af",
  textFaint: "#6b7280",
  textDim: "#4b5563",
  textDisabled: "#374151",
  accent: "#6ee7b7",
  accentDark: "#34d399",
  accentDimMed: "rgba(110,231,183,0.08)",
  accentDimHover: "rgba(110,231,183,0.1)",
  accentDimBorder: "rgba(110,231,183,0.25)",
  accentGlow: "#6ee7b7aa",
  btnBg: "linear-gradient(135deg, #6ee7b7, #34d399)",
  btnBgDisabled: "#2a2a35",
  btnColor: "#0a0a0f",
  btnColorDisabled: "#666",
  tooltipBg: "rgba(15, 15, 20, 0.92)",
  tooltipBorder: "rgba(255,255,255,0.08)",
  tooltipText: "#f0f0f0",
  tooltipLabel: "#9ca3af",
  rowHover: "rgba(110,231,183,0.04)",
  chartGrid: "rgba(255,255,255,0.04)",
  chartAxis: "#4b5563",
  chartAxisLine: "rgba(255,255,255,0.06)",
  chartGradStart: 0.35,
  chartGradEnd: 0.02,
  chartStroke: "#6ee7b7",
  chartDotBg: "#0a0a0f",
  exportBg: "#0f1019",
  exportBgRgb: [15, 16, 25],
  exportTextRgb: [240, 240, 245],
};

const lightTheme = {
  bgGradient: "linear-gradient(165deg, #fdf6ff 0%, #f0e8ff 45%, #e6f4f0 100%)",
  surface: "rgba(255,255,255,0.55)",
  surfaceMid: "rgba(255,255,255,0.6)",
  surfaceBorder: "rgba(120,80,180,0.12)",
  surfaceBorderAlt: "rgba(120,80,180,0.1)",
  surfaceBorderFaint: "rgba(120,80,180,0.07)",
  inputBg: "rgba(255,255,255,0.7)",
  inputBorder: "rgba(120,80,180,0.15)",
  dropdownBg: "#faf5ff",
  dropdownBorder: "rgba(120,80,180,0.15)",
  dropdownShadow: "0 12px 40px rgba(80,40,120,0.15)",
  text: "#1c1a2e",
  textStrong: "#1c1a2e",
  textMuted: "#6b5fa8",
  textFaint: "#8878c0",
  textDim: "#a89fc8",
  textDisabled: "#c8c0e0",
  accent: "#059669",
  accentDark: "#047857",
  accentDimMed: "rgba(5,150,105,0.1)",
  accentDimHover: "rgba(5,150,105,0.12)",
  accentDimBorder: "rgba(5,150,105,0.3)",
  accentGlow: "rgba(5,150,105,0.4)",
  btnBg: "linear-gradient(135deg, #059669, #047857)",
  btnBgDisabled: "#e8e0f0",
  btnColor: "#ffffff",
  btnColorDisabled: "#a89fc8",
  tooltipBg: "rgba(255,250,255,0.95)",
  tooltipBorder: "rgba(120,80,180,0.15)",
  tooltipText: "#1c1a2e",
  tooltipLabel: "#6b5fa8",
  rowHover: "rgba(5,150,105,0.04)",
  chartGrid: "rgba(0,0,0,0.05)",
  chartAxis: "#c8c0e0",
  chartAxisLine: "rgba(120,80,180,0.12)",
  chartGradStart: 0.3,
  chartGradEnd: 0.02,
  chartStroke: "#059669",
  chartDotBg: "#fdf6ff",
  exportBg: "#fdf6ff",
  exportBgRgb: [253, 246, 255],
  exportTextRgb: [28, 26, 46],
};

/* ------------------------------------------------------------------ */
/*  Utilities                                                           */
/* ------------------------------------------------------------------ */

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function CustomTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: 10,
        padding: "10px 16px",
        fontFamily: "'DM Sans', sans-serif",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ color: theme.tooltipLabel, fontSize: 12, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: theme.tooltipText, fontSize: 18, fontWeight: 700 }}>
        {payload[0].value.toLocaleString()}
        <span style={{ fontSize: 12, fontWeight: 400, color: theme.tooltipLabel, marginLeft: 4 }}>
          works
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart export helpers                                                */
/* ------------------------------------------------------------------ */

function getChartSvgElement(chartRef) {
  if (!chartRef.current) return null;
  return chartRef.current.querySelector(".recharts-wrapper svg");
}

function serializeSvg(svgEl, bgColor = "#0f1019") {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", bgColor);
  clone.insertBefore(bg, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function exportSvg(chartRef, filename, bgColor) {
  const svg = getChartSvgElement(chartRef);
  if (!svg) return;
  const blob = new Blob([serializeSvg(svg, bgColor)], { type: "image/svg+xml" });
  downloadBlob(blob, filename);
}

function svgToCanvas(svgEl, scale = 2, bgColor = "#0f1019") {
  return new Promise((resolve) => {
    const svgData = serializeSvg(svgEl, bgColor);
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgEl.clientWidth * scale;
      canvas.height = svgEl.clientHeight * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.src = url;
  });
}

async function exportPng(chartRef, filename, bgColor) {
  const svg = getChartSvgElement(chartRef);
  if (!svg) return;
  const canvas = await svgToCanvas(svg, 3, bgColor);
  canvas.toBlob((blob) => downloadBlob(blob, filename), "image/png");
}

async function exportPdf(chartRef, filename, title, bgRgb, textRgb) {
  const svg = getChartSvgElement(chartRef);
  if (!svg) return;
  const bgColor = `rgb(${bgRgb[0]},${bgRgb[1]},${bgRgb[2]})`;
  const canvas = await svgToCanvas(svg, 3, bgColor);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width, canvas.height + 80],
  });
  pdf.setFillColor(...bgRgb);
  pdf.rect(0, 0, canvas.width, canvas.height + 80, "F");
  pdf.setTextColor(...textRgb);
  pdf.setFontSize(20);
  pdf.text(title, 30, 45);
  pdf.addImage(imgData, "PNG", 0, 65, canvas.width, canvas.height);
  pdf.save(filename);
}

/* ------------------------------------------------------------------ */
/*  Table export helpers                                                */
/* ------------------------------------------------------------------ */

function exportTableCsv(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Title: r.title,
      Authors: r.authors,
      Year: r.year,
      Citations: r.cited,
      URL: r.url,
    }))
  );
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

function exportTableXlsx(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Title: r.title,
      Authors: r.authors,
      Year: r.year,
      Citations: r.cited,
      URL: r.url,
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Works");
  XLSX.writeFile(wb, filename);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [works, setWorks] = useState([]);
  const [totalWorks, setTotalWorks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [error, setError] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState("");

  // Filters
  const [startYear, setStartYear] = useState(1950);
  const [excludeTerms, setExcludeTerms] = useState("");
  const [searchMode, setSearchMode] = useState("broad"); // "broad" | "title"

  // Table pagination
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const PER_PAGE = 25;

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [tableExportOpen, setTableExportOpen] = useState(false);
  const [exportingTable, setExportingTable] = useState(false);

  const inputRef = useRef(null);
  const chartRef = useRef(null);

  const inputStyle = {
    background: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: theme.text,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
  };

  const labelStyle = {
    fontSize: 11,
    color: theme.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 5,
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = () => setExportOpen(false);
    document.addEventListener("click", handler, { once: true });
    return () => document.removeEventListener("click", handler);
  }, [exportOpen]);

  useEffect(() => {
    if (!tableExportOpen) return;
    const handler = () => setTableExportOpen(false);
    document.addEventListener("click", handler, { once: true });
    return () => document.removeEventListener("click", handler);
  }, [tableExportOpen]);

  /* ---------- Fetch grouped chart data ---------- */

  async function fetchChartData(term, mode) {
    let url;
    if (mode === "title") {
      url = `https://api.openalex.org/works?filter=title.search:${encodeURIComponent(term)}&group_by=publication_year&per_page=200&mailto=demo@example.com`;
    } else {
      url = `https://api.openalex.org/works?search=${encodeURIComponent(term)}&group_by=publication_year&per_page=200&mailto=demo@example.com`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const groups = json.group_by || [];
    return groups
      .map((g) => ({ year: parseInt(g.key), count: g.count }))
      .filter((d) => d.year >= 1950 && d.year <= CURRENT_YEAR)
      .sort((a, b) => a.year - b.year);
  }

  /* ---------- Fetch individual works ---------- */

  const fetchWorks = useCallback(async (term, pageNum, sYear, exTerms, mode) => {
    setLoadingWorks(true);
    try {
      const filters = [`from_publication_date:${sYear}-01-01`];
      if (mode === "title") {
        filters.push(`title.search:${term}`);
      }
      const params = new URLSearchParams({
        filter: filters.join(","),
        sort: "cited_by_count:desc",
        per_page: PER_PAGE,
        page: pageNum,
        mailto: "demo@example.com",
      });
      if (mode !== "title") {
        params.set("search", term);
      }
      const res = await fetch(`https://api.openalex.org/works?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setTotalResults(json.meta?.count || 0);

      const excl = (exTerms || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const items = (json.results || [])
        .map((w) => ({
          title: w.display_name || w.title || "Untitled",
          authors: (w.authorships || [])
            .slice(0, 3)
            .map((a) => a.author?.display_name || "Unknown")
            .join(", "),
          extraAuthors: Math.max(0, (w.authorships || []).length - 3),
          year: w.publication_year,
          url: w.doi || w.id || "",
          cited: w.cited_by_count || 0,
        }))
        .filter((w) => {
          if (excl.length === 0) return true;
          const title = w.title.toLowerCase();
          return !excl.some((ex) => title.includes(ex));
        });

      setWorks(items);
    } catch (e) {
      console.error("Failed to fetch works:", e);
    } finally {
      setLoadingWorks(false);
    }
  }, []);

  /* ---------- Fetch all works for table export ---------- */

  async function fetchAllWorksForExport(term, sYear, exTerms, mode) {
    const filters = [`from_publication_date:${sYear}-01-01`];
    if (mode === "title") {
      filters.push(`title.search:${term}`);
    }
    const params = new URLSearchParams({
      filter: filters.join(","),
      sort: "cited_by_count:desc",
      per_page: 200,
      page: 1,
      mailto: "demo@example.com",
    });
    if (mode !== "title") {
      params.set("search", term);
    }
    const res = await fetch(`https://api.openalex.org/works?${params.toString()}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();

    const excl = (exTerms || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    return (json.results || [])
      .map((w) => ({
        title: w.display_name || w.title || "Untitled",
        authors: (w.authorships || [])
          .map((a) => a.author?.display_name || "Unknown")
          .join(", "),
        year: w.publication_year,
        url: w.doi || w.id || "",
        cited: w.cited_by_count || 0,
      }))
      .filter((w) => {
        if (excl.length === 0) return true;
        return !excl.some((ex) => w.title.toLowerCase().includes(ex));
      });
  }

  /* ---------- Main search ---------- */

  async function search(q, mode) {
    const term = q || query;
    const activeMode = mode !== undefined ? mode : searchMode;
    if (!term.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setWorks([]);
    setPage(1);
    setSearchedQuery(term.trim());

    try {
      const allData = await fetchChartData(term.trim(), activeMode);
      const total = allData.reduce((s, d) => s + d.count, 0);
      setTotalWorks(total);
      setData(allData);
      await fetchWorks(term.trim(), 1, startYear, excludeTerms, activeMode);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Pagination ---------- */

  function changePage(newPage) {
    setPage(newPage);
    fetchWorks(searchedQuery, newPage, startYear, excludeTerms, searchMode);
  }

  /* ---------- Apply filters ---------- */

  function applyFilters() {
    if (!searchedQuery) return;
    setPage(1);
    fetchWorks(searchedQuery, 1, startYear, excludeTerms, searchMode);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") search();
  }

  /* ---------- Table export ---------- */

  async function handleTableExport(format) {
    setTableExportOpen(false);
    setExportingTable(true);
    try {
      const rows = await fetchAllWorksForExport(
        searchedQuery,
        startYear,
        excludeTerms,
        searchMode
      );
      if (format === "csv") {
        exportTableCsv(rows, `${safeFilename}.csv`);
      } else {
        exportTableXlsx(rows, `${safeFilename}.xlsx`);
      }
    } catch (e) {
      console.error("Table export failed:", e);
    } finally {
      setExportingTable(false);
    }
  }

  /* ---------- Derived stats ---------- */

  const filteredData = data ? data.filter((d) => d.year >= startYear) : null;

  const peak =
    filteredData && filteredData.length > 0
      ? filteredData.reduce((max, d) => (d.count > max.count ? d : max), filteredData[0])
      : null;

  const recent5 = filteredData
    ? filteredData
        .filter((d) => d.year >= CURRENT_YEAR - 5)
        .reduce((s, d) => s + d.count, 0)
    : 0;

  const filteredTotal = filteredData
    ? filteredData.reduce((s, d) => s + d.count, 0)
    : 0;

  const totalPages = Math.ceil(totalResults / PER_PAGE);
  const safeFilename = searchedQuery
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 40);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bgGradient,
        color: theme.text,
        fontFamily: "'DM Sans', sans-serif",
        padding: "0 20px 60px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: 960, margin: "0 auto", paddingTop: 48, position: "relative" }}>

        {/* Theme toggle */}
        <button
          onClick={() => setIsDark((d) => !d)}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            position: "absolute",
            top: 8,
            right: 0,
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 20,
            padding: "6px 14px",
            color: theme.textMuted,
            fontSize: 16,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1,
            transition: "all 0.2s",
          }}
        >
          {isDark ? "☀" : "☽"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: theme.accent,
              boxShadow: `0 0 12px ${theme.accentGlow}`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 3,
              color: theme.accent,
              fontWeight: 500,
            }}
          >
            Powered by OpenAlex
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 400,
            lineHeight: 1.1,
            margin: "8px 0 6px",
            color: theme.textStrong,
          }}
        >
          Research Trend Explorer
        </h1>
        <p
          style={{
            color: theme.textFaint,
            fontSize: 15,
            margin: "0 0 32px",
            maxWidth: 520,
          }}
        >
          Search any topic to see how scholarly output has evolved over time
          across 250M+ works.
        </p>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              flex: 1,
              background: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. LLM based bioagents"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "14px 18px",
                fontSize: 15,
                color: theme.text,
                fontFamily: "'DM Sans', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading || !query.trim()}
            style={{
              background: loading ? theme.btnBgDisabled : theme.btnBg,
              color: loading ? theme.btnColorDisabled : theme.btnColor,
              border: "none",
              borderRadius: 12,
              padding: "0 28px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Example chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: theme.textDim,
              alignSelf: "center",
              marginRight: 4,
            }}
          >
            Try:
          </span>
          {EXAMPLE_QUERIES.map((eq) => (
            <button
              key={eq}
              onClick={() => {
                setQuery(eq);
                search(eq);
              }}
              style={{
                background: theme.inputBg,
                border: `1px solid ${theme.surfaceBorderAlt}`,
                borderRadius: 20,
                padding: "5px 14px",
                color: theme.textMuted,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = theme.accentDimHover;
                e.target.style.borderColor = theme.accentDimBorder;
                e.target.style.color = theme.accent;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = theme.inputBg;
                e.target.style.borderColor = theme.surfaceBorderAlt;
                e.target.style.color = theme.textMuted;
              }}
            >
              {eq}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              padding: "12px 18px",
              color: "#fca5a5",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            Something went wrong: {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: `3px solid ${theme.accentDimMed}`,
                borderTopColor: theme.accent,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ color: theme.textFaint, fontSize: 14 }}>
              Querying OpenAlex…
            </p>
          </div>
        )}

        {/* ---- Results ---- */}
        {filteredData && !loading && (
          <div>
            {/* Filters row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-end",
                marginBottom: 28,
                padding: "16px 20px",
                background: theme.surface,
                border: `1px solid ${theme.surfaceBorderAlt}`,
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Start Year</label>
                <input
                  type="number"
                  min={1950}
                  max={CURRENT_YEAR}
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  style={{ ...inputStyle, width: 90 }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 180,
                }}
              >
                <label style={labelStyle}>
                  Exclude Terms (comma-separated)
                </label>
                <input
                  value={excludeTerms}
                  onChange={(e) => setExcludeTerms(e.target.value)}
                  placeholder="e.g. review, survey"
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>

              {/* Search precision toggle */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={labelStyle}>Search Precision</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { value: "broad", label: "Broad" },
                    { value: "title", label: "Title only" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (searchMode !== opt.value) {
                          setSearchMode(opt.value);
                          if (searchedQuery) search(searchedQuery, opt.value);
                        }
                      }}
                      style={{
                        background:
                          searchMode === opt.value
                            ? theme.accentDimMed
                            : theme.inputBg,
                        border: `1px solid ${
                          searchMode === opt.value
                            ? theme.accentDimBorder
                            : theme.inputBorder
                        }`,
                        borderRadius: 6,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: searchMode === opt.value ? 600 : 400,
                        color:
                          searchMode === opt.value
                            ? theme.accent
                            : theme.textMuted,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={applyFilters}
                style={{
                  background: theme.accentDimMed,
                  color: theme.accent,
                  border: `1px solid ${theme.accentDimBorder}`,
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                Apply Filters
              </button>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {[
                { label: "Total Works", value: formatNumber(filteredTotal) },
                { label: "Peak Year", value: peak ? `${peak.year}` : "—" },
                {
                  label: "Peak Output",
                  value: peak ? formatNumber(peak.count) : "—",
                },
                { label: "Last 5 Years", value: formatNumber(recent5) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: theme.surfaceMid,
                    border: `1px solid ${theme.surfaceBorderAlt}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textFaint,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      marginBottom: 4,
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: theme.textStrong,
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart header + export */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontSize: 24,
                    fontWeight: 400,
                    color: theme.textStrong,
                    margin: 0,
                  }}
                >
                  Publications per year
                </h2>
                <p
                  style={{
                    color: theme.textFaint,
                    fontSize: 13,
                    margin: "4px 0 0",
                  }}
                >
                  Results for "
                  <span style={{ color: theme.accent }}>{searchedQuery}</span>"
                  {startYear > 1950 && <span> · from {startYear}</span>}
                  {searchMode === "title" && (
                    <span style={{ color: theme.textMuted }}> · title only</span>
                  )}
                </p>
              </div>

              {/* Export chart dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportOpen(!exportOpen);
                  }}
                  style={{
                    background: theme.inputBg,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 8,
                    padding: "8px 16px",
                    color: theme.textMuted,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export chart
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {exportOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      background: theme.dropdownBg,
                      border: `1px solid ${theme.dropdownBorder}`,
                      borderRadius: 10,
                      padding: 4,
                      zIndex: 50,
                      minWidth: 160,
                      boxShadow: theme.dropdownShadow,
                    }}
                  >
                    {[
                      {
                        label: "PNG",
                        fn: () =>
                          exportPng(chartRef, `${safeFilename}.png`, theme.exportBg),
                      },
                      {
                        label: "SVG",
                        fn: () =>
                          exportSvg(chartRef, `${safeFilename}.svg`, theme.exportBg),
                      },
                      {
                        label: "PDF",
                        fn: () =>
                          exportPdf(
                            chartRef,
                            `${safeFilename}.pdf`,
                            `Publication trend · "${searchedQuery}" · ${startYear}–${CURRENT_YEAR}`,
                            theme.exportBgRgb,
                            theme.exportTextRgb
                          ),
                      },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => {
                          opt.fn();
                          setExportOpen(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          padding: "8px 14px",
                          color: theme.text,
                          fontSize: 13,
                          cursor: "pointer",
                          borderRadius: 6,
                          fontFamily: "'DM Sans', sans-serif",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.background = theme.accentDimHover)
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "transparent")
                        }
                      >
                        Export as {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div
              ref={chartRef}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.surfaceBorder}`,
                borderRadius: 16,
                padding: "24px 12px 20px 0",
                marginBottom: 40,
              }}
            >
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart
                  data={filteredData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient
                      id="areaGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={theme.chartStroke}
                        stopOpacity={theme.chartGradStart}
                      />
                      <stop
                        offset="90%"
                        stopColor={theme.chartStroke}
                        stopOpacity={theme.chartGradEnd}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.chartGrid}
                  />
                  <XAxis
                    dataKey="year"
                    stroke={theme.chartAxis}
                    tick={{ fill: theme.textFaint, fontSize: 11 }}
                    axisLine={{ stroke: theme.chartAxisLine }}
                    tickLine={false}
                  >
                    <Label
                      value="Year"
                      position="insideBottom"
                      offset={-8}
                      fill={theme.textFaint}
                      fontSize={11}
                      fontFamily="'DM Sans', sans-serif"
                    />
                  </XAxis>
                  <YAxis
                    stroke={theme.chartAxis}
                    tick={{ fill: theme.textFaint, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatNumber}
                    width={60}
                  >
                    <Label
                      value="# Publications"
                      angle={-90}
                      position="insideLeft"
                      offset={15}
                      fill={theme.textFaint}
                      fontSize={11}
                      fontFamily="'DM Sans', sans-serif"
                    />
                  </YAxis>
                  <Tooltip content={<CustomTooltip theme={theme} />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={theme.chartStroke}
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: theme.chartStroke,
                      stroke: theme.chartDotBg,
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ---- Works Table ---- */}
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontSize: 24,
                    fontWeight: 400,
                    color: theme.textStrong,
                    margin: 0,
                  }}
                >
                  Top works
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {totalResults > 0 && (
                    <span style={{ fontSize: 12, color: theme.textFaint }}>
                      {formatNumber(totalResults)} results · page {page}/
                      {Math.max(1, totalPages)}
                    </span>
                  )}

                  {/* Table export dropdown */}
                  {works.length > 0 && (
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableExportOpen(!tableExportOpen);
                        }}
                        disabled={exportingTable}
                        style={{
                          background: theme.inputBg,
                          border: `1px solid ${theme.inputBorder}`,
                          borderRadius: 8,
                          padding: "6px 12px",
                          color: exportingTable ? theme.textDim : theme.textMuted,
                          fontSize: 12,
                          cursor: exportingTable ? "wait" : "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {exportingTable ? "Exporting…" : "Export table"}
                        {!exportingTable && (
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        )}
                      </button>
                      {tableExportOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            right: 0,
                            background: theme.dropdownBg,
                            border: `1px solid ${theme.dropdownBorder}`,
                            borderRadius: 10,
                            padding: 4,
                            zIndex: 50,
                            minWidth: 170,
                            boxShadow: theme.dropdownShadow,
                          }}
                        >
                          {[
                            { label: "CSV", format: "csv" },
                            { label: "XLSX", format: "xlsx" },
                          ].map((opt) => (
                            <button
                              key={opt.format}
                              onClick={() => handleTableExport(opt.format)}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                background: "transparent",
                                border: "none",
                                padding: "8px 14px",
                                color: theme.text,
                                fontSize: 13,
                                cursor: "pointer",
                                borderRadius: 6,
                                fontFamily: "'DM Sans', sans-serif",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) =>
                                (e.target.style.background = theme.accentDimHover)
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.background = "transparent")
                              }
                            >
                              Export as {opt.label} (top 200)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  background: theme.surface,
                  border: `1px solid ${theme.surfaceBorder}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {/* Table header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 180px 60px 60px",
                    gap: 12,
                    padding: "12px 20px",
                    borderBottom: `1px solid ${theme.surfaceBorderAlt}`,
                    fontSize: 11,
                    color: theme.textFaint,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                  }}
                >
                  <span>Title</span>
                  <span>Authors</span>
                  <span>Year</span>
                  <span style={{ textAlign: "right" }}>Cited</span>
                </div>

                {loadingWorks && (
                  <div
                    style={{
                      padding: "32px 0",
                      textAlign: "center",
                      color: theme.textFaint,
                      fontSize: 13,
                    }}
                  >
                    Loading works…
                  </div>
                )}

                {!loadingWorks && works.length === 0 && (
                  <div
                    style={{
                      padding: "32px 0",
                      textAlign: "center",
                      color: theme.textDim,
                      fontSize: 13,
                    }}
                  >
                    No works found matching current filters.
                  </div>
                )}

                {!loadingWorks &&
                  works.map((w, i) => (
                    <a
                      key={i}
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 180px 60px 60px",
                        gap: 12,
                        padding: "12px 20px",
                        borderBottom: `1px solid ${theme.surfaceBorderFaint}`,
                        fontSize: 13,
                        color: theme.text,
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = theme.rowHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: theme.textStrong,
                        }}
                        title={w.title}
                      >
                        {w.title}
                      </span>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: theme.textMuted,
                          fontSize: 12,
                        }}
                        title={
                          w.authors +
                          (w.extraAuthors > 0
                            ? ` +${w.extraAuthors} more`
                            : "")
                        }
                      >
                        {w.authors}
                        {w.extraAuthors > 0 && (
                          <span style={{ color: theme.textFaint }}>
                            {" "}
                            +{w.extraAuthors}
                          </span>
                        )}
                      </span>
                      <span style={{ color: theme.textMuted }}>{w.year}</span>
                      <span
                        style={{
                          textAlign: "right",
                          color: theme.accent,
                          fontWeight: 500,
                        }}
                      >
                        {w.cited.toLocaleString()}
                      </span>
                    </a>
                  ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  <button
                    disabled={page <= 1}
                    onClick={() => changePage(page - 1)}
                    style={{
                      background: theme.inputBg,
                      border: `1px solid ${theme.inputBorder}`,
                      borderRadius: 8,
                      padding: "6px 16px",
                      color: page <= 1 ? theme.textDisabled : theme.text,
                      fontSize: 13,
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    ← Prev
                  </button>
                  <span
                    style={{
                      alignSelf: "center",
                      fontSize: 13,
                      color: theme.textFaint,
                    }}
                  >
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => changePage(page + 1)}
                    style={{
                      background: theme.inputBg,
                      border: `1px solid ${theme.inputBorder}`,
                      borderRadius: 8,
                      padding: "6px 16px",
                      color: page >= totalPages ? theme.textDisabled : theme.text,
                      fontSize: 13,
                      cursor:
                        page >= totalPages ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <p
              style={{
                color: theme.textDim,
                fontSize: 12,
                textAlign: "center",
                paddingBottom: 20,
              }}
            >
              Data from OpenAlex — an open catalog of 250M+ scholarly works.
              Sorted by citation count.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0 80px",
              color: theme.textDisabled,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>
              📊
            </div>
            <p style={{ fontSize: 14 }}>
              Enter a research topic above to explore publication trends
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
