import { useState, useEffect } from 'react';
import './App.css';
import DOMPurify from 'dompurify';
import Login from './Login';
import Signup from './Signup';

function extractImageSrc(html) {
  const match = html.match(/<img.*?src=['"](.*?)['"]/);
  return match ? match[1] : null;
}

function App() {
  const [query, setQuery] = useState('');
  const [feedItems, setFeedItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [lastQuery, setLastQuery] = useState('');
  const [view, setView] = useState('loading');
  const [feedback, setFeedback] = useState({});
  const [activeTab, setActiveTab] = useState('feed');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8080/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        console.log("✅ Logged in user:", data.user_id);
        setView('feed');
      })
      .catch(() => setView('login'));
  }, []);

  useEffect(() => {
    if (view === 'feed') {
      fetch('http://localhost:8080/feedback', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          const map = {};
          data.forEach(f => map[f.article_id] = f.action);
          setFeedback(map);
        });
    }
  }, [view]);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom && visibleCount < filteredFeedItems.length) {
        setVisibleCount(prev => prev + 10);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, feedItems, savedItems, activeTab]);

  const handleLogout = async () => {
    await fetch('http://localhost:8080/logout', { method: 'POST', credentials: 'include' });
    setView('login');
    setQuery('');
    setLastQuery('');
    setFeedItems([]);
    setSavedItems([]);
    setHasSearched(false);
    setVisibleCount(10);
    setFeedback({});
    setHasLoadedSaved(false);
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
      if (currentFilter && currentFilter !== "all") {
        url.searchParams.set("filter", currentFilter);
      }
      const res = await fetch(url.toString(), { credentials: 'include' });
      const data = await res.json();
      setFeedItems(Array.isArray(data) ? data : []);
      setLastQuery(actualQuery);
      setQuery(actualQuery);
    } catch (error) {
      console.error("Error fetching feed:", error);
      setFeedItems([]);
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

  if (view === 'loading') return <p>Loading...</p>;
  if (view === 'login') return <Login onLogin={() => setView('feed')} switchToSignup={() => setView('signup')} />;
  if (view === 'signup') return <Signup onSignup={() => setView('feed')} switchToLogin={() => setView('login')} />;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Defense & Gov Feed</h1>
      <button onClick={handleLogout} style={{ marginBottom: 10 }}>Logout</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <button
            onClick={() => setActiveTab('feed')}
            disabled={activeTab === 'feed' || isLoading}
          >Feed</button>

          <button
            onClick={() => {
              setActiveTab('saved');
              if (!hasLoadedSaved) fetchSavedItems();
            }}
            disabled={activeTab === 'saved' || isLoading}
            style={{ marginLeft: 10 }}
          >Saved</button>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', padding: '12px 20px', border: '1px solid #ddd', borderRadius: '9999px', backgroundColor: '#fff' }}>
        <input type="text" placeholder="What are you looking for?" value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', padding: '10px 0', backgroundColor: 'transparent', color: '#333' }} />
        <button onClick={() => handleSearch()} disabled={isLoading} style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.95rem' }}>Search</button>
      </div>

      <div>
        {filteredFeedItems.slice(0, visibleCount).map((item, idx) => {
          const imgSrc = extractImageSrc(item.description);
          return (
            <div key={idx} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 15, marginBottom: 10 }}>
              {imgSrc && <img src={imgSrc} alt="" style={{ maxWidth: '100%', height: 'auto', marginBottom: 10, borderRadius: 8 }} />}
              <h3>{item.title}</h3>
              <p>{DOMPurify.sanitize(item.description, { ALLOWED_TAGS: [] })}</p>
              <p><strong>{item.category}</strong> | {new Date(item.published).toLocaleDateString()}</p>
              <a href={item.link} target="_blank" rel="noreferrer">Read more</a>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                {['like', 'dislike', 'save', 'hide'].map(action => (
                  <button key={action} onClick={() => submitFeedback(item.link, action)} style={{ backgroundColor: feedback[item.link] === action ? '#cce5ff' : '#eee', border: '1px solid #aaa', padding: '5px 10px', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {action === 'like' && '👍'}
                    {action === 'dislike' && '👎'}
                    {action === 'save' && '⭐'}
                    {action === 'hide' && '🧹'}
                  </button>
                ))}
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

export default App;