import { useState, useRef, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { jsPDF } from "jspdf";
import "./index.css";

const EXAMPLE_QUERIES = [
  "LLM based bioagents",
  "CRISPR gene therapy",
  "quantum error correction",
  "transformer architecture NLP",
  "single cell RNA sequencing",
];

const CURRENT_YEAR = new Date().getFullYear();

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(15, 15, 20, 0.92)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "10px 16px",
        fontFamily: "'DM Sans', sans-serif",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color: "#f0f0f0", fontSize: 18, fontWeight: 700 }}>
        {payload[0].value.toLocaleString()}
        <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>
          works
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Export helpers                                                      */
/* ------------------------------------------------------------------ */

function getChartSvgElement(chartRef) {
  if (!chartRef.current) return null;
  return chartRef.current.querySelector(".recharts-wrapper svg");
}

function serializeSvg(svgEl) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#0f1019");
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

function exportSvg(chartRef, filename) {
  const svg = getChartSvgElement(chartRef);
  if (!svg) return;
  const blob = new Blob([serializeSvg(svg)], { type: "image/svg+xml" });
  downloadBlob(blob, filename);
}

function svgToCanvas(svgEl, scale = 2) {
  return new Promise((resolve) => {
    const svgData = serializeSvg(svgEl);
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

async function exportPng(chartRef, filename) {
  const svg = getChartSvgElement(chartRef);
  if (!svg) return;
  const canvas = await svgToCanvas(svg, 3);
  canvas.toBlob((blob) => downloadBlob(blob, filename), "image/png");
}

async function exportPdf(chartRef, filename, title) {
  const svg = getChartSvgElement(chartRef);
  if (!svg) return;
  const canvas = await svgToCanvas(svg, 3);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width, canvas.height + 80],
  });
  pdf.setFillColor(15, 16, 25);
  pdf.rect(0, 0, canvas.width, canvas.height + 80, "F");
  pdf.setTextColor(240, 240, 245);
  pdf.setFontSize(24);
  pdf.text(title, 30, 45);
  pdf.addImage(imgData, "PNG", 0, 65, canvas.width, canvas.height);
  pdf.save(filename);
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#e8e8ed",
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
};

const labelStyle = {
  fontSize: 11,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 1.2,
  marginBottom: 5,
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function App() {
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

  // Table pagination
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const PER_PAGE = 25;

  // Export
  const [exportOpen, setExportOpen] = useState(false);

  const inputRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = () => setExportOpen(false);
    document.addEventListener("click", handler, { once: true });
    return () => document.removeEventListener("click", handler);
  }, [exportOpen]);

  /* ---------- Fetch grouped chart data ---------- */

  async function fetchChartData(term) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(
      term
    )}&group_by=publication_year&per_page=200&mailto=demo@example.com`;
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

  const fetchWorks = useCallback(async (term, pageNum, sYear, exTerms) => {
    setLoadingWorks(true);
    try {
      const filters = [`from_publication_date:${sYear}-01-01`];
      const params = new URLSearchParams({
        search: term,
        filter: filters.join(","),
        sort: "cited_by_count:desc",
        per_page: PER_PAGE,
        page: pageNum,
        mailto: "demo@example.com",
      });
      const res = await fetch(
        `https://api.openalex.org/works?${params.toString()}`
      );
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

  /* ---------- Main search ---------- */

  async function search(q) {
    const term = q || query;
    if (!term.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setWorks([]);
    setPage(1);
    setSearchedQuery(term.trim());

    try {
      const allData = await fetchChartData(term.trim());
      const total = allData.reduce((s, d) => s + d.count, 0);
      setTotalWorks(total);
      setData(allData);
      await fetchWorks(term.trim(), 1, startYear, excludeTerms);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Pagination ---------- */

  function changePage(newPage) {
    setPage(newPage);
    fetchWorks(searchedQuery, newPage, startYear, excludeTerms);
  }

  /* ---------- Apply filters ---------- */

  function applyFilters() {
    if (!searchedQuery) return;
    setPage(1);
    fetchWorks(searchedQuery, 1, startYear, excludeTerms);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") search();
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
        background:
          "linear-gradient(165deg, #0a0a0f 0%, #0f1019 40%, #111320 100%)",
        color: "#e8e8ed",
        fontFamily: "'DM Sans', sans-serif",
        padding: "0 20px 60px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: 960, margin: "0 auto", paddingTop: 48 }}>
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
              background: "#6ee7b7",
              boxShadow: "0 0 12px #6ee7b7aa",
            }}
          />
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 3,
              color: "#6ee7b7",
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
            color: "#f0f0f5",
          }}
        >
          Research Trend Explorer
        </h1>
        <p
          style={{
            color: "#6b7280",
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
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
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
                color: "#e8e8ed",
                fontFamily: "'DM Sans', sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading || !query.trim()}
            style={{
              background: loading
                ? "#2a2a35"
                : "linear-gradient(135deg, #6ee7b7, #34d399)",
              color: loading ? "#666" : "#0a0a0f",
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
              color: "#4b5563",
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
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "5px 14px",
                color: "#9ca3af",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(110,231,183,0.1)";
                e.target.style.borderColor = "rgba(110,231,183,0.25)";
                e.target.style.color = "#6ee7b7";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(255,255,255,0.04)";
                e.target.style.borderColor = "rgba(255,255,255,0.06)";
                e.target.style.color = "#9ca3af";
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
                border: "3px solid rgba(110,231,183,0.15)",
                borderTopColor: "#6ee7b7",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ color: "#6b7280", fontSize: 14 }}>
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
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
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
              <button
                onClick={applyFilters}
                style={{
                  background: "rgba(110,231,183,0.12)",
                  color: "#6ee7b7",
                  border: "1px solid rgba(110,231,183,0.25)",
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
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7280",
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
                      color: "#f0f0f5",
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
                    color: "#f0f0f5",
                    margin: 0,
                  }}
                >
                  Publications per year
                </h2>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: 13,
                    margin: "4px 0 0",
                  }}
                >
                  Results for "
                  <span style={{ color: "#6ee7b7" }}>{searchedQuery}</span>"
                  {startYear > 1950 && <span> · from {startYear}</span>}
                </p>
              </div>

              {/* Export dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportOpen(!exportOpen);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "8px 16px",
                    color: "#9ca3af",
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
                  Export
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
                      background: "#1a1a24",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: 4,
                      zIndex: 50,
                      minWidth: 140,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    {[
                      {
                        label: "PNG",
                        fn: () =>
                          exportPng(chartRef, `${safeFilename}.png`),
                      },
                      {
                        label: "SVG",
                        fn: () =>
                          exportSvg(chartRef, `${safeFilename}.svg`),
                      },
                      {
                        label: "PDF",
                        fn: () =>
                          exportPdf(
                            chartRef,
                            `${safeFilename}.pdf`,
                            `Publications per year — "${searchedQuery}"`
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
                          color: "#d1d5db",
                          fontSize: 13,
                          cursor: "pointer",
                          borderRadius: 6,
                          fontFamily: "'DM Sans', sans-serif",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.background =
                            "rgba(110,231,183,0.1)")
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
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: "24px 12px 8px 0",
                marginBottom: 40,
              }}
            >
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart
                  data={filteredData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
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
                        stopColor="#6ee7b7"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="90%"
                        stopColor="#6ee7b7"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    dataKey="year"
                    stroke="#4b5563"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#4b5563"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatNumber}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6ee7b7"
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#6ee7b7",
                      stroke: "#0a0a0f",
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
                  alignItems: "baseline",
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontSize: 24,
                    fontWeight: 400,
                    color: "#f0f0f5",
                    margin: 0,
                  }}
                >
                  Top works
                </h2>
                {totalResults > 0 && (
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {formatNumber(totalResults)} results · page {page}/
                    {Math.max(1, totalPages)}
                  </span>
                )}
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
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
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 11,
                    color: "#6b7280",
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
                      color: "#6b7280",
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
                      color: "#4b5563",
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
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        fontSize: 13,
                        color: "#d1d5db",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(110,231,183,0.04)")
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
                          color: "#e8e8ed",
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
                          color: "#9ca3af",
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
                          <span style={{ color: "#6b7280" }}>
                            {" "}
                            +{w.extraAuthors}
                          </span>
                        )}
                      </span>
                      <span style={{ color: "#9ca3af" }}>{w.year}</span>
                      <span
                        style={{
                          textAlign: "right",
                          color: "#6ee7b7",
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
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "6px 16px",
                      color: page <= 1 ? "#374151" : "#d1d5db",
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
                      color: "#6b7280",
                    }}
                  >
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => changePage(page + 1)}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "6px 16px",
                      color: page >= totalPages ? "#374151" : "#d1d5db",
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
                color: "#4b5563",
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
              color: "#374151",
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
