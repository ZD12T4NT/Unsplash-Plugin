import { useState } from "react";
import {
  searchImages,
  type UnsplashSearchResponseItemDto,
} from "./services/unsplash";
import { Search, X, Image, Bookmark } from "lucide-react";
// top of file (keep these once)

// -------------------------
// Config
// -------------------------
const VERCEL_API_BASE = "https://unsplash-plugin.vercel.app/api";

// -------------------------
// Helper functions
// -------------------------
function getClientOrigin(): string {
  const dataAttr = (document.querySelector("[data-venn-client-origin]") as HTMLElement | null)
    ?.getAttribute("data-venn-client-origin");
  if (dataAttr) return dataAttr;

  const meta = document.querySelector('meta[name="venn-client-origin"]') as HTMLMetaElement | null;
  if (meta?.content) return meta.content;

  const href = (document.querySelector(".staging-link a") as HTMLAnchorElement | null)?.href;
  if (href) {
    try {
      return new URL(href).origin;
    } catch {
      /* ignore */
    }
  }

  return window.location.origin;
}

async function waitForHiddenIdToChange(el: HTMLInputElement | null, timeoutMs = 30000) {
  if (!el) return;
  const startVal = el.value;
  const start = Date.now();
  await new Promise<void>((resolve) => {
    const i = setInterval(() => {
      if (el.value && el.value !== startVal) {
        clearInterval(i);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(i);
        resolve();
      }
    }, 200);
  });
}

async function waitForUploadToFinish(uploadingUI: HTMLElement | null, timeoutMs = 30000) {
  if (!uploadingUI) {
    await new Promise((r) => setTimeout(r, 800));
    return;
  }
  const start = Date.now();
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const isVisible = uploadingUI.style.display !== "none";
      if (!isVisible || elapsed > timeoutMs) {
        clearInterval(interval);
        resolve();
      }
    }, 200);
  });
}

// -------------------------
// Component
// -------------------------
export function ImageItem({
  img,
  onClose,
}: {
  img: any;
  onClose?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ marginBottom: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="unsplash-card" style={{ position: "relative" }}>
        <img
          src={img.ThumbnailImageUrl}
          alt=""
          style={{ display: "block", width: "100%", height: "auto" }}
        />

        {/* Overlay fade */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.25s ease",
            pointerEvents: "none",
          }}
        />

        {/* Button */}
<button
  type="button"
  onClick={async (e) => {
    e.preventDefault();
    e.stopPropagation();
    (e as any).stopImmediatePropagation?.();

    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;

    try {
      // 1️⃣ Register & get CDN URL from the gateway
      const dlRes = await fetch(`${VERCEL_API_BASE}/download-unsplash`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Venn-Client-Origin": getClientOrigin(),
        },
        body: JSON.stringify({ url: img.DownloadLocation }),
      });

      if (!dlRes.ok) {
        const t = await dlRes.text().catch(() => "");
        console.error("[VENN] download-unsplash failed:", dlRes.status, t);
        alert("Could not fetch image via gateway.");
        return;
      }

      const dlJson = await dlRes.json().catch(() => ({}));
      const cdnUrl =
        dlJson?.url || dlJson?.Url || dlJson?.data?.url || dlJson?.data?.Url;
      if (!cdnUrl) {
        console.error("[VENN] download-unsplash returned no url:", dlJson);
        alert("Gateway did not return an image URL.");
        return;
      }

      // 2️⃣ Fetch the image bytes via proxy
      const fileResp = await fetch(`${VERCEL_API_BASE}/unsplash-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Venn-Client-Origin": getClientOrigin(),
        },
        body: JSON.stringify({ url: cdnUrl }),
      });

      if (!fileResp.ok) {
        const t = await fileResp.text().catch(() => "");
        console.error("[VENN] unsplash-file failed:", fileResp.status, t);
        alert("Could not fetch image bytes.");
        return;
      }

      const blob = await fileResp.blob();

      // 3️⃣ Build a File for CMS uploader
      const safeAuthor = (img.AuthorAttributionName || "unsplash")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .toLowerCase();
      const ext = (blob.type || "").includes("png") ? "png" : "jpg";
      const file = new File([blob], `${safeAuthor}.${ext}`, {
        type: blob.type || "image/jpeg",
      });
      const dt = new DataTransfer();
      dt.items.add(file);

      // 4️⃣ Locate CMS upload elements
      const container = document.querySelector<HTMLElement>(
        'dd.dev-module-field[data-module-fieldid="Image"]'
      );
      if (!container) {
        alert("Image field container not found.");
        return;
      }

      const fileInput =
        container.querySelector<HTMLInputElement>(
          'input[type="file"].imageupload.upload.uploadBtn'
        ) ||
        container.querySelector<HTMLInputElement>("input[type='file']");
      const hiddenIdInput =
        container.querySelector<HTMLInputElement>(".HashedImageID");
      const altInput =
        container.querySelector<HTMLInputElement>(".dev-alt-tag");
      const uploadingUI =
        container.querySelector<HTMLElement>(".uploading-file-this-file");
      const previewDiv =
        container.querySelector<HTMLElement>(".dragging-area");

      if (!fileInput) {
        alert("Upload input not found.");
        return;
      }

      // 5️⃣ Trigger upload
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      // 6️⃣ Alt + temporary preview
      if (altInput) {
        altInput.value = `Photo by ${img.AuthorAttributionName}`;
        altInput.dispatchEvent(new Event("input", { bubbles: true }));
        altInput.dispatchEvent(new Event("change", { bubbles: true }));
      }

      if (previewDiv) {
        const tempUrl = URL.createObjectURL(blob);
        previewDiv.style.backgroundImage = `url(${tempUrl})`;
      }

      // 7️⃣ Wait for upload & hidden ID
      await waitForHiddenIdToChange(hiddenIdInput);
      await waitForUploadToFinish(uploadingUI);

      console.log(
        "[VENN] ✅ Hidden media ID:",
        hiddenIdInput?.value || "(not set in time)"
      );

      // ✅ Close modal via prop
      onClose?.();

      // ✅ Fallback: click close button if the modal is outside React
      const closeBtn = document.querySelector(
        ".close-modal, .modal-close, .btn-close, [data-dismiss='modal']"
      ) as HTMLElement | null;
      if (closeBtn) {
        closeBtn.click();
        console.log("[VENN] Closed modal after successful upload");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to import image. Please try again.");
    } finally {
      btn.disabled = false;
    }
  }}
  style={{
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    background: "#000",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: 400,
    boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    cursor: "pointer",
    opacity: hover ? 1 : 0,
    transition: "opacity 0.25s ease",
        pointerEvents: hover ? "auto" : "none",
        }}
      >
        Add to Library
      </button>

      </div>

      <p style={{ fontSize: 12, marginTop: 10 }}>
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


const PRESETS = [
  "animal", "minimal", "abstract", "nature", "architecture", "plant", "art", "portrait",
  "business", "space", "colorful", "technology", "food", "texture", "interior", "wallpaper"
];


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
                <Image strokeWidth={1.5} style={{ marginRight: "1rem" }} size={16} />Explore Images
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
                <Bookmark strokeWidth={1.5} size={16} />
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
                <Search strokeWidth={1.5} size={16} />
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
                  borderRadius: "50px",
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
                  borderRadius: "50px",
                  background: '#FF3761',
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

                {results.map((img) => (
        <ImageItem
          key={img.DownloadLocation}
          img={img}
          onClose={() => setModalOpen(false)} // 🔥 this closes the modal
        />
      ))}
          </div>
        </div>
      )}
    </>
  );
}

export default App;

