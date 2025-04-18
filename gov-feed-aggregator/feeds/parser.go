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
	"regexp"

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
	// "https://www.popularmechanics.com/rss/all.xml",
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
	// "https://feeds.feedburner.com/defense-technology",
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
	// "https://bulgarianmilitary.com/feed/",
	"https://russiandefpolicy.com/feed/",

	// US‑based news
	// "https://feeds.npr.org/1001/rss.xml",
	// "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
	// "https://feeds.washingtonpost.com/rss/national",

	// International news
	// "https://feeds.bbci.co.uk/news/world/rss.xml",
	// "https://www.aljazeera.com/xml/rss/all.xml",

	// Tech
	// "http://feeds.feedburner.com/TechCrunch/",
	// "https://www.wired.com/feed/rss",
	"https://www.nsf.gov/rss/rss_www_funding_pgm_annc_inf.xml",

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

func fetchAndFilterFeeds(query string, _ bool) ([]FeedItem, error) {

	/* 0. Empty → everything */
	if strings.TrimSpace(query) == "" {
		return fetchEverythingFromSources()
	}

	start      := time.Now()
	fp         := gofeed.NewParser()
	lq         := strings.ToLower(strings.TrimSpace(query))

	// --- decide mode ----------------------------------------------------
	useOR := strings.Contains(lq, ",") // ← comma means “alternatives”

	// --- build the list of search terms ---------------------------------
	lq = strings.ReplaceAll(lq, ",", " ")
	rawTerms := strings.Fields(lq)

	terms := []string{}
	for _, t := range rawTerms {
		if t != "" {
			terms = append(terms, t)
		}
	}
	if len(terms) == 0 {
		fmt.Println("⚠️  no terms after normalising query")
		return nil, nil
	}

	// pre‑compile boundary regexes
	termRegex := make([]*regexp.Regexp, len(terms))
	for i, t := range terms {
		termRegex[i] = regexp.MustCompile(`\b` + regexp.QuoteMeta(t) + `\b`)
	}
	exactPhrase := regexp.MustCompile(`\b` + regexp.QuoteMeta(strings.Join(terms, " ")) + `\b`)

	// ---------- rest identical to previous version ----------------------
	type scored struct {
		Item  FeedItem
		Score int
	}
	resCh := make(chan scored, 1000)
	var wg sync.WaitGroup
	seen  := map[string]bool{}
	var mu sync.Mutex

	for _, feedURL := range sources {
		wg.Add(1)
		go func(feedURL string) {
			defer wg.Done()

			/* cache‑aware fetch */
			var items []*gofeed.Item
			cacheMu.Lock()
			if it, ok := sourceCache[feedURL]; ok && time.Since(sourceCacheTimes[feedURL]) < cacheTTL {
				items = it
			}
			cacheMu.Unlock()

			if items == nil {
				feed, err := fp.ParseURL(feedURL)
				if err != nil {
					fmt.Printf("❌ fetch failed: %s: %v\n", feedURL, err)
					return
				}
				items = feed.Items
				cacheMu.Lock()
				sourceCache[feedURL] = items
				sourceCacheTimes[feedURL] = time.Now()
				cacheMu.Unlock()
			}

			/* score / filter */
			for _, it := range items {
				title := strings.ToLower(it.Title)

				keep := false
				if useOR {
					/* OR mode: keep if **any** term matches */
					for _, re := range termRegex {
						if re.MatchString(title) {
							keep = true
							break
						}
					}
				} else {
					/* AND mode: keep only if **all** terms match */
					keep = true
					for _, re := range termRegex {
						if !re.MatchString(title) {
							keep = false
							break
						}
					}
				}
				if !keep {
					continue
				}

				/* basic scoring */
				score := 5                                            // baseline
				if exactPhrase.MatchString(title) { score += 40 }     // full phrase
				score += 10 * len(title) / 1000                       // harmless tie‑breaker

				/* recency bump */
				var pub time.Time
				if it.PublishedParsed != nil {
					pub = *it.PublishedParsed
					if hrs := time.Since(pub).Hours(); hrs <= 24 {
						score += 5
					} else if hrs <= 72 {
						score += 2
					}
				}

				/* dedupe */
				mu.Lock()
				if seen[it.Link] { mu.Unlock(); continue }
				seen[it.Link] = true
				mu.Unlock()

				/* async DB insert */
				go func(l, t string) {
					auth.DB.Exec(`INSERT INTO articles (link,title)
					              VALUES ($1,$2) ON CONFLICT DO NOTHING`, l, t)
				}(it.Link, it.Title)

				resCh <- scored{
					Item: FeedItem{
						Title:       it.Title,
						Link:        it.Link,
						Description: it.Description,
						Published:   pub,
						Category:    classifyItem(it, feedURL),
					},
					Score: score,
				}
			}
		}(feedURL)
	}

	go func() { wg.Wait(); close(resCh) }()

	var all []scored
	for s := range resCh { all = append(all, s) }
	sort.Slice(all, func(i, j int) bool { return all[i].Score > all[j].Score })

	out := make([]FeedItem, len(all))
	for i, s := range all { out[i] = s.Item }

	fmt.Printf("✅ Search finished (%s) | %d results | %v\n",
		query, len(out), time.Since(start))
	return out, nil
}



func fetchEverythingFromSources() ([]FeedItem, error) {
	var wg sync.WaitGroup
	fp := gofeed.NewParser()
	resultChan := make(chan FeedItem, 1000)

	for _, url := range sources {
		wg.Add(1)
		go func(feedURL string) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("⚠️ Panic recovered in %s: %v\n", feedURL, r)
				}
			}()

			feed, err := fp.ParseURL(feedURL)
			if err != nil {
				fmt.Printf("❌ Failed to fetch %s\n", feedURL)
				return
			}

			for _, item := range feed.Items {
				var published time.Time
				if item.PublishedParsed != nil {
					published = *item.PublishedParsed
				}
				resultChan <- FeedItem{
					Title:       item.Title,
					Link:        item.Link,
					Description: item.Description,
					Published:   published,
					Category:    classifyItem(item, feedURL),
				}
			}
		}(url)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	var items []FeedItem
	for item := range resultChan {
		items = append(items, item)
	}
	return items, nil
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
