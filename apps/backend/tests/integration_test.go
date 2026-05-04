package tests

import (
	"net/http"
	"net/http/httptest"
	testing_helper "repair-platform/testing"
	"testing"
)

func TestBasicIntegration(t *testing.T) {
	const strongPassword = "Str0ngPass123"
	const strongAdminPassword = "Adm1nPass123"

	// 设置测试环境
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	t.Run("Health Check", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/health/ping", nil)
		w := httptest.NewRecorder()
		helper.Router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}
	})

	t.Run("GraphQL Playground", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/graphql", nil)
		w := httptest.NewRecorder()
		helper.Router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Code)
		}
	})

	t.Run("User Registration", func(t *testing.T) {
		variables := map[string]interface{}{
			"input": map[string]interface{}{
				"username": "testuser",
				"email":    "test@example.com",
				"password": strongPassword,
			},
		}

		_, response, err := helper.MakeGraphQLRequest(testing_helper.TestQueries.Register, variables, "")
		if err != nil {
			t.Fatalf("GraphQL request failed: %v", err)
		}

		helper.AssertNoGraphQLErrors(t, response)

		// 验证返回数据
		data, ok := response.Data.(map[string]interface{})
		if !ok {
			t.Fatal("Response data is not a map")
		}

		register, ok := data["register"].(map[string]interface{})
		if !ok {
			t.Fatal("Register response is not a map")
		}

		if register["token"] == nil {
			t.Error("Token not returned in registration response")
		}

		user, ok := register["user"].(map[string]interface{})
		if !ok {
			t.Fatal("User data is not a map")
		}

		if user["username"] != "testuser" {
			t.Errorf("Expected username 'testuser', got '%v'", user["username"])
		}

		if user["email"] != "test@example.com" {
			t.Errorf("Expected email 'test@example.com', got '%v'", user["email"])
		}
	})

	t.Run("User Login", func(t *testing.T) {
		// 首先注册一个用户
		user, err := helper.CreateTestUser("logintest", "login@example.com", strongPassword, false)
		if err != nil {
			t.Fatalf("Failed to create test user: %v", err)
		}

		variables := map[string]interface{}{
			"input": map[string]interface{}{
				"identifier": user.Email,
				"password":   strongPassword,
			},
		}

		_, response, err := helper.MakeGraphQLRequest(testing_helper.TestQueries.Login, variables, "")
		if err != nil {
			t.Fatalf("GraphQL request failed: %v", err)
		}

		helper.AssertNoGraphQLErrors(t, response)
	})

	t.Run("Authenticated Query", func(t *testing.T) {
		// 创建测试用户并生成token
		user, err := helper.CreateTestUser("authtest", "auth@example.com", strongPassword, false)
		if err != nil {
			t.Fatalf("Failed to create test user: %v", err)
		}

		token, err := helper.GenerateTestJWT(user)
		if err != nil {
			t.Fatalf("Failed to generate JWT: %v", err)
		}

		// 使用token查询当前用户信息
		_, response, err := helper.MakeGraphQLRequest(testing_helper.TestQueries.Me, nil, token)
		if err != nil {
			t.Fatalf("GraphQL request failed: %v", err)
		}

		helper.AssertNoGraphQLErrors(t, response)

		// 验证返回数据
		data, ok := response.Data.(map[string]interface{})
		if !ok {
			t.Fatal("Response data is not a map")
		}

		me, ok := data["me"].(map[string]interface{})
		if !ok {
			t.Fatal("Me response is not a map")
		}

		if me["username"] != user.Username {
			t.Errorf("Expected username '%s', got '%v'", user.Username, me["username"])
		}
	})

	t.Run("Admin Query", func(t *testing.T) {
		// 创建管理员用户
		admin, err := helper.CreateTestUser("admin", "admin@example.com", strongAdminPassword, true)
		if err != nil {
			t.Fatalf("Failed to create admin user: %v", err)
		}

		token, err := helper.GenerateTestJWT(admin)
		if err != nil {
			t.Fatalf("Failed to generate JWT: %v", err)
		}

		// 查询用户列表（管理员权限）
		variables := map[string]interface{}{
			"limit":  10,
			"offset": 0,
		}

		_, response, err := helper.MakeGraphQLRequest(testing_helper.TestQueries.Users, variables, token)
		if err != nil {
			t.Fatalf("GraphQL request failed: %v", err)
		}

		helper.AssertNoGraphQLErrors(t, response)
	})
}

func TestErrorHandling(t *testing.T) {
	helper := testing_helper.SetupTestEnvironment(t)
	defer helper.TeardownTestEnvironment()

	t.Run("Invalid Login", func(t *testing.T) {
		variables := map[string]interface{}{
			"input": map[string]interface{}{
				"identifier": "nonexistent@example.com",
				"password":   "wrongpassword",
			},
		}

		_, response, err := helper.MakeGraphQLRequest(testing_helper.TestQueries.Login, variables, "")
		if err != nil {
			t.Fatalf("GraphQL request failed: %v", err)
		}

		if len(response.Errors) == 0 {
			t.Error("Expected login error but got none")
		}
	})

	t.Run("Unauthorized Query", func(t *testing.T) {
		// 尝试在没有token的情况下查询me
		_, response, err := helper.MakeGraphQLRequest(testing_helper.TestQueries.Me, nil, "")
		if err != nil {
			t.Fatalf("GraphQL request failed: %v", err)
		}

		if len(response.Errors) == 0 {
			t.Error("Expected unauthorized error but got none")
		}
	})

	t.Run("Non-Admin Query", func(t *testing.T) {
		// 创建普通用户
		user, err := helper.CreateTestUser("normaluser", "normal@example.com", "password123", false)
		if err != nil {
			t.Fatalf("Failed to create test user: %v", err)
		}

		token, err := helper.GenerateTestJWT(user)
		if err != nil {
			t.Fatalf("Failed to generate JWT: %v", err)
		}

		// 尝试访问管理员接口
		variables := map[string]interface{}{
			"limit":  10,
			"offset": 0,
		}

		_, response, err := helper.MakeGraphQLRequest(testing_helper.TestQueries.Users, variables, token)
		if err != nil {
			t.Fatalf("GraphQL request failed: %v", err)
		}

		if len(response.Errors) == 0 {
			t.Error("Expected forbidden error but got none")
		}
	})
}
