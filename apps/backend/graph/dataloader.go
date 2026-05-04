package graph

import (
	"context"
	"repair-platform/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/graph-gophers/dataloader/v7"
	"gorm.io/gorm"
)

// 定义 Loader Key 类型，必须实现 String() 方法 (虽然 v7 使用泛型，但某些接口可能仍需)
// v7 中 Key 是泛型 K comparable

// DataLoader 包含所有的 Loaders
type DataLoader struct {
	UserLoader       *dataloader.Loader[uint, *models.User]
	StatsLoader      *dataloader.Loader[uint, *models.BlogPostStats]
	PostsCountLoader *dataloader.Loader[uint, int]
	VersionsLoader   *dataloader.Loader[uint, []*models.BlogPostVersion]
}

// NewDataLoader 创建新的数据加载器实例
func NewDataLoader(db *gorm.DB) *DataLoader {
	// 用户加载器
	batchUsers := func(ctx context.Context, keys []uint) []*dataloader.Result[*models.User] {
		var results []*dataloader.Result[*models.User] = make([]*dataloader.Result[*models.User], len(keys))

		// 初始化结果并将所有结果默认为 nil/error
		for i := range results {
			results[i] = &dataloader.Result[*models.User]{Data: nil, Error: nil}
		}

		// 执行批量查询
		var users []models.User
		if err := db.Where("id IN ?", keys).Find(&users).Error; err != nil {
			// 如果查询失败，所有结果都设为错误
			for i := range results {
				results[i].Error = err
			}
			return results
		}

		// 将查询结果映射回 keys 的顺序
		userMap := make(map[uint]*models.User)
		for i := range users {
			user := users[i]
			userMap[user.ID] = &user
		}

		for i, key := range keys {
			if user, ok := userMap[key]; ok {
				results[i].Data = user
			} else {
				// 没找到用户，不返回错误，让 resolver 处理默认值
				results[i].Data = nil
				results[i].Error = nil
			}
		}

		return results
	}

	// 统计加载器
	batchStats := func(ctx context.Context, keys []uint) []*dataloader.Result[*models.BlogPostStats] {
		var results []*dataloader.Result[*models.BlogPostStats] = make([]*dataloader.Result[*models.BlogPostStats], len(keys))

		// 执行批量查询
		var stats []models.BlogPostStats
		if err := db.Where("blog_post_id IN ?", keys).Find(&stats).Error; err != nil {
			for i := range results {
				results[i] = &dataloader.Result[*models.BlogPostStats]{Error: err}
			}
			return results
		}

		// 映射结果
		statsMap := make(map[uint]*models.BlogPostStats)
		for i := range stats {
			stat := stats[i]
			statsMap[stat.BlogPostID] = &stat
		}

		for i, key := range keys {
			if stat, ok := statsMap[key]; ok {
				results[i] = &dataloader.Result[*models.BlogPostStats]{Data: stat}
			} else {
				// 未找到统计数据，返回默认空统计，ID 设为文章 ID 以确保非空且唯一
				defaultStats := &models.BlogPostStats{
					ID:         key, // 临时使用文章 ID 作为统计 ID
					BlogPostID: key,
					ViewCount:  0,
					LikeCount:  0,
					UpdatedAt:  time.Now(),
				}
				results[i] = &dataloader.Result[*models.BlogPostStats]{Data: defaultStats}
			}
		}

		return results
	}

	// 文章计数加载器
	batchPostsCount := func(ctx context.Context, keys []uint) []*dataloader.Result[int] {
		var results []*dataloader.Result[int] = make([]*dataloader.Result[int], len(keys))

		type PostCount struct {
			AuthorID uint
			Count    int64
		}
		var counts []PostCount
		if err := db.Model(&models.BlogPost{}).
			Select("author_id, count(*) as count").
			Where("author_id IN ?", keys).
			Group("author_id").
			Scan(&counts).Error; err != nil {
			for i := range results {
				results[i] = &dataloader.Result[int]{Error: err}
			}
			return results
		}

		countMap := make(map[uint]int)
		for _, c := range counts {
			countMap[c.AuthorID] = int(c.Count)
		}

		for i, key := range keys {
			results[i] = &dataloader.Result[int]{Data: countMap[key]}
		}

		return results
	}

	// 文章版本加载器
	batchVersions := func(ctx context.Context, keys []uint) []*dataloader.Result[[]*models.BlogPostVersion] {
		var results []*dataloader.Result[[]*models.BlogPostVersion] = make([]*dataloader.Result[[]*models.BlogPostVersion], len(keys))

		var versions []models.BlogPostVersion
		if err := db.Where("blog_post_id IN ?", keys).Preload("CreatedBy").Order("version_num DESC").Find(&versions).Error; err != nil {
			for i := range results {
				results[i] = &dataloader.Result[[]*models.BlogPostVersion]{Error: err}
			}
			return results
		}

		versionsMap := make(map[uint][]*models.BlogPostVersion)
		for i := range versions {
			v := versions[i]
			versionsMap[v.BlogPostID] = append(versionsMap[v.BlogPostID], &v)
		}

		for i, key := range keys {
			results[i] = &dataloader.Result[[]*models.BlogPostVersion]{Data: versionsMap[key]}
		}

		return results
	}

	// 配置 Loader 选项
	// 设置 Wait 时间为 2ms，足以收集同一事件循环中的请求
	userLoader := dataloader.NewBatchedLoader(batchUsers, dataloader.WithWait[uint, *models.User](2*time.Millisecond))
	statsLoader := dataloader.NewBatchedLoader(batchStats, dataloader.WithWait[uint, *models.BlogPostStats](2*time.Millisecond))
	postsCountLoader := dataloader.NewBatchedLoader(batchPostsCount, dataloader.WithWait[uint, int](2*time.Millisecond))
	versionsLoader := dataloader.NewBatchedLoader(batchVersions, dataloader.WithWait[uint, []*models.BlogPostVersion](2*time.Millisecond))

	return &DataLoader{
		UserLoader:       userLoader,
		StatsLoader:      statsLoader,
		PostsCountLoader: postsCountLoader,
		VersionsLoader:   versionsLoader,
	}
}

// LoadAuthor 加载作者
func (dl *DataLoader) LoadAuthor(ctx context.Context, userID uint) (*models.User, error) {
	thunk := dl.UserLoader.Load(ctx, userID)
	result, err := thunk()
	if err != nil {
		return nil, err
	}
	return result, nil
}

// LoadStats 加载统计
func (dl *DataLoader) LoadStats(ctx context.Context, postID uint) (*models.BlogPostStats, error) {
	thunk := dl.StatsLoader.Load(ctx, postID)
	result, err := thunk()
	if err != nil {
		return nil, err
	}
	return result, nil
}

// LoadPostsCount 加载文章计数
func (dl *DataLoader) LoadPostsCount(ctx context.Context, userID uint) (int, error) {
	thunk := dl.PostsCountLoader.Load(ctx, userID)
	result, err := thunk()
	if err != nil {
		return 0, err
	}
	return result, nil
}

// LoadVersions 加载文章版本
func (dl *DataLoader) LoadVersions(ctx context.Context, postID uint) ([]*models.BlogPostVersion, error) {
	thunk := dl.VersionsLoader.Load(ctx, postID)
	result, err := thunk()
	if err != nil {
		return nil, err
	}
	if result == nil {
		return []*models.BlogPostVersion{}, nil
	}
	return result, nil
}

// Loaders 接口 (兼容旧代码如需)
// 下面的方法是为了保持与旧接口的某种兼容性，或者方便其他地方调用
// 但实际上 schema.resolvers.go 已经修改为调用 LoadAuthor/LoadStats，所以接口签名是最重要的

// 辅助方法：GetDataLoaderFromContext
func GetDataLoaderFromContext(ctx context.Context) *DataLoader {
	if dl, ok := ctx.Value(LoaderKey).(*DataLoader); ok {
		return dl
	}
	return nil
}

const LoaderKey ContextKey = "dataloader"

// DataLoaderMiddleware Gin中间件
func DataLoaderMiddleware(db *gorm.DB) func(c *gin.Context) {
	return func(c *gin.Context) {
		loader := NewDataLoader(db)
		ctx := context.WithValue(c.Request.Context(), LoaderKey, loader)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}
