// feeds/federal.go
package feeds

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type FederalDoc struct {
	Title   string `json:"title"`
	HTMLURL string `json:"html_url"`
	Abstract string `json:"abstract"`
	PubDate string `json:"publication_date"`
}

type FederalResponse struct {
	Results []FederalDoc `json:"results"`
}

func FetchFederalDocs(query string) ([]FeedItem, error) {
	url := fmt.Sprintf("https://www.federalregister.gov/api/v1/documents.json?conditions[term]=%s&per_page=20", query)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var data FederalResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	var items []FeedItem
	for _, d := range data.Results {
		pubTime, _ := time.Parse("2006-01-02", d.PubDate)
		items = append(items, FeedItem{
			Title:       d.Title,
			Link:        d.HTMLURL,
			Description: d.Abstract,
			Published:   pubTime,
			Category:    "Federal Register",
		})
	}
	return items, nil
}
