import { useState } from 'react';
import { searchImages, registerDownload, type UnsplashSearchResponseItemDto } from './services/unsplash';


// Preset keywords for quick search
const PRESETS = [
  'animal', 'minimal', 'abstract', 'nature', 'architecture', 'plant', 'art', 'portrait',
  'business', 'space', 'colorful', 'technology', 'food', 'texture', 'interior', 'wallpaper'
];

export function App() {
  // React state hooks
  const [modalOpen, setModalOpen] = useState(false); // Controls modal visibility
  const [activeTab, setActiveTab] = useState<'presets' | 'search'>('search'); // Active tab
  const [searchTerm, setSearchTerm] = useState(''); // Search input value
  const [results, setResults] = useState<UnsplashSearchResponseItemDto[]>([]); // Image results
  const [loading, setLoading] = useState(false); // Loading state for API
  const [error, setError] = useState<string | null>(null); // Error message if any
  const [dropdownOpen, setDropdownOpen] = useState(false); // Controls "More" dropdown

  // Function to perform search using Unsplash API
  const onSearch = async (term?: string) => {
    const query = term ?? searchTerm.trim(); // Use term from argument or input field
    if (!query) return; // Do nothing if empty query
    setLoading(true);
    setError(null);
    try {
      const data = await searchImages(query); // Call Unsplash API
      setResults(data.Data); // Update results
    } catch (e) {
      setError((e as Error).message); // Show error message
    } finally {
      setLoading(false);
    }
  };

  // Renders tab content dynamically
  const renderTabContent = () => {
    // If "Presets" tab is active
    if (activeTab === 'presets') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {PRESETS.map(preset => (
            <button className='preset-btn'
              key={preset}
              onClick={() => {
                setSearchTerm(preset); // Set input value to preset
                onSearch(preset); // Trigger search immediately
                setActiveTab('search'); // Switch back to search tab
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      );
    }

    // If "Search" tab is active
    return (
      <>
        {/* Search input + button */}
        <div style={{ display: 'flex', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search images..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} // Update state
            onKeyDown={e => e.key === 'Enter' && onSearch()} // Search on Enter key
            style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #ccc', fontWeight: 'bold' }}
          />
          <button className='search-btn'
            onClick={() => onSearch()}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Show error if exists */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* If no results yet */}
        {results.length === 0 && !loading && <p>No results yet.</p>}

        {/* Render image results */}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map(img => (
            <li key={img.DownloadLocation} style={{ marginBottom: 20 }}>
              <a
                href={img.AuthorAttributionUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async () => {
                  try {
                    await registerDownload(img.DownloadLocation); // Register the download with Unsplash
                    console.log('Download registered successfully');
                  } catch (error) {
                    console.error('Failed to register download', error);
                  }
                }}
              >
                <img
                  src={img.ThumbnailImageUrl}
                  alt={`Photo by ${img.AuthorAttributionName}`}
                  style={{ borderRadius: 8, maxWidth: '100%' }}
                />
              </a>

              <p style={{ fontSize: 12, marginTop: 4 }}>
                Photo by{' '}
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
      {/* Main button to open modal */}
      <button
        onClick={() => setModalOpen(true)}
        style={{
          padding: '0.8rem 1.2rem',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          margin: '2rem',
          fontWeight: 'bold'
        }}
      >
        Open Unsplash Plugin
      </button>

      {/* Modal overlay */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          {/* Modal content */}
          <div
            style={{
              background: '#fff',
              minHeight: '30rem',
              width: '70%',
              maxWidth: '720px',
              borderRadius: '.5rem',
              padding: '1.5rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: 'absolute',
                top: '0rem',
                right: '5px',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
            >
              &times;
            </button>

            {/* Modal header: Tabs + More dropdown */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
                borderBottom: '1px solid #ccc',
                paddingBottom: '20px'
              }}
            >
              {/* Tabs (Presets / Search) */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveTab('presets')}
                  style={{
                    padding: '0.7rem',
                    background: activeTab === 'presets' ? '#222' : '#eee',
                    color: activeTab === 'presets' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Presets
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  style={{
                    padding: '0.7rem',
                    background: activeTab === 'search' ? '#222' : '#eee',
                    color: activeTab === 'search' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Search
                </button>
              </div>

              {/* Dropdown Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(prev => !prev)}
                  style={{
                    padding: '0.7rem',
                    background: '#eee',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  More ▾
                </button>

                {/* Dropdown options */}
                {dropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      minWidth: '160px',
                    }}
                  >
                    <button onClick={() => alert('About clicked')} style={dropdownStyle}>
                      About
                    </button>
                    <button
                      onClick={() =>
                        window.open('https://unsplash.com/oauth/authorize', '_blank', 'noopener,noreferrer')
                      }
                      style={dropdownStyle}
                    >
                      Login
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Render either Presets or Search */}
            <div>{renderTabContent()}</div>
          </div>
        </div>
      )}
    </>
  );
}

// Dropdown button styles
const dropdownStyle: React.CSSProperties = {
  padding: '0.75rem',
  width: '100%',
  background: '#333',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  color: '#fff',
  fontWeight: 'bold'
};

export default App;
