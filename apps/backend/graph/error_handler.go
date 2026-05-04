package graph

import (
	"context"
	"fmt"
	"repair-platform/models"
	"repair-platform/utils"

	"gorm.io/gorm"
)

// GraphQLErrorHandler GraphQL错误处理器
type GraphQLErrorHandler struct{}

// HandleError 处理错误并转换为统一格式
func (h *GraphQLErrorHandler) HandleError(err error, operation string) error {
	if err == nil {
		return nil
	}

	// 如果已经是AppError，直接返回
	if appErr, ok := err.(*utils.AppError); ok {
		return fmt.Errorf("%s：%s", operation, appErr.Message)
	}

	// 从传统错误转换
	appErr := utils.FromLegacyError(err)
	return fmt.Errorf("%s：%s", operation, appErr.Message)
}

// WrapAuthError 包装认证错误
func (h *GraphQLErrorHandler) WrapAuthError(err error) error {
	if err == nil {
		return nil
	}
	return h.HandleError(err, "认证失败")
}

// WrapPermissionError 包装权限错误
func (h *GraphQLErrorHandler) WrapPermissionError(err error) error {
	if err == nil {
		return nil
	}
	return h.HandleError(err, "权限验证失败")
}

// WrapValidationError 包装验证错误
func (h *GraphQLErrorHandler) WrapValidationError(err error) error {
	if err == nil {
		return nil
	}
	return h.HandleError(err, "输入验证失败")
}

// WrapBusinessError 包装业务逻辑错误
func (h *GraphQLErrorHandler) WrapBusinessError(err error) error {
	if err == nil {
		return nil
	}
	return h.HandleError(err, "操作失败")
}

// WrapDatabaseError 包装数据库错误
func (h *GraphQLErrorHandler) WrapDatabaseError(err error) error {
	if err == nil {
		return nil
	}
	return h.HandleError(err, "数据操作失败")
}

// 全局错误处理器实例
var errorHandler = &GraphQLErrorHandler{}

// 便捷错误处理函数
func HandleError(err error, operation string) error {
	return errorHandler.HandleError(err, operation)
}

func HandleAuthError(err error) error {
	return errorHandler.WrapAuthError(err)
}

func HandlePermissionError(err error) error {
	return errorHandler.WrapPermissionError(err)
}

func HandleValidationError(err error) error {
	return errorHandler.WrapValidationError(err)
}

func HandleBusinessError(err error) error {
	return errorHandler.WrapBusinessError(err)
}

func HandleDatabaseError(err error) error {
	return errorHandler.WrapDatabaseError(err)
}

// 常用错误场景的便捷函数
func HandleUnauthorized() error {
	return HandleError(models.ErrUnauthorized, "访问验证失败")
}

func HandleForbidden() error {
	return HandleError(models.ErrForbidden, "权限验证失败")
}

func HandleNotFound(resource string) error {
	return HandleError(models.NewNotFoundError(resource), "查找失败")
}

func HandleInvalidInput(field string) error {
	return HandleError(models.NewValidationError("无效的"+field), "输入验证失败")
}

// getUserFromContext 带错误处理的用户获取
func getUserFromContextSafe(ctx context.Context, db *gorm.DB) (*models.User, error) {
	user, err := getUserFromContext(ctx, db)
	if err != nil {
		return nil, HandleAuthError(err)
	}
	return user, nil
}
