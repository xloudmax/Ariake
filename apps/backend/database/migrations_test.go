package database

import (
	"testing"

	"repair-platform/models"
)

func TestRunMigrationsCreatesIndexesForResolvedTableNames(t *testing.T) {
	db, err := InitTestDB()
	if err != nil {
		t.Fatalf("init test db: %v", err)
	}

	stmt := tableName(db, &models.BlogPostLike{})
	if stmt != "blog_post_likes" {
		t.Fatalf("unexpected BlogPostLike table name: %s", stmt)
	}
	if tableName(db, &models.BlogPostComment{}) != "blog_post_comments" {
		t.Fatalf("unexpected BlogPostComment table name: %s", tableName(db, &models.BlogPostComment{}))
	}
	if tableName(db, &models.Notification{}) != "notifications" {
		t.Fatalf("unexpected Notification table name: %s", tableName(db, &models.Notification{}))
	}
	if joinTableName(db, &models.BlogPost{}, "TagsList") != "blog_post_tags" {
		t.Fatalf("unexpected BlogPost.TagsList join table: %s", joinTableName(db, &models.BlogPost{}, "TagsList"))
	}
	if joinTableName(db, &models.BlogPost{}, "CategoriesList") != "blog_post_categories" {
		t.Fatalf("unexpected BlogPost.CategoriesList join table: %s", joinTableName(db, &models.BlogPost{}, "CategoriesList"))
	}

	expectedIndexes := []string{
		"idx_blog_post_title",
		"idx_blog_post_like_post_user",
		"idx_blog_post_like_created_at",
		"idx_blog_post_comment_blog_post_id",
		"idx_blog_post_comment_like_comment_user",
		"idx_notification_recipient_id",
		"idx_notification_type",
		"idx_user_username",
		"idx_user_email",
	}

	for _, indexName := range expectedIndexes {
		var count int64
		if err := db.Raw(
			"SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = ?",
			indexName,
		).Scan(&count).Error; err != nil {
			t.Fatalf("query sqlite_master for %s: %v", indexName, err)
		}
		if count == 0 {
			t.Fatalf("expected index %s to exist", indexName)
		}
	}
}
