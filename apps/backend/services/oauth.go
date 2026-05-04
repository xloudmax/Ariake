package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"repair-platform/config"
	"repair-platform/models"
	"strings"
	"sync"
	"time"

	"github.com/goccy/go-json"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"gorm.io/gorm"
)

type GithubUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	Name      string `json:"name"`
}

type GithubEmail struct {
	Email   string `json:"email"`
	Primary bool   `json:"primary"`
	Verfied bool   `json:"verified"`
}

type OAuthExchangePayload struct {
	User         models.User
	Token        string
	RefreshToken string
	ExpiresAt    time.Time
}

var oauthExchangeStore = struct {
	sync.Mutex
	items map[string]OAuthExchangePayload
}{items: map[string]OAuthExchangePayload{}}

func CreateOAuthExchangeCode(user *models.User, token, refreshToken string) (string, error) {
	code := generateRandomHex(32)
	if code == "fallback_random_password_123!" {
		return "", fmt.Errorf("生成OAuth交换码失败")
	}

	oauthExchangeStore.Lock()
	defer oauthExchangeStore.Unlock()
	cleanupExpiredOAuthExchangeCodesLocked()
	oauthExchangeStore.items[code] = OAuthExchangePayload{
		User:         *user,
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(5 * time.Minute),
	}
	return code, nil
}

func ConsumeOAuthExchangeCode(code string) (*OAuthExchangePayload, error) {
	oauthExchangeStore.Lock()
	defer oauthExchangeStore.Unlock()
	payload, ok := oauthExchangeStore.items[code]
	if !ok {
		return nil, fmt.Errorf("OAuth交换码不存在")
	}
	delete(oauthExchangeStore.items, code)
	if time.Now().After(payload.ExpiresAt) {
		return nil, fmt.Errorf("OAuth交换码已过期")
	}
	return &payload, nil
}

func cleanupExpiredOAuthExchangeCodesLocked() {
	now := time.Now()
	for code, payload := range oauthExchangeStore.items {
		if now.After(payload.ExpiresAt) {
			delete(oauthExchangeStore.items, code)
		}
	}
}

// OAuthService 处理第三方登录
type OAuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewOAuthService 创建OAuth服务
func NewOAuthService(db *gorm.DB, cfg *config.Config) *OAuthService {
	return &OAuthService{
		db:  db,
		cfg: cfg,
	}
}

// GetGithubOAuthConfig 获取GitHub OAuth配置
func (s *OAuthService) GetGithubOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     s.cfg.GithubClientID,
		ClientSecret: s.cfg.GithubClientSecret,
		RedirectURL:  s.cfg.GithubRedirectURL,
		Scopes:       []string{"read:user", "user:email"},
		Endpoint:     github.Endpoint,
	}
}

// HandleGithubCallback 处理GitHub回调并登录/注册用户
func (s *OAuthService) HandleGithubCallback(ctx context.Context, code string) (*models.User, string, string, error) {
	oauthConfig := s.GetGithubOAuthConfig()

	// 1. 交换Token
	token, err := oauthConfig.Exchange(ctx, code)
	if err != nil {
		return nil, "", "", fmt.Errorf("交换GitHub Token失败: %w", err)
	}

	client := oauthConfig.Client(ctx, token)

	// 2. 获取用户信息
	githubUser, err := s.fetchGithubUser(client)
	if err != nil {
		return nil, "", "", err
	}

	// 3. 确保获取到邮箱（GitHub API如果邮箱私有，user接口可能返回空email）
	if githubUser.Email == "" {
		email, err := s.fetchGithubPrimaryEmail(client)
		if err != nil {
			return nil, "", "", err
		}
		githubUser.Email = email
	}

	if githubUser.Email == "" {
		return nil, "", "", fmt.Errorf("无法获取GitHub用户的邮箱")
	}

	// 4. 查找或创建用户
	user, err := s.findOrCreateUserFromGithub(githubUser)
	if err != nil {
		return nil, "", "", err
	}

	// 5. 生成系统内部登录凭证
	jwtToken, err := models.GenerateJWT(user.ID, user.Username, user.Role, false)
	if err != nil {
		return nil, "", "", fmt.Errorf("生成JWT失败: %w", err)
	}

	rawRefreshToken, _, err := models.GenerateRefreshToken(user.ID, models.DefaultRefreshTokenConfig, s.db)
	if err != nil {
		return nil, "", "", fmt.Errorf("生成Refresh Token失败: %w", err)
	}

	return user, jwtToken, rawRefreshToken, nil
}

func (s *OAuthService) fetchGithubUser(client *http.Client) (*GithubUser, error) {
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return nil, fmt.Errorf("获取GitHub用户信息失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("获取GitHub用户信息失败: 状态码 %d", resp.StatusCode)
	}

	var user GithubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("解析GitHub用户信息失败: %w", err)
	}

	return &user, nil
}

func (s *OAuthService) fetchGithubPrimaryEmail(client *http.Client) (string, error) {
	resp, err := client.Get("https://api.github.com/user/emails")
	if err != nil {
		return "", fmt.Errorf("获取GitHub邮箱失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("获取GitHub邮箱失败: 状态码 %d", resp.StatusCode)
	}

	var emails []GithubEmail
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", fmt.Errorf("解析GitHub邮箱失败: %w", err)
	}

	for _, email := range emails {
		if email.Primary && email.Verfied {
			return email.Email, nil
		}
	}

	// 降级策略
	if len(emails) > 0 {
		return emails[0].Email, nil
	}

	return "", nil
}

func (s *OAuthService) findOrCreateUserFromGithub(gu *GithubUser) (*models.User, error) {
	var user models.User
	
	// 首先通过邮箱查找
	err := s.db.Where("email = ?", gu.Email).First(&user).Error
	if err == nil {
		if !user.IsActive {
			return nil, models.ErrAccountLocked
		}
		return &user, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 用户不存在，尝试创建
	// 避免用户名冲突
	baseUsername := gu.Login
	if baseUsername == "" {
		baseUsername = strings.Split(gu.Email, "@")[0]
	}
	
	username := baseUsername
	for i := 1; i <= 10; i++ {
		var count int64
		s.db.Model(&models.User{}).Where("username = ?", username).Count(&count)
		if count == 0 {
			break
		}
		username = fmt.Sprintf("%s%d", baseUsername, i)
	}

	now := time.Now()
	newUser := models.User{
		Username:        username,
		Email:           gu.Email,
		Role:            "USER", // 默认角色
		IsVerified:      true,   // GitHub验证过的
		IsActive:        true,
		Avatar:          gu.AvatarURL,
		EmailVerifiedAt: &now,
	}

	// 为OAuth用户生成随机安全密码
	_ = newUser.SetPassword(generateRandomHex(16))

	if err := s.db.Create(&newUser).Error; err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}

	return &newUser, nil
}

func generateRandomHex(n int) string {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return "fallback_random_password_123!" // should never happen
	}
	return hex.EncodeToString(bytes)
}
