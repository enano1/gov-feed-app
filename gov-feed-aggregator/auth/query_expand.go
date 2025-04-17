package auth

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"log"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type ExpandQueryRequest struct {
	Query string `json:"query"`
}

type ExpandResponse struct {
	Keywords string `json:"keywords"` // Comma-separated keywords
}

func QueryExpansionHandler(c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}

	var req ExpandQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query"})
		return
	}

	// ✂️ Check if it's one word
	wordCount := len(strings.Fields(req.Query))
	if wordCount <= 1 {
		log.Printf("🧃 Skipped OpenAI: simple query detected [%s]", req.Query)
		c.JSON(http.StatusOK, ExpandResponse{Keywords: req.Query})
		return
	}

	log.Printf("🔮 Using OpenAI to expand query: [%s]", req.Query)

	// 🧠 Proceed with OpenAI
	prompt := "Extract 3-5 relevant keywords (comma-separated) from this query for search filtering:\n\n\"" + req.Query + "\""

	openAIReq := map[string]interface{}{
		"model": "gpt-3.5-turbo",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"max_tokens": 40,
	}

	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(openAIReq)

	request, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", buf)
	request.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_API_KEY"))
	request.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(request)
	if err != nil {
		log.Printf("❌ OpenAI request failed for query: [%s]", req.Query)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "OpenAI request failed"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &parsed); err != nil || len(parsed.Choices) == 0 {
		log.Printf("❌ OpenAI response parsing failed for query: [%s]", req.Query)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse OpenAI response"})
		return
	}

	keywords := parsed.Choices[0].Message.Content
	log.Printf("✅ OpenAI keywords extracted: %s", keywords)

	c.JSON(http.StatusOK, ExpandResponse{Keywords: keywords})
}

// ✅ Helper
func splitWords(s string) []string {
	var words []string
	for _, w := range bytes.Fields([]byte(s)) {
		words = append(words, string(w))
	}
	return words
}
