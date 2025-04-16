package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"gov-feed-aggregator/auth"
	"gov-feed-aggregator/feeds"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	err = auth.InitDB()
	if err != nil {
		log.Fatal("❌ Failed to connect to DB: ", err)
	}

	router := gin.Default()

	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	store := cookie.NewStore([]byte("some-secret-key"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode, // <- Crucial for localhost
		Secure:   false,                // <- Only false for HTTP (localhost)
	})
	router.Use(sessions.Sessions("govfeed_session", store))
	
	router.GET("/feed", func(c *gin.Context) {
		query := c.Query("query")
		filter := c.Query("filter")
	
		session := sessions.Default(c)
		userID := session.Get("user_id")
	
		// Handle "Saved" Tab: fetch saved articles from DB regardless of query
		if filter == "save" && userID != nil {
			rows, err := auth.DB.Query(`SELECT article_id FROM feedback WHERE user_id = $1 AND action = 'save'`, userID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve saved articles"})
				return
			}
			defer rows.Close()
	
			savedLinks := map[string]bool{}
			for rows.Next() {
				var articleID string
				rows.Scan(&articleID)
				savedLinks[articleID] = true
			}
	
			allItems, err := feeds.DeepSearch("")
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
	
			filtered := []feeds.FeedItem{}
			for _, item := range allItems {
				if savedLinks[item.Link] {
					filtered = append(filtered, item)
				}
			}
	
			c.JSON(http.StatusOK, filtered)
			return
		}
	
		// Default behavior: search
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter is required"})
			return
		}
	
		items, err := feeds.QuickSearch(query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		/* 🔁 Fallback to deep search if no title matches */
		if len(items) == 0 {
			items, err = feeds.DeepSearch(query)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
			
		if userID == nil {
			c.JSON(http.StatusOK, items)
			return
		}
	
		feedbackMap := make(map[string]string)
		rows, err := auth.DB.Query(`SELECT article_id, action FROM feedback WHERE user_id = $1`, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var articleID, action string
				rows.Scan(&articleID, &action)
				feedbackMap[articleID] = action
			}
		}
	
		filtered := []feeds.FeedItem{}
		for _, item := range items {
			action := feedbackMap[item.Link]
			if filter != "" && action != filter {
				continue
			}
			filtered = append(filtered, item)
		}
	
		c.JSON(http.StatusOK, filtered)
	})
	
			
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	router.POST("/signup", auth.SignupHandler)
	router.POST("/login", auth.LoginHandler)
	router.POST("/logout", auth.LogoutHandler)
	router.GET("/me", auth.GetCurrentUserHandler)
	router.POST("/feedback", auth.SubmitFeedbackHandler)
	router.GET("/feedback", auth.GetUserFeedbackHandler)
	router.GET("/boost-topics", auth.GetTopTopicsHandler)
	router.GET("/user-topics", auth.RequireLogin(), auth.GetUserTopics)
	router.POST("/onboarding", auth.OnboardingHandler)



	router.GET("/debug/session", func(c *gin.Context) {
		session := sessions.Default(c)
		log.Println("🧪 /feed user_id:", session.Get("user_id"))
		userID := session.Get("user_id")
		if userID == nil {
			c.JSON(401, gin.H{"error": "No session"})
		} else {
			c.JSON(200, gin.H{"user_id": userID})
		}
	})

	router.Run(":8080")
}
