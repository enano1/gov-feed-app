// src/Feed.jsx
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

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
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom && visibleCount < feedItems.length) {
        setVisibleCount(prev => prev + 10);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, feedItems, savedItems, activeTab]);

  const handleLogout = async () => {
    await fetch('http://localhost:8080/logout', { method: 'POST', credentials: 'include' });
    window.location.href = "/login";
  };

  const fetchSavedItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8080/feed?filter=save', { credentials: 'include' });
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
      const url = new URL('http://localhost:8080/feed');
      if (actualQuery) url.searchParams.set("query", actualQuery);
      if (currentFilter !== "all") url.searchParams.set("filter", currentFilter);
      const res = await fetch(url.toString(), { credentials: 'include' });
      let items = await res.json();

      if (boostedTopics.length > 0) {
        items.sort((a, b) => {
          const aScore = boostedTopics.some(topic => a.title.toLowerCase().includes(topic)) ? 1 : 0;
          const bScore = boostedTopics.some(topic => b.title.toLowerCase().includes(topic)) ? 1 : 0;
          return bScore - aScore;
        });
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

  const fallbackSuggestions = ["AI", "Defense", "Cybersecurity", "China", "Pentagon"];
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
  padding: '20px 40px',
  backgroundColor: '#111',
  color: '#fff',
  fontFamily: 'Inter, sans-serif'
}}>

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
  <h1 style={{ fontSize: '1.75rem' }}>GovTech Feed</h1>
  <button style={{
    padding: '8px 18px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '9999px',
    cursor: 'pointer'
  }} onClick={handleLogout}>Logout</button>
</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <button onClick={() => setActiveTab('feed')} disabled={activeTab === 'feed' || isLoading}>Feed</button>
          <button onClick={() => { setActiveTab('saved'); if (!hasLoadedSaved) fetchSavedItems(); }} disabled={activeTab === 'saved' || isLoading} style={{ marginLeft: 10 }}>Saved</button>
        </div>

        {activeTab === 'feed' && (
          <>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="like">Liked</option>
              <option value="dislike">Disliked</option>
              <option value="save">Starred</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ marginLeft: 10 }}>
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
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            cursor: 'pointer'
            }}
        >
            Search
        </button>
        </div>

      <div>
        {filteredFeedItems.slice(0, visibleCount).map((item, idx) => {
          const imgSrc = extractImageSrc(item.description);
          return (
            <div key={idx} style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #333' }}>
              <div style={{ marginBottom: 10, fontSize: '0.85rem', color: '#888' }}>
                <span style={{ backgroundColor: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                  {item.category.toUpperCase()}
                </span>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{item.title}</h3>
              <p style={{ color: '#bbb' }}>{DOMPurify.sanitize(item.description, { ALLOWED_TAGS: [] })}</p>
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 6 }}>
                {new Date(item.published).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.9rem' }}>Read more →</a>
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
        })}

        {!isLoading && hasSearched && query === lastQuery && filteredFeedItems.length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#555', marginTop: 20 }}>No results found for "{query}". Try a different topic below.</p>
        )}

        <div style={{ marginTop: 30 }}>
          <p style={{ fontWeight: 'bold', marginBottom: 5 }}>Suggested Topics:</p>
          {fallbackSuggestions.map(tag => (
            <button key={tag} disabled={isLoading} onClick={() => {
              setFilter('all');
              setActiveTab('feed');
              setQuery(tag);
              handleSearch(tag, 'all');
            }} style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '10px 20px', marginRight: '10px', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.95rem' }}>{tag}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
