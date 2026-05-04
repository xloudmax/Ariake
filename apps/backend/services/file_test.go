package services

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"github.com/99designs/gqlgen/graphql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"repair-platform/models"
)

func setupTestFileDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{SingularTable: true},
	})
	if err != nil {
		t.Fatalf("setup test db failed: %v", err)
	}
	db.AutoMigrate(&models.FileMeta{})
	return db
}

type readSeekCloser struct{ *bytes.Reader }

func (r readSeekCloser) Close() error { return nil }

func makeUpload(filename string, data []byte) graphql.Upload {
	return graphql.Upload{File: readSeekCloser{bytes.NewReader(data)}, Filename: filename}
}

func TestFileServiceUploadAndDelete(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "upload-test")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	os.Setenv("BASE_PATH", tmpDir)
	os.Setenv("ALLOWED_FILE_TYPES", ".png,.jpg")
	os.Setenv("MAX_FILE_SIZE", "1024")

	fs := NewFileService(setupTestFileDB(t))
	fs.maxSize = 1024
	fs.allowExts = map[string]bool{".png": true, ".jpg": true}

	data := bytes.Repeat([]byte{1}, 100)
	upload := makeUpload("test.png", data)

	resp, err := fs.UploadImage(upload, 1)
	if err != nil {
		t.Fatalf("upload failed: %v", err)
	}

	if resp.Filename == "" || resp.ImageURL == "" {
		t.Fatalf("expected filename and url")
	}

	// delete as owner should succeed
	name := filepath.Base(resp.Filename)
	if err := fs.DeleteImage(name, 1, "USER"); err != nil {
		t.Fatalf("delete should succeed: %v", err)
	}

	// non-owner non-admin should be blocked
	if err := fs.DeleteImage(name, 2, "USER"); err == nil {
		t.Fatalf("expected delete by other user to fail")
	}
	// admin can delete (recreate file first)
	upload = makeUpload("test.png", data)
	resp, err = fs.UploadImage(upload, 1)
	if err != nil {
		t.Fatalf("re-upload failed: %v", err)
	}
	if err := fs.DeleteImage(filepath.Base(resp.Filename), 2, "ADMIN"); err != nil {
		t.Fatalf("admin delete should succeed: %v", err)
	}
}

func TestFileServiceRejectsLargeFile(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "upload-test")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	os.Setenv("BASE_PATH", tmpDir)
	os.Setenv("ALLOWED_FILE_TYPES", ".png")
	os.Setenv("MAX_FILE_SIZE", "10") // very small

	fs := NewFileService(setupTestFileDB(t))
	fs.maxSize = 10
	fs.allowExts = map[string]bool{".png": true}
	data := bytes.Repeat([]byte{1}, 50)
	upload := makeUpload("big.png", data)

	if _, err := fs.UploadImage(upload, 1); err == nil {
		t.Fatalf("expected upload to fail due to size limit")
	}
}

func TestFileServiceRejectsDisallowedExt(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "upload-test")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	os.Setenv("BASE_PATH", tmpDir)
	os.Setenv("ALLOWED_FILE_TYPES", ".png")
	fs := NewFileService(setupTestFileDB(t))
	fs.allowExts = map[string]bool{".png": true}

	data := bytes.Repeat([]byte{1}, 10)
	upload := makeUpload("bad.txt", data)
	if _, err := fs.UploadImage(upload, 1); err == nil {
		t.Fatalf("expected disallowed extension to be rejected")
	}
}

func TestFileServiceUploadRateLimit(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "upload-test")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	os.Setenv("BASE_PATH", tmpDir)
	fs := NewFileService(setupTestFileDB(t))
	fs.allowExts = map[string]bool{".png": true}

	data := bytes.Repeat([]byte{1}, 10)

	// Try uploading 11 times. We expect a rate limit of perhaps 10/min.
	for i := 0; i < 11; i++ {
		upload := makeUpload("test.png", data)
		_, err := fs.UploadImage(upload, 99)

		if i == 10 {
			if err == nil {
				t.Fatalf("expected the 11th upload to fail due to rate limiting, but it succeeded")
			}
		} else {
			if err != nil {
				t.Fatalf("expected upload %d to succeed, got %v", i+1, err)
			}
		}
	}
}

func TestFileServiceDeletesViaDB(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "upload-test")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	db := setupTestFileDB(t)
	os.Setenv("BASE_PATH", tmpDir)
	fs := NewFileService(db)
	fs.uploadDir = tmpDir

	// Create a file whose name does NOT start with "2_"
	customFilename := "arbitrary_name.png"
	fullPath := filepath.Join(tmpDir, "images", customFilename)
	os.MkdirAll(filepath.Dir(fullPath), 0755)
	os.WriteFile(fullPath, []byte("fake image data"), 0644)

	// Inject file ownership into DB
	db.Create(&models.FileMeta{
		Filename: customFilename,
		UserID:   2,
		Size:     10,
	})

	// User 2 tries to delete the file. It should SUCCEED via DB, even without the "2_" prefix.
	err = fs.DeleteImage(customFilename, 2, "USER")

	if err != nil {
		t.Fatalf("expected DeleteImage to succeed via DB lookup, but got error: %v", err)
	}
}

func TestFileServiceLegacyDelete(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "upload-test")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	os.Setenv("BASE_PATH", tmpDir)
	fs := NewFileService(setupTestFileDB(t))
	fs.uploadDir = tmpDir

	// Create an old file format that HAS no DB record
	legacyFilename := "3_legacy.png"
	fullPath := filepath.Join(tmpDir, "images", legacyFilename)
	os.MkdirAll(filepath.Dir(fullPath), 0755)
	os.WriteFile(fullPath, []byte("fake image data"), 0644)

	// User 3 tries to delete their own legacy file.
	// Since there is no DB record, it should fallback to the prefix format and SUCCEED.
	err = fs.DeleteImage(legacyFilename, 3, "USER")
	if err != nil {
		t.Fatalf("expected legacy DeleteImage to succeed via fallback prefix check, got %v", err)
	}
}
