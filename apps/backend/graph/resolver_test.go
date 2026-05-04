package graph_test

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"repair-platform/database"
	"repair-platform/graph"
	"repair-platform/models"
	"testing"
	"time"

	"github.com/99designs/gqlgen/client"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func randomString() string {
	return fmt.Sprintf("%d", rand.Int63())
}

// setupMockSchema builds an executable schema attached to a clean in-memory sqlite connection.
func setupMockSchema() (*client.Client, *gorm.DB) {
	// Use a unique DSN per invocation to avoid cache=shared lock contention
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=private", randomString())
	db, _ := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{SingularTable: true},
	})

	// Enable WAL mode for concurrent access
	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA busy_timeout=5000")

	database.RunMigrations(db)

	// We pass nil for external services in this basic test
	resolver := graph.NewResolver(db, nil, nil)
	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	handlerWrapper := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = r
		c.Set("db", db)

		loader := graph.NewDataLoader(db)
		ctx := context.WithValue(r.Context(), graph.GinContextKey, c)
		ctx = context.WithValue(ctx, graph.LoaderKey, loader)
		r = r.WithContext(ctx)

		srv.ServeHTTP(w, r)
	})

	c := client.New(handlerWrapper)
	return c, db
}

func TestGraphQL_ListPosts(t *testing.T) {
	c, db := setupMockSchema()

	// Seed some DB records
	user := models.User{Username: "graphql_tester", Role: "user"}
	db.Create(&user)

	now := time.Now()
	db.Create(&models.BlogPost{
		Title:       "GQL Post",
		Slug:        "gql-post",
		Content:     "Content",
		Status:      "PUBLISHED",
		AccessLevel: "PUBLIC",
		AuthorID:    user.ID,
		PublishedAt: &now,
	})

	type QueryResponse struct {
		Posts []struct {
			Id    string
			Title string
		}
	}

	var resp QueryResponse
	q := `
		query {
			posts(limit: 10, offset: 0, filter: {status: PUBLISHED}) {
				id
				title
			}
		}`

	err := c.Post(q, &resp)
	require.NoError(t, err)

	assert.Equal(t, 1, len(resp.Posts))
	assert.Equal(t, "GQL Post", resp.Posts[0].Title)
}
