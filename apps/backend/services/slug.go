package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"repair-platform/utils"

	"github.com/mozillazg/go-pinyin"
)

// SlugGenerator slug生成器
type SlugGenerator struct{}

// NewSlugGenerator 创建slug生成器实例
func NewSlugGenerator() *SlugGenerator {
	return &SlugGenerator{}
}

// GenerateSlug 生成URL友好的slug，支持中文
func (sg *SlugGenerator) GenerateSlug(title string) string {
	if title == "" {
		return sg.generateFallbackSlug()
	}

	// 清理和预处理
	slug := strings.TrimSpace(title)

	// 检测是否包含中文字符
	if sg.containsChinese(slug) {
		slug = sg.convertChineseToSlug(slug)
	} else {
		slug = sg.convertLatinToSlug(slug)
	}

	// 后处理：清理多余字符
	slug = sg.cleanSlug(slug)

	// 如果处理后为空，使用回退方案
	if slug == "" {
		slug = sg.generateFallbackSlug()
	}

	// 限制长度 (Runes-aware)
	if len(slug) > 100 {
		slug = utils.TruncateString(slug, 100)
		// 确保不在单词中间截断
		if lastDash := strings.LastIndex(slug, "-"); lastDash > 50 {
			slug = slug[:lastDash]
		}
	}

	return slug
}

// containsChinese 检测字符串是否包含中文字符
func (sg *SlugGenerator) containsChinese(s string) bool {
	for _, r := range s {
		if unicode.Is(unicode.Scripts["Han"], r) {
			return true
		}
	}
	return false
}

// convertChineseToSlug 将包含中文的字符串转换为slug
func (sg *SlugGenerator) convertChineseToSlug(title string) string {
	var result strings.Builder

	// 分割成词段处理（中文字符和连续的拉丁字符）
	segments := sg.segmentMixedContent(title)

	for i, segment := range segments {
		if segment == "" {
			continue
		}

		var segmentSlug string
		if sg.containsChinese(segment) {
			// 处理中文段
			args := pinyin.NewArgs()
			args.Style = pinyin.Tone3
			args.Heteronym = false
			args.Separator = "-"

			pinyinSlices := pinyin.LazyPinyin(segment, args)
			var pinyinResult strings.Builder
			for j, py := range pinyinSlices {
				if py == "" {
					continue
				}
				py = sg.removeToneNumbers(py)
				if j > 0 && pinyinResult.Len() > 0 {
					pinyinResult.WriteString("-")
				}
				pinyinResult.WriteString(py)
			}
			segmentSlug = pinyinResult.String()
		} else {
			// 处理拉丁字符段
			segmentSlug = sg.convertLatinToSlug(segment)
		}

		if segmentSlug != "" {
			if i > 0 && result.Len() > 0 {
				result.WriteString("-")
			}
			result.WriteString(segmentSlug)
		}
	}

	return strings.ToLower(result.String())
}

// segmentMixedContent 将混合内容分割为段，每段要么是纯中文，要么是纯拉丁字符
func (sg *SlugGenerator) segmentMixedContent(title string) []string {
	var segments []string
	var currentSegment strings.Builder
	var lastWasChinese bool
	var initialized bool

	for _, r := range title {
		isChinese := unicode.Is(unicode.Scripts["Han"], r)
		isLatin := unicode.IsLetter(r) || unicode.IsDigit(r)

		if !isLatin && !isChinese {
			// 分隔符字符
			if currentSegment.Len() > 0 {
				segments = append(segments, currentSegment.String())
				currentSegment.Reset()
				initialized = false
			}
			continue
		}

		if !initialized {
			// 开始新的段
			currentSegment.WriteRune(r)
			lastWasChinese = isChinese
			initialized = true
		} else if isChinese != lastWasChinese {
			// 字符类型改变，结束当前段，开始新段
			if currentSegment.Len() > 0 {
				segments = append(segments, currentSegment.String())
				currentSegment.Reset()
			}
			currentSegment.WriteRune(r)
			lastWasChinese = isChinese
		} else {
			// 同类型字符，添加到当前段
			currentSegment.WriteRune(r)
		}
	}

	// 添加最后一段
	if currentSegment.Len() > 0 {
		segments = append(segments, currentSegment.String())
	}

	return segments
}

// convertLatinToSlug 将拉丁文字转换为slug
func (sg *SlugGenerator) convertLatinToSlug(title string) string {
	// 转换为小写
	slug := strings.ToLower(title)

	// 替换空格和下划线为连字符
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")

	// 移除或替换特殊字符
	slug = sg.replaceSpecialChars(slug)

	// 只保留字母、数字和连字符
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}

	return result.String()
}

// removeToneNumbers 移除拼音中的声调数字
func (sg *SlugGenerator) removeToneNumbers(pinyin string) string {
	// 移除数字1-4（声调标记）
	reg := regexp.MustCompile(`[1-4]`)
	return reg.ReplaceAllString(pinyin, "")
}

// replaceSpecialChars 替换特殊字符为ASCII等价字符
func (sg *SlugGenerator) replaceSpecialChars(s string) string {
	// 常见的特殊字符替换映射
	replacements := map[string]string{
		"á": "a", "à": "a", "ä": "a", "â": "a", "ā": "a", "ã": "a",
		"é": "e", "è": "e", "ë": "e", "ê": "e", "ē": "e",
		"í": "i", "ì": "i", "ï": "i", "î": "i", "ī": "i",
		"ó": "o", "ò": "o", "ö": "o", "ô": "o", "ō": "o", "õ": "o",
		"ú": "u", "ù": "u", "ü": "u", "û": "u", "ū": "u",
		"ñ": "n", "ç": "c",
		"&": "and",
		"@": "at",
		"+": "plus",
		"=": "equals",
		"°": "degrees",
		"€": "euro",
		"$": "dollar",
		"£": "pound",
		"¥": "yen",
	}

	result := s
	for from, to := range replacements {
		result = strings.ReplaceAll(result, from, to)
	}

	return result
}

// cleanSlug 清理slug中的多余字符
func (sg *SlugGenerator) cleanSlug(slug string) string {
	// 移除连续的连字符
	reg := regexp.MustCompile(`-+`)
	slug = reg.ReplaceAllString(slug, "-")

	// 移除开头和结尾的连字符
	slug = strings.Trim(slug, "-")

	return slug
}

// generateFallbackSlug 生成回退slug
func (sg *SlugGenerator) generateFallbackSlug() string {
	timestamp := time.Now().Unix()
	return fmt.Sprintf("post-%d", timestamp)
}

// GenerateUniqueSlug 生成唯一的slug（用于避免冲突）
func (sg *SlugGenerator) GenerateUniqueSlug(title string, existingSlugChecker func(string) bool) string {
	baseSlug := sg.GenerateSlug(title)

	// 检查是否已存在
	if !existingSlugChecker(baseSlug) {
		return baseSlug
	}

	// 策略1: 尝试使用简化版本（如果有的话）
	suggestions := sg.SuggestSlugs(title, 3)
	for _, suggestion := range suggestions {
		if suggestion != baseSlug && !existingSlugChecker(suggestion) {
			return suggestion
		}
	}

	// 策略2: 添加数字后缀
	counter := 1
	for {
		newSlug := fmt.Sprintf("%s-%d", baseSlug, counter)
		if !existingSlugChecker(newSlug) {
			return newSlug
		}
		counter++

		// 防止无限循环
		if counter > 1000 {
			// 使用时间戳作为最终回退
			return fmt.Sprintf("%s-%d", baseSlug, time.Now().UnixNano())
		}
	}
}

// SuggestSlugs 为给定标题生成多个slug候选
func (sg *SlugGenerator) SuggestSlugs(title string, count int) []string {
	if count <= 0 {
		count = 3
	}

	suggestions := make([]string, 0, count)

	// 第一个建议：标准slug
	mainSlug := sg.GenerateSlug(title)
	suggestions = append(suggestions, mainSlug)

	if count == 1 {
		return suggestions
	}

	// 第二个建议：简化版本（仅保留主要词汇）
	if sg.containsChinese(title) {
		// 中文：尝试提取关键词
		simplified := sg.simplifyChineseTitle(title)
		if simplified != mainSlug {
			suggestions = append(suggestions, simplified)
		}
	} else {
		// 英文：移除常见停词
		simplified := sg.simplifyEnglishTitle(title)
		if simplified != mainSlug {
			suggestions = append(suggestions, simplified)
		}
	}

	// 第三个及以后：添加数字或时间戳变体
	for len(suggestions) < count {
		variant := fmt.Sprintf("%s-%d", mainSlug, len(suggestions))
		suggestions = append(suggestions, variant)
	}

	return suggestions
}

// GenerateSlugWithContext 生成带上下文信息的slug（改进的冲突避免策略）
func (sg *SlugGenerator) GenerateSlugWithContext(title string, authorName string, createdAt time.Time, existingSlugChecker func(string) bool) string {
	baseSlug := sg.GenerateSlug(title)

	// 检查是否已存在
	if !existingSlugChecker(baseSlug) {
		return baseSlug
	}

	// 策略1: 尝试添加作者信息
	if authorName != "" {
		authorSlug := sg.GenerateSlug(authorName)
		if authorSlug != "" {
			contextSlug := fmt.Sprintf("%s-by-%s", baseSlug, authorSlug)
			if !existingSlugChecker(contextSlug) {
				return contextSlug
			}
		}
	}

	// 策略2: 添加年月信息
	dateSlug := fmt.Sprintf("%s-%d-%02d", baseSlug, createdAt.Year(), createdAt.Month())
	if !existingSlugChecker(dateSlug) {
		return dateSlug
	}

	// 策略3: 回退到标准的唯一slug生成
	return sg.GenerateUniqueSlug(title, existingSlugChecker)
}

// simplifyChineseTitle 简化中文标题
func (sg *SlugGenerator) simplifyChineseTitle(title string) string {
	// 简单实现：限制字符数，去除常见的助词
	commonWords := []string{"的", "了", "和", "与", "或", "及", "以及", "关于", "对于"}

	simplified := title
	for _, word := range commonWords {
		simplified = strings.ReplaceAll(simplified, word, "")
	}

	return sg.GenerateSlug(simplified)
}

// simplifyEnglishTitle 简化英文标题
func (sg *SlugGenerator) simplifyEnglishTitle(title string) string {
	// 移除常见停词
	stopWords := []string{"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "about"}

	words := strings.Fields(strings.ToLower(title))
	filtered := make([]string, 0, len(words))

	for _, word := range words {
		isStopWord := false
		for _, stopWord := range stopWords {
			if word == stopWord {
				isStopWord = true
				break
			}
		}
		if !isStopWord {
			filtered = append(filtered, word)
		}
	}

	simplified := strings.Join(filtered, " ")
	return sg.GenerateSlug(simplified)
}
