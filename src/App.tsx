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


function ImageItem({ img }: { img: UnsplashSearchResponseItemDto }) {
  const [hover, setHover] = useState(false);

  return (
    <div style={{ marginBottom: 0 }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "0.3rem",
          cursor: "pointer",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <img
          loading="lazy"
          src={img.ThumbnailImageUrl}
          alt={`Photo by ${img.AuthorAttributionName}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            objectFit: "cover",
            transform: hover ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.3s ease",
          }}
        />

        <button
  type="button"
  onKeyDown={(e) => e.stopPropagation()}
  onClick={async (e) => {
    e.preventDefault();
    e.stopPropagation();
    (e as any).stopImmediatePropagation?.();

    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;

    try {
      // 1) Import to your media/CDN
      const reg = await registerDownload(img.DownloadLocation);

      // 2) Extract ID (+ a usable CDN url if provided)
      const payload = (reg && (reg.data ?? reg)) || {};
      const assetId =
        payload.id || payload.Id || payload.mediaId || payload.MediaId || payload.assetId || payload.AssetId;
      const cdnUrl = payload.url || payload.Url || payload.src || payload.sourceUrl;

      if (!assetId) {
        console.error("[VENN] registerDownload returned no asset id:", reg);
        alert("Could not import image (no asset id).");
        return;
      }

      // 3) Find CMS elements
      const container = document.querySelector<HTMLElement>('.dev-module-field[data-module-fieldid="Image"]');
      const hiddenInput = container?.querySelector<HTMLInputElement>('.HashedImageID');
      const altInput = container?.querySelector<HTMLInputElement>('.dev-alt-tag');
      const draggingArea = container?.querySelector<HTMLElement>('.dragging-area');

      // 4) Write the **asset ID** (NOT the Unsplash URL)
      if (hiddenInput) {
        hiddenInput.value = String(assetId);
        hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
        hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        // Fallback: try by 'name' if the field is hashed (e.g., XQr7szjAUik=)
        const hashedByName = document.querySelector<HTMLInputElement>('[name="XQr7szjAUik="]');
        if (hashedByName) {
          hashedByName.value = String(assetId);
          hashedByName.dispatchEvent(new Event("input", { bubbles: true }));
          hashedByName.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          console.warn("[VENN] Image hidden input not found (.HashedImageID or [name='XQr7szjAUik='])");
        }
      }

      // 5) Alt/label
      if (altInput) {
        altInput.value = `Photo by ${img.AuthorAttributionName}`;
        altInput.dispatchEvent(new Event("input", { bubbles: true }));
        altInput.dispatchEvent(new Event("change", { bubbles: true }));
      }

      // 6) Preview (prefer imported CDN url, fallback to thumbnail)
      if (draggingArea) {
        draggingArea.style.backgroundImage = `url(${cdnUrl || img.ThumbnailImageUrl})`;
      }

      console.log("[VENN] Imported & injected asset id into CMS field", { assetId, cdnUrl });
    } catch (err) {
      console.error(err);
      alert("Failed to import image. Please try again.");
    } finally {
      btn.disabled = false;
    }
  }}
  style={{
      position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: hover ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    opacity: hover ? 1 : 0,
    transition: "opacity 0.25s ease, background 0.25s ease",
    fontSize: "14px",
    fontWeight: 500,
    pointerEvents: hover ? "auto" : "none", // prevents hover ghost clicks
  }}
>
  Use this image
</button>

      </div>

      <p style={{ fontSize: 12, marginTop: 4 }}>
        Photo by{" "}
        <a
          href={img.AuthorAttributionUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#000" }}
        >
          {img.AuthorAttributionName}
        </a>
      </p>
    </div> 
  );
}

export function App() {
 
  const [modalOpen, setModalOpen] = useState(false);

 const stopBubble = (e: React.SyntheticEvent) => {
  e.stopPropagation();
  // @ts-ignore
  e.nativeEvent?.stopImmediatePropagation?.();
};


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
      columnCount: 2, 
      columnGap: "2rem",      
    }}
  >
    {results.map((img, index) => (
      <li
        key={index}
        style={{
          breakInside: "avoid",    
          marginBottom: "1rem",
        }}
      >
        <ImageItem img={img} />
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
      type="button"
         onClick={(e) => {
          e.preventDefault();
          e.stopPropagation(); // <-- prevents CMS from closing
          setModalOpen(true);
        }}
          onKeyDown={(e) => e.stopPropagation()} // Optional: prevent keyboard events from closing
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
  onClick={(e) => {
    if (e.target === e.currentTarget) setModalOpen(false); // click outside content only
  }}
  >
    <div
      style={{
        background: '#fff',
        color: '#000' ,
        minHeight: "30rem",
        width: "40%",
        borderRadius: "10px",
        padding: "1.5rem",
        position: "relative",
        maxHeight: "90vh",
        overflowY: "auto",
        transition: 'background 0.3s ease, color 0.3s ease',
      }}
      onClick={stopBubble}
      onMouseDown={stopBubble}
      onPointerDown={stopBubble}
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
              type="button"
                onKeyDown={(e) => e.stopPropagation()} // Optional: prevent keyboard events from closing
                onClick={(e) => {
                  e.stopPropagation();
                  setModalOpen(false);
                }}
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
                <X style={{color: '#000' }} size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
              <button
              type="button"
                onKeyDown={(e) => e.stopPropagation()} // Optional: prevent keyboard events from closing
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("presets");
                }}
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
              type="button"
                onKeyDown={(e) => e.stopPropagation()} // Optional: prevent keyboard events from closing
                onClick={(e) => {
                  e.stopPropagation(); 
                  setActiveTab("search");
                }}
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
                onKeyDown={(e) => {e.stopPropagation(); if (e.key === "Enter")basicSearch()}}
                style={{
                  flex: 1,
                  padding: "1rem 1.2rem",
                  borderRadius: "0.3rem",
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  margin: "0"
                }}
              />
              <button
              type="button"
                onKeyDown={(e) => e.stopPropagation()} // Optional: prevent keyboard events from closing
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); basicSearch()
                  }}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "1rem 2rem",
                  borderRadius: "0.3rem",
                  background: '#121212',
                  color: '#fff' ,
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
                  type="button"
                    onKeyDown={(e) => e.stopPropagation()} // Optional: prevent keyboard events from closing
                    key={preset}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); 
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
                }}
              >
                {/* Image Type Buttons */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {["photos", "illustrations"].map((type) => (
                    <button
                    type="button"
                      key={type}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Prevent CMS from closing modal
                        setImageType(type as "photos" | "illustrations");
                      }}
                      onKeyDown={(e) => e.stopPropagation()} // optional: prevent keyboard events
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.2rem",
                        border: imageType === type ? "1px solid #EFEFF0" : "none",
                        background: imageType === type ? "#EFEFF0" : "#fff",
                        color: "#000",
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
                    type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Prevent CMS from closing modal
                        handleViewMore();
                      }}
                      onKeyDown={(e) => e.stopPropagation()} // optional: prevent keyboard events from closing modal
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

