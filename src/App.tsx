import { useState } from "react";
import {
  searchImages,
  registerDownload,
  type UnsplashSearchResponseItemDto,
} from "./services/unsplash";
import { Search, X, Image, Bookmark } from "lucide-react"; // icons

// Preset keywords for quick search
const PRESETS = [
  "animal", "minimal", "abstract", "nature", "architecture", "plant", "art", "portrait",
  "business", "space", "colorful", "technology", "food", "texture", "interior", "wallpaper"
];

export function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"presets" | "search">("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UnsplashSearchResponseItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (term?: string) => {
    const query = term ?? searchTerm.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchImages(query);
      setResults(data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    if (activeTab === "presets") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
          {PRESETS.map((preset) => (
            <button
              className="preset-btn"
              key={preset}
              onClick={() => {
                setSearchTerm(preset);
                onSearch(preset);
                setActiveTab("search");
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      );
    }

    return (
      <>
        <div style={{ display: "flex", marginBottom: "1rem", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            style={{
              flex: 1,
              padding: "1rem 1.2rem",
              borderRadius: "0.2rem",
              border: "1px solid #ccc",
              fontWeight: "normal",
              fontSize: "14px"
            }}
          />
          <button
            className="search-btn"
            onClick={() => onSearch()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "1rem 2rem",
              borderRadius: "0.2rem",
              background: "#000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <Search size={16} />
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {results.length === 0 && !loading && <p>No results yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
  {results.map((img, index) => (
    <li key={index} style={{ marginBottom: 20 }}>
      <a
        href={img.AuthorAttributionUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={async () => await registerDownload(img.DownloadLocation)}
      >
        <img
          src={img.ThumbnailImageUrl}
          alt={`Photo by ${img.AuthorAttributionName}`}
          style={{ borderRadius: 8, maxWidth: "100%" }}
        />
      </a>
      <p style={{ fontSize: 12, marginTop: 4 }}>
        Photo by{" "}
        <a href={img.AuthorAttributionUrl} target="_blank" rel="noopener noreferrer">
          {img.AuthorAttributionName}
        </a>
      </p>
    </li>
  ))}
</ul>

      </>
    );
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        style={{
          padding: "0.8rem 1.2rem",
          background: "#000",
          color: "#fff",
          border: "none",
          borderRadius: "0.3rem",
          cursor: "pointer",
          margin: "2rem",
          fontWeight: "bold",
        }}
      >
        Open Unsplash Plugin
      </button>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0,
            width: "100vw", height: "100vh",
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              minHeight: "30rem",
              width: "70%",
              maxWidth: "720px",
              borderRadius: ".3rem",
              padding: "1.5rem",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header with Title + Close */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "2rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px solid #ccc"
              }}
            >
              <h2 style={{ margin: 0,fontSize: 16, fontWeight: "normal", display: "flex", alignItems: "center" }}><Image style={{marginRight:"1rem"}} size={16} />Explore Images</h2>
             
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                
                <X size={20} />
                
              </button>
              
            </div>

            {/* Tabs + Dropdown under title */}
           <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <button
              onClick={() => setActiveTab("presets")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "1rem 2rem",
                background: activeTab === "presets" ? "#EFEFF0" : "#FFF",
                color: "#000",
                border: activeTab === "presets" ? "1px solid #EFEFF0" : "1px solid #E2E2F2",
                borderRadius: "0.2rem",
                cursor: "pointer",
                fontWeight: "normal",
                fontSize: "12px",
              }}
            >
              <Bookmark size={16} />
              Presets
            </button>

            <button
              onClick={() => setActiveTab("search")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "1rem 2rem",
                background: activeTab === "search" ? "#EFEFF0" : "#FFF",
                color: "#000",
                border: activeTab === "search" ? "1px solid #EFEFF0" : "1px solid #E2E2F2",
                borderRadius: "0.2rem",
                cursor: "pointer",
                fontWeight: "normal",
                fontSize: "12px",
              }}
            >
              <Search size={16} />
              Search
            </button>
          </div>

            <div>{renderTabContent()}</div>
          </div>
        </div>
      )}
    </>
  );
}



export default App;
