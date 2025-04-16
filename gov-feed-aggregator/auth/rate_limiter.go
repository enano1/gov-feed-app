package auth

import (
	"sync"
	"time"
)

type UserRateLimiter struct {
	Requests   int
	ResetAt    time.Time
}

var (
	rateLimitMu sync.Mutex
	userLimits  = make(map[int]*UserRateLimiter)
)

const maxRequestsPerMinute = 3
const windowDuration = time.Minute

func AllowRequest(userID int) bool {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()

	now := time.Now()
	limiter, exists := userLimits[userID]
	if !exists || now.After(limiter.ResetAt) {
		userLimits[userID] = &UserRateLimiter{
			Requests: 1,
			ResetAt:  now.Add(windowDuration),
		}
		return true
	}

	if limiter.Requests < maxRequestsPerMinute {
		limiter.Requests++
		return true
	}

	return false
}
