package services

import (
	"repair-platform/models"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func setupBlogTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		t.Fatalf("Failed to connect database: %v", err)
	}

	// 自动迁移模式，包括 Tag 和 Join Table
	if err := db.AutoMigrate(
		&models.User{},
		&models.BlogPost{},
		&models.BlogPostStats{},
		&models.Tag{},
		&models.Category{},
		&models.BlogPostVersion{},
		&models.BlogPostLike{},
		&models.BlogPostComment{},
		&models.BlogPostCommentLike{},
	); err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	return db
}

func TestCreatePost(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	// 创建作者
	author := models.User{Username: "testauthor", Email: "test@example.com", Role: "ADMIN"}
	db.Create(&author)

	// 测试输入
	input := &models.CreatePostInput{
		Title:       "Test Post",
		Content:     "Content of test post",
		Tags:        []string{"Go", "Testing"},
		AccessLevel: "PUBLIC",
		Status:      "PUBLISHED",
	}

	// 执行创建
	post, err := service.CreatePost(input, author.ID)
	if err != nil {
		t.Fatalf("CreatePost failed: %v", err)
	}

	// 验证基本字段
	if post.Title != input.Title {
		t.Errorf("Expected title %s, got %s", input.Title, post.Title)
	}
	if post.Slug == "" {
		t.Error("Excluded slug to be generated")
	}

	// 验证关联统计表是否创建
	var stats models.BlogPostStats
	if err := db.Where("blog_post_id = ?", post.ID).First(&stats).Error; err != nil {
		t.Errorf("Stats not created: %v", err)
	}

	// 验证标签是否正确保存到关联表
	var count int64
	db.Table("blog_post_tags").Where("blog_post_id = ?", post.ID).Count(&count)
	if count != 2 {
		t.Errorf("Expected 2 tags in join table, got %d", count)
	}
}

func TestUpdatePost(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author", "ADMIN")

	// 先创建
	input := &models.CreatePostInput{Title: "Original", Content: "Old Content"}
	post, _ := service.CreatePost(input, author.ID)

	// 更新
	newTitle := "Updated Title"
	newContent := "New Content"
	updateInput := &models.UpdatePostInput{
		Title:   &newTitle,
		Content: &newContent,
	}

	updatedPost, err := service.UpdatePost(post.ID, updateInput, author.ID, "ADMIN")
	if err != nil {
		t.Fatalf("UpdatePost failed: %v", err)
	}

	if updatedPost.Title != newTitle {
		t.Errorf("Title not updated")
	}

	// 验证版本历史
	var versions []models.BlogPostVersion
	db.Where("blog_post_id = ?", post.ID).Find(&versions)
	if len(versions) != 1 {
		t.Errorf("Expected 1 version history, got %d", len(versions))
	}
	if versions[0].Content != "Old Content" {
		t.Errorf("Expected version to store old content")
	}
}

func TestUpdatePostClearsTagsAndCategories(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author_clear_tags", "ADMIN")
	post, err := service.CreatePost(&models.CreatePostInput{
		Title:      "Tagged Post",
		Content:    "Content",
		Tags:       []string{"Go", "GraphQL"},
		Categories: []string{"Backend"},
	}, author.ID)
	if err != nil {
		t.Fatalf("CreatePost failed: %v", err)
	}

	updateInput := &models.UpdatePostInput{
		Tags:       []string{},
		Categories: []string{},
	}

	updatedPost, err := service.UpdatePost(post.ID, updateInput, author.ID, "ADMIN")
	if err != nil {
		t.Fatalf("UpdatePost failed: %v", err)
	}
	if updatedPost.Tags != "" {
		t.Fatalf("expected tags to be cleared, got %q", updatedPost.Tags)
	}
	if updatedPost.Categories != "" {
		t.Fatalf("expected categories to be cleared, got %q", updatedPost.Categories)
	}

	var tagCount int64
	if err := db.Table("blog_post_tags").Where("blog_post_id = ?", post.ID).Count(&tagCount).Error; err != nil {
		t.Fatalf("count tag join rows: %v", err)
	}
	if tagCount != 0 {
		t.Fatalf("expected 0 tag associations, got %d", tagCount)
	}

	var categoryCount int64
	if err := db.Table("blog_post_categories").Where("blog_post_id = ?", post.ID).Count(&categoryCount).Error; err != nil {
		t.Fatalf("count category join rows: %v", err)
	}
	if categoryCount != 0 {
		t.Fatalf("expected 0 category associations, got %d", categoryCount)
	}
}

func TestDeletePost(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author", "ADMIN")

	input := &models.CreatePostInput{Title: "To Be Deleted", Content: "Content"}
	post, _ := service.CreatePost(input, author.ID)

	// User not author
	err := service.DeletePost(post.ID, 999, "user")
	if err == nil {
		t.Fatal("expected error deleting another user's post as non-admin")
	}

	// Author deleting
	err = service.DeletePost(post.ID, author.ID, "user")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	// Verify it's soft deleted
	var checkPost models.BlogPost
	if err := db.First(&checkPost, post.ID).Error; err == nil {
		t.Fatal("expected post to be soft deleted")
	}
}

func TestPostStateTransitions(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author", "ADMIN")

	input := &models.CreatePostInput{Title: "Draft Post", Content: "Content", Status: "DRAFT"}
	post, _ := service.CreatePost(input, author.ID)

	// Publish
	published, err := service.PublishPost(post.ID, author.ID, "ADMIN")
	if err != nil {
		t.Fatalf("Failed to publish: %v", err)
	}
	if published.Status != "PUBLISHED" || published.PublishedAt == nil {
		t.Error("expected PUBLISHED status and non-nil PublishedAt")
	}

	// Archive
	archived, err := service.ArchivePost(post.ID, author.ID, "ADMIN")
	if err != nil {
		t.Fatalf("Failed to archive: %v", err)
	}
	if archived.Status != "ARCHIVED" {
		t.Error("expected ARCHIVED status")
	}
}

func TestPostLikes(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author", "user")
	liker := mustCreateTestUser(t, db, "liker", "user")

	input := &models.CreatePostInput{Title: "Like Post", Content: "Content"}
	post, _ := service.CreatePost(input, author.ID)

	// Like
	likedPost, err := service.LikePost(post.ID, liker.ID)
	if err != nil {
		t.Fatalf("Failed to like post: %v", err)
	}
	if likedPost.Stats.LikeCount != 1 {
		t.Errorf("Expected 1 like, got %d", likedPost.Stats.LikeCount)
	}

	// Like again (should fail)
	_, err = service.LikePost(post.ID, liker.ID)
	if err == nil {
		t.Fatal("Expected error liking already liked post")
	}

	// Unlike
	unlikedPost, err := service.UnlikePost(post.ID, liker.ID)
	if err != nil {
		t.Fatalf("Failed to unlike post: %v", err)
	}
	if unlikedPost.Stats.LikeCount != 0 {
		t.Errorf("Expected 0 likes, got %d", unlikedPost.Stats.LikeCount)
	}
}

func TestPostAccess(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author", "user")
	reader := mustCreateTestUser(t, db, "reader", "user")

	// Draft post
	input := &models.CreatePostInput{Title: "Draft", Content: "C", Status: "DRAFT", AccessLevel: "PUBLIC"}
	draft, _ := service.CreatePost(input, author.ID)

	// Published private post
	input2 := &models.CreatePostInput{Title: "Private", Content: "C", Status: "PUBLISHED", AccessLevel: "PRIVATE"}
	private, _ := service.CreatePost(input2, author.ID)

	// Published public post
	input3 := &models.CreatePostInput{Title: "Public", Content: "C", Status: "PUBLISHED", AccessLevel: "PUBLIC"}
	public, _ := service.CreatePost(input3, author.ID)

	// reader trying to view draft -> forbidden
	_, err := service.GetPostByID(draft.ID, &reader.ID, reader.Role, true)
	if err == nil {
		t.Fatal("Expected forbidden viewing draft")
	}

	// author viewing draft -> success
	_, err = service.GetPostByID(draft.ID, &author.ID, author.Role, true)
	if err != nil {
		t.Fatalf("Expected author to view draft, got %v", err)
	}

	// reader viewing private -> forbidden
	_, err = service.GetPostByID(private.ID, &reader.ID, reader.Role, true)
	if err == nil {
		t.Fatal("Expected forbidden viewing private post")
	}

	// reader viewing public -> success
	_, err = service.GetPostByID(public.ID, &reader.ID, reader.Role, true)
	if err != nil {
		t.Fatalf("Expected success viewing public post, got %v", err)
	}
}

func TestRestorePostVersion(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewBlogService(db)

	author := mustCreateTestUser(t, db, "author", "ADMIN")

	// Create original
	input := &models.CreatePostInput{Title: "Original", Content: "Old Content"}
	post, _ := service.CreatePost(input, author.ID)

	// Update to v2
	newTitle := "Updated Title"
	newContent := "New Content"
	updateInput := &models.UpdatePostInput{
		Title:   &newTitle,
		Content: &newContent,
	}
	updatedPost, _ := service.UpdatePost(post.ID, updateInput, author.ID, "ADMIN")

	// Get versions
	versions, err := service.GetPostVersions(updatedPost.ID, author.ID, "ADMIN")
	if err != nil || len(versions) == 0 {
		t.Fatalf("Expected versions to exist")
	}

	// Restore to v1
	v1 := versions[0]
	restored, err := service.RestorePostVersion(updatedPost.ID, v1.ID, author.ID, "ADMIN")
	if err != nil {
		t.Fatalf("Failed to restore version: %v", err)
	}

	if restored.Title != "Original" || restored.Content != "Old Content" {
		t.Errorf("Expected content to be restored to 'Old Content', got: %s", restored.Content)
	}
}
