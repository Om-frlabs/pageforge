import { useState, useRef, useEffect, useCallback } from "react";

// ─── Environment Detection ────────────────────────────────────────────────────
// Claude needs a local proxy (proxy.js). On GitHub Pages there's no Node server,
// so we disable it there and show a clear message.
const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDERS = [
  { id: "gemini", label: "Gemini", badge: "GOOGLE",    badgeColor: "#4ade80", placeholder: "AIzaSy…  aistudio.google.com",    docsUrl: "aistudio.google.com",    localOnly: false },
  { id: "claude", label: "Claude", badge: "ANTHROPIC", badgeColor: "#fb923c", placeholder: "sk-ant-…  console.anthropic.com", docsUrl: "console.anthropic.com",  localOnly: true  },
  { id: "openai", label: "OpenAI", badge: "GPT-4o",    badgeColor: "#34d399", placeholder: "sk-…  platform.openai.com",       docsUrl: "platform.openai.com",    localOnly: false },
  { id: "grok",   label: "Grok",   badge: "xAI",       badgeColor: "#a78bfa", placeholder: "xai-…  console.x.ai",             docsUrl: "console.x.ai",           localOnly: false },
];

const TONES = [
  { id: "modern-saas",  label: "Modern SaaS",  emoji: "⚡" },
  { id: "bold-punchy",  label: "Bold & Punchy", emoji: "🔥" },
  { id: "minimal",      label: "Minimal",       emoji: "◻" },
  { id: "playful",      label: "Playful",       emoji: "✦" },
  { id: "enterprise",   label: "Enterprise",    emoji: "🏢" },
  { id: "dark-luxury",  label: "Dark Luxury",   emoji: "◈" },
];

const SECTIONS = [
  { id: "hero",         label: "Hero",           icon: "⬛" },
  { id: "features",     label: "Features",       icon: "◈" },
  { id: "testimonials", label: "Social Proof",   icon: "◉" },
  { id: "pricing",      label: "Pricing",        icon: "◆" },
  { id: "cta",          label: "Call to Action", icon: "▶" },
  { id: "footer",       label: "Footer",         icon: "▬" },
];

const COLOR_PALETTES = [
  { id: "auto",   label: "Auto",   colors: ["#e8ff47","#00d4ff","#a78bfa"] },
  { id: "ocean",  label: "Ocean",  colors: ["#0ea5e9","#06b6d4","#e0f2fe"] },
  { id: "forest", label: "Forest", colors: ["#22c55e","#84cc16","#f0fdf4"] },
  { id: "ember",  label: "Ember",  colors: ["#f97316","#ef4444","#fff7ed"] },
  { id: "violet", label: "Violet", colors: ["#8b5cf6","#ec4899","#fdf4ff"] },
  { id: "mono",   label: "Mono",   colors: ["#f8fafc","#94a3b8","#1e293b"] },
];

const PANEL_MIN     = 220;
const PANEL_MAX     = 520;
const PANEL_DEFAULT = 316;

const SYSTEM_PROMPT = `You are an elite landing page designer and senior frontend engineer at a world-class design agency. You create production-ready, visually stunning, conversion-optimized landing pages.

STRICT OUTPUT RULES:
1. Output ONLY raw HTML. Absolutely no markdown, no backticks, no explanations.
2. First character must be < from <!DOCTYPE html>
3. ALWAYS include: <script src="https://cdn.tailwindcss.com"></script> in <head>
4. ALWAYS include a Google Fonts link. Choose distinctive characterful fonts. NEVER use Inter, Roboto, Arial. Pair a bold display font with a refined body font.
5. Each section MUST have: id="section-hero", id="section-features", id="section-testimonials", id="section-pricing", id="section-cta", id="section-footer"
6. Add custom <style> with CSS animations: fade-in, slide-up, IntersectionObserver stagger, hover micro-interactions
7. Fully mobile responsive with hamburger nav on mobile
8. Realistic compelling copywriting — never lorem ipsum
9. Asymmetric layouts, overlapping elements, diagonal sections, creative grids
10. Result must feel like a $50,000 agency build — not a template`;

// ─── Provider API Calls ───────────────────────────────────────────────────────

function stripFences(text) {
  return text.replace(/^```html\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
}

async function callGemini(apiKey, system, user, maxTokens = 8192) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return stripFences(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

async function callClaude(apiKey, system, user, maxTokens = 8000) {
  if (!IS_LOCAL) throw new Error("Claude requires local proxy. Run locally with: node proxy.js");
  const res = await fetch("http://localhost:3001/claude/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return stripFences(data.content?.map(b => b.text || "").join("") || "");
}

async function callOpenAI(apiKey, system, user, maxTokens = 8000) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o", max_tokens: maxTokens, temperature: 0.9, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return stripFences(data.choices?.[0]?.message?.content || "");
}

async function callGrok(apiKey, system, user, maxTokens = 8000) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "grok-3", max_tokens: maxTokens, temperature: 0.9, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return stripFences(data.choices?.[0]?.message?.content || "");
}

async function callProvider(id, key, sys, usr, max) {
  switch (id) {
    case "gemini": return callGemini(key, sys, usr, max);
    case "claude": return callClaude(key, sys, usr, max);
    case "openai": return callOpenAI(key, sys, usr, max);
    case "grok":   return callGrok(key, sys, usr, max);
    default: throw new Error("Unknown provider: " + id);
  }
}

function buildUserPrompt(description, tone, palette) {
  const paletteNote = palette !== "auto" ? `\nColor palette: use "${palette}" as dominant color direction.` : "";
  return `Build a complete production-quality landing page.
Product: ${description}
Design Tone: ${tone}${paletteNote}
Include ALL sections:
1. Sticky navigation — logo, nav links, CTA button, hamburger on mobile
2. Hero (id="section-hero") — bold headline, subheadline, dual CTAs, hero visual
3. Features (id="section-features") — 6 features in creative asymmetric grid
4. Social Proof (id="section-testimonials") — 3 testimonials + stats row
5. Pricing (id="section-pricing") — 3 tiers with highlighted recommended tier
6. Final CTA (id="section-cta") — conversion-focused, urgency
7. Footer (id="section-footer") — links, socials, copyright
Match palette, typography, spacing, layout PRECISELY to "${tone}" aesthetic.
Output ONLY the complete HTML. Start with <!DOCTYPE html>.`;
}

async function generateFullPage(providerId, apiKey, description, tone, palette) {
  return callProvider(providerId, apiKey, SYSTEM_PROMPT, buildUserPrompt(description, tone, palette), 8192);
}

async function regenerateSection(providerId, apiKey, sectionId, description, tone, currentHTML) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(currentHTML, "text/html");
  const existing = doc.getElementById(`section-${sectionId}`);
  const snippet = existing ? existing.outerHTML.slice(0, 600) : "";
  const newHTML = await callProvider(providerId, apiKey,
    `You regenerate individual HTML sections for landing pages. Output ONLY the section HTML element. No DOCTYPE, no html, no head, no body. Root element must keep id="section-${sectionId}". No markdown, no backticks.`,
    `Regenerate the "${sectionId}" section.\nProduct: ${description}\nTone: ${tone}\nCurrent version (make DIFFERENT):\n${snippet}\nOutput ONLY the new section HTML.`, 2500);
  const fullDoc = parser.parseFromString(currentHTML, "text/html");
  const target = fullDoc.getElementById(`section-${sectionId}`);
  if (target) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = newHTML.trim();
    const newEl = wrapper.firstElementChild;
    if (newEl) target.replaceWith(newEl);
  }
  return "<!DOCTYPE html>" + fullDoc.documentElement.outerHTML;
}

// ─── Resizable Panel Hook ─────────────────────────────────────────────────────

function useResizablePanel(defaultWidth = PANEL_DEFAULT) {
  const [panelWidth, setPanelWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX    = useRef(0);
  const dragStartWidth = useRef(defaultWidth);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragStartX.current     = e.clientX;
    dragStartWidth.current = panelWidth;
    setIsDragging(true);
  }, [panelWidth]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      const delta    = e.clientX - dragStartX.current;
      const newWidth = Math.min(PANEL_MAX, Math.max(PANEL_MIN, dragStartWidth.current + delta));
      setPanelWidth(newWidth);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  return { panelWidth, isDragging, onMouseDown };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResizeHandle({ onMouseDown, isDragging }) {
  const [hovered, setHovered] = useState(false);
  const active = isDragging || hovered;
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Drag to resize panel"
      style={{ width: "6px", flexShrink: 0, background: "transparent", position: "relative", cursor: "col-resize", zIndex: 10 }}
    >
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: active ? "3px" : "1px",
        background: active ? "#e8ff47" : "#1a1a1a",
        transition: "width 0.15s, background 0.15s", borderRadius: "2px",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex", flexDirection: "column", gap: "4px",
        opacity: active ? 1 : 0, transition: "opacity 0.15s",
      }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#e8ff47" }} />
        ))}
      </div>
    </div>
  );
}

function ApiKeyField({ provider, value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", opacity: disabled ? 0.4 : 1 }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => !disabled && onChange(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "Not available on GitHub Pages — run locally" : provider.placeholder}
        style={{
          width: "100%", background: "#0c0c0c",
          border: `1px solid ${value && !disabled ? provider.badgeColor + "45" : "#1e1e1e"}`,
          borderRadius: "7px", padding: "9px 38px 9px 11px",
          color: value && !disabled ? provider.badgeColor : "#555",
          fontSize: "11.5px", fontFamily: "'IBM Plex Mono', monospace",
          boxSizing: "border-box", transition: "border-color 0.2s",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
      {!disabled && (
        <button onClick={() => setShow(s => !s)} style={{
          position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "12px",
        }}>{show ? "🙈" : "👁"}</button>
      )}
    </div>
  );
}

function ProviderTab({ provider, selected, hasKey, disabled, onClick }) {
  return (
    <button
      onClick={() => !disabled && onClick(provider.id)}
      title={disabled ? "Needs local proxy — not available on GitHub Pages" : ""}
      style={{
        flex: 1, padding: "10px 4px", border: "none",
        borderBottom: selected ? `2px solid ${disabled ? "#444" : provider.badgeColor}` : "2px solid transparent",
        background: "transparent",
        color: selected ? (disabled ? "#555" : provider.badgeColor) : "#3a3a3a",
        fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace",
        cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span>{provider.label}{disabled ? " 🔒" : ""}</span>
      <span style={{
        width: "5px", height: "5px", borderRadius: "50%",
        background: !disabled && hasKey ? "#4ade80" : "#1e1e1e",
        display: "block", transition: "background 0.2s",
      }} />
    </button>
  );
}

function ToneButton({ tone, selected, onClick }) {
  return (
    <button onClick={() => onClick(tone.id)} style={{
      display: "flex", alignItems: "center", gap: "5px",
      padding: "6px 10px", borderRadius: "6px",
      border: selected ? "1.5px solid #e8ff47" : "1.5px solid #1e1e1e",
      background: selected ? "rgba(232,255,71,0.08)" : "transparent",
      color: selected ? "#e8ff47" : "#555",
      fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace",
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      <span>{tone.emoji}</span>{tone.label}
    </button>
  );
}

function PaletteButton({ pal, selected, onClick }) {
  return (
    <button onClick={() => onClick(pal.id)} title={pal.label} style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "5px 9px", borderRadius: "6px",
      border: selected ? "1.5px solid #e8ff47" : "1.5px solid #1e1e1e",
      background: selected ? "rgba(232,255,71,0.06)" : "transparent",
      cursor: "pointer", transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", gap: "3px" }}>
        {pal.colors.map((c, i) => <div key={i} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c }} />)}
      </div>
      <span style={{ fontSize: "11px", color: selected ? "#e8ff47" : "#555", fontFamily: "'IBM Plex Mono', monospace" }}>{pal.label}</span>
    </button>
  );
}

function SectionRow({ section, onRegenerate, onScroll, isRegenerating, hasPage }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: "7px", border: "1px solid #181818", background: "#0c0c0c", marginBottom: "5px" }}>
      <button onClick={() => hasPage && onScroll(section.id)} disabled={!hasPage} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: hasPage ? "pointer" : "default", padding: 0 }}>
        <span style={{ fontSize: "10px", color: "#333" }}>{section.icon}</span>
        <span style={{ fontSize: "12px", color: hasPage ? "#aaa" : "#3a3a3a", fontFamily: "'IBM Plex Mono', monospace" }}>{section.label}</span>
      </button>
      <button onClick={() => onRegenerate(section.id)} disabled={!hasPage || isRegenerating} style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "4px 10px", borderRadius: "5px", border: "1px solid #1e1e1e",
        background: isRegenerating ? "rgba(232,255,71,0.06)" : "transparent",
        color: isRegenerating ? "#e8ff47" : "#444",
        fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace",
        cursor: hasPage && !isRegenerating ? "pointer" : "not-allowed", opacity: hasPage ? 1 : 0.3,
      }}>
        <span style={isRegenerating ? { animation: "spin 0.8s linear infinite", display: "inline-block" } : {}}>↻</span>
        {isRegenerating ? "Redoing…" : "Redo"}
      </button>
    </div>
  );
}

function HistoryItem({ entry, index, onRestore }) {
  const provider = PROVIDERS.find(p => p.id === entry.providerId) || PROVIDERS[0];
  return (
    <div onClick={() => onRestore(entry)} style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #181818", background: "#0c0c0c", marginBottom: "6px", cursor: "pointer" }}>
      <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "5px", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        #{index + 1} — {entry.prompt.slice(0, 34)}{entry.prompt.length > 34 ? "…" : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "3px", background: provider.badgeColor + "18", color: provider.badgeColor, fontFamily: "'IBM Plex Mono', monospace" }}>{provider.label}</span>
        <span style={{ fontSize: "10px", color: "#3a3a3a", fontFamily: "'IBM Plex Mono', monospace" }}>{entry.tone}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "#e8ff47", fontFamily: "'IBM Plex Mono', monospace" }}>Restore ↩</span>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function PageForge() {
  const [apiKeys, setApiKeys]               = useState({ gemini: "", claude: "", openai: "", grok: "" });
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [prompt, setPrompt]                 = useState("");
  const [tone, setTone]                     = useState("modern-saas");
  const [palette, setPalette]               = useState("auto");
  const [generatedHTML, setGeneratedHTML]   = useState("");
  const [isGenerating, setIsGenerating]     = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [activeTab, setActiveTab]           = useState("preview");
  const [activePanel, setActivePanel]       = useState("build");
  const [error, setError]                   = useState("");
  const [statusMsg, setStatusMsg]           = useState("");
  const [copied, setCopied]                 = useState(false);
  const [history, setHistory]               = useState([]);
  const [previewMode, setPreviewMode]       = useState("desktop");
  const iframeRef = useRef(null);

  const { panelWidth, isDragging, onMouseDown } = useResizablePanel(PANEL_DEFAULT);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@300;400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const currentKey      = apiKeys[activeProvider] || "";
  const currentProvider = PROVIDERS.find(p => p.id === activeProvider);
  const providerDisabled = !IS_LOCAL && currentProvider.localOnly;

  const scrollToSection = useCallback((sectionId) => {
    try {
      const iDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      iDoc?.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: "smooth" });
      setActiveTab("preview");
    } catch (_) {}
  }, []);

  const handleGenerate = useCallback(async () => {
    if (providerDisabled) { setError("Claude requires local proxy. Use Gemini, OpenAI, or Grok here."); return; }
    if (!currentKey.trim()) { setError(`Paste your ${currentProvider.label} API key first.`); return; }
    if (!prompt.trim())     { setError("Describe your product first."); return; }
    setError(""); setIsGenerating(true); setStatusMsg("Generating…");
    try {
      const html = await generateFullPage(activeProvider, currentKey.trim(), prompt.trim(), tone, palette);
      setHistory(prev => [{ prompt: prompt.trim(), tone, palette, providerId: activeProvider, html }, ...prev.slice(0, 2)]);
      setGeneratedHTML(html);
      setStatusMsg("Done ✓");
      setActiveTab("preview");
      setTimeout(() => setStatusMsg(""), 2500);
    } catch (e) {
      setError(`${currentProvider.label} error: ${e.message}`);
      setStatusMsg("");
    } finally {
      setIsGenerating(false);
    }
  }, [activeProvider, currentKey, prompt, tone, palette, currentProvider, providerDisabled]);

  const handleRegenerate = useCallback(async (sectionId) => {
    if (!generatedHTML || !prompt.trim() || !currentKey.trim()) return;
    setRegeneratingId(sectionId); setError("");
    try {
      const newHTML = await regenerateSection(activeProvider, currentKey.trim(), sectionId, prompt.trim(), tone, generatedHTML);
      setGeneratedHTML(newHTML);
    } catch (e) {
      setError("Regeneration failed: " + e.message);
    } finally { setRegeneratingId(null); }
  }, [activeProvider, currentKey, generatedHTML, prompt, tone]);

  const handleExport = () => {
    if (!generatedHTML) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([generatedHTML], { type: "text/html" }));
    a.download = "landing-page.html";
    a.click();
  };

  const handleCopy = () => {
    if (!generatedHTML) return;
    navigator.clipboard.writeText(generatedHTML).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const hasPage = !!generatedHTML;

  const topBtn = (active, disabled, children, onClick) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "6px 13px", borderRadius: "6px",
      border: active ? "1px solid rgba(232,255,71,0.3)" : "1px solid #1e1e1e",
      background: active ? "rgba(232,255,71,0.08)" : "transparent",
      color: disabled ? "#262626" : active ? "#e8ff47" : "#666",
      fontSize: "11.5px", fontFamily: "'IBM Plex Mono', monospace",
      cursor: disabled ? "not-allowed" : "pointer",
    }}>{children}</button>
  );

  const panelLabel = (text) => (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9.5px", color: "#3a3a3a", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "9px" }}>
      {text}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080808", color: "#fff", fontFamily: "'Outfit', sans-serif", overflow: "hidden", userSelect: isDragging ? "none" : "auto" }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        input:focus, textarea:focus { outline:none!important; box-shadow:0 0 0 3px rgba(232,255,71,0.05)!important; border-color:#e8ff47!important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1e1e1e; border-radius:4px; }
        button:not(:disabled):hover { opacity:0.75; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: "50px", borderBottom: "1px solid #141414", background: "#090909", flexShrink: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", fontWeight: 500, color: "#e8ff47", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>⬡</span> PageForge
          <span style={{
            fontSize: "9px", padding: "2px 7px", borderRadius: "4px",
            background: currentProvider.badgeColor + "18",
            border: `1px solid ${currentProvider.badgeColor}35`,
            color: currentProvider.badgeColor, letterSpacing: "0.08em", transition: "all 0.2s",
          }}>{currentProvider.badge}</span>
          {/* Environment badge */}
          <span style={{
            fontSize: "9px", padding: "2px 7px", borderRadius: "4px",
            background: IS_LOCAL ? "rgba(74,222,128,0.1)" : "rgba(251,146,60,0.1)",
            border: `1px solid ${IS_LOCAL ? "rgba(74,222,128,0.2)" : "rgba(251,146,60,0.2)"}`,
            color: IS_LOCAL ? "#4ade80" : "#fb923c",
            letterSpacing: "0.08em",
          }}>{IS_LOCAL ? "LOCAL" : "HOSTED"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {statusMsg && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#e8ff47", animation: "blink 1.4s infinite" }}>● {statusMsg}</span>}
          {topBtn(false, !hasPage, previewMode === "desktop" ? "📱 Mobile" : "🖥 Desktop", () => setPreviewMode(m => m === "desktop" ? "mobile" : "desktop"))}
          {topBtn(false, !hasPage, copied ? "✓ Copied" : "⎘ Copy", handleCopy)}
          {topBtn(hasPage, !hasPage, "↓ Export .html", handleExport)}
        </div>
      </div>

      {/* Hosted banner — shown on GitHub Pages */}
      {!IS_LOCAL && (
        <div style={{ background: "rgba(251,146,60,0.07)", borderBottom: "1px solid rgba(251,146,60,0.15)", padding: "8px 20px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{ fontSize: "12px" }}>⚠</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#fb923c88" }}>
            Running on GitHub Pages — Claude is disabled (needs local proxy). Gemini, OpenAI &amp; Grok work fine.
          </span>
          <a href="https://github.com" target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", color: "#fb923c", textDecoration: "none" }}>
            Run locally →
          </a>
        </div>
      )}

      {/* ── LAYOUT ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: `${panelWidth}px`, flexShrink: 0, background: "#090909", display: "flex", flexDirection: "column", overflow: "hidden", transition: isDragging ? "none" : "width 0.05s" }}>

          {isDragging && (
            <div style={{ position: "fixed", top: "60px", left: `${panelWidth + 12}px`, background: "#e8ff47", color: "#111", fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", padding: "3px 8px", borderRadius: "4px", zIndex: 1000, pointerEvents: "none" }}>
              {panelWidth}px
            </div>
          )}

          {/* Sub-panel tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #141414" }}>
            {[{ id: "build", label: "Build" }, { id: "sections", label: "Sections" }, { id: "history", label: `History (${history.length})` }].map(p => (
              <button key={p.id} onClick={() => setActivePanel(p.id)} style={{
                flex: 1, padding: "11px 4px", border: "none",
                borderBottom: activePanel === p.id ? "2px solid #e8ff47" : "2px solid transparent",
                background: "transparent",
                color: activePanel === p.id ? "#e8ff47" : "#3a3a3a",
                fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
              }}>{p.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>

            {/* ── BUILD ── */}
            {activePanel === "build" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                <div>
                  {panelLabel("00 — AI Provider")}
                  <div style={{ background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a" }}>
                      {PROVIDERS.map(p => (
                        <ProviderTab
                          key={p.id} provider={p}
                          selected={activeProvider === p.id}
                          hasKey={!!apiKeys[p.id]}
                          disabled={!IS_LOCAL && p.localOnly}
                          onClick={(id) => { setActiveProvider(id); setError(""); }}
                        />
                      ))}
                    </div>
                    <div style={{ padding: "12px" }}>
                      <ApiKeyField
                        provider={currentProvider}
                        value={apiKeys[activeProvider]}
                        onChange={val => setApiKeys(k => ({ ...k, [activeProvider]: val }))}
                        disabled={providerDisabled}
                      />
                      <div style={{ marginTop: "6px", fontSize: "10px", color: "#2e2e2e", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {providerDisabled
                          ? <span style={{ color: "#fb923c66" }}>🔒 Requires local proxy — run: node proxy.js</span>
                          : <>→ {currentProvider.docsUrl}{activeProvider === "claude" && IS_LOCAL && <span style={{ color: "#fb923c88" }}> · needs proxy (node proxy.js)</span>}</>
                        }
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {PROVIDERS.map(p => {
                      const dis = !IS_LOCAL && p.localOnly;
                      return (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", color: dis ? "#2a2a2a" : apiKeys[p.id] ? p.badgeColor : "#2e2e2e" }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: dis ? "#1a1a1a" : apiKeys[p.id] ? p.badgeColor : "#2a2a2a" }} />
                          {p.label}{dis ? " 🔒" : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  {panelLabel("01 — Product Description")}
                  <textarea
                    style={{ width: "100%", minHeight: "100px", background: "#0c0c0c", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "11px", color: "#ddd", fontSize: "13px", fontFamily: "'Outfit', sans-serif", lineHeight: 1.65, resize: "vertical", boxSizing: "border-box" }}
                    placeholder="e.g. An AI tool that converts GitHub repos into interactive docs. Devs ship docs 10x faster."
                    value={prompt}
                    onChange={e => { setPrompt(e.target.value); setError(""); }}
                  />
                </div>

                <div>
                  {panelLabel("02 — Design Tone")}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {TONES.map(t => <ToneButton key={t.id} tone={t} selected={tone === t.id} onClick={setTone} />)}
                  </div>
                </div>

                <div>
                  {panelLabel("03 — Color Palette")}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {COLOR_PALETTES.map(p => <PaletteButton key={p.id} pal={p} selected={palette === p.id} onClick={setPalette} />)}
                  </div>
                </div>

                {error && (
                  <div style={{ background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)", borderRadius: "7px", padding: "10px 12px", fontSize: "11.5px", color: "#ff7070", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6 }}>
                    {error}
                  </div>
                )}

                <button onClick={handleGenerate} disabled={isGenerating || providerDisabled} style={{
                  width: "100%", padding: "13px", borderRadius: "9px",
                  border: isGenerating ? `1px solid ${currentProvider.badgeColor}25` : "none",
                  background: providerDisabled ? "#0e0e0e" : isGenerating ? "#0e0e0e" : "linear-gradient(135deg, #e8ff47, #b8d400)",
                  color: isGenerating || providerDisabled ? currentProvider.badgeColor : "#111",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", fontWeight: 500,
                  cursor: isGenerating || providerDisabled ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  letterSpacing: "0.04em",
                  opacity: providerDisabled ? 0.4 : 1,
                }}>
                  {isGenerating
                    ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>↻</span>Generating via {currentProvider.label}…</>
                    : providerDisabled
                      ? <>🔒 {currentProvider.label} — Local Only</>
                      : <><span>⚡</span>{hasPage ? "Regenerate Page" : "Generate Landing Page"}</>
                  }
                </button>
              </div>
            )}

            {/* ── SECTIONS ── */}
            {activePanel === "sections" && (
              <div>
                {panelLabel(hasPage ? "Click label to jump · ↻ to redo" : "Generate a page first")}
                {SECTIONS.map(sec => <SectionRow key={sec.id} section={sec} onRegenerate={handleRegenerate} onScroll={scrollToSection} isRegenerating={regeneratingId === sec.id} hasPage={hasPage} />)}
              </div>
            )}

            {/* ── HISTORY ── */}
            {activePanel === "history" && (
              <div>
                {panelLabel("Last 3 generations")}
                {history.length === 0
                  ? <div style={{ color: "#2a2a2a", fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", textAlign: "center", paddingTop: "28px", lineHeight: 2 }}>No history yet.<br />Generate your first page.</div>
                  : history.map((entry, i) => (
                    <HistoryItem key={i} entry={entry} index={i}
                      onRestore={e => { setPrompt(e.prompt); setTone(e.tone); setPalette(e.palette); setActiveProvider(e.providerId); setGeneratedHTML(e.html); setActivePanel("build"); setActiveTab("preview"); }}
                    />
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* ── RESIZE HANDLE ── */}
        <ResizeHandle onMouseDown={onMouseDown} isDragging={isDragging} />

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 16px", height: "44px", borderBottom: "1px solid #141414", background: "#090909", flexShrink: 0 }}>
            {[{ id: "preview", label: "◉ Preview" }, { id: "code", label: "</> Code" }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: "5px 13px", borderRadius: "5px",
                border: activeTab === t.id ? "1px solid #222" : "1px solid transparent",
                background: activeTab === t.id ? "#131313" : "transparent",
                color: activeTab === t.id ? "#e8ff47" : "#3a3a3a",
                fontSize: "11.5px", fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
              }}>{t.label}</button>
            ))}
            {regeneratingId && (
              <span style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#e8ff47", animation: "blink 1s infinite" }}>
                ↻ Regenerating {regeneratingId}…
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflow: "hidden", position: "relative", background: activeTab === "preview" ? "#161616" : "#080808" }}>

            {!hasPage && !isGenerating && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
                <div style={{ fontSize: "44px", opacity: 0.05 }}>⬡</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", color: "#252525", textAlign: "center", lineHeight: 2 }}>
                  Pick an AI provider<br />Describe your product<br />Hit Generate ⚡
                </div>
              </div>
            )}

            {isGenerating && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(8,8,8,0.94)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                <div style={{ width: "42px", height: "42px", border: `2px solid ${currentProvider.badgeColor}20`, borderTop: `2px solid ${currentProvider.badgeColor}`, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", color: currentProvider.badgeColor }}>{currentProvider.label} is crafting your page…</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#2a2a2a", textAlign: "center", lineHeight: 1.9, maxWidth: "240px" }}>
                  Nav · Hero · Features<br />Testimonials · Pricing · CTA · Footer
                </div>
              </div>
            )}

            {hasPage && activeTab === "preview" && (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: previewMode === "mobile" ? "flex-start" : "stretch", justifyContent: "center", overflowY: previewMode === "mobile" ? "auto" : "hidden", padding: previewMode === "mobile" ? "20px 0" : "0" }}>
                <iframe
                  ref={iframeRef}
                  style={{
                    border: previewMode === "mobile" ? "2px solid #2a2a2a" : "none",
                    borderRadius: previewMode === "mobile" ? "22px" : "0",
                    width: previewMode === "mobile" ? "390px" : "100%",
                    height: previewMode === "mobile" ? "844px" : "100%",
                    background: "#fff", flexShrink: 0,
                    boxShadow: previewMode === "mobile" ? "0 0 48px rgba(0,0,0,0.7)" : "none",
                    pointerEvents: isDragging ? "none" : "auto",
                  }}
                  srcDoc={generatedHTML}
                  title="Generated Landing Page"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}

            {hasPage && activeTab === "code" && (
              <div style={{ width: "100%", height: "100%", overflow: "auto", padding: "20px" }}>
                <pre style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11.5px", color: "#6aaf8c", lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                  {generatedHTML}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}