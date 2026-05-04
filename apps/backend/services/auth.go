package services

import (
	"errors"
	"fmt"
	"net/smtp"
	"os"
	"regexp"
	"repair-platform/config"
	"repair-platform/middleware"
	"repair-platform/models"
	"strings"
	"time"

	"gorm.io/gorm"
)

// AuthService 认证服务
type AuthService struct {
	db  *gorm.DB
	evs *models.EmailVerificationService
}

// NewAuthService 创建认证服务实例
func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{
		db:  db,
		evs: models.GetEmailVerificationService(),
	}
}

// Register 用户注册 (统一接口)
func (s *AuthService) Register(input *models.RegisterInput) (*models.User, string, string, error) {
	user, _, err := s.RegisterUser(input)
	if err != nil {
		return nil, "", "", err
	}

	// 生成JWT令牌
	token, err := models.GenerateJWT(user.ID, user.Username, user.Role, false)
	if err != nil {
		return nil, "", "", models.ErrInternalServerError
	}

	// 注册后也必须返回可验证、已入库的 refresh token，保持与登录链路一致。
	rawRefreshToken, _, err := models.GenerateRefreshToken(user.ID, models.DefaultRefreshTokenConfig, s.db)
	if err != nil {
		return nil, "", "", models.ErrInternalServerError
	}

	return user, token, rawRefreshToken, nil
}

// SendEmailLoginCode 发送邮箱登录验证码
func (s *AuthService) SendEmailLoginCode(email string) error {
	return s.EmailLogin(email)
}
func (s *AuthService) RegisterUser(input *models.RegisterInput) (*models.User, string, error) {
	// 验证输入
	if err := s.validateRegisterInput(input); err != nil {
		return nil, "", err
	}
	cfg := config.GetConfig()

	// 检查用户名和邮箱是否已存在
	if err := s.checkUserExists(input.Username, input.Email); err != nil {
		return nil, "", err
	}

	// 验证邀请码（如果提供）
	var inviteCode *models.InviteCode
	if input.InviteCode != "" {
		var err error
		inviteCode, err = s.validateInviteCode(input.InviteCode)
		if err != nil {
			return nil, "", err
		}
	}

	// 创建用户
	role := "user" // 默认角色

	// 检查管理员邀请码（从环境变量读取）
	adminInviteCode := os.Getenv("ADMIN_INVITE_CODE")
	if adminInviteCode != "" && input.InviteCode == adminInviteCode {
		role = "ADMIN"
		// 记录安全审计日志
		middleware.GetLogger().Infow("SECURITY AUDIT: Admin Invite Code Used",
			"username", input.Username,
			"email", input.Email,
			"time", time.Now().Format(time.RFC3339))
	}

	user := &models.User{
		Username:   input.Username,
		Email:      input.Email,
		Role:       role,
		IsVerified: false,
		IsActive:   true,
	}

	if err := user.SetPassword(input.Password); err != nil {
		return nil, "", models.ErrInternalServerError
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 保存用户
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, "", models.ErrInternalServerError
	}

	// 使用邀请码
	if inviteCode != nil {
		// 检查是否为管理员邀请码（无需消耗）
		adminInviteCode := os.Getenv("ADMIN_INVITE_CODE")
		isAdminCode := adminInviteCode != "" && inviteCode.Code == adminInviteCode

		// 只有真实的邀请码才需要记录使用
		if !isAdminCode {
			if err := inviteCode.UseInviteCode(user.ID, tx); err != nil {
				tx.Rollback()
				return nil, "", err
			}
		}
	}

	// 生成验证码（开发环境跳过邮件发送）
	var verificationCode string
	shouldVerify := !cfg.ShouldSkipEmailVerification() && !s.isTestEnvironment()
	if shouldVerify {
		var err error
		verificationCode, err = s.evs.GenerateVerificationCode(user.Email, "REGISTER")
		if err != nil {
			tx.Rollback()
			return nil, "", models.ErrInternalServerError
		}

		// 发送验证邮件
		if err := s.sendVerificationEmail(user.Email, verificationCode, "REGISTER"); err != nil {
			// 记录错误但不阻止注册流程
			middleware.GetLogger().Errorw("发送验证邮件失败", "error", err)
		}
	} else {
		// 配置允许跳过验证时直接标记为已验证
		now := time.Now()
		user.IsVerified = true
		user.EmailVerifiedAt = &now
		if err := tx.Save(user).Error; err != nil {
			tx.Rollback()
			return nil, "", models.ErrInternalServerError
		}
	}

	tx.Commit()
	return user, verificationCode, nil
}

// LoginUser 用户登录
func (s *AuthService) LoginUser(input *models.LoginInput) (*models.User, string, string, error) {
	// 查找用户
	var user models.User
	query := s.db.Where("username = ? OR email = ?", input.Identifier, input.Identifier)
	if err := query.First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", "", models.ErrInvalidCredentials
		}
		return nil, "", "", models.ErrInternalServerError
	}

	// 检查账户状态
	if !user.IsActive {
		return nil, "", "", models.ErrAccountLocked
	}

	if user.IsAccountLocked() {
		return nil, "", "", models.ErrAccountLocked
	}

	// 验证密码
	if !user.CheckPassword(input.Password) {
		// 增加登录尝试次数
		user.IncrementLoginAttempts(s.db)
		return nil, "", "", models.ErrInvalidCredentials
	}

	// 检查邮箱验证状态（按配置决定是否强制）
	if !config.GetConfig().ShouldSkipEmailVerification() && !user.IsVerified {
		return nil, "", "", models.ErrEmailNotVerified
	}

	// 重置登录尝试次数并更新最后登录时间
	user.ResetLoginAttempts(s.db)
	user.UpdateLastLogin(s.db)

	// 生成JWT令牌
	token, err := models.GenerateJWT(user.ID, user.Username, user.Role, input.Remember)
	if err != nil {
		return nil, "", "", models.ErrInternalServerError
	}

	// 生成真实的加密 Refresh Token
	refreshTokenConfig := models.RefreshTokenConfig{
		TokenLength:    32,
		ExpiryDuration: 30 * 24 * time.Hour, // 30天
		EnableRotation: true,
	}
	if input.Remember {
		// 记住我时延长到90天
		refreshTokenConfig.ExpiryDuration = 90 * 24 * time.Hour
	}

	rawRefreshToken, _, err := models.GenerateRefreshToken(user.ID, refreshTokenConfig, s.db)
	if err != nil {
		return nil, "", "", models.ErrInternalServerError
	}

	return &user, token, rawRefreshToken, nil
}

// EmailLogin 邮箱登录（发送验证码）
func (s *AuthService) EmailLogin(email string) error {
	// 检查用户是否存在
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ErrUserNotFound
		}
		return models.ErrInternalServerError
	}

	if !user.IsActive {
		return models.ErrAccountLocked
	}

	// 生成验证码（开发环境跳过邮件发送）
	if !s.isTestEnvironment() {
		code, err := s.evs.GenerateVerificationCode(email, "LOGIN")
		if err != nil {
			return models.ErrInternalServerError
		}
		// 发送验证邮件
		if err := s.sendVerificationEmail(email, code, "LOGIN"); err != nil {
			// 记录错误但不阻止邮箱登录流程
			middleware.GetLogger().Errorw("发送验证邮件失败", "error", err)
		}
	}

	return nil
}

// VerifyEmailAndLogin 验证邮箱验证码并登录
func (s *AuthService) VerifyEmailAndLogin(input *models.VerifyEmailInput) (*models.User, string, string, error) {
	// 查找用户
	var user models.User
	if err := s.db.Where("email = ?", input.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", "", models.ErrUserNotFound
		}
		return nil, "", "", models.ErrInternalServerError
	}

	// 验证验证码（开发环境跳过）
	if !s.isTestEnvironment() {
		if !s.evs.VerifyCode(input.Email, input.Code, string(input.Type)) {
			return nil, "", "", models.ErrVerificationCodeInvalid
		}
	}

	// 如果是注册验证，更新验证状态
	if input.Type == "REGISTER" {
		user.IsVerified = true
		now := time.Now()
		user.EmailVerifiedAt = &now
		if err := s.db.Save(&user).Error; err != nil {
			return nil, "", "", models.ErrInternalServerError
		}
	}

	// 更新最后登录时间
	user.UpdateLastLogin(s.db)

	// 生成JWT令牌
	token, err := models.GenerateJWT(user.ID, user.Username, user.Role, false)
	if err != nil {
		return nil, "", "", models.ErrInternalServerError
	}

	// 生成真实的加密 Refresh Token
	rawRefreshToken, _, err := models.GenerateRefreshToken(user.ID, models.DefaultRefreshTokenConfig, s.db)
	if err != nil {
		return nil, "", "", models.ErrInternalServerError
	}

	return &user, token, rawRefreshToken, nil
}

// SendVerificationCode 发送验证码
func (s *AuthService) SendVerificationCode(email, codeType string) error {
	// 检查用户是否存在
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ErrUserNotFound
		}
		return models.ErrInternalServerError
	}

	// 检查是否已有待验证的验证码
	if s.evs.HasPendingCode(email, codeType) {
		return models.ErrRateLimited
	}

	// 生成验证码
	if !s.isTestEnvironment() {
		code, err := s.evs.GenerateVerificationCode(email, codeType)
		if err != nil {
			return models.ErrInternalServerError
		}
		// 发送验证邮件
		if err := s.sendVerificationEmail(email, code, codeType); err != nil {
			// 记录错误但不阻止流程
			middleware.GetLogger().Errorw("发送验证邮件失败", "error", err)
		}
	}

	return nil
}

// RequestPasswordReset 请求密码重置
func (s *AuthService) RequestPasswordReset(email string) error {
	// 检查用户是否存在
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ErrUserNotFound
		}
		return models.ErrInternalServerError
	}

	// 生成重置令牌
	token := &models.PasswordResetToken{
		UserID:    user.ID,
		ExpiresAt: time.Now().Add(1 * time.Hour), // 1小时有效期
	}

	if err := token.GenerateToken(); err != nil {
		return models.ErrInternalServerError
	}

	// 保存令牌
	if err := s.db.Create(token).Error; err != nil {
		return models.ErrInternalServerError
	}

	// 在测试环境中直接返回成功，不发送邮件
	if s.isTestEnvironment() {
		return nil
	}

	// 发送密码重置邮件
	if err := s.sendPasswordResetEmail(user.Email, token.Token); err != nil {
		// 记录错误但不阻止流程
		middleware.GetLogger().Errorw("发送密码重置邮件失败", "error", err)
	}

	return nil
}

// ConfirmPasswordReset 确认密码重置
func (s *AuthService) ConfirmPasswordReset(token, newPassword string) error {
	// 查找重置令牌
	var resetToken models.PasswordResetToken
	if err := s.db.Where("token = ? AND expires_at > ?", token, time.Now()).First(&resetToken).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.ErrInvalidToken
		}
		return models.ErrInternalServerError
	}

	// 查找用户
	var user models.User
	if err := s.db.First(&user, resetToken.UserID).Error; err != nil {
		return models.ErrUserNotFound
	}

	// 更新密码
	if err := user.SetPassword(newPassword); err != nil {
		return models.ErrInternalServerError
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 保存用户
	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return models.ErrInternalServerError
	}

	// 删除重置令牌
	if err := tx.Delete(&resetToken).Error; err != nil {
		tx.Rollback()
		return models.ErrInternalServerError
	}

	tx.Commit()
	return nil
}

// validateRegisterInput 验证注册输入
func (s *AuthService) validateRegisterInput(input *models.RegisterInput) error {
	// 验证用户名
	if len(input.Username) < 3 || len(input.Username) > 50 {
		return models.ErrUsernameTooShort
	}

	// 验证用户名格式（只允许字母、数字、下划线）
	if matched, _ := regexp.MatchString("^[a-zA-Z0-9_]+$", input.Username); !matched {
		return models.ErrInvalidUsername
	}

	// 增强密码强度验证
	if err := validatePasswordStrength(input.Password); err != nil {
		return err
	}

	// 验证邮箱格式
	if matched, _ := regexp.MatchString(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, input.Email); !matched {
		return models.ErrInvalidEmail
	}

	return nil
}

// validatePasswordStrength 验证密码强度
func validatePasswordStrength(password string) error {
	// 检查长度（至少8个字符）
	if len(password) < 8 {
		return errors.New("密码至少需要8个字符")
	}

	// 检查最大长度（防止DoS攻击）
	if len(password) > 128 {
		return errors.New("密码过长（最多128个字符）")
	}

	// 检查是否包含大写字母
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	// 检查是否包含小写字母
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	// 检查是否包含数字
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	// 至少需要包含大写、小写和数字中的任意两种
	strength := 0
	if hasUpper {
		strength++
	}
	if hasLower {
		strength++
	}
	if hasNumber {
		strength++
	}

	if strength < 2 {
		return errors.New("密码必须包含大写字母、小写字母和数字中的至少两种")
	}

	// 检查常见弱密码
	commonPasswords := []string{
		"12345678", "password", "Password", "password123", "Password123",
		"qwerty123", "abc12345", "welcome123", "admin123", "user1234",
	}
	lowerPassword := strings.ToLower(password)
	for _, common := range commonPasswords {
		if lowerPassword == strings.ToLower(common) {
			return errors.New("密码过于常见，请使用更强的密码")
		}
	}

	return nil
}

// checkUserExists 检查用户是否已存在
func (s *AuthService) checkUserExists(username, email string) error {
	var count int64

	// 检查用户名
	s.db.Model(&models.User{}).Where("username = ?", username).Count(&count)
	if count > 0 {
		return models.ErrUserExists
	}

	// 检查邮箱
	s.db.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		return models.ErrEmailExists
	}

	return nil
}

// validateInviteCode 验证邀请码
func (s *AuthService) validateInviteCode(code string) (*models.InviteCode, error) {
	// 检查管理员邀请码（从环境变量读取）
	adminInviteCode := os.Getenv("ADMIN_INVITE_CODE")
	if adminInviteCode != "" && code == adminInviteCode {
		// 创建一个虚拟的邀请码对象用于管理员注册
		expiresAt := time.Now().AddDate(10, 0, 0) // 10年后过期
		return &models.InviteCode{
			Code:        code,
			MaxUses:     999999, // 无限使用
			CurrentUses: 0,
			IsActive:    true,
			Description: "管理员专用邀请码（通过环境变量配置）",
			ExpiresAt:   &expiresAt,
		}, nil
	}

	var inviteCode models.InviteCode
	if err := s.db.Where("code = ?", code).First(&inviteCode).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, models.ErrInviteCodeNotFound
		}
		return nil, models.ErrInternalServerError
	}

	if !inviteCode.IsUsable() {
		if inviteCode.IsExpired() {
			return nil, models.ErrInviteCodeExpired
		}
		return nil, models.ErrInviteCodeNotUsable
	}

	return &inviteCode, nil
}

// isTestEnvironment 检查是否为测试环境
func (s *AuthService) isTestEnvironment() bool {
	env := os.Getenv("GIN_MODE")
	return env == "test" || env == "development" || strings.ToLower(env) == "debug"
}

// sendVerificationEmail 发送验证邮件
func (s *AuthService) sendVerificationEmail(email, code, emailType string) error {
	// 获取邮件配置
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUsername := os.Getenv("SMTP_USERNAME")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	// 如果没有配置SMTP，返回错误
	if smtpHost == "" || smtpUsername == "" || smtpPassword == "" {
		return fmt.Errorf("smtp配置缺失，请设置环境变量: SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD")
	}

	// 根据邮件类型选择主题和内容
	var subject, body string
	switch emailType {
	case "REGISTER":
		subject = "欢迎注册 - 邮箱验证"
		body = fmt.Sprintf("欢迎注册！您的验证码是: %s\n有效期为10分钟。", code)
	case "LOGIN":
		subject = "邮箱登录验证"
		body = fmt.Sprintf("您正在使用邮箱登录，验证码是: %s\n有效期为10分钟。", code)
	default:
		subject = "邮箱验证"
		body = fmt.Sprintf("您的验证码是: %s\n有效期为10分钟。", code)
	}

	// 构建邮件内容
	msg := fmt.Sprintf("From: %s\nTo: %s\nSubject: %s\n\n%s", smtpUsername, email, subject, body)

	// 发送邮件
	auth := smtp.PlainAuth("", smtpUsername, smtpPassword, smtpHost)
	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)

	return smtp.SendMail(addr, auth, smtpUsername, []string{email}, []byte(msg))
}

// sendPasswordResetEmail 发送密码重置邮件
func (s *AuthService) sendPasswordResetEmail(email, token string) error {
	// 获取邮件配置
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUsername := os.Getenv("SMTP_USERNAME")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	// 如果没有配置SMTP，返回错误
	if smtpHost == "" || smtpUsername == "" || smtpPassword == "" {
		return fmt.Errorf("smtp配置缺失，请设置环境变量: SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD")
	}

	// 构建重置链接
	baseURL := os.Getenv("FRONTEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:5173"
	}
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", baseURL, token)

	subject := "密码重置请求"
	body := fmt.Sprintf(`
您好，

您请求重置密码。请点击以下链接进行重置（有效期1小时）：
%s

如果您没有请求重置密码，请忽略此邮件。

此链接仅在1小时内有效。
`, resetLink)

	// 构建邮件内容
	msg := fmt.Sprintf("From: %s\nTo: %s\nSubject: %s\n\n%s", smtpUsername, email, subject, body)

	// 发送邮件
	auth := smtp.PlainAuth("", smtpUsername, smtpPassword, smtpHost)
	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)

	return smtp.SendMail(addr, auth, smtpUsername, []string{email}, []byte(msg))
}
