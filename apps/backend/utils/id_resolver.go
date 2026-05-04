package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

// IDType 表示ID的类型
type IDType int

const (
	IDTypeUnknown IDType = iota
	IDTypeNumeric        // 数字ID (如: "123", "456")
	IDTypeUUID           // UUID格式 (如: "550e8400-e29b-41d4-a716-446655440000")
	IDTypeSlug           // Slug格式 (如: "my-blog-post", "user-profile")
	IDTypeBase64         // Base64编码的ID
)

// IDInfo 包含ID的解析信息
type IDInfo struct {
	Original     string
	Type         IDType
	NumericValue uint64 // 当类型为Numeric时的数值
	SlugValue    string // 当类型为Slug时的slug值
	UUIDValue    string // 当类型为UUID时的UUID值
}

// IDResolver ID解析器
type IDResolver struct {
	// 预编译的正则表达式
	uuidRegex    *regexp.Regexp
	slugRegex    *regexp.Regexp
	numericRegex *regexp.Regexp
}

// NewIDResolver 创建新的ID解析器
func NewIDResolver() *IDResolver {
	return &IDResolver{
		// UUID格式: 8-4-4-4-12个十六进制字符
		uuidRegex: regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`),
		// Slug格式: 允许各种字符，只要不是全空格即可
		slugRegex: regexp.MustCompile(`^.+$`),
		// 纯数字格式
		numericRegex: regexp.MustCompile(`^[1-9]\d*$`),
	}
}

// ParseID 解析ID并返回类型信息
func (r *IDResolver) ParseID(id string) (*IDInfo, error) {
	if id == "" {
		return nil, fmt.Errorf("ID不能为空")
	}

	// 去除首尾空白
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("ID不能为空白字符")
	}

	info := &IDInfo{
		Original: id,
		Type:     IDTypeUnknown,
	}

	// 检查是否为数字ID
	if r.numericRegex.MatchString(id) {
		numericValue, err := strconv.ParseUint(id, 10, 64)
		if err == nil && numericValue > 0 {
			info.Type = IDTypeNumeric
			info.NumericValue = numericValue
			return info, nil
		}
	}

	// 检查是否为UUID
	if r.uuidRegex.MatchString(id) {
		info.Type = IDTypeUUID
		info.UUIDValue = strings.ToLower(id) // 标准化为小写
		return info, nil
	}

	// 检查是否为Slug (放宽限制，只要长度在 1-2048 个字符即可)
	runeCount := utf8.RuneCountInString(id)
	if r.slugRegex.MatchString(id) && runeCount >= 1 && runeCount <= 2048 {
		// 不再强制转为小写，因为中文字符或 Base64 可能会受到影响，但根据业务需求，slug 通常是大小写不敏感的
		// 我们保留原始大小写，如果业务需要小写，可以在具体查询中处理
		info.Type = IDTypeSlug
		info.SlugValue = id
		return info, nil
	}

	// 检查是否为Base64编码（可选功能）
	if r.isValidBase64(id) {
		info.Type = IDTypeBase64
		return info, nil
	}

	return nil, fmt.Errorf("无法识别的ID格式: %s", id)
}

// isValidBase64 检查是否为有效的Base64编码
func (r *IDResolver) isValidBase64(s string) bool {
	// 简单的Base64检查：长度是4的倍数，只包含Base64字符
	if len(s)%4 != 0 {
		return false
	}
	base64Regex := regexp.MustCompile(`^[A-Za-z0-9+/]*={0,2}$`)
	return base64Regex.MatchString(s) && len(s) >= 4
}

// AsNumeric 尝试将ID转换为数字
func (info *IDInfo) AsNumeric() (uint64, error) {
	if info.Type == IDTypeNumeric {
		return info.NumericValue, nil
	}
	return 0, fmt.Errorf("id类型不是数字: %s (类型: %v)", info.Original, info.Type)
}

// AsSlug 尝试将ID转换为Slug
func (info *IDInfo) AsSlug() (string, error) {
	if info.Type == IDTypeSlug {
		return info.SlugValue, nil
	}
	return "", fmt.Errorf("id类型不是slug: %s (类型: %v)", info.Original, info.Type)
}

// AsUUID 尝试将ID转换为UUID
func (info *IDInfo) AsUUID() (string, error) {
	if info.Type == IDTypeUUID {
		return info.UUIDValue, nil
	}
	return "", fmt.Errorf("id类型不是UUID: %s (类型: %v)", info.Original, info.Type)
}

// IsNumeric 检查是否为数字ID
func (info *IDInfo) IsNumeric() bool {
	return info.Type == IDTypeNumeric
}

// IsSlug 检查是否为Slug ID
func (info *IDInfo) IsSlug() bool {
	return info.Type == IDTypeSlug
}

// IsUUID 检查是否为UUID
func (info *IDInfo) IsUUID() bool {
	return info.Type == IDTypeUUID
}

// String 返回ID的字符串描述
func (info *IDInfo) String() string {
	switch info.Type {
	case IDTypeNumeric:
		return fmt.Sprintf("Numeric(%d)", info.NumericValue)
	case IDTypeSlug:
		return fmt.Sprintf("Slug(%s)", info.SlugValue)
	case IDTypeUUID:
		return fmt.Sprintf("UUID(%s)", info.UUIDValue)
	case IDTypeBase64:
		return fmt.Sprintf("Base64(%s)", info.Original)
	default:
		return fmt.Sprintf("Unknown(%s)", info.Original)
	}
}

// 全局ID解析器实例
var globalIDResolver = NewIDResolver()

// ParseID 全局ID解析函数
func ParseID(id string) (*IDInfo, error) {
	return globalIDResolver.ParseID(id)
}

// ParseNumericID 解析并验证数字ID
func ParseNumericID(id string) (uint64, error) {
	info, err := ParseID(id)
	if err != nil {
		return 0, err
	}
	return info.AsNumeric()
}

// ParseSlugID 解析并验证Slug ID
func ParseSlugID(id string) (string, error) {
	info, err := ParseID(id)
	if err != nil {
		return "", err
	}
	return info.AsSlug()
}

// ParseUUIDID 解析并验证UUID ID
func ParseUUIDID(id string) (string, error) {
	info, err := ParseID(id)
	if err != nil {
		return "", err
	}
	return info.AsUUID()
}

// ParseFlexibleID 灵活解析ID，支持数字和Slug两种格式
func ParseFlexibleID(id string) (numericID uint64, slug string, isNumeric bool, err error) {
	info, err := ParseID(id)
	if err != nil {
		return 0, "", false, err
	}

	switch info.Type {
	case IDTypeNumeric:
		return info.NumericValue, "", true, nil
	case IDTypeSlug:
		return 0, info.SlugValue, false, nil
	default:
		return 0, "", false, fmt.Errorf("ID必须是数字或Slug格式: %s", id)
	}
}
