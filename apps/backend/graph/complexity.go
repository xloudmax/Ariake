package graph

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
)

// QueryComplexityExtension GraphQL查询复杂度分析扩展
type QueryComplexityExtension struct {
	MaxComplexity int
}

// ExtensionName 扩展名称
func (e QueryComplexityExtension) ExtensionName() string {
	return "QueryComplexity"
}

// Validate 验证查询复杂度
func (e QueryComplexityExtension) Validate(_ graphql.ExecutableSchema) error {
	return nil
}

// MutateOperationContext 在操作上下文中添加复杂度检查
func (e QueryComplexityExtension) MutateOperationContext(ctx context.Context, oc *graphql.OperationContext) context.Context {
	// 简化实现，不进行复杂度检查
	return ctx
}

// DefaultComplexityConfig 默认复杂度配置
func DefaultComplexityConfig() map[string]int {
	return map[string]int{
		// 查询复杂度配置
		"Query.posts":           10,
		"Query.post":            5,
		"Query.searchPosts":     15,
		"Query.getPopularPosts": 12,
		"Query.getRecentPosts":  10,
		"Query.users":           8,
		"Query.user":            3,
		"Query.me":              2,

		// 关联字段复杂度
		"User.posts":        5,
		"BlogPost.author":   2,
		"BlogPost.stats":    3,
		"BlogPost.versions": 8,

		// 变更操作复杂度
		"Mutation.createPost": 15,
		"Mutation.updatePost": 12,
		"Mutation.deletePost": 8,
		"Mutation.likePost":   5,
		"Mutation.register":   10,
		"Mutation.login":      8,
	}
}
