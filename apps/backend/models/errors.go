package models

import "repair-platform/utils"

// 向后兼容的错误变量 - 使用新的统一错误系统
var (
	// 用户相关错误
	ErrUserNotFound       = utils.ErrUserNotFound
	ErrUserExists         = utils.ErrUserExists
	ErrEmailExists        = utils.ErrEmailExists
	ErrInvalidCredentials = utils.ErrInvalidCreds
	ErrAccountLocked      = utils.ErrAccountDisabled
	ErrEmailNotVerified   = utils.ErrEmailNotVerified

	// 令牌相关错误
	ErrInvalidToken = utils.ErrInvalidToken
	ErrTokenExpired = utils.ErrTokenExpired
	ErrUnauthorized = utils.ErrUnauthorized
	ErrForbidden    = utils.ErrForbidden

	// 资源相关错误
	ErrPostNotFound     = utils.ErrPostNotFound
	ErrBlogPostNotFound = utils.ErrPostNotFound

	// 业务逻辑错误
	ErrAlreadyLiked = utils.ErrAlreadyLiked
	ErrNotLiked     = utils.ErrNotLiked
	ErrRateLimited  = utils.ErrRateLimited
	ErrEditConflict = utils.ErrEditConflict

	// 验证错误
	ErrInvalidUsername  = utils.ErrInvalidUsername
	ErrUsernameTooShort = utils.ErrUsernameTooShort
	ErrPasswordTooWeak  = utils.ErrPasswordTooWeak
	ErrInvalidEmail     = utils.ErrInvalidEmail

	// 邀请码相关错误（扩展新的错误系统）
	ErrInviteCodeNotFound    = utils.NewNotFoundError("INVITE_CODE_NOT_FOUND", "邀请码不存在")
	ErrInviteCodeExpired     = utils.NewBusinessError("INVITE_CODE_EXPIRED", "邀请码已过期")
	ErrInviteCodeNotUsable   = utils.NewBusinessError("INVITE_CODE_NOT_USABLE", "邀请码不可用")
	ErrInviteCodeAlreadyUsed = utils.NewConflictError("INVITE_CODE_ALREADY_USED", "邀请码已使用")

	// 验证码相关错误
	ErrVerificationCodeInvalid = utils.NewValidationError("VERIFICATION_CODE_INVALID", "验证码无效")
	ErrVerificationCodeExpired = utils.NewBusinessError("VERIFICATION_CODE_EXPIRED", "验证码已过期")

	// 系统错误
	ErrInternalServerError = utils.ErrInternalError
)

// 响应代码常量 - 保持向后兼容
const (
	SuccessCode                      = "SUCCESS"
	ErrorCodeUserNotFound            = "USER_NOT_FOUND"
	ErrorCodeUserExists              = "USER_EXISTS"
	ErrorCodeInvalidCredentials      = "INVALID_CREDENTIALS"
	ErrorCodeAccountLocked           = "ACCOUNT_DISABLED"
	ErrorCodeEmailNotVerified        = "EMAIL_NOT_VERIFIED"
	ErrorCodeInvalidToken            = "INVALID_TOKEN"
	ErrorCodeTokenExpired            = "TOKEN_EXPIRED"
	ErrorCodeInviteCodeNotFound      = "INVITE_CODE_NOT_FOUND"
	ErrorCodeInviteCodeExpired       = "INVITE_CODE_EXPIRED"
	ErrorCodeInviteCodeNotUsable     = "INVITE_CODE_NOT_USABLE"
	ErrorCodeVerificationCodeInvalid = "VERIFICATION_CODE_INVALID"
	ErrorCodeVerificationCodeExpired = "VERIFICATION_CODE_EXPIRED"
	ErrorCodeBlogPostNotFound        = "POST_NOT_FOUND"
	ErrorCodeUnauthorized            = "UNAUTHORIZED"
	ErrorCodeForbidden               = "FORBIDDEN"
	ErrorCodeInternalServerError     = "INTERNAL_ERROR"
)

// 辅助函数用于创建特定类型的错误
func NewValidationError(message string) *utils.AppError {
	return utils.NewValidationError("VALIDATION_ERROR", message)
}

func NewBusinessError(message string) *utils.AppError {
	return utils.NewBusinessError("BUSINESS_ERROR", message)
}

func NewDatabaseError(operation string, err error) *utils.AppError {
	return utils.ErrDatabaseError.WithDetails(operation).Wrap(err)
}

func NewNotFoundError(resource string) *utils.AppError {
	return utils.NewNotFoundError("RESOURCE_NOT_FOUND", resource+"不存在")
}

// 错误包装函数 - 为特定业务场景提供便捷接口
func WrapAuthError(err error, context string) *utils.AppError {
	return utils.WrapError(err, "AUTH_ERROR", "认证失败："+context, utils.CategoryAuth)
}

func WrapPermissionError(err error, resource string) *utils.AppError {
	return utils.WrapError(err, "PERMISSION_ERROR", "访问"+resource+"权限不足", utils.CategoryPermission)
}

func WrapDatabaseError(err error, operation string) *utils.AppError {
	return utils.WrapError(err, "DATABASE_ERROR", operation+"操作失败", utils.CategoryDatabase)
}
