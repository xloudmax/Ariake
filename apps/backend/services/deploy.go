package services

import (
	"context"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"repair-platform/models"
	"strings"
	"time"

	"github.com/goccy/go-json"

	"github.com/google/go-github/v60/github"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type DeployService struct {
	db *gorm.DB
}

func NewDeployService(db *gorm.DB) *DeployService {
	return &DeployService{db: db}
}

// StaticPost 专门用于静态导出的文章模型，不包含敏感信息
type StaticPost struct {
	ID            uint                  `json:"id"`
	Title         string                `json:"title"`
	Slug          string                `json:"slug"`
	Excerpt       string                `json:"excerpt"`
	Content       string                `json:"content"`
	Tags          string                `json:"tags"`
	Categories    string                `json:"categories"`
	CoverImageURL string                `json:"cover_image_url"`
	PublishedAt   *time.Time            `json:"published_at"`
	UpdatedAt     time.Time             `json:"updated_at"`
	Author        StaticUser            `json:"author"`
	Stats         *models.BlogPostStats `json:"stats"`
}

// StaticUser 专门用于静态导出的用户信息，不包含 Email
type StaticUser struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

func toStaticPost(post models.BlogPost) StaticPost {
	return StaticPost{
		ID:            post.ID,
		Title:         post.Title,
		Slug:          post.Slug,
		Excerpt:       post.Excerpt,
		Content:       post.Content,
		Tags:          post.Tags,
		Categories:    post.Categories,
		CoverImageURL: post.CoverImageURL,
		PublishedAt:   post.PublishedAt,
		UpdatedAt:     post.UpdatedAt,
		Author: StaticUser{
			ID:       post.Author.ID,
			Username: post.Author.Username,
			Avatar:   post.Author.Avatar,
		},
		Stats: post.Stats,
	}
}

// ExportDataToJSON 导出所有已发布文章到指定的静态目录，并包含前端静态资源
func (s *DeployService) ExportDataToJSON(targetDir string) error {
	// 1. 复制前端静态资源 (增量复制)
	staticAssetDir := "../frontend/dist-static"
	if _, err := os.Stat(staticAssetDir); os.IsNotExist(err) {
		// 兼容旧目录结构
		staticAssetDir = "../dist-static"
	}
	if _, err := os.Stat(staticAssetDir); err == nil {
		if err := copyDirIncremental(staticAssetDir, targetDir); err != nil {
			return fmt.Errorf("failed to copy static assets: %w", err)
		}

		// 检查并重命名 index.static.html 为 index.html
		staticHTML := filepath.Join(targetDir, "index.static.html")
		if _, err := os.Stat(staticHTML); err == nil {
			if err := os.Rename(staticHTML, filepath.Join(targetDir, "index.html")); err != nil {
				return fmt.Errorf("failed to rename index.static.html: %w", err)
			}
		}
	}

	// 创建数据目录
	dataDir := filepath.Join(targetDir, "static")
	postsDir := filepath.Join(dataDir, "posts")
	if err := os.MkdirAll(postsDir, 0755); err != nil {
		return fmt.Errorf("failed to create data directory: %w", err)
	}

	// 2. 获取所有已发布文章
	var posts []models.BlogPost
	if err := s.db.Preload("Author").Preload("Stats").Where("status = ?", "PUBLISHED").Find(&posts).Error; err != nil {
		return fmt.Errorf("failed to fetch posts: %w", err)
	}

	// 转换数据为安全格式
	staticPosts := make([]StaticPost, len(posts))
	for i, p := range posts {
		staticPosts[i] = toStaticPost(p)
	}

	// 3. 生成 posts.json (列表，全量更新确保索引一致)
	postsJSON, _ := json.Marshal(staticPosts)
	if err := os.WriteFile(filepath.Join(dataDir, "posts.json"), postsJSON, 0644); err != nil {
		return fmt.Errorf("failed to write posts.json: %w", err)
	}

	// 4. 生成每个文章的详细 JSON (增量更新)
	for _, post := range staticPosts {
		postPath := filepath.Join(postsDir, post.Slug+".json")

		// 检查是否存在且未修改
		if info, err := os.Stat(postPath); err == nil {
			if !post.UpdatedAt.After(info.ModTime()) {
				// 文件比最后更新时间新或相等，跳过
				continue
			}
		}

		postJSON, _ := json.Marshal(post)
		if err := os.WriteFile(postPath, postJSON, 0644); err != nil {
			return fmt.Errorf("failed to write post %s.json: %w", post.Slug, err)
		}
	}

	// 5. 生成 dashboard.json (全量更新)
	dashboardTags := extractStaticTags(staticPosts)
	if dashboardTags == nil {
		dashboardTags = []map[string]interface{}{}
	}

	dashboard := map[string]interface{}{
		"popularPosts": staticPosts,
		"recentPosts":  staticPosts,
		"tags":         dashboardTags,
	}
	if len(staticPosts) == 0 {
		dashboard["popularPosts"] = []StaticPost{}
		dashboard["recentPosts"] = []StaticPost{}
	}
	dashboardJSON, _ := json.Marshal(dashboard)
	if err := os.WriteFile(filepath.Join(dataDir, "dashboard.json"), dashboardJSON, 0644); err != nil {
		return fmt.Errorf("failed to write dashboard.json: %w", err)
	}

	return nil
}

// copyDirIncremental 增量复制目录
func copyDirIncremental(src string, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(targetPath, info.Mode())
		}

		// 检查目标文件是否已存在且内容一致 (基于大小和修改时间)
		if targetInfo, err := os.Stat(targetPath); err == nil {
			if targetInfo.Size() == info.Size() && !info.ModTime().After(targetInfo.ModTime()) {
				return nil // 跳过
			}
		}

		// 复制文件
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(targetPath, data, info.Mode())
	})
}

func extractStaticTags(posts []StaticPost) []map[string]interface{} {
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
	tags := []map[string]interface{}{}
	for name, count := range tagMap {
		tags = append(tags, map[string]interface{}{
			"name":  name,
			"count": count,
		})
	}
	return tags
}

// calculateGitSHA 计算文件的 Git Blob SHA-1
func calculateGitSHA(content []byte) string {
	header := fmt.Sprintf("blob %d\x00", len(content))
	h := sha1.New()
	h.Write([]byte(header))
	h.Write(content)
	return hex.EncodeToString(h.Sum(nil))
}

// DeployToGitHubPages 推送到 GitHub (gh-pages 分支) - 已优化为增量推送
func (s *DeployService) DeployToGitHubPages(ctx context.Context, repoOwner, repoName, token, sourceDir string) error {
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	tc := oauth2.NewClient(ctx, ts)
	client := github.NewClient(tc)

	targetBranch := "gh-pages"

	// 1. 获取最新 commit 及 Tree SHA
	var baseCommitSHA string
	var remoteTreeSHA string
	ref, _, err := client.Git.GetRef(ctx, repoOwner, repoName, "refs/heads/"+targetBranch)
	if err != nil {
		// 如果 gh-pages 不存在，尝试从默认分支开始
		repo, _, err := client.Repositories.Get(ctx, repoOwner, repoName)
		if err != nil {
			return fmt.Errorf("failed to get repository: %w", err)
		}
		defaultBranch := repo.GetDefaultBranch()
		defaultRef, _, err := client.Git.GetRef(ctx, repoOwner, repoName, "refs/heads/"+defaultBranch)
		if err != nil {
			return fmt.Errorf("failed to get default branch ref: %w", err)
		}
		baseCommitSHA = defaultRef.Object.GetSHA()

		// 获取默认分支的最新 Tree
		commit, _, err := client.Git.GetCommit(ctx, repoOwner, repoName, baseCommitSHA)
		if err != nil {
			return fmt.Errorf("failed to get base commit: %w", err)
		}
		remoteTreeSHA = commit.Tree.GetSHA()
	} else {
		baseCommitSHA = ref.Object.GetSHA()
		commit, _, err := client.Git.GetCommit(ctx, repoOwner, repoName, baseCommitSHA)
		if err != nil {
			return fmt.Errorf("failed to get remote commit: %w", err)
		}
		remoteTreeSHA = commit.Tree.GetSHA()
	}

	// 2. 获取远程 Tree 的所有文件 SHA (递归)
	remoteTreeMap := make(map[string]string)
	treeResult, _, err := client.Git.GetTree(ctx, repoOwner, repoName, remoteTreeSHA, true)
	if err == nil {
		for _, entry := range treeResult.Entries {
			if entry.GetType() == "blob" {
				remoteTreeMap[entry.GetPath()] = entry.GetSHA()
			}
		}
	}

	// 3. 扫描本地文件，只为发生变化的文件创建 Blob
	var entries []*github.TreeEntry
	changedCount := 0
	localFiles := make(map[string]bool)
	err = filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		relPath, _ := filepath.Rel(sourceDir, path)
		localFiles[relPath] = true
		content, _ := os.ReadFile(path)

		// 计算本地 SHA
		localSHA := calculateGitSHA(content)

		// 如果远程已存在且 SHA 一致，则跳过上传
		if remoteSHA, ok := remoteTreeMap[relPath]; ok && remoteSHA == localSHA {
			return nil
		}

		changedCount++
		// 为发生改变的文件创建 Blob
		contentBase64 := base64.StdEncoding.EncodeToString(content)
		blob, _, err := client.Git.CreateBlob(ctx, repoOwner, repoName, &github.Blob{
			Content:  github.String(contentBase64),
			Encoding: github.String("base64"),
		})
		if err != nil {
			return fmt.Errorf("failed to create blob for %s: %w", relPath, err)
		}

		entries = append(entries, &github.TreeEntry{
			Path: github.String(relPath),
			Type: github.String("blob"),
			SHA:  blob.SHA,
			Mode: github.String("100644"),
		})
		return nil
	})
	if err != nil {
		return fmt.Errorf("incremental scan failed: %w", err)
	}

	// 检查是否有被删除的文件
	deletedCount := 0
	for remotePath := range remoteTreeMap {
		if !localFiles[remotePath] {
			deletedCount++
			entries = append(entries, &github.TreeEntry{
				Path: github.String(remotePath),
				Type: github.String("blob"),
				Mode: github.String("100644"),
				SHA:  nil, // 设置 SHA 为 nil 表示删除该文件
			})
		}
	}

	if changedCount == 0 && deletedCount == 0 {
		return nil // 没有文件改变，直接返回成功
	}

	// 4. 创建新 Tree (基于基础 Tree)
	tree, _, err := client.Git.CreateTree(ctx, repoOwner, repoName, remoteTreeSHA, entries)
	if err != nil {
		return fmt.Errorf("failed to create git tree: %w", err)
	}

	// 5. 创建 Commit
	commit, _, err := client.Git.CreateCommit(ctx, repoOwner, repoName, &github.Commit{
		Message: github.String(fmt.Sprintf("Deploy static blog (updated %d, deleted %d files)", changedCount, deletedCount)),
		Tree:    tree,
		Parents: []*github.Commit{{SHA: github.String(baseCommitSHA)}},
	}, &github.CreateCommitOptions{})
	if err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	// 6. 更新或创建 Ref
	if ref != nil {
		ref.Object.SHA = commit.SHA
		_, _, err = client.Git.UpdateRef(ctx, repoOwner, repoName, ref, false)
	} else {
		_, _, err = client.Git.CreateRef(ctx, repoOwner, repoName, &github.Reference{
			Ref:    github.String("refs/heads/" + targetBranch),
			Object: &github.GitObject{SHA: commit.SHA},
		})
	}
	if err != nil {
		return fmt.Errorf("failed to update/create ref: %w", err)
	}

	return nil
}
