package auth

import (
	"database/sql"
	"log"
	"net/http"
	"strings"
	"unicode"
	// "time"
	// "fmt"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"

)

type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func SignupHandler(c *gin.Context) {
	var creds Credentials
	if err := c.BindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	err := CreateUser(creds.Email, creds.Password)
	if err != nil {
		log.Printf("❌ Signup failed: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Signup failed"})
		return
	}

	// 🔐 Log the user in after signup
	userID, err := GetUserByEmailAndPassword(creds.Email, creds.Password)
	if err != nil {
		log.Printf("❌ Auto-login failed after signup: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Signup succeeded, but login failed"})
		return
	}

	session := sessions.Default(c)
	session.Set("user_id", userID)
	session.Save()

	c.JSON(http.StatusOK, gin.H{"message": "Signup + login successful"})
}

func LoginHandler(c *gin.Context) {
	var creds Credentials
	if err := c.BindJSON(&creds); err != nil {
		log.Println("⚠️ Invalid login payload")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	log.Printf("🔑 Attempting login: %s", creds.Email)

	userID, err := GetUserByEmailAndPassword(creds.Email, creds.Password)
	if err != nil {
		log.Printf("❌ Login failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	session := sessions.Default(c)
	session.Set("user_id", userID)
	session.Save()

	log.Printf("✅ Logged in user_id: %d", userID)
	c.JSON(http.StatusOK, gin.H{"message": "Login successful"})
	
}

func LogoutHandler(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	session.Save()
	c.JSON(http.StatusOK, gin.H{"message": "Logged out"})
}

func GetCurrentUserHandler(c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user_id": userID})
}

func SubmitFeedbackHandler(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("🔥 Panic in SubmitFeedbackHandler: %v", r)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal error"})
		}
	}()

	session := sessions.Default(c)
	userIDRaw := session.Get("user_id")
	if userIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}

	userID, ok := userIDRaw.(int)
	if !ok {
		log.Printf("❌ user_id in session is not an int: %#v", userIDRaw)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid session"})
		return
	}

	var input struct {
		ArticleID string  `json:"article_id"`
		Action    *string `json:"action"` // pointer to allow null for "unreact"
	}

	if err := c.BindJSON(&input); err != nil {
		log.Printf("❌ JSON bind failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	log.Printf("📥 Feedback received: user_id=%d, article_id=%s, action=%v", userID, input.ArticleID, input.Action)

	// ✅ Step 1: Get previous action if exists
	var prevAction string
	err := DB.QueryRow(`SELECT action FROM feedback WHERE user_id = $1 AND article_id = $2`, userID, input.ArticleID).Scan(&prevAction)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to fetch previous feedback: %v", err)
	}

	// ✅ Step 2: Handle "unreact" (null action = delete)
	if input.Action == nil {
		_, err := DB.Exec(`DELETE FROM feedback WHERE user_id = $1 AND article_id = $2`, userID, input.ArticleID)
		if err != nil {
			log.Printf("❌ DB delete failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove feedback"})
			return
		}

		// ✅ Step 3: Reverse topic scoring
		switch prevAction {
		case "like":
			go UpdateUserTopicsWithWeight(userID, input.ArticleID, -1)
		case "save":
			go UpdateUserTopicsWithWeight(userID, input.ArticleID, -2)
		case "dislike":
			go UpdateUserTopicsWithWeight(userID, input.ArticleID, +1)
		}

		c.JSON(http.StatusOK, gin.H{"message": "Feedback removed"})
		return
	}

	// ✅ Step 4: Validate action value before touching the DB
	allowed := map[string]bool{"like": true, "dislike": true, "save": true, "hide": true}
	if !allowed[*input.Action] {
		log.Printf("⚠️ Invalid action: %s", *input.Action)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action value"})
		return
	}

	// ✅ Step 5: Insert or update feedback
	_, err = DB.Exec(`
		INSERT INTO feedback (user_id, article_id, action)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, article_id)
		DO UPDATE SET action = EXCLUDED.action, created_at = NOW()
	`, userID, input.ArticleID, *input.Action)
	if err != nil {
		log.Printf("❌ DB insert/update failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save feedback"})
		return
	}

	// ✅ Step 6: Score adjustment
	weight := 0
	switch *input.Action {
	case "like":
		weight = 1
	case "save":
		weight = 2
	case "dislike":
		weight = -1
	}

	if weight != 0 {
		go UpdateUserTopicsWithWeight(userID, input.ArticleID, weight)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback recorded"})
}

func UpdateUserTopicsWithWeight(userID int, articleLink string, weight int) {
	log.Printf("📌 Updating topic scores with weight=%d for user_id=%d on article: %s", weight, userID, articleLink)

	// 1. Get article title
	var title string
	err := DB.QueryRow(`SELECT title FROM articles WHERE link = $1`, articleLink).Scan(&title)
	if err != nil {
		log.Printf("❌ Could not find article title for %s: %v", articleLink, err)
		return
	}

	// 2. Extract keywords
	keywords := extractKeywords(title)
	if len(keywords) == 0 {
		log.Printf("⚠️ No keywords extracted from title: %s", title)
		return
	}

	// 3. Apply weighted insert/update
	for _, kw := range keywords {
		_, err := DB.Exec(`
			INSERT INTO user_topic_preferences (user_id, topic, score)
			VALUES ($1, $2, $3)
			ON CONFLICT (user_id, topic)
			DO UPDATE SET score = user_topic_preferences.score + $3
		`, userID, kw, weight)

		if err != nil {
			log.Printf("❌ Failed to update topic score for %q: %v", kw, err)
		} else {
			log.Printf("✅ Updated topic %q by %+d for user %d", kw, weight, userID)
		}
	}
}

func GetUserFeedbackHandler(c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}

	filter := c.Query("filter")
	var rows *sql.Rows
	var err error

	if filter != "" {
		rows, err = DB.Query(`SELECT article_id, action FROM feedback WHERE user_id = $1 AND action = $2`, userID, filter)
	} else {
		rows, err = DB.Query(`SELECT article_id, action FROM feedback WHERE user_id = $1`, userID)
	}

	if err != nil {
		log.Printf("❌ DB feedback query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get feedback"})
		return
	}
	defer rows.Close()

	var feedback []map[string]string
	for rows.Next() {
		var articleID, action string
		if err := rows.Scan(&articleID, &action); err != nil {
			log.Printf("⚠️ Scan failed: %v", err)
			continue
		}
		feedback = append(feedback, map[string]string{
			"article_id": articleID,
			"action":     action,
		})
	}

	c.JSON(http.StatusOK, feedback)
}

func GetUserTopics(c *gin.Context) {
	session := sessions.Default(c)
	userIDRaw := session.Get("user_id")
	if userIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}

	userID, ok := userIDRaw.(int)
	if !ok {
		log.Printf("❌ user_id is not an int: %#v", userIDRaw)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Session cast error"})
		return
	}

	log.Printf("📦 Fetching topics for user_id: %d", userID)

	rows, err := DB.Query(`
		SELECT topic, score
		FROM user_topic_preferences
		WHERE user_id = $1
		ORDER BY score DESC
		LIMIT 10
	`, userID)
	if err != nil {
		log.Println("❌ DB query failed:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()

	results := []struct {
		Topic string `json:"topic"`
		Score int    `json:"score"`
	}{}

	for rows.Next() {
		var topic string
		var score int
		if err := rows.Scan(&topic, &score); err == nil {
			results = append(results, struct {
				Topic string `json:"topic"`
				Score int    `json:"score"`
			}{Topic: topic, Score: score})
		}
	}

	c.JSON(http.StatusOK, results)
}


// Inside auth/handlers.go
func GetTopTopicsHandler(c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get("user_id")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}

	rows, err := DB.Query(`
		SELECT topic FROM user_topic_preferences 
		WHERE user_id = $1 
		ORDER BY score DESC 
		LIMIT 5
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get topics"})
		return
	}
	defer rows.Close()

	var topics []string
	for rows.Next() {
		var topic string
		if err := rows.Scan(&topic); err == nil {
			topics = append(topics, topic)
		}
	}

	c.JSON(http.StatusOK, gin.H{"topics": topics})
}

func UpdateUserTopics(userID int, articleID string) {
	log.Printf("📌 Updating topic scores for user_id=%d on article: %s", userID, articleID)

	var title string
	err := DB.QueryRow(`SELECT title FROM articles WHERE link = $1`, articleID).Scan(&title)
	if err != nil {
		log.Printf("❌ Could not find article title for %s: %v", articleID, err)
		return
	}

	// Simple keyword extractor — you can improve this with NLP later
	keywords := extractKeywords(title)

	for _, keyword := range keywords {
		_, err := DB.Exec(`
			INSERT INTO user_topic_preferences (user_id, topic, score)
			VALUES ($1, $2, 1)
			ON CONFLICT (user_id, topic) DO UPDATE SET score = user_topic_preferences.score + 1
		`, userID, keyword)
		if err != nil {
			log.Printf("❌ Failed to update topic score for '%s': %v", keyword, err)
		}
	}
}

func extractKeywords(title string) []string {
	title = strings.ToLower(title)
	title = strings.TrimPrefix(title, "'")
	title = strings.TrimSuffix(title, "'")
	title = strings.ReplaceAll(title, "'", "")
	title = strings.ReplaceAll(title, ",", "")
	title = strings.ReplaceAll(title, ".", "")
	title = strings.ReplaceAll(title, ":", "")
	title = strings.ReplaceAll(title, ";", "")
	title = strings.ReplaceAll(title, "-", " ")
	title = strings.ReplaceAll(title, "—", " ")
	words := strings.FieldsFunc(title, func(r rune) bool {
		if r == '\'' {
			return true
		}
		return unicode.IsSpace(r)
	})

	stopwords := map[string]bool{
		"the": true, "and": true, "for": true, "with": true, "from": true,
		"that": true, "this": true, "about": true, "into": true, "their": true,
		"your": true, "they": true, "will": true, "have": true, "has": true,
	}

	var keywords []string
	for _, word := range words {
		if len(word) > 3 && !stopwords[word] {
			keywords = append(keywords, word)
		}
	}
	return keywords
}

func OnboardingHandler(c *gin.Context) {
	session := sessions.Default(c)
	userIDRaw := session.Get("user_id")
	if userIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}
	userID := userIDRaw.(int)

	var payload struct {
		Topics []string `json:"topics"`
		OrgURL string   `json:"org_url"` // optional
	}
	if err := c.BindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	for _, topic := range payload.Topics {
		DB.Exec(`
		  INSERT INTO user_topic_preferences (user_id, topic, score)
		  VALUES ($1, $2, 2)
		  ON CONFLICT (user_id, topic)
		  DO UPDATE SET score = user_topic_preferences.score + 2
		`, userID, strings.ToLower(topic))
	  }

	c.JSON(http.StatusOK, gin.H{"message": "Preferences saved"})
}

