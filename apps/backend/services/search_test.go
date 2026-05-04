package services

import (
	"fmt"
	"os"
	"testing"
	"time"

	"repair-platform/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

const ftsIntegrationEnv = "RUN_FTS_INTEGRATION"

func testTableName(t *testing.T, db *gorm.DB, model interface{}) string {
	stmt := &gorm.Statement{DB: db}
	if err := stmt.Parse(model); err != nil {
		t.Fatalf("resolve table name for %T: %v", model, err)
	}
	return stmt.Schema.Table
}

func setupFTSDB(t *testing.T) *gorm.DB {
	if os.Getenv(ftsIntegrationEnv) != "1" {
		t.Skipf("%s=1 is required to run FTS integration tests", ftsIntegrationEnv)
	}

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.BlogPost{}, &models.BlogPostStats{}, &models.SearchQuery{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	postTable := testTableName(t, db, &models.BlogPost{})

	// create FTS virtual table
	if err := db.Exec(fmt.Sprintf(
		"CREATE VIRTUAL TABLE blog_post_fts USING fts5(title, content, tags, categories, content='%s', content_rowid='id')",
		postTable,
	)).Error; err != nil {
		t.Skipf("fts5 not available: %v", err)
	}
	return db
}

func TestSearchServiceRefreshesFTSSupport(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&models.BlogPost{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	service := NewSearchService(db)
	if service.supportsFTS() {
		t.Fatalf("expected FTS to be unavailable before virtual table exists")
	}

	postTable := testTableName(t, db, &models.BlogPost{})
	if err := db.Exec(fmt.Sprintf(
		"CREATE VIRTUAL TABLE blog_post_fts USING fts5(title, content, tags, categories, content='%s', content_rowid='id')",
		postTable,
	)).Error; err != nil {
		t.Skipf("fts5 not available: %v", err)
	}

	if service.supportsFTS() {
		t.Fatalf("expected cached FTS support to remain false before refresh")
	}

	if !service.RefreshFTSSupport() {
		t.Fatalf("expected FTS support refresh to detect virtual table")
	}
}

func TestAdvancedSearchUsesFTS(t *testing.T) {
	db := setupFTSDB(t)

	author := models.User{Username: "author", Email: "a@example.com", IsVerified: true, Role: "USER"}
	if err := db.Create(&author).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	post := models.BlogPost{
		Title:       "Hello World",
		Content:     "This is an FTS test post",
		AuthorID:    author.ID,
		AccessLevel: "PUBLIC",
		Status:      "PUBLISHED",
		PublishedAt: func() *time.Time { t := time.Now(); return &t }(),
	}
	if err := db.Create(&post).Error; err != nil {
		t.Fatalf("create post: %v", err)
	}
	// insert into FTS table manually
	if err := db.Exec("INSERT INTO blog_post_fts(rowid, title, content, tags, categories) VALUES (?, ?, ?, ?, ?)", post.ID, post.Title, post.Content, post.Tags, post.Categories).Error; err != nil {
		t.Fatalf("insert fts: %v", err)
	}

	service := NewSearchService(db)
	res, err := service.AdvancedSearchPosts("Hello", 10, 0, nil, "USER")
	if err != nil {
		t.Fatalf("search err: %v", err)
	}
	if res.Total != 1 || len(res.Posts) != 1 {
		t.Fatalf("expected 1 result, got total=%d len=%d", res.Total, len(res.Posts))
	}
	if res.Posts[0].ID != post.ID {
		t.Fatalf("unexpected post id %d", res.Posts[0].ID)
	}
}
