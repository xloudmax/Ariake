package services

import (
	"fmt"
	"math"
	"repair-platform/config"
	"repair-platform/models"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"

	"gorm.io/gorm"
)

// SearchService 搜索服务
type SearchService struct {
	db         *gorm.DB
	ftsMu      sync.RWMutex
	ftsChecked bool
	hasFTS     bool
}

// NewSearchService 创建搜索服务实例
func NewSearchService(db *gorm.DB) *SearchService {
	return &SearchService{db: db}
}

// supportsFTS 判断底层数据库是否存在 FTS 虚拟表
func (s *SearchService) supportsFTS() bool {
	s.ftsMu.RLock()
	if s.ftsChecked {
		hasFTS := s.hasFTS
		s.ftsMu.RUnlock()
		return hasFTS
	}
	s.ftsMu.RUnlock()

	return s.RefreshFTSSupport()
}

// RefreshFTSSupport 重新探测当前数据库是否可用 FTS。
func (s *SearchService) RefreshFTSSupport() bool {
	hasFTS := s.detectFTSSupport()

	s.ftsMu.Lock()
	s.hasFTS = hasFTS
	s.ftsChecked = true
	s.ftsMu.Unlock()

	return hasFTS
}

// ResetFTSSupport 清除当前进程缓存的 FTS 探测结果。
func (s *SearchService) ResetFTSSupport() {
	s.ftsMu.Lock()
	s.hasFTS = false
	s.ftsChecked = false
	s.ftsMu.Unlock()
}

func (s *SearchService) detectFTSSupport() bool {
	if s == nil || s.db == nil {
		return false
	}
	var probe int
	return s.db.Raw("SELECT 1 FROM blog_post_fts LIMIT 1").Scan(&probe).Error == nil
}

// applyVisibilityFilters 根据用户角色/ID 追加文章可见性过滤
func (s *SearchService) applyVisibilityFilters(query *gorm.DB, userID *uint, userRole string) *gorm.DB {
	if userRole == "ADMIN" {
		return query
	}

	if userID != nil {
		return query.Where("(status = 'PUBLISHED' AND access_level = 'PUBLIC') OR author_id = ?", *userID)
	}

	return query.Where("status = 'PUBLISHED' AND access_level = 'PUBLIC'")
}

// SearchResult 搜索结果
type SearchResult struct {
	Posts []*models.BlogPost
	Total int64
	Took  time.Duration
}

// AdvancedSearchPosts 高级搜索博客文章（带缓存）
func (s *SearchService) AdvancedSearchPosts(query string, limit, offset int, userID *uint, userRole string) (*SearchResult, error) {
	startTime := time.Now()
	cfg := config.GetConfig()
	cacheTTL := 5 * time.Minute
	if ttl, err := time.ParseDuration(cfg.CacheTTL); err == nil {
		cacheTTL = ttl
	}
	useCache := cfg.CacheEnabled

	cacheService := GetGlobalSearchCache()
	if useCache {
		if cached, found := cacheService.Get(query, limit, offset, userID, userRole); found {
			return &SearchResult{
				Posts: cached.Posts,
				Total: cached.Total,
				Took:  time.Since(startTime),
			}, nil
		}
	}

	keywords := s.tokenize(query)
	if len(keywords) == 0 {
		return &SearchResult{Posts: []*models.BlogPost{}, Total: 0}, nil
	}

	if s.supportsFTS() {
		res, err := s.searchWithFTS(keywords, limit, offset, userID, userRole)
		if err == nil {
			s.LogSearchQuery(query, len(res.Posts), userID)
			if useCache {
				cacheService.Set(query, limit, offset, userID, userRole, res, cacheTTL)
			}
			return res, nil
		}
		// If FTS fails (e.g. missing module), log it and fallback to LIKE
		fmt.Printf("Search: FTS failed, falling back to LIKE: %v\n", err)
	}

	dbQuery := s.applyVisibilityFilters(
		s.db.Model(&models.BlogPost{}).
			Preload("Author").
			Preload("Stats"),
		userID, userRole,
	)

	searchConditions := s.buildFullTextSearchConditions(keywords)
	if len(searchConditions) > 0 {
		for _, condition := range searchConditions {
			dbQuery = dbQuery.Where(condition.query, condition.args...)
		}
	}

	var total int64
	countQuery := dbQuery.Session(&gorm.Session{})
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	var posts []models.BlogPost
	err := dbQuery.
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&posts).Error

	if err != nil {
		return nil, err
	}

	scoredPosts := s.calculateRelevanceScores(posts, keywords)
	result := make([]*models.BlogPost, len(scoredPosts))
	for i := range scoredPosts {
		result[i] = &scoredPosts[i].Post
	}

	took := time.Since(startTime)
	searchResult := &SearchResult{
		Posts: result,
		Total: total,
		Took:  took,
	}

	s.LogSearchQuery(query, len(result), userID)
	if useCache {
		cacheService.Set(query, limit, offset, userID, userRole, searchResult, cacheTTL)
	}

	return searchResult, nil
}

// SearchCondition 搜索条件结构
type SearchCondition struct {
	query string
	args  []interface{}
}

// searchWithFTS 使用 SQLite FTS 查询
func (s *SearchService) searchWithFTS(keywords []string, limit, offset int, userID *uint, userRole string) (*SearchResult, error) {
	start := time.Now()
	matchQuery := buildFTSMatchQuery(keywords)

	baseQuery := s.applyVisibilityFilters(
		s.db.Model(&models.BlogPost{}).
			Select("blog_post.*, bm25(blog_post_fts, 1.5, 1.0, 0.75, 0.5) AS rank").
			Joins("JOIN blog_post_fts ON blog_post_fts.rowid = blog_post.id").
			Preload("Author").
			Preload("Stats"),
		userID, userRole,
	).Where("blog_post_fts MATCH ?", matchQuery)

	var total int64
	if err := baseQuery.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, err
	}

	var posts []models.BlogPost
	if err := baseQuery.Offset(offset).Limit(limit).Order("rank ASC, blog_post.created_at DESC").Find(&posts).Error; err != nil {
		return nil, err
	}

	scored := s.calculateRelevanceScores(posts, keywords)
	result := make([]*models.BlogPost, len(scored))
	for i := range scored {
		result[i] = &scored[i].Post
	}

	return &SearchResult{Posts: result, Total: total, Took: time.Since(start)}, nil
}

func buildFTSMatchQuery(keywords []string) string {
	parts := make([]string, 0, len(keywords))
	for _, kw := range keywords {
		kw = strings.TrimSpace(strings.ReplaceAll(kw, "\"", "\"\""))
		if kw == "" {
			continue
		}
		parts = append(parts, fmt.Sprintf("%s*", kw))
	}

	return strings.Join(parts, " OR ")
}

// buildFullTextSearchConditions 构建全文搜索条件
func (s *SearchService) buildFullTextSearchConditions(keywords []string) []SearchCondition {
	var conditions []SearchCondition

	// 为每个关键词构建搜索条件
	for _, keyword := range keywords {
		// 使用 PostgreSQL 的全文搜索功能（如果使用 PostgreSQL）
		// 或使用 LIKE 进行模糊匹配
		likeKeyword := "%" + keyword + "%"

		// 构建多字段搜索条件
		condition := SearchCondition{
			query: "(title LIKE ? OR content LIKE ? OR tags LIKE ? OR categories LIKE ?)",
			args:  []interface{}{likeKeyword, likeKeyword, likeKeyword, likeKeyword},
		}

		conditions = append(conditions, condition)
	}

	return conditions
}

// ScoredPost 带得分的文章
type ScoredPost struct {
	Post  models.BlogPost
	Score float64
}

// calculateRelevanceScores 计算相关性得分
func (s *SearchService) calculateRelevanceScores(posts []models.BlogPost, keywords []string) []ScoredPost {
	var scoredPosts []ScoredPost

	for _, post := range posts {
		score := s.calculatePostScore(post, keywords)
		scoredPosts = append(scoredPosts, ScoredPost{
			Post:  post,
			Score: score,
		})
	}

	// 按得分降序排序
	sort.Slice(scoredPosts, func(i, j int) bool {
		// 如果得分相同，按创建时间排序（新的在前）
		if scoredPosts[i].Score == scoredPosts[j].Score {
			return scoredPosts[i].Post.CreatedAt.After(scoredPosts[j].Post.CreatedAt)
		}
		return scoredPosts[i].Score > scoredPosts[j].Score
	})

	return scoredPosts
}

// calculatePostScore 计算单篇文章的相关性得分
func (s *SearchService) calculatePostScore(post models.BlogPost, keywords []string) float64 {
	var totalScore float64

	// 字段权重
	titleWeight := 3.0
	contentWeight := 1.0
	tagsWeight := 2.0
	categoriesWeight := 1.5

	// 时间衰减因子（新文章得分更高）
	timeFactor := s.calculateTimeFactor(post.CreatedAt)

	// 人气因子（基于浏览量和点赞数）
	popularityFactor := s.calculatePopularityFactor(post)

	// 关键词密度因子
	keywordDensityFactor := s.calculateKeywordDensityFactor(post, keywords)

	for _, keyword := range keywords {
		lowerKeyword := strings.ToLower(keyword)

		// 标题匹配
		titleScore := s.calculateFieldScore(strings.ToLower(post.Title), lowerKeyword) * titleWeight

		// 内容匹配
		contentScore := s.calculateFieldScore(strings.ToLower(post.Content), lowerKeyword) * contentWeight

		// 标签匹配
		tagsScore := s.calculateFieldScore(strings.ToLower(post.Tags), lowerKeyword) * tagsWeight

		// 分类匹配
		categoriesScore := s.calculateFieldScore(strings.ToLower(post.Categories), lowerKeyword) * categoriesWeight

		totalScore += titleScore + contentScore + tagsScore + categoriesScore
	}

	// 应用各种因子
	finalScore := totalScore * timeFactor * popularityFactor * keywordDensityFactor

	return finalScore
}

// calculateFieldScore 计算字段匹配得分
func (s *SearchService) calculateFieldScore(fieldValue, keyword string) float64 {
	if !strings.Contains(fieldValue, keyword) {
		return 0
	}

	// 精确匹配得分更高
	if fieldValue == keyword {
		return 10.0
	}

	// 计算匹配次数
	matchCount := strings.Count(fieldValue, keyword)

	// 计算字段长度因子（在较短的字段中匹配得分更高）
	lengthFactor := 1.0 / (1.0 + math.Log(float64(len(fieldValue))/float64(len(keyword))))

	return float64(matchCount) * lengthFactor
}

// calculateTimeFactor 计算时间衰减因子
func (s *SearchService) calculateTimeFactor(createdAt time.Time) float64 {
	daysSinceCreated := time.Since(createdAt).Hours() / 24

	// 30天内的文章得分不衰减，之后每30天衰减10%
	if daysSinceCreated <= 30 {
		return 1.0
	}

	decayPeriods := (daysSinceCreated - 30) / 30
	timeFactor := math.Pow(0.9, decayPeriods)

	// 最小时间因子为0.1
	if timeFactor < 0.1 {
		timeFactor = 0.1
	}

	return timeFactor
}

// calculatePopularityFactor 计算人气因子
func (s *SearchService) calculatePopularityFactor(post models.BlogPost) float64 {
	// 基础人气得分 - 使用Stats数据
	var popularityScore float64
	if post.Stats != nil {
		popularityScore = float64(post.Stats.ViewCount)*0.1 + float64(post.Stats.LikeCount)*2.0
	}

	// 使用对数函数避免热门文章得分过高
	if popularityScore > 0 {
		return 1.0 + math.Log(1.0+popularityScore)/10.0
	}

	return 1.0
}

// calculateKeywordDensityFactor 计算关键词密度因子
func (s *SearchService) calculateKeywordDensityFactor(post models.BlogPost, keywords []string) float64 {
	if len(keywords) == 0 {
		return 1.0
	}

	totalWords := float64(len(strings.Fields(post.Content)))
	if totalWords == 0 {
		return 1.0
	}

	keywordCount := 0
	for _, keyword := range keywords {
		keywordCount += strings.Count(strings.ToLower(post.Content), strings.ToLower(keyword))
	}

	// 计算关键词密度（关键词出现次数/总词数）
	density := float64(keywordCount) / totalWords

	// 密度在2%-8%之间为最佳，给予最高分
	if density >= 0.02 && density <= 0.08 {
		return 1.5 // 给予1.5倍加分
	} else if density > 0.08 {
		// 密度过高可能不是好文章，适当降低得分
		return 0.8
	}

	// 密度较低，正常得分
	return 1.0
}

// tokenize 分词处理 - 改进版本
func (s *SearchService) tokenize(query string) []string {
	// 清理查询字符串
	query = strings.TrimSpace(query)
	if query == "" {
		return []string{}
	}

	// 移除标点符号，只保留字母、数字和中文字符
	var cleanedQuery strings.Builder
	for _, r := range query {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.Is(unicode.Scripts["Han"], r) {
			cleanedQuery.WriteRune(r)
		} else {
			cleanedQuery.WriteRune(' ')
		}
	}
	query = cleanedQuery.String()

	// 按空格分割
	words := strings.Fields(query)

	// 去重和清理
	keywordMap := make(map[string]bool)
	var keywords []string

	for _, word := range words {
		word = strings.ToLower(strings.TrimSpace(word))
		// 忽略长度小于2的词，除非是数字
		if len(word) >= 2 || (len(word) == 1 && unicode.IsDigit(rune(word[0]))) {
			if !keywordMap[word] {
				keywordMap[word] = true
				keywords = append(keywords, word)
			}
		}
	}

	return keywords
}

// GetSearchSuggestions 获取搜索建议
func (s *SearchService) GetSearchSuggestions(query string, limit int) ([]string, error) {
	keywords := s.tokenize(query)
	if len(keywords) == 0 {
		return []string{}, nil
	}

	// 从文章标题和标签中获取建议
	var suggestions []string

	// 标题建议
	var titles []string
	err := s.db.Model(&models.BlogPost{}).
		Where("status = 'PUBLISHED' AND access_level = 'PUBLIC'").
		Where("title LIKE ?", "%"+strings.Join(keywords, "%")+"%").
		Limit(limit/2).
		Pluck("title", &titles).Error

	if err == nil {
		suggestions = append(suggestions, titles...)
	}

	// 标签建议
	var tags []string
	err = s.db.Model(&models.BlogPost{}).
		Where("status = 'PUBLISHED' AND access_level = 'PUBLIC'").
		Where("tags LIKE ?", "%"+strings.Join(keywords, "%")+"%").
		Limit(limit/2).
		Pluck("tags", &tags).Error

	if err == nil {
		// 解析标签字符串
		for _, tagString := range tags {
			if tagString != "" {
				tagList := strings.Split(tagString, ",")
				for _, tag := range tagList {
					tag = strings.TrimSpace(tag)
					if tag != "" && !contains(suggestions, tag) {
						suggestions = append(suggestions, tag)
					}
				}
			}
		}
	}

	// 限制返回数量
	if len(suggestions) > limit {
		suggestions = suggestions[:limit]
	}

	return suggestions, nil
}

// contains 检查切片是否包含指定元素
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// GetTrendingSearches 获取热门搜索词
func (s *SearchService) GetTrendingSearches(limit int) ([]string, error) {
	// 简化实现：从文章标签中获取最常用的词
	var tags []string
	err := s.db.Model(&models.BlogPost{}).
		Where("status = 'PUBLISHED' AND access_level = 'PUBLIC'").
		Where("tags IS NOT NULL AND tags != ''").              // 添加非空检查
		Where("created_at > ?", time.Now().AddDate(0, -1, 0)). // 最近一个月
		Pluck("tags", &tags).Error

	if err != nil {
		return []string{}, err
	}

	// 统计标签频率
	tagCount := make(map[string]int)
	for _, tagString := range tags {
		// 再次检查确保不为空
		if tagString != "" && tagString != "NULL" {
			tagList := strings.Split(tagString, ",")
			for _, tag := range tagList {
				tag = strings.TrimSpace(tag)
				if len(tag) >= 2 {
					tagCount[tag]++
				}
			}
		}
	}

	// 排序并返回前N个
	type tagFreq struct {
		tag   string
		count int
	}

	var tagFreqs []tagFreq
	for tag, count := range tagCount {
		tagFreqs = append(tagFreqs, tagFreq{tag: tag, count: count})
	}

	sort.Slice(tagFreqs, func(i, j int) bool {
		return tagFreqs[i].count > tagFreqs[j].count
	})

	var trending []string
	for i, tf := range tagFreqs {
		if i >= limit {
			break
		}
		trending = append(trending, tf.tag)
	}

	return trending, nil
}

// HighlightKeywords 高亮关键词
func (s *SearchService) HighlightKeywords(content string, keywords []string) string {
	if len(keywords) == 0 {
		return content
	}

	result := content
	for _, keyword := range keywords {
		// 使用简单的标记高亮关键词
		highlighted := "<mark>" + keyword + "</mark>"
		result = strings.ReplaceAll(result, keyword, highlighted)
	}

	return result
}

// FacetItem 聚合项
type FacetItem struct {
	Value string
	Count int
}

// GetTagFacets 获取标签聚合
func (s *SearchService) GetTagFacets(query string, limit int) ([]FacetItem, error) {
	var facets []FacetItem

	// 简化实现：从匹配的文章中提取标签并统计
	var posts []models.BlogPost
	err := s.db.Model(&models.BlogPost{}).
		Where("status = 'PUBLISHED' AND access_level = 'PUBLIC'").
		Where("title LIKE ? OR content LIKE ? OR tags LIKE ? OR categories LIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%").
		Find(&posts).Error

	if err != nil {
		return facets, err
	}

	// 统计标签频率
	tagCount := make(map[string]int)
	for _, post := range posts {
		if post.Tags != "" {
			tags := strings.Split(post.Tags, ",")
			for _, tag := range tags {
				tag = strings.TrimSpace(tag)
				if tag != "" {
					tagCount[tag]++
				}
			}
		}
	}

	// 转换为 FacetItem 列表并排序
	type tagCountPair struct {
		tag   string
		count int
	}

	var tagCounts []tagCountPair
	for tag, count := range tagCount {
		tagCounts = append(tagCounts, tagCountPair{tag: tag, count: count})
	}

	// 按计数排序
	sort.Slice(tagCounts, func(i, j int) bool {
		return tagCounts[i].count > tagCounts[j].count
	})

	// 限制返回数量
	for i, tc := range tagCounts {
		if i >= limit {
			break
		}
		facets = append(facets, FacetItem{Value: tc.tag, Count: tc.count})
	}

	return facets, nil
}

// GetCategoryFacets 获取分类聚合
func (s *SearchService) GetCategoryFacets(query string, limit int) ([]FacetItem, error) {
	var facets []FacetItem

	// 简化实现：从匹配的文章中提取分类并统计
	var posts []models.BlogPost
	err := s.db.Model(&models.BlogPost{}).
		Where("status = 'PUBLISHED' AND access_level = 'PUBLIC'").
		Where("title LIKE ? OR content LIKE ? OR tags LIKE ? OR categories LIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%").
		Find(&posts).Error

	if err != nil {
		return facets, err
	}

	// 统计分类频率
	categoryCount := make(map[string]int)
	for _, post := range posts {
		if post.Categories != "" {
			categories := strings.Split(post.Categories, ",")
			for _, category := range categories {
				category = strings.TrimSpace(category)
				if category != "" {
					categoryCount[category]++
				}
			}
		}
	}

	// 转换为 FacetItem 列表并排序
	type categoryCountPair struct {
		category string
		count    int
	}

	var categoryCounts []categoryCountPair
	for category, count := range categoryCount {
		categoryCounts = append(categoryCounts, categoryCountPair{category: category, count: count})
	}

	// 按计数排序
	sort.Slice(categoryCounts, func(i, j int) bool {
		return categoryCounts[i].count > categoryCounts[j].count
	})

	// 限制返回数量
	for i, cc := range categoryCounts {
		if i >= limit {
			break
		}
		facets = append(facets, FacetItem{Value: cc.category, Count: cc.count})
	}

	return facets, nil
}

// GetAuthorFacets 获取作者聚合
func (s *SearchService) GetAuthorFacets(query string, limit int) ([]FacetItem, error) {
	var facets []FacetItem

	// 简化实现：从匹配的文章中提取作者并统计
	type AuthorResult struct {
		Username string
		Count    int
	}

	var authors []AuthorResult
	err := s.db.Model(&models.BlogPost{}).
		Select("users.username, COUNT(*) as count").
		Joins("JOIN users ON blog_post.author_id = users.id").
		Where("blog_post.status = 'PUBLISHED' AND blog_post.access_level = 'PUBLIC'").
		Where("blog_post.title LIKE ? OR blog_post.content LIKE ? OR blog_post.tags LIKE ? OR blog_post.categories LIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%").
		Group("users.username").
		Order("count DESC").
		Limit(limit).
		Scan(&authors).Error

	if err != nil {
		return facets, err
	}

	// 转换为 FacetItem 列表
	for _, author := range authors {
		facets = append(facets, FacetItem{Value: author.Username, Count: author.Count})
	}

	return facets, nil
}

// GetCacheStats 获取缓存统计信息
func (s *SearchService) GetCacheStats() map[string]interface{} {
	cacheService := GetGlobalSearchCache()
	return cacheService.GetCacheStats()
}

// LogSearchQuery 记录搜索查询
func (s *SearchService) LogSearchQuery(query string, resultCount int, userID *uint) error {
	// 如果查询为空，不记录
	if strings.TrimSpace(query) == "" {
		return nil
	}

	// 创建搜索查询记录
	searchQuery := &models.SearchQuery{
		Query:       strings.TrimSpace(query),
		ResultCount: resultCount,
		UserID:      userID,
	}

	// 异步记录，不阻塞主流程
	go func() {
		if err := s.db.Create(searchQuery).Error; err != nil {
			// 记录错误但不影响搜索结果
			// 可以添加日志记录
		}
	}()

	return nil
}

// GetSearchQueryStats 获取搜索统计数据
func (s *SearchService) GetSearchQueryStats(limit int, days int) ([]models.SearchQueryStats, error) {
	var stats []models.SearchQueryStats

	// 计算时间范围
	startDate := time.Now().AddDate(0, 0, -days)

	// 聚合查询：按查询词分组，统计次数和最后搜索时间
	err := s.db.Model(&models.SearchQuery{}).
		Select("query, COUNT(*) as count, MAX(created_at) as last_searched").
		Where("created_at >= ?", startDate).
		Group("query").
		Order("count DESC").
		Limit(limit).
		Scan(&stats).Error

	return stats, err
}

// GetTotalSearchCount 获取总搜索次数
func (s *SearchService) GetTotalSearchCount(days int) (int64, error) {
	var count int64

	startDate := time.Now().AddDate(0, 0, -days)

	err := s.db.Model(&models.SearchQuery{}).
		Where("created_at >= ?", startDate).
		Count(&count).Error

	return count, err
}

// GetUniqueSearchCount 获取唯一搜索词数量
func (s *SearchService) GetUniqueSearchCount(days int) (int64, error) {
	var count int64

	startDate := time.Now().AddDate(0, 0, -days)

	err := s.db.Model(&models.SearchQuery{}).
		Select("COUNT(DISTINCT query)").
		Where("created_at >= ?", startDate).
		Count(&count).Error

	return count, err
}

// GetSearchTrends 获取搜索趋势数据
func (s *SearchService) GetSearchTrends(days int) ([]map[string]interface{}, error) {
	var trends []map[string]interface{}

	startDate := time.Now().AddDate(0, 0, -days)

	// 按日期分组统计搜索次数
	type DailyCount struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}

	var dailyCounts []DailyCount
	err := s.db.Model(&models.SearchQuery{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&dailyCounts).Error

	if err != nil {
		return trends, err
	}

	// 转换为通用格式
	for _, dc := range dailyCounts {
		trends = append(trends, map[string]interface{}{
			"date":  dc.Date,
			"count": dc.Count,
		})
	}

	return trends, nil
}
