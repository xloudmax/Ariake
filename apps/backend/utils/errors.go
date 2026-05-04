package utils

import (
	"fmt"
	"strings"
)

// ErrorCategory 错误类别
type ErrorCategory string

const (
	// 认证和授权错误
	CategoryAuth       ErrorCategory = "AUTH"
	CategoryPermission ErrorCategory = "PERMISSION"

	// 业务逻辑错误
	CategoryValidation ErrorCategory = "VALIDATION"
	CategoryBusiness   ErrorCategory = "BUSINESS"
	CategoryConflict   ErrorCategory = "CONFLICT"

	// 数据错误
	CategoryNotFound ErrorCategory = "NOT_FOUND"
	CategoryDatabase ErrorCategory = "DATABASE"

	// 系统错误
	CategorySystem   ErrorCategory = "SYSTEM"
	CategoryExternal ErrorCategory = "EXTERNAL"
)

// ErrorLevel 错误级别
type ErrorLevel string

const (
	LevelInfo     ErrorLevel = "INFO"
	LevelWarning  ErrorLevel = "WARNING"
	LevelError    ErrorLevel = "ERROR"
	LevelCritical ErrorLevel = "CRITICAL"
)

// AppError 应用错误结构
type AppError struct {
	Code       string                 `json:"code"`
	Message    string                 `json:"message"`
	Category   ErrorCategory          `json:"category"`
	Level      ErrorLevel             `json:"level"`
	Details    string                 `json:"details,omitempty"`
	Context    map[string]interface{} `json:"context,omitempty"`
	WrappedErr error                  `json:"-"`
}

// Error 实现 error 接口
func (e *AppError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s", e.Message, e.Details)
	}
	return e.Message
}

// Unwrap 支持错误链
func (e *AppError) Unwrap() error {
	return e.WrappedErr
}

// WithDetails 添加详细信息
func (e *AppError) WithDetails(details string) *AppError {
	newErr := *e
	newErr.Details = details
	return &newErr
}

// WithContext 添加上下文信息
func (e *AppError) WithContext(key string, value interface{}) *AppError {
	newErr := *e
	if newErr.Context == nil {
		newErr.Context = make(map[string]interface{})
	}
	newErr.Context[key] = value
	return &newErr
}

// Wrap 包装底层错误
func (e *AppError) Wrap(err error) *AppError {
	newErr := *e
	newErr.WrappedErr = err
	if err != nil {
		newErr.Details = err.Error()
	}
	return &newErr
}

// 错误构造函数
func NewError(code, message string, category ErrorCategory, level ErrorLevel) *AppError {
	return &AppError{
		Code:     code,
		Message:  message,
		Category: category,
		Level:    level,
	}
}

// 便捷构造函数
func NewAuthError(code, message string) *AppError {
	return NewError(code, message, CategoryAuth, LevelWarning)
}

func NewPermissionError(code, message string) *AppError {
	return NewError(code, message, CategoryPermission, LevelWarning)
}

func NewValidationError(code, message string) *AppError {
	return NewError(code, message, CategoryValidation, LevelInfo)
}

func NewBusinessError(code, message string) *AppError {
	return NewError(code, message, CategoryBusiness, LevelInfo)
}

func NewNotFoundError(code, message string) *AppError {
	return NewError(code, message, CategoryNotFound, LevelInfo)
}

func NewConflictError(code, message string) *AppError {
	return NewError(code, message, CategoryConflict, LevelInfo)
}

func NewDatabaseError(code, message string) *AppError {
	return NewError(code, message, CategoryDatabase, LevelError)
}

func NewSystemError(code, message string) *AppError {
	return NewError(code, message, CategorySystem, LevelCritical)
}

// 预定义的常用错误
var (
	// 认证和授权错误
	ErrUnauthorized     = NewAuthError("UNAUTHORIZED", "未授权访问")
	ErrInvalidToken     = NewAuthError("INVALID_TOKEN", "无效的令牌")
	ErrTokenExpired     = NewAuthError("TOKEN_EXPIRED", "令牌已过期")
	ErrInvalidCreds     = NewAuthError("INVALID_CREDENTIALS", "用户名或密码错误")
	ErrAccountDisabled  = NewAuthError("ACCOUNT_DISABLED", "账户已被禁用")
	ErrEmailNotVerified = NewAuthError("EMAIL_NOT_VERIFIED", "邮箱未验证")

	// 权限错误
	ErrForbidden    = NewPermissionError("FORBIDDEN", "权限不足")
	ErrAccessDenied = NewPermissionError("ACCESS_DENIED", "访问被拒绝")

	// 验证错误
	ErrInvalidInput    = NewValidationError("INVALID_INPUT", "输入参数无效")
	ErrInvalidFormat   = NewValidationError("INVALID_FORMAT", "格式不正确")
	ErrInvalidID       = NewValidationError("INVALID_ID", "无效的ID")
	ErrMissingRequired = NewValidationError("MISSING_REQUIRED", "缺少必需参数")

	// 特定验证错误
	ErrInvalidUsername  = NewValidationError("INVALID_USERNAME", "用户名格式不正确")
	ErrUsernameTooShort = NewValidationError("USERNAME_TOO_SHORT", "用户名长度必须在3-50字符之间")
	ErrPasswordTooWeak  = NewValidationError("PASSWORD_TOO_WEAK", "密码长度至少为6位")
	ErrInvalidEmail     = NewValidationError("INVALID_EMAIL", "邮箱格式不正确")

	// 业务逻辑错误
	ErrUserNotFound     = NewNotFoundError("USER_NOT_FOUND", "用户不存在")
	ErrPostNotFound     = NewNotFoundError("POST_NOT_FOUND", "文章不存在")
	ErrResourceNotFound = NewNotFoundError("RESOURCE_NOT_FOUND", "资源不存在")

	ErrUserExists   = NewConflictError("USER_EXISTS", "用户已存在")
	ErrEmailExists  = NewConflictError("EMAIL_EXISTS", "邮箱已被注册")
	ErrAlreadyLiked = NewConflictError("ALREADY_LIKED", "已经点赞过了")
	ErrNotLiked     = NewConflictError("NOT_LIKED", "尚未点赞")

	// 限流和重复操作错误
	ErrRateLimited      = NewBusinessError("RATE_LIMITED", "操作过于频繁，请稍后再试")
	ErrDuplicateRequest = NewConflictError("DUPLICATE_REQUEST", "请勿重复操作")
	ErrEditConflict     = NewConflictError("EDIT_CONFLICT", "文章已被他人修改，请刷新页面后再试")

	// 系统错误
	ErrDatabaseError  = NewDatabaseError("DATABASE_ERROR", "数据库操作失败")
	ErrInternalError  = NewSystemError("INTERNAL_ERROR", "内部服务器错误")
	ErrServiceUnavail = NewSystemError("SERVICE_UNAVAILABLE", "服务暂时不可用")
)

// 错误格式化辅助函数
func FormatError(template string, args ...interface{}) *AppError {
	message := fmt.Sprintf(template, args...)
	return NewError("CUSTOM_ERROR", message, CategoryBusiness, LevelInfo)
}

// 错误链包装函数
func WrapError(err error, code, message string, category ErrorCategory) *AppError {
	if err == nil {
		return nil
	}

	// 如果已经是AppError，保持原有信息但更新消息
	if appErr, ok := err.(*AppError); ok {
		return appErr.WithDetails(message)
	}

	return NewError(code, message, category, LevelError).Wrap(err)
}

// 检查错误类型的辅助函数
func IsAppError(err error) bool {
	_, ok := err.(*AppError)
	return ok
}

func IsCategory(err error, category ErrorCategory) bool {
	if appErr, ok := err.(*AppError); ok {
		return appErr.Category == category
	}
	return false
}

func IsAuthError(err error) bool {
	return IsCategory(err, CategoryAuth)
}

func IsPermissionError(err error) bool {
	return IsCategory(err, CategoryPermission)
}

func IsValidationError(err error) bool {
	return IsCategory(err, CategoryValidation)
}

func IsNotFoundError(err error) bool {
	return IsCategory(err, CategoryNotFound)
}

// 标准化错误消息格式
func StandardizeMessage(message string) string {
	// 统一使用中文冒号
	message = strings.ReplaceAll(message, ": ", "：")
	message = strings.ReplaceAll(message, ":", "：")

	// 确保首字母一致（中文不需要）
	message = strings.TrimSpace(message)

	return message
}

// 从旧的错误代码迁移
func FromLegacyError(err error) *AppError {
	if err == nil {
		return nil
	}

	// 如果已经是AppError，直接返回
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}

	errMsg := err.Error()

	// 根据错误消息内容判断错误类型
	switch {
	case strings.Contains(errMsg, "未授权") || strings.Contains(errMsg, "unauthorized"):
		return ErrUnauthorized.Wrap(err)
	case strings.Contains(errMsg, "权限不足") || strings.Contains(errMsg, "forbidden"):
		return ErrForbidden.Wrap(err)
	case strings.Contains(errMsg, "用户不存在") || strings.Contains(errMsg, "user not found"):
		return ErrUserNotFound.Wrap(err)
	case strings.Contains(errMsg, "文章不存在") || strings.Contains(errMsg, "post not found"):
		return ErrPostNotFound.Wrap(err)
	case strings.Contains(errMsg, "无效") || strings.Contains(errMsg, "invalid"):
		return ErrInvalidInput.Wrap(err)
	case strings.Contains(errMsg, "数据库") || strings.Contains(errMsg, "database"):
		return ErrDatabaseError.Wrap(err)
	default:
		return NewError("UNKNOWN_ERROR", StandardizeMessage(errMsg), CategorySystem, LevelError).Wrap(err)
	}
}
