import { useState, useRef, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./index.css";

const EXAMPLE_QUERIES = [
  "LLM based bioagents",
  "CRISPR gene therapy",
  "quantum error correction",
  "transformer architecture NLP",
  "single cell RNA sequencing",
];

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
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: "#9ca3af",
            marginLeft: 4,
          }}
        >
          works
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [totalWorks, setTotalWorks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function search(q) {
    const term = q || query;
    if (!term.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSearchedQuery(term.trim());

    try {
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(
        term.trim()
      )}&group_by=publication_year&per_page=200&mailto=demo@example.com`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();

      const groups = json.group_by || [];
      const now = new Date().getFullYear();
      const filtered = groups
        .map((g) => ({ year: parseInt(g.key), count: g.count }))
        .filter((d) => d.year >= 1950 && d.year <= now)
        .sort((a, b) => a.year - b.year);

      const total = filtered.reduce((s, d) => s + d.count, 0);
      setTotalWorks(total);
      setData(filtered);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") search();
  }

  const peak = data
    ? data.reduce((max, d) => (d.count > max.count ? d : max), data[0])
    : null;
  const recent5 = data
    ? data
        .filter((d) => d.year >= new Date().getFullYear() - 5)
        .reduce((s, d) => s + d.count, 0)
    : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(165deg, #0a0a0f 0%, #0f1019 40%, #111320 100%)",
        color: "#e8e8ed",
        fontFamily: "'DM Sans', sans-serif",
        padding: "0 20px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: 820, margin: "0 auto", paddingTop: 48 }}>
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

        {/* Search */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              flex: 1,
              position: "relative",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              overflow: "hidden",
              transition: "border-color 0.2s",
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

        {/* Results */}
        {data && !loading && (
          <div>
            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {[
                { label: "Total Works", value: formatNumber(totalWorks) },
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
                    style={{ fontSize: 24, fontWeight: 700, color: "#f0f0f5" }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart title */}
            <div style={{ marginBottom: 16 }}>
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
              <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
                Results for "
                <span style={{ color: "#6ee7b7" }}>{searchedQuery}</span>"
              </p>
            </div>

            {/* Chart */}
            <div
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
                  data={data}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
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

            {/* Footer note */}
            <p
              style={{
                color: "#4b5563",
                fontSize: 12,
                textAlign: "center",
                paddingBottom: 40,
              }}
            >
              Data from OpenAlex — an open catalog of 250M+ scholarly works.
              Results based on semantic + keyword matching against titles and
              abstracts.
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
