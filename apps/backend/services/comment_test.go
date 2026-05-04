package services

import (
	"repair-platform/models"
	"testing"
)

func TestCreateComment(t *testing.T) {
	db := setupBlogTestDB(t) // Reuse the blog test setup because comments need users and posts
	service := NewCommentService(db)
	blogService := NewBlogService(db)

	author := mustCreateTestUser(t, db, "comment_author", "user")

	postAuthor := mustCreateTestUser(t, db, "post_author", "user")

	postInput := &models.CreatePostInput{Title: "Post for Comments", Content: "Content", Status: "PUBLISHED"}
	post, _ := blogService.CreatePost(postInput, postAuthor.ID)

	// Valid comment
	input := &CreateCommentInput{
		BlogPostID: post.ID,
		Content:    "This is a test comment",
	}

	comment, err := service.CreateComment(input, author.ID)
	if err != nil {
		t.Fatalf("Failed to create comment: %v", err)
	}

	if comment.Content != "This is a test comment" {
		t.Errorf("Expected content 'This is a test comment', got '%s'", comment.Content)
	}
	if comment.UserID != author.ID {
		t.Errorf("Expected UserID %d, got %d", author.ID, comment.UserID)
	}
}

func TestUpdateComment(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewCommentService(db)
	blogService := NewBlogService(db)

	author := mustCreateTestUser(t, db, "comment_author", "user")

	postInput := &models.CreatePostInput{Title: "Post for Comments", Content: "Content", Status: "PUBLISHED"}
	post, _ := blogService.CreatePost(postInput, author.ID)

	input := &CreateCommentInput{BlogPostID: post.ID, Content: "Original Content"}
	comment, _ := service.CreateComment(input, author.ID)

	// User not author
	_, err := service.UpdateComment(comment.ID, "New Content", 999, "user")
	if err == nil {
		t.Fatal("Expected error updating comment as non-author")
	}

	// Author updating
	updated, err := service.UpdateComment(comment.ID, "Updated Content", author.ID, "user")
	if err != nil {
		t.Fatalf("Failed to update: %v", err)
	}
	if updated.Content != "Updated Content" {
		t.Errorf("Expected comment to be updated smoothly")
	}
}

func TestDeleteComment(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewCommentService(db)
	blogService := NewBlogService(db)

	author := mustCreateTestUser(t, db, "comment_author", "user")
	admin := mustCreateTestUser(t, db, "admin", "ADMIN")

	postInput := &models.CreatePostInput{Title: "Post for Comments", Content: "Content", Status: "PUBLISHED"}
	post, _ := blogService.CreatePost(postInput, author.ID)

	input := &CreateCommentInput{BlogPostID: post.ID, Content: "Content"}
	comment, _ := service.CreateComment(input, author.ID)

	// Delete as someone else
	err := service.DeleteComment(comment.ID, 999, "user")
	if err == nil {
		t.Fatal("Expected error deleting comment as non-author/non-admin")
	}

	// Delete as Admin
	err = service.DeleteComment(comment.ID, admin.ID, "ADMIN")
	if err != nil {
		t.Fatalf("Expected admin to delete comment, got: %v", err)
	}

	_, err = service.GetCommentByID(comment.ID)
	if err == nil {
		t.Fatal("Expected error retrieving deleted comment")
	}
}

func TestCommentLikeAndReport(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewCommentService(db)
	blogService := NewBlogService(db)

	author := mustCreateTestUser(t, db, "comment_author", "user")

	postInput := &models.CreatePostInput{Title: "Post", Content: "Content", Status: "PUBLISHED"}
	post, _ := blogService.CreatePost(postInput, author.ID)

	input := &CreateCommentInput{BlogPostID: post.ID, Content: "Content"}
	comment, _ := service.CreateComment(input, author.ID)

	// Like
	liked, err := service.LikeComment(comment.ID, author.ID)
	if err != nil || liked.LikeCount != 1 {
		t.Fatalf("Failed to like comment properly: %v", err)
	}

	// Unlike
	unliked, err := service.UnlikeComment(comment.ID, author.ID)
	if err != nil || unliked.LikeCount != 0 {
		t.Fatalf("Failed to unlike comment properly: %v", err)
	}

	// Report
	reported, err := service.ReportComment(comment.ID, author.ID)
	if err != nil || reported.ReportCount != 1 {
		t.Fatalf("Failed to report comment properly: %v", err)
	}
}

func TestCommentNestedReplies(t *testing.T) {
	db := setupBlogTestDB(t)
	service := NewCommentService(db)
	blogService := NewBlogService(db)

	author := mustCreateTestUser(t, db, "comment_author", "user")
	replier := mustCreateTestUser(t, db, "replier", "user")

	postInput := &models.CreatePostInput{Title: "Post", Content: "Content", Status: "PUBLISHED"}
	post, _ := blogService.CreatePost(postInput, author.ID)

	// Parent Comment
	input := &CreateCommentInput{BlogPostID: post.ID, Content: "Parent comment"}
	parent, _ := service.CreateComment(input, author.ID)

	// Reply to parent
	replyInput := &CreateCommentInput{BlogPostID: post.ID, Content: "Reply to parent", ParentID: &parent.ID}
	reply, err := service.CreateComment(replyInput, replier.ID)
	if err != nil {
		t.Fatalf("Failed to create reply: %v", err)
	}

	if *reply.ParentID != parent.ID {
		t.Errorf("Expected reply parent ID %d, got %v", parent.ID, reply.ParentID)
	}

	// Fetch comments and ensure nested replies load
	comments, total, err := service.GetCommentsByPostID(post.ID, 10, 0)
	if err != nil || total != 2 {
		t.Fatalf("Failed to get comments: %v", err)
	}

	// parent comment should exist at top level or in list
	foundReply := false
	for _, c := range comments {
		if c.ID == reply.ID {
			foundReply = true
		}
		if c.ID == parent.ID && len(c.Replies) > 0 {
			if c.Replies[0].ID == reply.ID {
				foundReply = true
			}
		}
	}
	if !foundReply {
		t.Errorf("Could not locate the reply nested within parent or flat list")
	}
}
