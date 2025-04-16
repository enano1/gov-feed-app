package feeds

import (
	"fmt"
	"strings"
	"sync"
	"time"
	"net/url"
	"net/http"
	"encoding/json"
	"sort"

	"github.com/mmcdole/gofeed"
	"gov-feed-aggregator/auth"
)

type FeedItem struct {
	Title       string    `json:"title"`
	Link        string    `json:"link"`
	Description string    `json:"description"`
	Published   time.Time `json:"published"`
	Category    string    `json:"category"`
}

/* ───────────────── RSS SOURCE LIST ───────────────────────── */

var sources = []string{
	// Defense news and military
	"https://www.defenseone.com/rss/all/",
	"https://breakingdefense.com/feed/",
	"https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
	"https://www.realcleardefense.com/index.xml",
	"https://www.army.mil/rss/static/85.xml",
	"https://www.rand.org/topics/national-security.xml",
	"https://www.af.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1",
	"https://www.popularmechanics.com/rss/all.xml",
	"https://www.defenceiq.com/rss/categories/air-forces-military-aircraft",
	"https://www.defenceiq.com/rss/categories/armoured-vehicles",
	"https://www.defenceiq.com/rss/categories/air-land-and-sea-defence-services",
	"https://www.defenceiq.com/rss/categories/defence-technology",
	"https://www.defenceiq.com/rss/categories/army-land-forces",
	"https://www.defenceiq.com/rss/categories/naval-maritime-defence",
	"https://www.defenceiq.com/rss/categories/cyber-defence-and-security",
	"https://oval.mitre.org/news/rss/ovalnews.feed.xml",
	"https://defence-blog.com/feed/",
	"https://www.army-technology.com/feed/",
	"https://www.airforce-technology.com/feed/",
	"https://www.naval-technology.com/news/feed/",
	"https://feeds.feedburner.com/defense-technology",
	"https://sociable.co/military-technology/feed/",
	"https://www.defenseone.com/rss/technology/",
	"https://defense-update.com/feed",
	"https://breakingdefense.com/full-rss-feed/?v=2",


	// Government Agencies
	"https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=800&Site=945&max=10",
	"https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=10&ContentType=1&Site=945",
	"https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=400&Site=945&max=10",
	"https://nexus.od.nih.gov/all/feed/",
	"https://www.ruralhealthinfo.org/rss/funding/types/grants-and-contracts.xml",

	// RSS from DOS


	// Grants
	"https://grants.nih.gov/podcasts/All_About_Grants/AAG_Feed.xml",
	"https://www.nsf.gov/rss/rss_www_events.xml",
	"https://www.nsf.gov/rss/rss_www_funding_pgm_annc_inf.xml",
	"https://www.nsf.gov/news/mmg/rss/rss_www_funding_upcoming.xml",
	"https://www.nsf.gov/rss/rss_www_news.xml",
	"https://www.ruralhealthinfo.org/rss/funding/types/grants-and-contracts.xml",

	// Ally / international defense
	"https://www.gov.uk/government/organisations/ministry-of-defence.atom",
	"https://natowatch.org/news.xml",
	"https://ukdefencejournal.org.uk/feed/",
	"https://bulgarianmilitary.com/feed/",
	"https://russiandefpolicy.com/feed/",

	// US‑based news
	"https://feeds.npr.org/1001/rss.xml",
	"https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
	"https://feeds.washingtonpost.com/rss/national",

	// International news
	"https://feeds.bbci.co.uk/news/world/rss.xml",
	"https://www.aljazeera.com/xml/rss/all.xml",

	// Tech
	"http://feeds.feedburner.com/TechCrunch/",
	"https://www.wired.com/feed/rss",
}

/* ───────────────── IN‑MEMORY CACHE ───────────────────────── */

var (
	sourceCache      = make(map[string][]*gofeed.Item)
	sourceCacheTimes = make(map[string]time.Time)
	cacheTTL         = 5 * time.Minute
	cacheMu          sync.Mutex
)

/* ───────────────── PUBLIC WRAPPERS ───────────────────────── */

// QuickSearch  ➜ phase‑1 (titles only)
func QuickSearch(query string) ([]FeedItem, error) {
	return fetchAndFilterFeeds(query, false)
}

// DeepSearch   ➜ phase‑2 (titles + descriptions)
func DeepSearch(query string) ([]FeedItem, error) {
	return fetchAndFilterFeeds(query, true)
}

/* ───────────────── CORE FETCH LOGIC ──────────────────────── */

func fetchRelatedTerms(query string) ([]string, error) {
    // Example using Datamuse API
    apiURL := fmt.Sprintf("https://api.datamuse.com/words?ml=%s", url.QueryEscape(query))
    resp, err := http.Get(apiURL)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var results []struct {
        Word string `json:"word"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
        return nil, err
    }

    var terms []string
    for _, result := range results {
        terms = append(terms, result.Word)
    }
    return terms, nil
}

func fetchAndFilterFeeds(query string, searchDescriptions bool) ([]FeedItem, error) {
	var wg sync.WaitGroup
	type ScoredItem struct {
		Item  FeedItem
		Score int
	}
	resultChan := make(chan ScoredItem, 1000)
	fp := gofeed.NewParser()

	// Expand search terms with Datamuse API
	expandedTerms := []string{strings.ToLower(query)}
	if synonyms, err := fetchRelatedTerms(query); err == nil {
		for _, word := range synonyms {
			expandedTerms = append(expandedTerms, strings.ToLower(word))
		}
	} else {
		fmt.Printf("⚠️ Failed to fetch related terms: %v\n", err)
	}

	seen := make(map[string]bool)
	var seenMu sync.Mutex
	start := time.Now()

	for _, url := range sources {
		wg.Add(1)
		go func(feedURL string) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("⚠️ Recovered from panic in %s: %v\n", feedURL, r)
				}
			}()

			var items []*gofeed.Item
			cacheMu.Lock()
			cachedItems, cached := sourceCache[feedURL]
			cacheTime := sourceCacheTimes[feedURL]
			cacheMu.Unlock()

			if cached && time.Since(cacheTime) < cacheTTL {
				items = cachedItems
			} else {
				feed, err := fp.ParseURL(feedURL)
				if err != nil {
					fmt.Printf("❌ Failed to connect: %s\n", feedURL)
					return
				}
				items = feed.Items
				cacheMu.Lock()
				sourceCache[feedURL] = items
				sourceCacheTimes[feedURL] = time.Now()
				cacheMu.Unlock()
			}

			for _, item := range items {
				title := strings.ToLower(item.Title)
				desc := strings.ToLower(item.Description)
				content := strings.ToLower(item.Content)

				score := 0
				for _, term := range expandedTerms {
					if strings.Contains(title, term) {
						score += 5
					}
					if searchDescriptions && (strings.Contains(desc, term) || strings.Contains(content, term)) {
						score += 3
					}
				}
				if score == 0 {
					continue
				}

				seenMu.Lock()
				if seen[item.Link] {
					seenMu.Unlock()
					continue
				}
				seen[item.Link] = true
				seenMu.Unlock()

				var published time.Time
				if item.PublishedParsed != nil {
					published = *item.PublishedParsed
				}

				go func(link, title string) {
					auth.DB.Exec(
						`INSERT INTO articles (link, title) VALUES ($1,$2) ON CONFLICT (link) DO NOTHING`,
						link, title,
					)
				}(item.Link, item.Title)

				resultChan <- ScoredItem{
					Item: FeedItem{
						Title:       item.Title,
						Link:        item.Link,
						Description: item.Description,
						Published:   published,
						Category:    classifyItem(item, feedURL),
					},
					Score: score,
				}
			}
		}(url)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	var scoredItems []ScoredItem
	for result := range resultChan {
		scoredItems = append(scoredItems, result)
	}

	// Sort by descending score
	sort.Slice(scoredItems, func(i, j int) bool {
		return scoredItems[i].Score > scoredItems[j].Score
	})

	results := make([]FeedItem, len(scoredItems))
	for i, entry := range scoredItems {
		results[i] = entry.Item
	}

	fmt.Printf("✅ Phase complete | DescSearch=%v | Feeds=%d | Results=%d | %v\n",
		searchDescriptions, len(sources), len(results), time.Since(start))

	return results, nil
}

/* ───────────────── CLASSIFIER ─────────────────────────────── */

func classifyItem(item *gofeed.Item, url string) string {
	lowerTitle := strings.ToLower(item.Title)
	lowerDesc := strings.ToLower(item.Description)
	lowerURL := strings.ToLower(url)

	domainCategories := map[string]string{
		"defenseone":       "News",
		"breakingdefense":  "News",
		"army.mil":         "News",
		"af.mil":           "News",
		"popularmechanics": "News",
		"rand.org":         "Think Tank",
		"mitre":            "Think Tank",
		"natowatch":        "Think Tank",
		"gov.uk":           "International",
	}

	for domain, category := range domainCategories {
		if strings.Contains(lowerURL, domain) {
			return category
		}
	}

	grantKeywords := []string{"grant", "funding opportunity", "apply now", "call for proposals"}
	for _, kw := range grantKeywords {
		if strings.Contains(lowerTitle, kw) || strings.Contains(lowerDesc, kw) {
			if kw == "grant" {
				return "Grant"
			}
			return "Gov Opportunity"
		}
	}
	return "Other"
}
