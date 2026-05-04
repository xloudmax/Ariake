package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"repair-platform/models"
	"testing"
	"time"
)

func TestExportDataToJSON(t *testing.T) {
	db := setupBlogTestDB(t)

	// Create an author and a published post
	author := mustCreateTestUser(t, db, "deploy_author", "user")

	now := time.Now()
	post := models.BlogPost{
		Title:       "Deploy Post",
		Slug:        "deploy-post",
		Content:     "Content for deploy",
		Status:      "PUBLISHED",
		AccessLevel: "PUBLIC",
		AuthorID:    author.ID,
		Author:      *author,
		Tags:        "go,deploy",
		Categories:  "tech",
		PublishedAt: &now,
	}
	db.Create(&post)

	stats := models.BlogPostStats{
		BlogPostID: post.ID,
		ViewCount:  100,
	}
	db.Create(&stats)

	svc := NewDeployService(db)

	tempDir := t.TempDir()
	err := svc.ExportDataToJSON(tempDir)
	if err != nil {
		t.Fatalf("ExportDataToJSON failed: %v", err)
	}

	// Verify posts.json
	postsJSONPath := filepath.Join(tempDir, "static", "posts.json")
	data, err := os.ReadFile(postsJSONPath)
	if err != nil {
		t.Fatalf("Failed to read posts.json: %v", err)
	}

	var exportedPosts []StaticPost
	if err := json.Unmarshal(data, &exportedPosts); err != nil {
		t.Fatalf("Failed to unmarshal posts.json: %v", err)
	}

	if len(exportedPosts) != 1 {
		t.Errorf("Expected 1 exported post, got %d", len(exportedPosts))
	} else if exportedPosts[0].Slug != "deploy-post" {
		t.Errorf("Expected post slug 'deploy-post', got '%s'", exportedPosts[0].Slug)
	}

	// Verify post specific json
	postDetailPath := filepath.Join(tempDir, "static", "posts", "deploy-post.json")
	if _, err := os.Stat(postDetailPath); os.IsNotExist(err) {
		t.Errorf("Expected detail json file %s to exist", postDetailPath)
	}

	// Verify dashboard.json
	dashboardPath := filepath.Join(tempDir, "static", "dashboard.json")
	dashData, err := os.ReadFile(dashboardPath)
	if err != nil {
		t.Fatalf("Failed to read dashboard.json: %v", err)
	}

	var dashboard map[string]interface{}
	if err := json.Unmarshal(dashData, &dashboard); err != nil {
		t.Fatalf("Failed to unmarshal dashboard.json: %v", err)
	}

	tags, ok := dashboard["tags"].([]interface{})
	if !ok {
		t.Fatalf("Tags missing from dashboard export or invalid type")
	}

	if len(tags) != 2 {
		t.Errorf("Expected 2 tags, got %d", len(tags))
	}
}

func TestExtractStaticTags(t *testing.T) {
	posts := []StaticPost{
		{Tags: "a,b,c"},
		{Tags: "b,c, d "}, // Note the spaces
		{Tags: ""},
	}

	tags := extractStaticTags(posts)
	tagMap := make(map[string]int)
	for _, t := range tags {
		name := t["name"].(string)
		count := t["count"].(int)
		tagMap[name] = count
	}

	if tagMap["a"] != 1 {
		t.Errorf("Expected tag 'a' count 1, got %d", tagMap["a"])
	}
	if tagMap["b"] != 2 {
		t.Errorf("Expected tag 'b' count 2, got %d", tagMap["b"])
	}
	if tagMap["c"] != 2 {
		t.Errorf("Expected tag 'c' count 2, got %d", tagMap["c"])
	}
	if tagMap["d"] != 1 {
		t.Errorf("Expected tag 'd' count 1, got %d", tagMap["d"])
	}
}
