package services

import "repair-platform/models"

func (s *BlogService) joinTags(tags []models.Tag) string {
	var names []string
	for _, t := range tags {
		names = append(names, t.Name)
	}
	// 简单的逗号连接，实际应使用 strings.Join
	result := ""
	for i, name := range names {
		if i > 0 {
			result += ","
		}
		result += name
	}
	return result
}

// 辅助方法：拼接分类
func (s *BlogService) joinCategories(cats []models.Category) string {
	var names []string
	for _, c := range cats {
		names = append(names, c.Name)
	}
	result := ""
	for i, name := range names {
		if i > 0 {
			result += ","
		}
		result += name
	}
	return result
}
