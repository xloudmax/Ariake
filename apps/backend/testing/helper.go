package testing

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"repair-platform/config"
	"repair-platform/database"
	"repair-platform/middleware"
	"repair-platform/models"
	"repair-platform/routes"
	"repair-platform/services"
	"testing"

	"github.com/goccy/go-json"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// TestHelper 测试辅助结构体
type TestHelper struct {
	DB     *gorm.DB
	Router *gin.Engine
	Config *config.Config
}

// GraphQLRequest GraphQL请求结构体
type GraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// GraphQLResponse GraphQL响应结构体
type GraphQLResponse struct {
	Data   interface{} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
		Code    string `json:"code,omitempty"`
	} `json:"errors,omitempty"`
}

// SetupTestEnvironment 设置测试环境
func SetupTestEnvironment(t *testing.T) *TestHelper {
	// 设置测试环境变量
	os.Setenv("GIN_MODE", "test")
	os.Setenv("EMAIL_ENABLED", "false")

	// 加载配置
	cfg := config.LoadConfig()

	// 设置Gin为测试模式
	gin.SetMode(gin.TestMode)

	// 初始化数据库（内存数据库）
	db, err := database.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to initialize test database: %v", err)
	}

	// 初始化缓存
	models.InitCache()

	// 初始化日志（测试模式）
	middleware.InitTestLogger()

	// 创建 Gin 路由
	router := gin.New()
	aiSvc := services.NewAIService()
	graphRAG := services.NewGraphRAGService(db, aiSvc)
	routes.SetupRoutes(router, db, cfg, nil, aiSvc, graphRAG)

	return &TestHelper{
		DB:     db,
		Router: router,
		Config: cfg,
	}
}

// TeardownTestEnvironment 清理测试环境
func (h *TestHelper) TeardownTestEnvironment() {
	// 清理缓存
	if models.GlobalCache != nil {
		models.GlobalCache.Clear()
	}
}

// CreateTestUser 创建测试用户
func (h *TestHelper) CreateTestUser(username, email, password string, isAdmin bool) (*models.User, error) {
	user := &models.User{
		Username:   username,
		Email:      email,
		Role:       "USER",
		IsVerified: true, // 测试环境自动验证
		IsActive:   true,
	}

	if isAdmin {
		user.Role = "ADMIN"
	}

	if err := user.SetPassword(password); err != nil {
		return nil, err
	}

	if err := h.DB.Create(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

// GenerateTestJWT 生成测试JWT令牌
func (h *TestHelper) GenerateTestJWT(user *models.User) (string, error) {
	return models.GenerateJWT(user.ID, user.Username, user.Role, false)
}

// MakeGraphQLRequest 发送GraphQL请求
func (h *TestHelper) MakeGraphQLRequest(query string, variables map[string]interface{}, token string) (*httptest.ResponseRecorder, *GraphQLResponse, error) {
	request := GraphQLRequest{
		Query:     query,
		Variables: variables,
	}

	jsonBody, err := json.Marshal(request)
	if err != nil {
		return nil, nil, err
	}

	req, err := http.NewRequest("POST", "/graphql", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	w := httptest.NewRecorder()
	h.Router.ServeHTTP(w, req)

	var response GraphQLResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		return w, nil, err
	}

	return w, &response, nil
}

// AssertNoGraphQLErrors 断言GraphQL响应无错误
func (h *TestHelper) AssertNoGraphQLErrors(t *testing.T, response *GraphQLResponse) {
	if len(response.Errors) > 0 {
		t.Fatalf("GraphQL request returned errors: %v", response.Errors)
	}
}

// AssertGraphQLError 断言GraphQL响应有特定错误
func (h *TestHelper) AssertGraphQLError(t *testing.T, response *GraphQLResponse, expectedMessage string) {
	if len(response.Errors) == 0 {
		t.Fatal("Expected GraphQL error but got none")
	}

	found := false
	for _, err := range response.Errors {
		if err.Message == expectedMessage {
			found = true
			break
		}
	}

	if !found {
		t.Fatalf("Expected error message '%s' but got: %v", expectedMessage, response.Errors)
	}
}

// TestQueries 常用测试查询
var TestQueries = struct {
	Register string
	Login    string
	Me       string
	Users    string
}{
	Register: `
		mutation Register($input: RegisterInput!) {
			register(input: $input) {
				token
				refreshToken
				user {
					id
					username
					email
					role
					isVerified
				}
				expiresAt
			}
		}
	`,

	Login: `
		mutation Login($input: LoginInput!) {
			login(input: $input) {
				token
				refreshToken
				user {
					id
					username
					email
					role
					isVerified
				}
				expiresAt
			}
		}
	`,

	Me: `
		query Me {
			me {
				id
				username
				email
				role
				isVerified
				isActive
				createdAt
				updatedAt
			}
		}
	`,

	Users: `
		query Users($limit: Int, $offset: Int, $search: String, $role: UserRole, $isVerified: Boolean) {
			users(limit: $limit, offset: $offset, search: $search, role: $role, isVerified: $isVerified) {
				id
				username
				email
				role
				isVerified
				isActive
				createdAt
			}
		}
	`,
}

// TestData 测试数据
var TestData = struct {
	Users []struct {
		Username string
		Email    string
		Password string
		IsAdmin  bool
	}
}{
	Users: []struct {
		Username string
		Email    string
		Password string
		IsAdmin  bool
	}{
		{"testuser1", "test1@example.com", "password123", false},
		{"testuser2", "test2@example.com", "password123", false},
		{"ADMIN", "admin@example.com", "admin123", true},
	},
}
