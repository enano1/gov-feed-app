// src/Feed.jsx
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import LoadingBadge from './LoadingBadge';
import './App.css';
import SummaryModal from './SummaryModal';


function extractImageSrc(html) {
  const match = html.match(/<img.*?src=['"](.*?)['"]/);
  return match ? match[1] : null;
}

export default function Feed() {
  const [query, setQuery] = useState('');
  const [feedItems, setFeedItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [lastQuery, setLastQuery] = useState('');
  const [feedback, setFeedback] = useState({});
  const [activeTab, setActiveTab] = useState('feed');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);
  const [boostedTopics, setBoostedTopics] = useState([]);

  const [currentArticleLink, setCurrentArticleLink] = useState(null);

  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState('');
  const [summaryCache, setSummaryCache] = useState({});

  const [hasContinued, setHasContinued] = useState(false);
  const [showContinueOptions, setShowContinueOptions] = useState(false);

  const [feedGenerated, setFeedGenerated] = useState(false);



  useEffect(() => {
    fetch('http://localhost:8080/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(() => {
        setActiveTab('feed');
        return fetch('http://localhost:8080/user-topics', { credentials: 'include' });
      })
      .then(res => res.json())
      .then(data => {
        const topics = Array.isArray(data) ? data.map(t => t.topic.toLowerCase()) : [];
        setBoostedTopics(topics);
      })
      .catch(() => window.location.href = "/login");
  }, []);

  useEffect(() => {
    fetch('http://localhost:8080/feedback', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(f => map[f.article_id] = f.action);
        setFeedback(map);
      });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY
                       >= document.body.offsetHeight - 300;
  
      if (!nearBottom) return;
  
      if (!hasContinued) {
        setShowContinueOptions(true);
      } else if (visibleCount < feedItems.length) {
        setVisibleCount(v => v + 10);
      }
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasContinued, visibleCount, feedItems]);
  
  const handleLogout = async () => {
    await fetch('http://localhost:8080/logout', { method: 'POST', credentials: 'include' });
    window.location.href = "/login";
  };

  const fetchSavedItems = async () => {
    setIsLoading(true);
    try {
      const url = new URL('http://localhost:8080/feed');
      url.searchParams.set('query', ''); // or "all"
      url.searchParams.set('filter', 'save');
  
      const res = await fetch(url.toString(), { credentials: 'include' });
      const data = await res.json();
      setSavedItems(Array.isArray(data) ? data : []);
      setHasLoadedSaved(true);
    } catch (err) {
      console.error("Failed to fetch saved articles:", err);
    } finally {
      setIsLoading(false);
    }
  };
    
  const handleSearch = async (customQuery = "", filterOverride = null) => {
    if (isLoading) return;
    const actualQuery = customQuery || query;
    const currentFilter = filterOverride || filter;
    setIsLoading(true);
    setHasSearched(true);
  
    try {
      // 🧠 Step 1: Fetch related terms using Datamuse API
      const relatedRes = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(actualQuery)}&max=5`);
      const relatedData = await relatedRes.json();
      const relatedTerms = relatedData.map(item => item.word.toLowerCase());
      const allQueries = [actualQuery.toLowerCase(), ...relatedTerms];
  
      // 🛰️ Step 2: Send the full query list as a comma-separated string
      const url = new URL('http://localhost:8080/feed');
      url.searchParams.set("query", allQueries.join(','));
      if (currentFilter !== "all") url.searchParams.set("filter", currentFilter);
  
      const res = await fetch(url.toString(), { credentials: 'include' });
      let items = await res.json();
  
      // ✨ Step 3: Boost relevance using boostedTopics
      if (boostedTopics.length > 0) {
        const boosted = [];
        const regular = [];
      
        for (const item of items) {
          const isBoosted = boostedTopics.some(topic =>
            item.title.toLowerCase().includes(topic)
          );
          if (isBoosted) {
            boosted.push(item);
          } else {
            regular.push(item);
          }
        }
      
        // Interleave: one boosted item every 5 regular items
        const interleaved = [];
        let r = 0, b = 0;
      
        while (r < regular.length || b < boosted.length) {
          for (let i = 0; i < 5 && r < regular.length; i++) {
            interleaved.push(regular[r++]);
          }
          if (b < boosted.length) {
            interleaved.push(boosted[b++]);
          }
        }
      
        items = interleaved;
      }
        
      setFeedItems(items);
      setLastQuery(actualQuery);
      setQuery(actualQuery);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const submitFeedback = async (articleId, action) => {
    const current = feedback[articleId];
    const newAction = current === action ? null : action;

    try {
      await fetch('http://localhost:8080/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ article_id: articleId, action: newAction }),
      });

      setFeedback(prev => {
        const updated = { ...prev };
        if (newAction) updated[articleId] = newAction;
        else delete updated[articleId];
        return updated;
      });

      if (newAction === 'save') {
        const alreadySaved = savedItems.some(item => item.link === articleId);
        const newItem = [...feedItems, ...savedItems].find(item => item.link === articleId);
        if (!alreadySaved && newItem) setSavedItems(prev => [newItem, ...prev]);
      }

      if (current === 'save' && newAction === null) {
        setSavedItems(prev => prev.filter(item => item.link !== articleId));
      }

      if (newAction === 'hide') {
        if (activeTab === 'feed') setFeedItems(prev => prev.filter(item => item.link !== articleId));
        if (activeTab === 'saved') setSavedItems(prev => prev.filter(item => item.link !== articleId));
      }

    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const handleTldrClick = async (article) => {
    setCurrentArticleLink(article.link); // 🆕 track the current article
    setSummaryModalOpen(true);
  
    if (summaryCache[article.link]) {
      setCurrentSummary(summaryCache[article.link]);
      return;
    }
  
    setCurrentSummary("⏳ Summarizing...");
  
    try {
      const res = await fetch('http://localhost:8080/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: article.title,
          content: article.description,
          link: article.link, // make sure you're sending the link
        }),
      });
  
      const data = await res.json();
      const summary = data.summary || "Rate limit exceeded, 3 per minute :D.";
  
      setSummaryCache(prev => ({ ...prev, [article.link]: summary }));
      setCurrentSummary(summary);
    } catch (err) {
      setCurrentSummary("⚠️ Failed to summarize this article.");
    }
  };
    

  const fallbackSuggestions = [
    "Artificial Intelligence", "Defense", "Cybersecurity", "China", "Pentagon", 
    "Army", "Navy", "Grants", "Funding", "Security", "Technology", "Military", "International"
  ];
  
  const getRandomTopics = () => {
    const shuffled = fallbackSuggestions.sort(() => 0.5 - Math.random());  // Shuffle the array
    return shuffled.slice(0, 3);  // Pick top 3 random topics
  };

  const [randomTopics, setRandomTopics] = useState([]);

  useEffect(() => {
    // Set random topics when the component loads
    setRandomTopics(getRandomTopics());
  }, []);  // Empty dependency array ensures this runs only once when the component mounts


  const feedToShow = activeTab === 'saved' ? savedItems : feedItems;
  const filteredFeedItems = feedToShow.filter(item => {
    const userAction = feedback[item.link];
    const matchesReaction = filter === 'all' || userAction === filter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return (activeTab === 'saved' ? userAction === 'save' : true) && matchesReaction && matchesCategory;
  });

  return (
    // screen size

<div style={{
  minHeight: '100vh',
  width: '100vw',
  overflowX: 'hidden',
  boxSizing: 'border-box',
  paddingTop: 50,
  paddingLeft: 500,
  paddingRight: 500,
  paddingBottom: 50,
  backgroundColor: '#111',
  color: '#fff',
  fontFamily: 'Inter, sans-serif'
}}>

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
  <h1 style={{ fontSize: '1.75rem' }}>GovTech Feed</h1>
  <button
  onClick={handleLogout}
  style={{
    padding: '8px 18px',
    backgroundColor: '#000',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
  }}
  onMouseEnter={(e) => {
    e.target.style.borderColor = '#dc2626';
    e.target.style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.5)';
  }}
  onMouseLeave={(e) => {
    e.target.style.borderColor = '#444';
    e.target.style.boxShadow = 'none';
  }}
>
  Logout
</button>
</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
        <button
  onClick={() => setActiveTab('feed')}
  disabled={activeTab === 'feed' || isLoading}
  style={{
    padding: '8px 16px',
    borderRadius: '9999px',
    backgroundColor: '#000',
    color: '#fff',
    border: activeTab === 'feed' ? '1px solid #7c3aed' : '1px solid #444',
    boxShadow: activeTab === 'feed' ? '0 0 0 2px rgba(124, 58, 237, 0.5)' : 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    marginRight: '10px',
    transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
  }}
  onMouseEnter={(e) => {
    if (activeTab !== 'feed') {
      e.target.style.borderColor = '#7c3aed';
      e.target.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.5)';
    }
  }}
  onMouseLeave={(e) => {
    if (activeTab !== 'feed') {
      e.target.style.borderColor = '#444';
      e.target.style.boxShadow = 'none';
    }
  }}
>
  Feed
</button>

<button
  onClick={() => {
    setActiveTab('saved');
    if (!hasLoadedSaved) fetchSavedItems();
  }}
  disabled={activeTab === 'saved' || isLoading}
  style={{
    padding: '8px 16px',
    borderRadius: '9999px',
    backgroundColor: '#000',
    color: '#fff',
    border: activeTab === 'saved' ? '1px solid #7c3aed' : '1px solid #444',
    boxShadow: activeTab === 'saved' ? '0 0 0 2px rgba(124, 58, 237, 0.5)' : 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
  }}
  onMouseEnter={(e) => {
    if (activeTab !== 'saved') {
      e.target.style.borderColor = '#7c3aed';
      e.target.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.5)';
    }
  }}
  onMouseLeave={(e) => {
    if (activeTab !== 'saved') {
      e.target.style.borderColor = '#444';
      e.target.style.boxShadow = 'none';
    }
  }}
>
  Saved
</button>

        </div>

        {activeTab === 'feed' && (
          <>
            <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            onMouseEnter={e => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
            }}
            onMouseLeave={e => {
                e.target.style.borderColor = '#333';
                e.target.style.boxShadow = 'none';
            }}
            style={{
                marginLeft: 10,
                borderRadius: '9999px',
                textAlign: 'center',
                padding: '6px 12px',
                backgroundColor: '#000',
                color: '#fff',
                border: '1px solid #333',
                transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                cursor: 'pointer',
            }}
            >
            <option value="all">All</option>
            <option value="like">Liked</option>
            <option value="dislike">Disliked</option>
            <option value="save">Starred</option>
            </select>

            <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            onMouseEnter={e => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
            }}
            onMouseLeave={e => {
                e.target.style.borderColor = '#333';
                e.target.style.boxShadow = 'none';
            }}
            style={{
                marginLeft: 10,
                borderRadius: '9999px',
                textAlign: 'center',
                padding: '6px 12px',
                backgroundColor: '#000',
                color: '#fff',
                border: '1px solid #333',
                transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                cursor: 'pointer',
            }}
            >
            <option value="all">All Categories</option>
            <option value="News">News</option>
            <option value="Grant">Grant</option>
            <option value="Gov Opportunity">Gov Opportunity</option>
            <option value="Think Tank">Think Tank</option>
            <option value="International">International</option>
            <option value="Other">Other</option>
            </select>
          </>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '2rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '12px 20px',
        border: '1px solid #333'
        }}>
        <input
            type="text"
            placeholder="Search articles..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: '1rem'
            }}
        />
        
        <button
        onClick={() => handleSearch()}
        disabled={isLoading}
        style={{
            backgroundColor: '#1a1a1a',
            color: 'white',
            padding: '8px 16px',
            border: '1px solid #2563eb',
            borderRadius: '8px',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
        }}
        onMouseEnter={(e) => {
            e.target.style.borderColor = '#22c55e'; // neon green
            e.target.style.boxShadow = '0 0 0 2px rgba(34, 197, 94, 0.5)';
        }}
        onMouseLeave={(e) => {
            e.target.style.borderColor = '#2563eb';
            e.target.style.boxShadow = 'none';
        }}
        >
        Search
        </button>
        </div>

        <div>
        {isLoading ? (
            <LoadingBadge />
        ) : (
        filteredFeedItems.slice(0, visibleCount).map((item, idx) => {        
        const imgSrc = extractImageSrc(item.description);
        // Determine if the article is boosted by checking if the title includes any boosted topic.
        const isBoosted = boostedTopics.some(topic =>
            item.title.toLowerCase().includes(topic)
        );

        const fullText = DOMPurify.sanitize(item.description, { ALLOWED_TAGS: [] });
        const excerpt = fullText.length > 150
          ? fullText.slice(0, 150) + '…'
          : fullText;

        return (
            <div key={idx} style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #333' }}>
            {imgSrc && (
                <img
                src={imgSrc}
                alt=""
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px 12px 0 0' }}
                />
            )}
            <div style={{ marginBottom: 10, fontSize: '0.85rem', color: '#888', display: 'flex', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                {item.category.toUpperCase()}
                </span>
                {isBoosted && (
                <span style={{ marginLeft: '8px', fontSize: '0.75rem' }}>
                    ✨ Boosted
                </span>
                )}
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{item.title}</h3>
            <p style={{ color: '#bbb' }}>{excerpt}</p>
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 6 }}>
                {new Date(item.published).toLocaleDateString()}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.9rem' }}>Read more →</a>
                <button
                onClick={() => handleTldrClick(item)}
                style={{
                    backgroundColor: '#222',
                    color: '#fff',
                    border: '1px solid #444',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    marginLeft: '8px',
                    cursor: 'pointer',
                }}
                >
                TL;DR
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                {['like', 'dislike', 'save', 'hide'].map(action => (
                    <button key={action} onClick={() => submitFeedback(item.link, action)} style={{
                    backgroundColor: feedback[item.link] === action ? '#2563eb' : '#222',
                    color: '#fff',
                    border: '1px solid #333',
                    padding: '4px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                    }}>
                    {action === 'like' && '❤️'}
                    {action === 'dislike' && '👎'}
                    {action === 'save' && '🔖'}
                    {action === 'hide' && '🚫'}
                    </button>
                ))}
                </div>
            </div>
            </div>  
        );
        })
    )}

    {showContinueOptions && !hasContinued && (
    <div style={{ textAlign: 'center', margin: '2rem 0' }}>
        <button onClick={() => setHasContinued(true)}>
        Continue Scrolling
        </button>
        <button onClick={() => {
        const topic = randomTopics[Math.floor(Math.random() * 3)]; // or open a picker
        setHasContinued(false);
        setVisibleCount(10);
        setShowContinueOptions(false);
        handleSearch(topic);
        }}>
        Try a Suggested Topic
        </button>
    </div>
    )}

        {!isLoading && hasSearched && query === lastQuery && filteredFeedItems.length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#555', marginTop: 20 }}>No results found for "{query}". Try a different topic below.</p>
        )}

        {!feedGenerated && (
          <button
            onClick={() => {
              handleSearch(boostedTopics[0]);
              setFeedGenerated(true);
            }}
            style={{
                display: 'block',
                margin: '100px auto',
                backgroundColor: '#000',
                color: '#fff',
                border: '1px solid #444',
                padding: '50px 50px',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '1rem',
                animation: 'pulse-glow 2s infinite',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#7c3aed';
                e.target.style.boxShadow = '0 0 15px rgba(124, 58, 237, 0.6)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#444';
                e.target.style.boxShadow = 'none';
                e.target.style.transform = 'scale(1)';
              }}          >
            Generate Feed
          </button>
        )}

        <div style={{ marginTop: 30 }}>
          <h1 style={{ fontSize: '1.75rem' }}>Suggested Topics:</h1>
          {randomTopics.map(tag => (
            <button
            key={tag}
            disabled={isLoading}
            onClick={() => {
                setFilter('all');
                setActiveTab('feed');
                setQuery(tag);
                handleSearch(tag, 'all');
            }}
            style={{
                backgroundColor: '#000',
                color: '#fff',
                border: '1px solid #444',
                padding: '10px 20px',
                marginRight: '10px',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
            }}
            onMouseEnter={(e) => {
                e.target.style.borderColor = '#7c3aed'; // Neon purple
                e.target.style.boxShadow = '0 0 0 2px rgba(124, 58, 237, 0.5)';
            }}
            onMouseLeave={(e) => {
                e.target.style.borderColor = '#444';
                e.target.style.boxShadow = 'none';
            }}
            >
            {tag}
            </button>
          ))}
          <SummaryModal
            isOpen={summaryModalOpen}
            onClose={() => setSummaryModalOpen(false)}
            content={currentSummary}
            />
        </div>
      </div>
    </div>
    
  );
}
