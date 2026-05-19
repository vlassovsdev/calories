package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/vlassovs/calories/internal/db/queries"
	"github.com/vlassovs/calories/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserExists         = errors.New("user already exists")
	ErrTokenInvalid       = errors.New("token invalid or expired")
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type AuthService struct {
	users      *queries.UserStore
	rdb        *redis.Client
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewAuthService(users *queries.UserStore, rdb *redis.Client,
	secret []byte, accessTTL, refreshTTL time.Duration) *AuthService {
	return &AuthService{
		users:      users,
		rdb:        rdb,
		secret:     secret,
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
	}
}

func (s *AuthService) Register(ctx context.Context, email, password, displayName string) (*domain.User, *TokenPair, error) {
	existing, _, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return nil, nil, err
	}
	if existing != nil {
		return nil, nil, ErrUserExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, fmt.Errorf("bcrypt: %w", err)
	}

	user, err := s.users.Create(ctx, email, string(hash), displayName)
	if err != nil {
		return nil, nil, err
	}

	tokens, err := s.issueTokens(ctx, user)
	if err != nil {
		return nil, nil, err
	}
	return user, tokens, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*domain.User, *TokenPair, error) {
	user, hash, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return nil, nil, err
	}
	if user == nil {
		return nil, nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	tokens, err := s.issueTokens(ctx, user)
	if err != nil {
		return nil, nil, err
	}
	return user, tokens, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	claims, err := s.parseToken(refreshToken)
	if err != nil {
		return nil, ErrTokenInvalid
	}

	jti := claims.ID
	key := fmt.Sprintf("rt:%s:%s", claims.UserID, jti)

	exists, err := s.rdb.Exists(ctx, key).Result()
	if err != nil || exists == 0 {
		return nil, ErrTokenInvalid
	}

	blacklisted, err := s.rdb.Exists(ctx, "rt:blacklist:"+jti).Result()
	if err != nil || blacklisted > 0 {
		return nil, ErrTokenInvalid
	}

	user, err := s.users.GetByID(ctx, claims.UserID)
	if err != nil || user == nil {
		return nil, ErrTokenInvalid
	}

	// Revoke old refresh token
	s.rdb.Del(ctx, key)

	return s.issueTokens(ctx, user)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	claims, err := s.parseToken(refreshToken)
	if err != nil {
		return nil
	}
	jti := claims.ID
	key := fmt.Sprintf("rt:%s:%s", claims.UserID, jti)
	s.rdb.Del(ctx, key)
	s.rdb.Set(ctx, "rt:blacklist:"+jti, "1", s.refreshTTL)
	return nil
}

func (s *AuthService) issueTokens(ctx context.Context, user *domain.User) (*TokenPair, error) {
	now := time.Now()
	accessJTI := uuid.NewString()
	accessClaims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        accessJTI,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
		},
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(s.secret)
	if err != nil {
		return nil, fmt.Errorf("sign access token: %w", err)
	}

	refreshJTI := uuid.NewString()
	refreshClaims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        refreshJTI,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshTTL)),
		},
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(s.secret)
	if err != nil {
		return nil, fmt.Errorf("sign refresh token: %w", err)
	}

	key := fmt.Sprintf("rt:%s:%s", user.ID, refreshJTI)
	if err := s.rdb.Set(ctx, key, "1", s.refreshTTL).Err(); err != nil {
		return nil, fmt.Errorf("store refresh token: %w", err)
	}

	return &TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (s *AuthService) parseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrTokenInvalid
	}
	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, ErrTokenInvalid
	}
	return claims, nil
}
