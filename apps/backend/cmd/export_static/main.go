package main

import (
	"fmt"
	"github.com/goccy/go-json"
	"log"
	"os"
	"path/filepath"
	"repair-platform/models"
	"strings"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func main() {
	// 1. 确定数据库路径
	dbPath := "blog_platform.db"
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		// 如果当前目录没有，尝试上一级目录 (因为可能在 cmd/export_static 下运行)
		dbPath = "../../blog_platform.db"
		if _, err := os.Stat(dbPath); os.IsNotExist(err) {
			// 如果还是没有，尝试 data.db
			dbPath = "data.db"
			if _, err := os.Stat(dbPath); os.IsNotExist(err) {
				log.Fatalf("❌ 错误: 找不到数据库文件 blog_platform.db 或 data.db")
			}
		}
	}

	fmt.Printf("📂 正在使用数据库: %s\n", dbPath)

	// 2. 连接数据库 (必须使用 SingularTable: true)
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// 3. 准备目标目录
	// 假设在 apps/backend 目录下运行，静态资源输出到 apps/frontend/dist-static
	targetDir := "../frontend/dist-static/static"
	postsDir := filepath.Join(targetDir, "posts")
	os.MkdirAll(postsDir, 0755)

	// 4. 获取所有已发布文章
	var posts []models.BlogPost
	result := db.Preload("Author").Preload("Stats").Where("status = ?", "PUBLISHED").Find(&posts)
	if result.Error != nil {
		log.Fatalf("❌ 查询文章失败: %v", result.Error)
	}

	if len(posts) == 0 {
		fmt.Println("⚠️ 警告: 数据库中没有已发布的文章")
	}

	// 定义用于静态导出的数据结构 (完全扁平化且不包含循环引用)
	type StaticStats struct {
		ViewCount    int    `json:"viewCount"`
		LikeCount    int    `json:"likeCount"`
		CommentCount int    `json:"commentCount"`
		UpdatedAt    string `json:"updatedAt"`
	}

	type StaticAuthor struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Avatar   string `json:"avatar"`
	}

	type StaticPost struct {
		ID            uint         `json:"id"`
		Title         string       `json:"title"`
		Slug          string       `json:"slug"`
		Content       string       `json:"content"`
		Excerpt       string       `json:"excerpt"`
		CoverImageURL string       `json:"coverImageUrl"`
		Status        string       `json:"status"`
		CreatedAt     string       `json:"createdAt"`
		UpdatedAt     string       `json:"updatedAt"`
		PublishedAt   string       `json:"publishedAt"`
		Tags          []string     `json:"tags"`
		Categories    []string     `json:"categories"`
		Author        StaticAuthor `json:"author"`
		Stats         StaticStats  `json:"stats"`
	}

	// 转换数据
	var staticPosts []StaticPost
	for _, p := range posts {
		// 处理时间格式
		pubDate := ""
		if p.PublishedAt != nil {
			pubDate = p.PublishedAt.Format(time.RFC3339)
		}

		sp := StaticPost{
			ID:            p.ID,
			Title:         p.Title,
			Slug:          p.Slug,
			Content:       p.Content,
			Excerpt:       p.Excerpt,
			CoverImageURL: p.CoverImageURL,
			Status:        p.Status,
			CreatedAt:     p.CreatedAt.Format(time.RFC3339),
			UpdatedAt:     p.UpdatedAt.Format(time.RFC3339),
			PublishedAt:   pubDate,
			Author: StaticAuthor{
				ID:       p.Author.ID,
				Username: p.Author.Username,
				Avatar:   p.Author.Avatar,
			},
		}

		// 处理统计信息
		if p.Stats != nil {
			sp.Stats = StaticStats{
				ViewCount:    p.Stats.ViewCount,
				LikeCount:    p.Stats.LikeCount,
				CommentCount: p.Stats.CommentCount,
				UpdatedAt:    p.Stats.UpdatedAt.Format(time.RFC3339),
			}
		}

		// 转换标签
		if p.Tags != "" {
			tags := strings.Split(p.Tags, ",")
			for _, t := range tags {
				trimmed := strings.TrimSpace(t)
				if trimmed != "" {
					sp.Tags = append(sp.Tags, trimmed)
				}
			}
		} else {
			sp.Tags = []string{}
		}

		// 转换分类
		if p.Categories != "" {
			cats := strings.Split(p.Categories, ",")
			for _, c := range cats {
				trimmed := strings.TrimSpace(c)
				if trimmed != "" {
					sp.Categories = append(sp.Categories, trimmed)
				}
			}
		} else {
			sp.Categories = []string{}
		}

		staticPosts = append(staticPosts, sp)
	}

	// 5. 生成 posts.json
	postsJSON, _ := json.Marshal(staticPosts)
	os.WriteFile(filepath.Join(targetDir, "posts.json"), postsJSON, 0644)

	// 6. 生成个体文章详情
	for _, post := range staticPosts {
		postJSON, _ := json.Marshal(post)
		os.WriteFile(filepath.Join(postsDir, post.Slug+".json"), postJSON, 0644)
	}

	// 7. 生成 dashboard.json
	dashboard := map[string]interface{}{
		"popularPosts": staticPosts,
		"recentPosts":  staticPosts,
		"tags":         extractTags(posts),
	}
	dashboardJSON, _ := json.Marshal(dashboard)
	os.WriteFile(filepath.Join(targetDir, "dashboard.json"), dashboardJSON, 0644)

	fmt.Printf("✅ 成功导出 %d 篇文章到 %s\n", len(posts), targetDir)
}

func extractTags(posts []models.BlogPost) []map[string]interface{} {
	tagMap := make(map[string]int)
	for _, post := range posts {
		tags := strings.Split(post.Tags, ",")
		for _, t := range tags {
			t = strings.TrimSpace(t)
			if t != "" {
				tagMap[t]++
			}
		}
	}
	var tags []map[string]interface{}
	for name, count := range tagMap {
		tags = append(tags, map[string]interface{}{
			"name":  name,
			"count": count,
		})
	}
	return tags
}
