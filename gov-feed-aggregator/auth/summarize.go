package auth

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type SummarizeRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Link    string `json:"link"` // Add this so we can uniquely identify the article
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIRequest struct {
	Model     string    `json:"model"`
	Messages  []Message `json:"messages"`
	MaxTokens int       `json:"max_tokens"`
}

type OpenAIResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

func SummarizeHandler(c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}

	uid, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Session ID invalid"})
		return
	}

	if !AllowRequest(uid) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded. Try again later."})
		return
	}

	var req SummarizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 1. Check if summary exists in DB
	var cached string
	err := DB.QueryRow(`SELECT summary FROM summaries WHERE article_link = $1`, req.Link).Scan(&cached)
	if err == nil {
		c.JSON(http.StatusOK, gin.H{"summary": cached})
		return
	} else if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	// 2. Create prompt
	prompt := "Summarize the following article titled \"" + req.Title + "\" in 3 bullet points:\n\n" + req.Content

	openAIReq := OpenAIRequest{
		Model: "gpt-3.5-turbo",
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		MaxTokens: 150,
	}

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(openAIReq); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encoding failed"})
		return
	}

	request, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", buf)
	request.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_API_KEY"))
	request.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to contact OpenAI"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var aiResp OpenAIResponse
	if err := json.Unmarshal(body, &aiResp); err != nil || len(aiResp.Choices) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "OpenAI response error"})
		return
	}

	summary := aiResp.Choices[0].Message.Content

	// 3. Save to DB
	_, _ = DB.Exec(`INSERT INTO summaries (article_link, summary, created_at)
					VALUES ($1, $2, $3)
					ON CONFLICT (article_link) DO NOTHING`,
		req.Link, summary, time.Now())

	c.JSON(http.StatusOK, gin.H{"summary": summary})
}
