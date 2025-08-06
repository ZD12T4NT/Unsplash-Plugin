import { useState } from 'react';
import { searchImages, type UnsplashSearchResponseItemDto } from './services/unsplash';

const PRESETS = [
  'animal', 'minimal', 'abstract', 'nature', 'architecture', 'plant', 'art', 'portrait',
  'business', 'space', 'colorful', 'technology', 'food', 'texture', 'interior', 'wallpaper'
];

export function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'search'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UnsplashSearchResponseItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const onSearch = async (term?: string) => {
    const query = term ?? searchTerm.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchImages(query);
      setResults(data.Data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'presets') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {PRESETS.map(preset => (
            <button className='preset-btn'
              key={preset}
              onClick={() => {
                setSearchTerm(preset);
                onSearch(preset);
                setActiveTab('search');
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
        <div style={{ display: 'flex', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search images..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #ccc' }}
          />
          <button className='search-btn'
            onClick={() => onSearch()}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {results.length === 0 && !loading && <p>No results yet.</p>}

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map(img => (
            <li key={img.DownloadLocation} style={{ marginBottom: 20 }}>
              <a href={img.AuthorAttributionUrl} target="_blank" rel="noopener noreferrer">
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
        }}
      >
        Open Unsplash Plugin
      </button>

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
                    {/* Left side: Presets & Search */}
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
                        }}
                        >
                        Search
                        </button>
                    </div>

                    {/* Right side: More dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                        onClick={() => setDropdownOpen(prev => !prev)}
                        style={{
                            padding: '0.7rem',
                            background: '#eee',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                        }}
                        >
                        More ▾
                        </button>

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

            <div>{renderTabContent()}</div>
          </div>
        </div>
      )}
    </>
  );
}

const dropdownStyle: React.CSSProperties = {
  padding: '0.75rem',
  width: '100%',
  background: '#333',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  color: '#fff'
};

export default App;
