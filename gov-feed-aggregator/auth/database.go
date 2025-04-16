package auth

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB
var dbSemaphore = make(chan struct{}, 10) // adjust 10 based on your load


func InitDB() error {
	var err error
	dsn := os.Getenv("DATABASE_URL")

	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to DB: %w", err)
	}

	DB.SetMaxOpenConns(10)

	DB.SetMaxIdleConns(5)

	DB.SetConnMaxLifetime(30 * time.Minute)

	// ✅ Fix 4: Ensure DB connection is valid
	if err := DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping DB: %w", err)
	}

	return nil
}

func CreateUser(email, password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = DB.Exec(`INSERT INTO users (email, password) VALUES ($1, $2)`, email, string(hashedPassword))
	return err
}

func GetUserByEmailAndPassword(email, password string) (int, error) {
	var userID int
	var hashedPassword string

	err := DB.QueryRow(`SELECT id, password FROM users WHERE email = $1`, email).Scan(&userID, &hashedPassword)
	if err != nil {
		return 0, err
	}

	// Compare hash
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return 0, fmt.Errorf("invalid password")
	}

	return userID, nil
}

func SaveFeedback(userID int, articleID string, action string) error {
	dbSemaphore <- struct{}{} // acquire
	defer func() { <-dbSemaphore }() // release

	_, err := DB.Exec(`
		INSERT INTO feedback (user_id, article_id, action)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, userID, articleID, action)
	return err
}


func GetFeedback(userID int) ([]map[string]string, error) {
	dbSemaphore <- struct{}{}
	defer func() { <-dbSemaphore }()

	rows, err := DB.Query(`
		SELECT article_id, action FROM feedback WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var feedback []map[string]string
	for rows.Next() {
		var articleID, action string
		if err := rows.Scan(&articleID, &action); err != nil {
			return nil, err
		}
		feedback = append(feedback, map[string]string{
			"article_id": articleID,
			"action":     action,
		})
	}
	return feedback, nil
}
