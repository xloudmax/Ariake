package tests

import (
	"repair-platform/models"
	"repair-platform/services"
	testing_helper "repair-platform/testing"
	"testing"
)

func TestBlogService_CreatePost(t *testing.T) {
	// 设置测试环境
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	// 创建博客服务
	blogService := services.NewBlogService(helper.DB)

	// 创建测试用户
	user, err := helper.CreateTestUser("bloguser", "bloguser@example.com", "password123", false)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	t.Run("成功创建文章", func(t *testing.T) {
		input := &models.CreatePostInput{
			Title:       "Test Post",
			Content:     "This is a test post content",
			Tags:        []string{"test", "blog"},
			Categories:  []string{"technology"},
			AccessLevel: "PUBLIC",
		}

		post, err := blogService.CreatePost(input, user.ID)
		if err != nil {
			t.Fatalf("Failed to create post: %v", err)
		}

		if post.Title != input.Title {
			t.Errorf("Expected title %s, got %s", input.Title, post.Title)
		}

		if post.Content != input.Content {
			t.Errorf("Expected content %s, got %s", input.Content, post.Content)
		}

		if post.AuthorID != user.ID {
			t.Errorf("Expected author ID %d, got %d", user.ID, post.AuthorID)
		}

		// 验证标签
		tags := post.GetTagsArray()
		if len(tags) != 2 {
			t.Errorf("Expected 2 tags, got %d", len(tags))
		}

		// 验证分类
		categories := post.GetCategoriesArray()
		if len(categories) != 1 {
			t.Errorf("Expected 1 category, got %d", len(categories))
		}

		// 验证状态
		if post.Status != "DRAFT" {
			t.Errorf("Expected status DRAFT, got %s", post.Status)
		}

		// 验证统计信息
		if post.Stats == nil {
			t.Error("Expected stats to be created")
		} else {
			if post.Stats.ViewCount != 0 {
				t.Errorf("Expected view count 0, got %d", post.Stats.ViewCount)
			}
			if post.Stats.LikeCount != 0 {
				t.Errorf("Expected like count 0, got %d", post.Stats.LikeCount)
			}
		}
	})

	t.Run("创建重复slug的文章", func(t *testing.T) {
		// 先创建一篇文章
		input1 := &models.CreatePostInput{
			Title:       "Test Post",
			Content:     "First post",
			AccessLevel: "PUBLIC",
		}

		post1, err := blogService.CreatePost(input1, user.ID)
		if err != nil {
			t.Fatalf("Failed to create first post: %v", err)
		}

		// 再创建一篇相同标题的文章
		input2 := &models.CreatePostInput{
			Title:       "Test Post",
			Content:     "Second post",
			AccessLevel: "PUBLIC",
		}

		post2, err := blogService.CreatePost(input2, user.ID)
		if err != nil {
			t.Fatalf("Failed to create second post: %v", err)
		}

		// 验证两个文章有不同的slug
		if post1.Slug == post2.Slug {
			t.Error("Expected different slugs for posts with same title")
		}
	})
}

func TestBlogService_UpdatePost(t *testing.T) {
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	blogService := services.NewBlogService(helper.DB)

	// 创建测试用户
	user, err := helper.CreateTestUser("bloguser", "bloguser@example.com", "password123", false)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// 创建初始文章
	input := &models.CreatePostInput{
		Title:       "Original Post",
		Content:     "Original content",
		Tags:        []string{"original"},
		AccessLevel: "PUBLIC",
	}

	post, err := blogService.CreatePost(input, user.ID)
	if err != nil {
		t.Fatalf("Failed to create post: %v", err)
	}

	t.Run("成功更新文章", func(t *testing.T) {
		updateInput := &models.UpdatePostInput{
			Title:       stringPtr("Updated Post"),
			Content:     stringPtr("Updated content"),
			Tags:        []string{"updated", "test"},
			AccessLevel: stringPtr("PRIVATE"),
		}

		updatedPost, err := blogService.UpdatePost(post.ID, updateInput, user.ID, user.Role)
		if err != nil {
			t.Fatalf("Failed to update post: %v", err)
		}

		if updatedPost.Title != "Updated Post" {
			t.Errorf("Expected title 'Updated Post', got %s", updatedPost.Title)
		}

		if updatedPost.Content != "Updated content" {
			t.Errorf("Expected content 'Updated content', got %s", updatedPost.Content)
		}

		// 验证标签更新
		tags := updatedPost.GetTagsArray()
		if len(tags) != 2 {
			t.Errorf("Expected 2 tags, got %d", len(tags))
		}

		// 验证访问级别更新
		if updatedPost.AccessLevel != "PRIVATE" {
			t.Errorf("Expected access level PRIVATE, got %s", updatedPost.AccessLevel)
		}

		// 验证最后编辑时间已更新
		if updatedPost.LastEditedAt == nil {
			t.Error("Expected LastEditedAt to be set")
		}
	})

	t.Run("非作者无法更新文章", func(t *testing.T) {
		// 创建另一个用户
		otherUser, err := helper.CreateTestUser("otheruser", "other@example.com", "password123", false)
		if err != nil {
			t.Fatalf("Failed to create other user: %v", err)
		}

		updateInput := &models.UpdatePostInput{
			Title: stringPtr("Hacked Post"),
		}

		_, err = blogService.UpdatePost(post.ID, updateInput, otherUser.ID, otherUser.Role)
		if err == nil {
			t.Error("Expected error when non-author tries to update post")
		}

		if err != models.ErrForbidden {
			t.Errorf("Expected ErrForbidden, got %v", err)
		}
	})

	t.Run("管理员可以更新任何文章", func(t *testing.T) {
		// 创建管理员用户
		adminUser, err := helper.CreateTestUser("admin", "admin@example.com", "admin123", true)
		if err != nil {
			t.Fatalf("Failed to create admin user: %v", err)
		}

		updateInput := &models.UpdatePostInput{
			Title: stringPtr("Admin Updated Post"),
		}

		updatedPost, err := blogService.UpdatePost(post.ID, updateInput, adminUser.ID, adminUser.Role)
		if err != nil {
			t.Fatalf("Admin should be able to update any post: %v", err)
		}

		if updatedPost.Title != "Admin Updated Post" {
			t.Errorf("Expected title 'Admin Updated Post', got %s", updatedPost.Title)
		}
	})
}

func TestBlogService_DeletePost(t *testing.T) {
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	blogService := services.NewBlogService(helper.DB)

	// 创建测试用户
	user, err := helper.CreateTestUser("bloguser", "bloguser@example.com", "password123", false)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// 创建文章
	input := &models.CreatePostInput{
		Title:       "Test Post",
		Content:     "Test content",
		AccessLevel: "PUBLIC",
	}

	post, err := blogService.CreatePost(input, user.ID)
	if err != nil {
		t.Fatalf("Failed to create post: %v", err)
	}

	t.Run("作者可以删除自己的文章", func(t *testing.T) {
		err := blogService.DeletePost(post.ID, user.ID, user.Role)
		if err != nil {
			t.Fatalf("Author should be able to delete their own post: %v", err)
		}

		// 验证文章已被删除
		var deletedPost models.BlogPost
		err = helper.DB.First(&deletedPost, post.ID).Error
		if err == nil {
			t.Error("Expected post to be deleted")
		}
	})

	t.Run("创建新文章测试其他删除场景", func(t *testing.T) {
		// 创建新文章
		newPost, err := blogService.CreatePost(input, user.ID)
		if err != nil {
			t.Fatalf("Failed to create post: %v", err)
		}

		// 创建另一个用户
		otherUser, err := helper.CreateTestUser("otheruser", "other@example.com", "password123", false)
		if err != nil {
			t.Fatalf("Failed to create other user: %v", err)
		}

		t.Run("非作者无法删除文章", func(t *testing.T) {
			err := blogService.DeletePost(newPost.ID, otherUser.ID, otherUser.Role)
			if err == nil {
				t.Error("Expected error when non-author tries to delete post")
			}

			if err != models.ErrForbidden {
				t.Errorf("Expected ErrForbidden, got %v", err)
			}
		})

		t.Run("管理员可以删除任何文章", func(t *testing.T) {
			// 创建管理员用户
			adminUser, err := helper.CreateTestUser("admin", "admin@example.com", "admin123", true)
			if err != nil {
				t.Fatalf("Failed to create admin user: %v", err)
			}

			err = blogService.DeletePost(newPost.ID, adminUser.ID, adminUser.Role)
			if err != nil {
				t.Fatalf("Admin should be able to delete any post: %v", err)
			}
		})
	})
}

func TestBlogService_PublishPost(t *testing.T) {
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	blogService := services.NewBlogService(helper.DB)

	// 创建测试用户
	user, err := helper.CreateTestUser("bloguser", "bloguser@example.com", "password123", false)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// 创建草稿文章
	input := &models.CreatePostInput{
		Title:       "Draft Post",
		Content:     "Draft content",
		AccessLevel: "PUBLIC",
	}

	post, err := blogService.CreatePost(input, user.ID)
	if err != nil {
		t.Fatalf("Failed to create post: %v", err)
	}

	t.Run("作者可以发布自己的文章", func(t *testing.T) {
		publishedPost, err := blogService.PublishPost(post.ID, user.ID, user.Role)
		if err != nil {
			t.Fatalf("Author should be able to publish their own post: %v", err)
		}

		if publishedPost.Status != "PUBLISHED" {
			t.Errorf("Expected status PUBLISHED, got %s", publishedPost.Status)
		}

		if publishedPost.PublishedAt == nil {
			t.Error("Expected PublishedAt to be set")
		}
	})
}

func TestBlogService_GetPostByID(t *testing.T) {
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	blogService := services.NewBlogService(helper.DB)

	// 创建测试用户
	user, err := helper.CreateTestUser("bloguser", "bloguser@example.com", "password123", false)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// 创建公开文章
	input := &models.CreatePostInput{
		Title:       "Public Post",
		Content:     "Public content",
		AccessLevel: "PUBLIC",
	}

	post, err := blogService.CreatePost(input, user.ID)
	if err != nil {
		t.Fatalf("Failed to create post: %v", err)
	}

	// 发布文章
	post, err = blogService.PublishPost(post.ID, user.ID, user.Role)
	if err != nil {
		t.Fatalf("Failed to publish post: %v", err)
	}

	t.Run("获取存在的文章", func(t *testing.T) {
		retrievedPost, err := blogService.GetPostByID(post.ID, &user.ID, user.Role, false)
		if err != nil {
			t.Fatalf("Failed to get post: %v", err)
		}

		if retrievedPost.ID != post.ID {
			t.Errorf("Expected post ID %d, got %d", post.ID, retrievedPost.ID)
		}

		if retrievedPost.Title != post.Title {
			t.Errorf("Expected title %s, got %s", post.Title, retrievedPost.Title)
		}
	})

	t.Run("获取不存在的文章", func(t *testing.T) {
		_, err := blogService.GetPostByID(999999, &user.ID, user.Role, false)
		if err == nil {
			t.Error("Expected error when getting non-existent post")
		}

		if err != models.ErrPostNotFound {
			t.Errorf("Expected ErrPostNotFound, got %v", err)
		}
	})
}

func TestBlogService_LikePost(t *testing.T) {
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	blogService := services.NewBlogService(helper.DB)

	// 创建测试用户
	user, err := helper.CreateTestUser("bloguser", "bloguser@example.com", "password123", false)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// 创建另一个用户用于点赞
	liker, err := helper.CreateTestUser("liker", "liker@example.com", "password123", false)
	if err != nil {
		t.Fatalf("Failed to create liker user: %v", err)
	}

	// 创建公开文章
	input := &models.CreatePostInput{
		Title:       "Likeable Post",
		Content:     "Likeable content",
		AccessLevel: "PUBLIC",
	}

	post, err := blogService.CreatePost(input, user.ID)
	if err != nil {
		t.Fatalf("Failed to create post: %v", err)
	}

	// 发布文章
	post, err = blogService.PublishPost(post.ID, user.ID, user.Role)
	if err != nil {
		t.Fatalf("Failed to publish post: %v", err)
	}

	t.Run("用户可以点赞文章", func(t *testing.T) {
		likedPost, err := blogService.LikePost(post.ID, liker.ID)
		if err != nil {
			t.Fatalf("Failed to like post: %v", err)
		}

		if likedPost.Stats.LikeCount != 1 {
			t.Errorf("Expected like count 1, got %d", likedPost.Stats.LikeCount)
		}
	})

	t.Run("同一用户不能重复点赞", func(t *testing.T) {
		_, err := blogService.LikePost(post.ID, liker.ID)
		if err == nil {
			t.Error("Expected error when liking post twice")
		}
	})
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}

// Helper function to create time pointer
