import { useState } from "react";
import {
  searchImages,
  registerDownload,
  type UnsplashSearchResponseItemDto,
} from "./services/unsplash";
import { Search, X, Image, Bookmark } from "lucide-react";



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

  // Add state hooks at the top of your component
const [imageType, setImageType] = useState<"photos" | "illustrations">("photos");
const [relevance, setRelevance] = useState<"newest" | "oldest">("newest");
const [orientation, setOrientation] = useState<"all" | "square" | "landscape" | "portrait">("all");
  // -------------------------
  // Pagination / “View More”
  // -------------------------
  // const [page, setPage] = useState(1);

  // -------------------------
  // Basic search (your working code)
  // -------------------------
  const basicSearch = async (term?: string) => {
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

  // -------------------------
  // Optional paginated search (commented for later gateway use)
  // -------------------------
  /*
  const paginatedSearch = async (term?: string, append = false) => {
    const query = term ?? searchTerm.trim();
    if (!query) return;

    setLoading(true);
    setError(null);

    try {
      const data = await searchImages(query); // pass page param if gateway supports
      setResults(prev => append ? [...prev, ...data.data] : data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  */

  const renderResults = () => (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        marginTop: "1.5rem",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1rem",
      }}
    >
      {results.map((img, index) => (
        <li key={index} style={{ marginBottom: 0 }}>
          <a
            href={img.AuthorAttributionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={async () => await registerDownload(img.DownloadLocation)}
            style={{ display: "block" }}
          >
            <img
              src={img.ThumbnailImageUrl}
              alt={`Photo by ${img.AuthorAttributionName}`}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                objectFit: "cover",
              }}
            />
          </a>
          <p style={{ fontSize: 12, marginTop: 4
           }}>
            Photo by{" "}
            <a href={img.AuthorAttributionUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#000" }}>
              {img.AuthorAttributionName}
            </a>
          </p>
        </li>
      ))}
    </ul>
  );

  

  // -------------------------
  // Mock “View More” handler
  // This duplicates the existing results to simulate more pages
  // -------------------------
  const handleViewMore = () => {
    const mockMoreImages = results.length ? results : [];
    setResults(prev => [...prev, ...mockMoreImages]);
  };

  return (
    <>
      {/* Open modal button */}
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
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "2rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px solid #ccc",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: "normal",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Image style={{ marginRight: "1rem" }} size={16} />Explore Images
              </h2>

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

            {/* Tabs */}
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

            {/* Search Bar */}
            <div style={{ display: "flex", marginBottom: "1rem", gap: "0.5rem" }}>
              <input
                type="text"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && basicSearch()}
                style={{
                  flex: 1,
                  padding: "1rem 1.2rem",
                  borderRadius: "0.3rem",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={() => basicSearch()}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "1rem 2rem",
                  borderRadius: "0.3rem",
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "normal",
                }}
              >
                <Search size={16} />
                {loading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Presets */}
            {activeTab === "presets" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem", paddingBottom: "1.5rem",borderBottom: "1px solid #ccc",}}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setSearchTerm(preset);
                      basicSearch(preset);
                      setActiveTab("search");
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#FFF",
                      border: "1px solid #E2E2E2",
                      borderRadius: "0.2rem",
                      cursor: "pointer",
                      fontSize: "12px",
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            {/* Photos Illustrations Relevance Orientations */}

                <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                  paddingBottom: "1.5rem",
                  borderBottom: "1px solid #ccc",
                }}
              >
                {/* Image Type Buttons */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {["photos", "illustrations"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setImageType(type as "photos" | "illustrations")}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.2rem",
                        border: imageType === type ? "1px solid #EFEFF0" : "none",
                        background: imageType === type ? "#EFEFF0" : "#fff",
                        color: imageType === type ? "#000" : "#000",
                        cursor: "pointer",
                        fontWeight: "normal",
                        textTransform: "capitalize",
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Relevance & Orientation Dropdowns */}
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  {/* Relevance */}
                 <select
                  name="Relevance"
                  value={relevance}
                  onChange={(e) => {
                    console.log("Select name:", e.target.name); // "Relevance"
                    console.log("Selected value:", e.target.value); // "newest" or "oldest"
                    setRelevance(e.target.value as "newest" | "oldest");
                  }}
                  style={{ padding: "0.5rem 1rem", borderRadius: "0.3rem", border:"none" }}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>

                  {/* Orientation */}
                  <select
                    value={orientation}
                    onChange={(e) =>
                      setOrientation(e.target.value as "all" | "square" | "landscape" | "portrait")
                    }
                    style={{ padding: "0.5rem 1rem", borderRadius: "0.3rem", border: "none" }}
                  >
                    <option value="all">All Orientations</option>
                    <option value="square">Square</option>
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>

            {/* Search Results */}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {!loading && results.length === 0 && <p>No results yet.</p>}
            {!loading && results.length > 0 && (
              <>
                {renderResults()}

                {/* Mock “View More” */}
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <button
                    onClick={handleViewMore}
                    style={{
                      padding: "0.8rem 1.2rem",
                      background: "#000",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.2rem",
                      cursor: "pointer",
                      fontWeight: "normal",
                    }}
                  >
                    View More
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
