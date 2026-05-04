package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"github.com/jomei/notionapi"
)

func TestPageConversion(t *testing.T) {
	// Try to load .env from parent or current dir
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	apiKey := os.Getenv("NOTION_API_KEY")
	if apiKey == "" {
		t.Skip("NOTION_API_KEY not set, skipping integration test")
	}

	client := notionapi.NewClient(notionapi.Token(apiKey))
	svc := &NotionService{
		client: client,
		db:     nil,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Test ListPages
	pages, err := svc.ListPages(ctx)
	if err != nil {
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "unauthorized") {
			t.Skipf("Notion API authentication failed (expected in some environments): %v", err)
		}
		t.Fatalf("ListPages failed: %v", err)
	}

	fmt.Println("=== Notion Pages List (via Service) ===")
	fmt.Printf("Found %d pages:\n", len(pages))
	for _, page := range pages {
		fmt.Printf("- [%s] PageID: %s (Last Edited: %s)\n", page.Title, page.ID, page.LastEditedAt)
	}
	fmt.Println("=======================================")
	fmt.Println("=== Generated Markdown End ===")
}
