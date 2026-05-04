package database

import (
	"errors"
	"fmt"
	"repair-platform/models"
	"strings"

	"gorm.io/gorm"
)

func tableName(db *gorm.DB, model interface{}) string {
	stmt := &gorm.Statement{DB: db}
	if err := stmt.Parse(model); err != nil {
		panic(fmt.Sprintf("failed to resolve table name for %T: %v", model, err))
	}
	return stmt.Schema.Table
}

func joinTableName(db *gorm.DB, model interface{}, relationName string) string {
	stmt := &gorm.Statement{DB: db}
	if err := stmt.Parse(model); err != nil {
		panic(fmt.Sprintf("failed to resolve schema for %T: %v", model, err))
	}

	relation, ok := stmt.Schema.Relationships.Relations[relationName]
	if !ok || relation == nil || relation.JoinTable == nil {
		panic(fmt.Sprintf("failed to resolve join table for %T.%s", model, relationName))
	}

	return relation.JoinTable.Table
}

// RunMigrations 执行数据库迁移
func RunMigrations(db *gorm.DB) error {
	driverName := db.Dialector.Name()

	// 1. 基础模型自动迁移 (跨数据库兼容)
	err := db.AutoMigrate(
		&models.User{},
		&models.BlogPost{},
		&models.BlogPostStats{},
		&models.BlogPostVersion{},
		&models.BlogPostLike{},
		&models.BlogPostComment{},
		&models.BlogPostCommentLike{},
		&models.InviteCode{},
		&models.PasswordResetToken{},
		&models.RefreshToken{},
		&models.SearchQuery{},
		&models.Notification{},
		&models.Tag{},
		&models.Category{},
		&models.Setting{},
		&models.FileMeta{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate base models: %w", err)
	}

	// 2. 针对 Postgres 的高级特性模型迁移
	if driverName == "postgres" {
		// Use raw SQL instead of AutoMigrate to avoid Gorm's internal
		// ALTER TABLE DROP CONSTRAINT (without IF EXISTS) which fails on stale schemas.
		if err := migrateGraphRAGTables(db); err != nil {
			return fmt.Errorf("failed to migrate knowledge graph models: %w", err)
		}
	}

	// 迁移现有数据的冗余字段到Stats表
	if err := migrateRedundantBlogPostData(db); err != nil {
		return err
	}

	// 创建搜索优化索引
	if err := createSearchIndexes(db); err != nil {
		return err
	}

	// 创建全文搜索索引 (针对 SQLite)
	if driverName == "sqlite" {
		if err := createFullTextSearchIndexes(db); err != nil {
			fmt.Printf("Warning: SQLite FTS5 creation failed: %v\n", err)
		}
	}

	// 创建评论相关索引
	if err := createCommentIndexes(db); err != nil {
		return err
	}

	// 创建通知相关索引
	if err := createNotificationIndexes(db); err != nil {
		return err
	}

	// 迁移标签和分类数据
	if err := migrateTagsAndCategories(db); err != nil {
		return err
	}

	// 初始化知识图谱全文搜索 (Postgres 专用)
	if driverName == "postgres" {
		if err := initKnowledgeGraphFTS(db); err != nil {
			fmt.Printf("Warning: Knowledge graph FTS initialization failed: %v\n", err)
		}
	}

	return nil
}

// createSearchIndexes 创建搜索相关的数据库索引
func createSearchIndexes(db *gorm.DB) error {
	postTable := tableName(db, &models.BlogPost{})
	statsTable := tableName(db, &models.BlogPostStats{})
	likesTable := tableName(db, &models.BlogPostLike{})
	userTable := tableName(db, &models.User{})

	// 为博客文章创建搜索索引
	indexes := []string{
		// 标题搜索索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_title ON %s(title)", postTable),

		// 内容搜索索引 (部分数据库版本可能不支持函数索引)
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_content_prefix ON %s(content)", postTable),

		// 标签搜索索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_tags ON %s(tags)", postTable),

		// 分类搜索索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_categories ON %s(categories)", postTable),

		// 状态和访问级别组合索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_status_access ON %s(status, access_level)", postTable),

		// 作者ID索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_author_id ON %s(author_id)", postTable),

		// 创建时间索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_created_at ON %s(created_at DESC)", postTable),

		// 发布时间索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_published_at ON %s(published_at DESC)", postTable),

		// 博客文章统计表索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_stats_blog_post_id ON %s(blog_post_id)", statsTable),
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_stats_like_count ON %s(like_count DESC)", statsTable),
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_stats_view_count ON %s(view_count DESC)", statsTable),

		// 点赞表索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_like_post_user ON %s(blog_post_id, user_id)", likesTable),
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_like_created_at ON %s(created_at DESC)", likesTable),

		// 用户表搜索索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_user_username ON \"%s\"(username)", userTable),
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_user_email ON \"%s\"(email)", userTable),

		// 复合索引：状态+访问级别+创建时间（常用查询组合）
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_status_access_created ON %s(status, access_level, created_at DESC)", postTable),
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			// 记录警告但不中断，某些复杂的索引语法可能在特定版本的数据库中不兼容
			fmt.Printf("Warning: Failed to create index [%s]: %v\n", indexSQL, err)
			continue
		}
	}

	return nil
}

// createFullTextSearchIndexes 创建全文搜索索引
func createFullTextSearchIndexes(db *gorm.DB) error {
	postTable := tableName(db, &models.BlogPost{})

	// 首先尝试创建全文搜索虚拟表
	createFTSTable := fmt.Sprintf(`CREATE VIRTUAL TABLE IF NOT EXISTS blog_post_fts USING fts5(
		title,
		content,
		tags,
		categories,
		content='%s',
		content_rowid='id'
	)`, postTable)

	if err := db.Exec(createFTSTable).Error; err != nil {
		// 如果FTS表创建失败，仅记录警告并返回，不要报错导致程序退出
		fmt.Printf("⚠️ 警告: 无法创建全文搜索虚拟表 (可能缺少 FTS5 支持): %v\n", err)
		return nil
	}

	// 对于 SQLite，我们可以创建虚拟表来支持全文搜索
	sqliteFullTextIndexes := []string{
		// 创建触发器保持同步（INSERT）
		fmt.Sprintf(`CREATE TRIGGER IF NOT EXISTS blog_post_ai AFTER INSERT ON %s BEGIN
			INSERT INTO blog_post_fts(rowid, title, content, tags, categories)
			VALUES (new.id, new.title, new.content, new.tags, new.categories);
		END`, postTable),

		// 创建触发器保持同步（DELETE）
		fmt.Sprintf(`CREATE TRIGGER IF NOT EXISTS blog_post_ad AFTER DELETE ON %s BEGIN
			INSERT INTO blog_post_fts(blog_post_fts, rowid, title, content, tags, categories)
			VALUES('delete', old.id, old.title, old.content, old.tags, old.categories);
		END`, postTable),

		// 创建触发器保持同步（UPDATE）
		fmt.Sprintf(`CREATE TRIGGER IF NOT EXISTS blog_post_au AFTER UPDATE ON %s BEGIN
			INSERT INTO blog_post_fts(blog_post_fts, rowid, title, content, tags, categories)
			VALUES('delete', old.id, old.title, old.content, old.tags, old.categories);
			INSERT INTO blog_post_fts(rowid, title, content, tags, categories)
			VALUES(new.id, new.title, new.content, new.tags, new.categories);
		END`, postTable),
	}
	for _, indexSQL := range sqliteFullTextIndexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			// 如果也失败，继续但不报错
			continue
		}
	}

	return nil
}

// createCommentIndexes 创建评论相关的数据库索引
func createCommentIndexes(db *gorm.DB) error {
	commentTable := tableName(db, &models.BlogPostComment{})
	commentLikeTable := tableName(db, &models.BlogPostCommentLike{})

	// 为博客文章评论创建索引
	indexes := []string{
		// 博客文章ID索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_blog_post_id ON %s(blog_post_id)", commentTable),

		// 用户ID索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_user_id ON %s(user_id)", commentTable),

		// 父评论ID索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_parent_id ON %s(parent_id)", commentTable),

		// 创建时间索引（用于排序）
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_created_at ON %s(created_at DESC)", commentTable),

		// 是否已审核索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_is_approved ON %s(is_approved)", commentTable),

		// 点赞数索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_like_count ON %s(like_count DESC)", commentTable),

		// 评论点赞表索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_like_comment_user ON %s(blog_post_comment_id, user_id)", commentLikeTable),
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_blog_post_comment_like_created_at ON %s(created_at DESC)", commentLikeTable),
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			// 记录错误但不中断，某些索引可能已存在
			continue
		}
	}

	return nil
}

// createNotificationIndexes 创建通知相关的数据库索引
func createNotificationIndexes(db *gorm.DB) error {
	notificationTable := tableName(db, &models.Notification{})

	// 为通知创建索引
	indexes := []string{
		// 接收者ID索引（用于查询用户的通知）
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_notification_recipient_id ON %s(recipient_id)", notificationTable),

		// 接收者ID和已读状态组合索引（用于查询未读通知）
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_notification_recipient_is_read ON %s(recipient_id, is_read)", notificationTable),

		// 关联文章ID索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_notification_related_post_id ON %s(related_post_id)", notificationTable),

		// 关联评论ID索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_notification_related_comment_id ON %s(related_comment_id)", notificationTable),

		// 关联用户ID索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_notification_related_user_id ON %s(related_user_id)", notificationTable),

		// 创建时间索引（用于排序）
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_notification_created_at ON %s(created_at DESC)", notificationTable),

		// 通知类型索引
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_notification_type ON %s(type)", notificationTable),
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			// 记录错误但不中断，某些索引可能已存在
			continue
		}
	}

	return nil
}

// DropSearchIndexes 删除搜索索引（用于回滚）
func DropSearchIndexes(db *gorm.DB) error {
	postTable := tableName(db, &models.BlogPost{})

	indexes := []string{
		"DROP INDEX IF EXISTS idx_blog_post_title",
		"DROP INDEX IF EXISTS idx_blog_post_content_prefix",
		"DROP INDEX IF EXISTS idx_blog_post_tags",
		"DROP INDEX IF EXISTS idx_blog_post_categories",
		"DROP INDEX IF EXISTS idx_blog_post_status_access",
		"DROP INDEX IF EXISTS idx_blog_post_author_id",
		"DROP INDEX IF EXISTS idx_blog_post_created_at",
		"DROP INDEX IF EXISTS idx_blog_post_published_at",
		"DROP INDEX IF EXISTS idx_blog_post_stats_blog_post_id",
		"DROP INDEX IF EXISTS idx_blog_post_stats_like_count",
		"DROP INDEX IF EXISTS idx_blog_post_stats_view_count",
		"DROP INDEX IF EXISTS idx_blog_post_like_post_user",
		"DROP INDEX IF EXISTS idx_blog_post_like_created_at",
		"DROP INDEX IF EXISTS idx_user_username",
		"DROP INDEX IF EXISTS idx_user_email",
		"DROP INDEX IF EXISTS idx_blog_post_status_access_created",
		"DROP INDEX IF EXISTS idx_blog_post_search_vector",
		// 评论相关索引
		"DROP INDEX IF EXISTS idx_blog_post_comment_blog_post_id",
		"DROP INDEX IF EXISTS idx_blog_post_comment_user_id",
		"DROP INDEX IF EXISTS idx_blog_post_comment_parent_id",
		"DROP INDEX IF EXISTS idx_blog_post_comment_created_at",
		"DROP INDEX IF EXISTS idx_blog_post_comment_is_approved",
		"DROP INDEX IF EXISTS idx_blog_post_comment_like_count",
		"DROP INDEX IF EXISTS idx_blog_post_comment_like_comment_user",
		"DROP INDEX IF EXISTS idx_blog_post_comment_like_created_at",
	}

	for _, indexSQL := range indexes {
		db.Exec(indexSQL)
	}

	// 删除全文搜索相关的对象
	fullTextObjects := []string{
		"DROP TRIGGER IF EXISTS blog_post_search_vector_trigger",
		"DROP FUNCTION IF EXISTS update_blog_post_search_vector",
		fmt.Sprintf("ALTER TABLE %s DROP COLUMN IF EXISTS search_vector", postTable),
		"DROP TABLE IF EXISTS blog_post_fts",
		"DROP TRIGGER IF EXISTS blog_post_ai",
		"DROP TRIGGER IF EXISTS blog_post_ad",
		"DROP TRIGGER IF EXISTS blog_post_au",
	}

	for _, objectSQL := range fullTextObjects {
		db.Exec(objectSQL)
	}

	return nil
}

// migrateRedundantBlogPostData 迁移BlogPost模型中的冗余统计数据到BlogPostStats表
func migrateRedundantBlogPostData(db *gorm.DB) error {
	// 创建一个临时结构体来读取老的BlogPost数据（包含冗余字段）
	type OldBlogPost struct {
		ID        uint `gorm:"primaryKey"`
		ViewCount int  `gorm:"default:0"`
		Likes     int  `gorm:"default:0"`
	}

	// 检查是否存在老的ViewCount和Likes字段
	var hasViewCount, hasLikes bool

	// 检查ViewCount字段是否存在
	if db.Migrator().HasColumn(&models.BlogPost{}, "view_count") {
		hasViewCount = true
	}

	// 检查Likes字段是否存在
	if db.Migrator().HasColumn(&models.BlogPost{}, "likes") {
		hasLikes = true
	}

	// 如果没有这些字段，跳过迁移
	if !hasViewCount && !hasLikes {
		return nil
	}

	// 开始迁移过程
	fmt.Println("开始迁移BlogPost冗余统计数据到BlogPostStats表...")

	// 获取所有BlogPost记录
	var oldPosts []OldBlogPost
	query := db.Table(tableName(db, &models.BlogPost{})).Select("id")

	if hasViewCount {
		query = query.Select("id, view_count")
	}
	if hasLikes {
		if hasViewCount {
			query = query.Select("id, view_count, likes")
		} else {
			query = query.Select("id, likes")
		}
	}

	if err := query.Find(&oldPosts).Error; err != nil {
		return fmt.Errorf("获取BlogPost数据失败: %w", err)
	}

	// 在事务中执行迁移
	return db.Transaction(func(tx *gorm.DB) error {
		for _, oldPost := range oldPosts {
			// 检查是否已存在Stats记录
			var existingStats models.BlogPostStats
			err := tx.Where("blog_post_id = ?", oldPost.ID).First(&existingStats).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Stats记录不存在，创建新的
				newStats := &models.BlogPostStats{
					BlogPostID:   oldPost.ID,
					ViewCount:    0,
					LikeCount:    0,
					ShareCount:   0,
					CommentCount: 0,
				}

				// 迁移数据
				if hasViewCount {
					newStats.ViewCount = oldPost.ViewCount
				}
				if hasLikes {
					newStats.LikeCount = oldPost.Likes
				}

				if err := tx.Create(newStats).Error; err != nil {
					return fmt.Errorf("创建BlogPostStats记录失败，PostID: %d, Error: %w", oldPost.ID, err)
				}
			} else if err != nil {
				return fmt.Errorf("检查BlogPostStats记录失败，PostID: %d, Error: %w", oldPost.ID, err)
			} else {
				// Stats记录已存在，更新数据（如果老数据有值且新数据为0）
				updateNeeded := false
				if hasViewCount && existingStats.ViewCount == 0 && oldPost.ViewCount > 0 {
					existingStats.ViewCount = oldPost.ViewCount
					updateNeeded = true
				}
				if hasLikes && existingStats.LikeCount == 0 && oldPost.Likes > 0 {
					existingStats.LikeCount = oldPost.Likes
					updateNeeded = true
				}

				if updateNeeded {
					if err := tx.Save(&existingStats).Error; err != nil {
						return fmt.Errorf("更新BlogPostStats记录失败，PostID: %d, Error: %w", oldPost.ID, err)
					}
				}
			}
		}

		// 迁移完成后，删除冗余字段
		if hasViewCount {
			if err := tx.Migrator().DropColumn(&models.BlogPost{}, "view_count"); err != nil {
				fmt.Printf("删除view_count字段失败（可以忽略）: %v\n", err)
			}
		}
		if hasLikes {
			if err := tx.Migrator().DropColumn(&models.BlogPost{}, "likes"); err != nil {
				fmt.Printf("删除likes字段失败（可以忽略）: %v\n", err)
			}
		}

		fmt.Printf("成功迁移了 %d 条BlogPost记录的统计数据\n", len(oldPosts))
		return nil
	})
}

// migrateTagsAndCategories 迁移标签和分类数据
func migrateTagsAndCategories(db *gorm.DB) error {
	postTable := tableName(db, &models.BlogPost{})
	tagJoinTable := joinTableName(db, &models.BlogPost{}, "TagsList")
	categoryJoinTable := joinTableName(db, &models.BlogPost{}, "CategoriesList")

	// 定义临时结构体读取旧数据
	type OldBlogPost struct {
		ID         uint
		Tags       string
		Categories string
	}

	var posts []OldBlogPost
	// 只查询有标签或分类且未迁移的数据
	if err := db.Table(postTable).Where("tags != '' OR categories != ''").Scan(&posts).Error; err != nil {
		// 如果表不存在或者列不存在（新库），直接忽略
		return nil
	}

	if len(posts) == 0 {
		return nil
	}

	// 检查是否已经迁移过（通过检查TagsList表是否有数据）
	var count int64
	db.Table(tagJoinTable).Count(&count)
	if count == 0 {
		db.Table(categoryJoinTable).Count(&count)
	}
	if count > 0 {
		// 只有在数据量差异很大时才尝试再次迁移，或者直接跳过
		// 这里简单跳过，避免重复处理
		return nil
	}

	fmt.Printf("开始迁移 %d 篇文章的标签和分类数据...\n", len(posts))

	// 遍历文章进行迁移
	return db.Transaction(func(tx *gorm.DB) error {
		for _, p := range posts {
			var post models.BlogPost
			if err := tx.First(&post, p.ID).Error; err != nil {
				continue
			}

			// 迁移标签
			if p.Tags != "" {
				tagNames := strings.Split(p.Tags, ",")
				var tags []models.Tag
				for _, name := range tagNames {
					name = strings.TrimSpace(name)
					if name == "" {
						continue
					}
					var tag models.Tag
					if err := tx.FirstOrCreate(&tag, models.Tag{Name: name}).Error; err != nil {
						return err
					}
					tags = append(tags, tag)
				}
				if len(tags) > 0 {
					if err := tx.Model(&post).Association("TagsList").Replace(tags); err != nil {
						return err
					}
				}
			}

			// 迁移分类
			if p.Categories != "" {
				catNames := strings.Split(p.Categories, ",")
				var cats []models.Category
				for _, name := range catNames {
					name = strings.TrimSpace(name)
					if name == "" {
						continue
					}
					var cat models.Category
					if err := tx.FirstOrCreate(&cat, models.Category{Name: name}).Error; err != nil {
						return err
					}
					cats = append(cats, cat)
				}
				if len(cats) > 0 {
					if err := tx.Model(&post).Association("CategoriesList").Replace(cats); err != nil {
						return err
					}
				}
			}
		}
		fmt.Printf("标签和分类数据迁移完成\n")
		return nil
	})
}

// initKnowledgeGraphFTS 为知识图谱节点初始化全文搜索 (Postgres 专用)
func initKnowledgeGraphFTS(db *gorm.DB) error {
	// 添加生成列和 GIN 索引 (Postgres 语法)
	var count int
	err := db.Raw("SELECT count(*) FROM information_schema.columns WHERE table_name='knowledge_nodes' AND table_schema='public' AND column_name='search_vector'").Scan(&count).Error
	if err != nil {
		return nil
	}

	if count == 0 {
		sql := `
			ALTER TABLE knowledge_nodes 
			ADD COLUMN IF NOT EXISTS search_vector tsvector 
			GENERATED ALWAYS AS (
				setweight(to_tsvector('simple', coalesce(name, '')), 'A') || 
				setweight(to_tsvector('simple', coalesce(description, '')), 'B')
			) STORED;
			CREATE INDEX IF NOT EXISTS idx_nodes_search_vector ON knowledge_nodes USING GIN (search_vector);
		`
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to create FTS column/index: %w", err)
		}
	}
	return nil
}

// migrateGraphRAGTables creates knowledge graph tables using raw SQL
// instead of Gorm's AutoMigrate to avoid ALTER TABLE DROP CONSTRAINT
// failures on existing schemas.
func migrateGraphRAGTables(db *gorm.DB) error {
	statements := []string{
		// Drop generated column that blocks ALTER TABLE on name/description columns
		`ALTER TABLE knowledge_nodes DROP COLUMN IF EXISTS search_vector`,

		// knowledge_nodes
		`CREATE TABLE IF NOT EXISTS knowledge_nodes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name TEXT NOT NULL,
			canonical_name TEXT,
			display_name TEXT,
			type TEXT,
			description TEXT,
			embedding vector(1536),
			community_id BIGINT,
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// knowledge_edges
		`CREATE TABLE IF NOT EXISTS knowledge_edges (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			source_id UUID NOT NULL,
			target_id UUID NOT NULL,
			relation_type TEXT,
			description TEXT,
			weight DOUBLE PRECISION DEFAULT 1.0,
			confidence DOUBLE PRECISION DEFAULT 0.6,
			evidence_count INTEGER DEFAULT 1,
			directionality TEXT DEFAULT 'directed',
			source_post_ids JSONB DEFAULT '[]',
			source_spans JSONB DEFAULT '[]',
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// communities
		`CREATE TABLE IF NOT EXISTS communities (
			id BIGSERIAL PRIMARY KEY,
			community_id INTEGER NOT NULL,
			level INTEGER DEFAULT 0,
			title TEXT,
			summary TEXT,
			findings JSONB DEFAULT '{}',
			embedding vector(1536),
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// knowledge_evidence
		`CREATE TABLE IF NOT EXISTS knowledge_evidence (
			id BIGSERIAL PRIMARY KEY,
			node_id UUID,
			edge_id UUID,
			entity_kind TEXT NOT NULL,
			post_id TEXT,
			source_span TEXT,
			signature TEXT,
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Backfill columns for existing installations.
		`ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS canonical_name TEXT`,
		`ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS display_name TEXT`,
		`ALTER TABLE knowledge_edges ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 0.6`,
		`ALTER TABLE knowledge_edges ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 1`,
		`ALTER TABLE knowledge_edges ADD COLUMN IF NOT EXISTS directionality TEXT DEFAULT 'directed'`,
		`ALTER TABLE knowledge_edges ADD COLUMN IF NOT EXISTS source_post_ids JSONB DEFAULT '[]'`,
		`ALTER TABLE knowledge_edges ADD COLUMN IF NOT EXISTS source_spans JSONB DEFAULT '[]'`,
		`ALTER TABLE communities ADD COLUMN IF NOT EXISTS embedding vector(1536)`,
		`ALTER TABLE communities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
		`DROP INDEX IF EXISTS unique_name`,

		// Indexes (idempotent)
		`CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_name ON knowledge_nodes (name)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_nodes_canonical_name ON knowledge_nodes (canonical_name)`,
		`CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_community_id ON knowledge_nodes (community_id)`,
		`CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source_id ON knowledge_edges (source_id)`,
		`CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target_id ON knowledge_edges (target_id)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_edges_unique_relation ON knowledge_edges (source_id, target_id, relation_type)`,
		`CREATE INDEX IF NOT EXISTS idx_knowledge_edges_confidence ON knowledge_edges (confidence DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_node_id ON knowledge_evidence (node_id)`,
		`CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_edge_id ON knowledge_evidence (edge_id)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_evidence_signature ON knowledge_evidence (signature)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_community_id ON communities (community_id)`,
	}

	for _, stmt := range statements {
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("GraphRAG migration statement failed: %w\nSQL: %s", err, stmt)
		}
	}
	return nil
}
