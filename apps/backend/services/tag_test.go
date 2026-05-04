package services

import (
	"repair-platform/models"
	"strings"
	"testing"
)

func TestDeleteUnusedTagsAndCategories(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewTagService(db)

	db.Create(&models.Tag{Name: "UsedTag"})
	db.Create(&models.Tag{Name: "UnusedTag"})
	db.Create(&models.Category{Name: "UsedCategory"})
	db.Create(&models.Category{Name: "UnusedCategory"})

	author := mustCreateTestUser(t, db, "author", "user")

	blogService := NewBlogService(db)
	postInput := &models.CreatePostInput{
		Title:      "Test Post",
		Content:    "Content",
		Status:     "PUBLISHED",
		Tags:       []string{"UsedTag"},
		Categories: []string{"UsedCategory"},
	}
	_, err := blogService.CreatePost(postInput, author.ID)
	if err != nil {
		t.Fatalf("Failed to create post: %v", err)
	}

	// Delete unused tags
	tagDeleted, err := service.DeleteUnusedTags()
	if err != nil {
		t.Fatalf("Failed to delete unused tags: %v", err)
	}
	if tagDeleted != 1 {
		t.Errorf("Expected 1 unused tag to be deleted, got %d", tagDeleted)
	}

	// Verify UsedTag remains
	var remainingTags []models.Tag
	db.Find(&remainingTags)
	if len(remainingTags) != 1 || remainingTags[0].Name != "UsedTag" {
		t.Errorf("Expected only 'UsedTag' to remain")
	}

	// Delete unused categories
	catDeleted, err := service.DeleteUnusedCategories()
	if err != nil {
		t.Fatalf("Failed to delete unused categories: %v", err)
	}
	if catDeleted != 1 {
		t.Errorf("Expected 1 unused category to be deleted, got %d", catDeleted)
	}
}

func TestMergeTags(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewTagService(db)
	blogService := NewBlogService(db)

	db.Create(&models.Tag{Name: "React"})
	db.Create(&models.Tag{Name: "reactjs"})

	author := mustCreateTestUser(t, db, "author", "user")

	postInput := &models.CreatePostInput{
		Title:   "Test Post",
		Content: "Content",
		Status:  "PUBLISHED",
		Tags:    []string{"reactjs"},
	}
	post, _ := blogService.CreatePost(postInput, author.ID)

	// Merge reactjs -> React
	err := service.MergeTags("reactjs", "React")
	if err != nil {
		t.Fatalf("Failed to merge tags: %v", err)
	}

	// Verify post now uses 'React'
	var verifyPost models.BlogPost
	db.Preload("TagsList").First(&verifyPost, post.ID) // Note: Gorm Preload("Tags") might not apply since Tags is a text field, but we assume basic scan works.

	if !strings.Contains(verifyPost.Tags, "React") {
		t.Errorf("Expected post to be tagged with 'React' after merge, got: %s", verifyPost.Tags)
	}

	// Verify old tag is gone
	var oldTag models.Tag
	if err := db.Where("name = ?", "reactjs").First(&oldTag).Error; err == nil {
		t.Error("Expected old tag 'reactjs' to be deleted or merged out")
	}
}

func TestBatchUpdateTags(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewTagService(db)
	blogService := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author", "user")

	postInput := &models.CreatePostInput{
		Title:   "Test Post",
		Content: "Content",
		Status:  "PUBLISHED",
		Tags:    []string{"Existing"},
	}
	post, _ := blogService.CreatePost(postInput, author.ID)

	// Batch Add
	err := service.BatchUpdateTags([]uint{post.ID}, []string{"New Tag"}, "ADD")
	if err != nil {
		t.Fatalf("Failed to batch update tags: %v", err)
	}

	var verifyPost models.BlogPost
	db.First(&verifyPost, post.ID)

	tagsArr := strings.Split(verifyPost.Tags, ",")
	if len(tagsArr) != 2 {
		t.Errorf("Expected 2 tags, got %d. Tags: %s", len(tagsArr), verifyPost.Tags)
	}
}
