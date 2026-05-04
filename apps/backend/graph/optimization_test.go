package graph_test

import (
	"fmt"
	"repair-platform/models"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestGraphQL_ListPosts_NPlusOne(t *testing.T) {
	c, db := setupMockSchema()

	// Seed multiple authors and posts
	now := time.Now()
	for i := 1; i <= 5; i++ {
		user := models.User{Username: fmt.Sprintf("author_%d", i), Role: "user"}
		db.Create(&user)

		for j := 1; j <= 3; j++ {
			postID := i*10 + j
			db.Create(&models.BlogPost{
				Title:       fmt.Sprintf("Post %d", postID),
				Slug:        fmt.Sprintf("post-%d", postID),
				Content:     "DataLoader testing",
				Status:      "PUBLISHED",
				AccessLevel: "PUBLIC",
				AuthorID:    user.ID,
				PublishedAt: &now,
			})
		}
	}

	// Register a plugin to count GORM queries
	var queryCount int
	db.Callback().Query().After("gorm:query").Register("query_counter", func(db *gorm.DB) {
		// Ignore sqlite internal metadata queries
		sql := db.Statement.SQL.String()
		if sql != "" {
			queryCount++
		}
	})

	type QueryResponse struct {
		Posts []struct {
			Id     string
			Title  string
			Author struct {
				Id       string
				Username string
			}
			Stats struct {
				ViewCount int
			}
			Versions []struct {
				VersionNum int
			}
		}
	}

	var resp QueryResponse
	q := `
		query {
			posts(limit: 15, offset: 0, filter: {status: PUBLISHED}) {
				id
				title
				author {
					id
					username
				}
				stats {
					viewCount
				}
				versions {
					versionNum
				}
			}
		}`

	// Reset counter before request
	queryCount = 0

	err := c.Post(q, &resp)
	require.NoError(t, err)

	assert.Equal(t, 15, len(resp.Posts))

	// If N+1 was present, we would have 1 query for posts + 15 for authors + 15 for stats + 15 for versions = ~46 queries
	// With Dataloader, it should be 1 query for posts + 1 for authors + 1 for stats + 1 for versions = ~4 queries
	// Provide a safe threshold (e.g., < 10) to account for some additional inner queries
	require.Less(t, queryCount, 10, "Query count exceeded optimal batching expectations, possible N+1 regression")
}
