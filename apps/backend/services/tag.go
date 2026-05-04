package services

import (
	"fmt"
	"repair-platform/models"
	"sort"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

func serviceTableName(db *gorm.DB, model interface{}) string {
	stmt := &gorm.Statement{DB: db}
	if err := stmt.Parse(model); err != nil {
		panic(fmt.Sprintf("failed to resolve table name for %T: %v", model, err))
	}
	return stmt.Schema.Table
}

func serviceJoinTableName(db *gorm.DB, model interface{}, relationName string) string {
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

// TagService 标签管理服务
type TagService struct {
	db *gorm.DB

	// in-memory TTL cache
	cacheMu     sync.RWMutex
	tagsCache   []*TagInfo
	catsCache   []*CategoryInfo
	cacheExpiry time.Time
}

const tagCacheTTL = 5 * time.Minute

// NewTagService 创建标签服务
func NewTagService(db *gorm.DB) *TagService {
	return &TagService{db: db}
}

// TagInfo 标签信息
type TagInfo struct {
	Name  string
	Count int
	Posts []*models.BlogPost
}

// CategoryInfo 分类信息
type CategoryInfo struct {
	Name  string
	Count int
	Posts []*models.BlogPost
}

// TagCategoryStats 标签分类统计
type TagCategoryStats struct {
	TotalTags       int
	TotalCategories int
	Tags            []*TagInfo
	Categories      []*CategoryInfo
}

// invalidateCache clears the cached tag and category lists.
func (s *TagService) invalidateCache() {
	s.cacheMu.Lock()
	s.tagsCache = nil
	s.catsCache = nil
	s.cacheExpiry = time.Time{}
	s.cacheMu.Unlock()
}

// allTagsFromDB loads all tags from DB and caches them (no filter, no paging).
func (s *TagService) allTagsFromDB() ([]*TagInfo, []*CategoryInfo, error) {
	// Check cache first
	s.cacheMu.RLock()
	if s.tagsCache != nil && time.Now().Before(s.cacheExpiry) {
		t, c := s.tagsCache, s.catsCache
		s.cacheMu.RUnlock()
		return t, c, nil
	}
	s.cacheMu.RUnlock()

	// Cache miss — fetch from DB
	var posts []models.BlogPost
	if err := s.db.Where("status = ?", "PUBLISHED").Find(&posts).Error; err != nil {
		return nil, nil, fmt.Errorf("failed to get posts: %w", err)
	}

	tagMap := make(map[string]*TagInfo)
	catMap := make(map[string]*CategoryInfo)

	for i := range posts {
		p := &posts[i]
		for _, name := range p.GetTagsArray() {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			if tagMap[name] == nil {
				tagMap[name] = &TagInfo{Name: name, Posts: []*models.BlogPost{}}
			}
			tagMap[name].Count++
			tagMap[name].Posts = append(tagMap[name].Posts, p)
		}
		for _, name := range p.GetCategoriesArray() {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			if catMap[name] == nil {
				catMap[name] = &CategoryInfo{Name: name, Posts: []*models.BlogPost{}}
			}
			catMap[name].Count++
			catMap[name].Posts = append(catMap[name].Posts, p)
		}
	}

	tags := make([]*TagInfo, 0, len(tagMap))
	for _, v := range tagMap {
		tags = append(tags, v)
	}
	sort.Slice(tags, func(i, j int) bool { return tags[i].Count > tags[j].Count })

	cats := make([]*CategoryInfo, 0, len(catMap))
	for _, v := range catMap {
		cats = append(cats, v)
	}
	sort.Slice(cats, func(i, j int) bool { return cats[i].Count > cats[j].Count })

	// Store in cache
	s.cacheMu.Lock()
	s.tagsCache = tags
	s.catsCache = cats
	s.cacheExpiry = time.Now().Add(tagCacheTTL)
	s.cacheMu.Unlock()

	return tags, cats, nil
}

// GetTags 获取所有标签及使用次数（带搜索和分页）
func (s *TagService) GetTags(limit *int, offset *int, search *string) ([]*TagInfo, error) {
	allTags, _, err := s.allTagsFromDB()
	if err != nil {
		return nil, err
	}

	// Apply optional search filter
	filtered := allTags
	if search != nil && *search != "" {
		lower := strings.ToLower(*search)
		filtered = make([]*TagInfo, 0)
		for _, t := range allTags {
			if strings.Contains(strings.ToLower(t.Name), lower) {
				filtered = append(filtered, t)
			}
		}
	}

	return paginate(filtered, offset, limit), nil
}

// GetCategories 获取所有分类及使用次数（带搜索和分页）
func (s *TagService) GetCategories(limit *int, offset *int, search *string) ([]*CategoryInfo, error) {
	_, allCats, err := s.allTagsFromDB()
	if err != nil {
		return nil, err
	}

	filtered := allCats
	if search != nil && *search != "" {
		lower := strings.ToLower(*search)
		filtered = make([]*CategoryInfo, 0)
		for _, c := range allCats {
			if strings.Contains(strings.ToLower(c.Name), lower) {
				filtered = append(filtered, c)
			}
		}
	}

	return paginate(filtered, offset, limit), nil
}

// paginate is a generic helper that applies offset/limit to any slice.
func paginate[T any](slice []T, offset, limit *int) []T {
	start := 0
	if offset != nil && *offset < len(slice) {
		start = *offset
	}
	if start >= len(slice) {
		return []T{}
	}
	end := len(slice)
	if limit != nil && start+*limit < len(slice) {
		end = start + *limit
	}
	return slice[start:end]
}

// GetTagCategoryStats 获取标签和分类的统计信息（使用缓存，避免双重 DB 查询）
func (s *TagService) GetTagCategoryStats() (*TagCategoryStats, error) {
	tags, cats, err := s.allTagsFromDB()
	if err != nil {
		return nil, err
	}
	return &TagCategoryStats{
		TotalTags:       len(tags),
		TotalCategories: len(cats),
		Tags:            tags,
		Categories:      cats,
	}, nil
}

// MergeTags 合并标签（将sourceTag的所有文章移动到targetTag）
func (s *TagService) MergeTags(sourceTag, targetTag string) error {
	sourceTag = strings.TrimSpace(sourceTag)
	targetTag = strings.TrimSpace(targetTag)

	if sourceTag == "" || targetTag == "" {
		return fmt.Errorf("source and target tags cannot be empty")
	}

	if sourceTag == targetTag {
		return fmt.Errorf("source and target tags cannot be the same")
	}

	// 查找所有包含sourceTag的文章
	var posts []models.BlogPost
	if err := s.db.Find(&posts).Error; err != nil {
		return fmt.Errorf("failed to get posts: %w", err)
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, post := range posts {
		tags := post.GetTagsArray()
		hasSource := false
		hasTarget := false
		newTags := []string{}

		// 检查文章是否包含这些标签
		for _, tag := range tags {
			tag = strings.TrimSpace(tag)
			if tag == sourceTag {
				hasSource = true
			}
			if tag == targetTag {
				hasTarget = true
			}
		}

		// 如果文章包含sourceTag
		if hasSource {
			for _, tag := range tags {
				tag = strings.TrimSpace(tag)
				// 跳过sourceTag
				if tag == sourceTag {
					// 如果还没有targetTag，添加它
					if !hasTarget {
						newTags = append(newTags, targetTag)
						hasTarget = true
					}
				} else {
					newTags = append(newTags, tag)
				}
			}

			// 更新文章标签
			post.SetTagsFromArray(newTags)

			// 关联更新 TagsList
			var tagModels []models.Tag
			for _, tagName := range newTags {
				var tag models.Tag
				tx.FirstOrCreate(&tag, models.Tag{Name: tagName})
				tagModels = append(tagModels, tag)
			}
			if err := tx.Model(&post).Association("TagsList").Replace(tagModels); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to replace tags list for post %d: %w", post.ID, err)
			}

			if err := tx.Save(&post).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to update post %d: %w", post.ID, err)
			}
		}
	}

	// 清理 orphaned source tag
	tx.Where("name = ?", sourceTag).Delete(&models.Tag{})

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.invalidateCache()
	return nil
}

// MergeCategories 合并分类
func (s *TagService) MergeCategories(sourceCategory, targetCategory string) error {
	sourceCategory = strings.TrimSpace(sourceCategory)
	targetCategory = strings.TrimSpace(targetCategory)

	if sourceCategory == "" || targetCategory == "" {
		return fmt.Errorf("source and target categories cannot be empty")
	}

	if sourceCategory == targetCategory {
		return fmt.Errorf("source and target categories cannot be the same")
	}

	// 查找所有包含sourceCategory的文章
	var posts []models.BlogPost
	if err := s.db.Find(&posts).Error; err != nil {
		return fmt.Errorf("failed to get posts: %w", err)
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, post := range posts {
		categories := post.GetCategoriesArray()
		hasSource := false
		hasTarget := false
		newCategories := []string{}

		// 检查文章是否包含这些分类
		for _, category := range categories {
			category = strings.TrimSpace(category)
			if category == sourceCategory {
				hasSource = true
			}
			if category == targetCategory {
				hasTarget = true
			}
		}

		// 如果文章包含sourceCategory
		if hasSource {
			for _, category := range categories {
				category = strings.TrimSpace(category)
				// 跳过sourceCategory
				if category == sourceCategory {
					// 如果还没有targetCategory，添加它
					if !hasTarget {
						newCategories = append(newCategories, targetCategory)
						hasTarget = true
					}
				} else {
					newCategories = append(newCategories, category)
				}
			}

			// 更新文章分类
			post.SetCategoriesFromArray(newCategories)

			// 关联更新 CategoriesList
			var catModels []models.Category
			for _, catName := range newCategories {
				var cat models.Category
				tx.FirstOrCreate(&cat, models.Category{Name: catName})
				catModels = append(catModels, cat)
			}
			if err := tx.Model(&post).Association("CategoriesList").Replace(catModels); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to replace categories list for post %d: %w", post.ID, err)
			}

			if err := tx.Save(&post).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to update post %d: %w", post.ID, err)
			}
		}
	}

	// 清理 orphaned source category
	tx.Where("name = ?", sourceCategory).Delete(&models.Category{})

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// BatchUpdateTags 批量更新文章标签
func (s *TagService) BatchUpdateTags(postIDs []uint, tags []string, operation string) error {
	if len(postIDs) == 0 {
		return fmt.Errorf("post IDs cannot be empty")
	}

	// 清理标签
	cleanTags := []string{}
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			cleanTags = append(cleanTags, tag)
		}
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, postID := range postIDs {
		var post models.BlogPost
		if err := tx.First(&post, postID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to get post %d: %w", postID, err)
		}

		switch operation {
		case "REPLACE":
			// 替换所有标签
			post.SetTagsFromArray(cleanTags)
		case "ADD":
			// 添加新标签（避免重复）
			existingTags := make(map[string]bool)
			currentTags := post.GetTagsArray()

			for _, tag := range currentTags {
				existingTags[strings.TrimSpace(tag)] = true
			}

			newTags := currentTags
			for _, tag := range cleanTags {
				if !existingTags[tag] {
					newTags = append(newTags, tag)
				}
			}
			post.SetTagsFromArray(newTags)
		default:
			tx.Rollback()
			return fmt.Errorf("invalid operation: %s", operation)
		}

		if err := tx.Save(&post).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update post %d: %w", postID, err)
		}

		// 关联更新 TagsList
		var tagModels []models.Tag
		for _, tagName := range post.GetTagsArray() {
			var tag models.Tag
			tx.FirstOrCreate(&tag, models.Tag{Name: tagName})
			tagModels = append(tagModels, tag)
		}
		if err := tx.Model(&post).Association("TagsList").Replace(tagModels); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to replace tags list for post %d: %w", post.ID, err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.invalidateCache()
	return nil
}

// BatchUpdateCategories 批量更新文章分类
func (s *TagService) BatchUpdateCategories(postIDs []uint, categories []string, operation string) error {
	if len(postIDs) == 0 {
		return fmt.Errorf("post IDs cannot be empty")
	}

	// 清理分类
	cleanCategories := []string{}
	for _, category := range categories {
		category = strings.TrimSpace(category)
		if category != "" {
			cleanCategories = append(cleanCategories, category)
		}
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, postID := range postIDs {
		var post models.BlogPost
		if err := tx.First(&post, postID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to get post %d: %w", postID, err)
		}

		switch operation {
		case "REPLACE":
			// 替换所有分类
			post.SetCategoriesFromArray(cleanCategories)
		case "ADD":
			// 添加新分类（避免重复）
			existingCategories := make(map[string]bool)
			currentCategories := post.GetCategoriesArray()

			for _, category := range currentCategories {
				existingCategories[strings.TrimSpace(category)] = true
			}

			newCategories := currentCategories
			for _, category := range cleanCategories {
				if !existingCategories[category] {
					newCategories = append(newCategories, category)
				}
			}
			post.SetCategoriesFromArray(newCategories)
		default:
			tx.Rollback()
			return fmt.Errorf("invalid operation: %s", operation)
		}

		if err := tx.Save(&post).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update post %d: %w", postID, err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.invalidateCache()
	return nil
}

// DeleteUnusedTags 删除未使用的标签（实际上是清理空标签）
func (s *TagService) DeleteUnusedTags() (int, error) {
	var posts []models.BlogPost
	if err := s.db.Find(&posts).Error; err != nil {
		return 0, fmt.Errorf("failed to get posts: %w", err)
	}

	cleaned := 0
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, post := range posts {
		tags := post.GetTagsArray()
		originalLen := len(tags)
		cleanTags := []string{}

		for _, tag := range tags {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				cleanTags = append(cleanTags, tag)
			}
		}

		if len(cleanTags) != originalLen {
			post.SetTagsFromArray(cleanTags)

			// 关联更新 TagsList
			var tagModels []models.Tag
			for _, tagName := range cleanTags {
				var tag models.Tag
				tx.FirstOrCreate(&tag, models.Tag{Name: tagName})
				tagModels = append(tagModels, tag)
			}
			if err := tx.Model(&post).Association("TagsList").Replace(tagModels); err != nil {
				tx.Rollback()
				return 0, fmt.Errorf("failed to replace tags list for post %d: %w", post.ID, err)
			}

			if err := tx.Save(&post).Error; err != nil {
				tx.Rollback()
				return 0, fmt.Errorf("failed to update post %d: %w", post.ID, err)
			}
			cleaned++
		}
	}

	// 物理删除所有没有关联的标签
	tagTable := serviceTableName(tx, &models.Tag{})
	tagJoinTable := serviceJoinTableName(tx, &models.BlogPost{}, "TagsList")
	res := tx.Exec(fmt.Sprintf("DELETE FROM %s WHERE id NOT IN (SELECT tag_id FROM %s)", tagTable, tagJoinTable))
	if res.Error != nil {
		tx.Rollback()
		return 0, fmt.Errorf("failed to delete unused tags: %w", res.Error)
	}
	cleanedTagsCount := int(res.RowsAffected)

	if err := tx.Commit().Error; err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.invalidateCache()
	return cleanedTagsCount, nil
}

// DeleteUnusedCategories 删除未使用的分类
func (s *TagService) DeleteUnusedCategories() (int, error) {
	var posts []models.BlogPost
	if err := s.db.Find(&posts).Error; err != nil {
		return 0, fmt.Errorf("failed to get posts: %w", err)
	}

	cleaned := 0
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, post := range posts {
		categories := post.GetCategoriesArray()
		originalLen := len(categories)
		cleanCategories := []string{}

		for _, category := range categories {
			category = strings.TrimSpace(category)
			if category != "" {
				cleanCategories = append(cleanCategories, category)
			}
		}

		if len(cleanCategories) != originalLen {
			post.SetCategoriesFromArray(cleanCategories)

			// 关联更新 CategoriesList
			var catModels []models.Category
			for _, catName := range cleanCategories {
				var cat models.Category
				tx.FirstOrCreate(&cat, models.Category{Name: catName})
				catModels = append(catModels, cat)
			}
			if err := tx.Model(&post).Association("CategoriesList").Replace(catModels); err != nil {
				tx.Rollback()
				return 0, fmt.Errorf("failed to replace categories list for post %d: %w", post.ID, err)
			}

			if err := tx.Save(&post).Error; err != nil {
				tx.Rollback()
				return 0, fmt.Errorf("failed to update post %d: %w", post.ID, err)
			}
			cleaned++
		}
	}

	categoryTable := serviceTableName(tx, &models.Category{})
	categoryJoinTable := serviceJoinTableName(tx, &models.BlogPost{}, "CategoriesList")
	res := tx.Exec(fmt.Sprintf("DELETE FROM %s WHERE id NOT IN (SELECT category_id FROM %s)", categoryTable, categoryJoinTable))
	if res.Error != nil {
		tx.Rollback()
		return 0, fmt.Errorf("failed to delete unused categories: %w", res.Error)
	}
	cleanedCatsCount := int(res.RowsAffected)

	if err := tx.Commit().Error; err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.invalidateCache()
	return cleanedCatsCount, nil
}
