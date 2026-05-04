package services

import (
	"context"
	"fmt"
	"repair-platform/config"
	"repair-platform/models"
	"strings"
	"time"

	"github.com/jomei/notionapi"
	"gorm.io/gorm"
)

type NotionService struct {
	client *notionapi.Client
	db     *gorm.DB
}

func NewNotionService(db *gorm.DB, cfg *config.Config) *NotionService {
	apiKey := cfg.NotionAPIKey
	if apiKey == "" {
		return nil
	}
	client := notionapi.NewClient(notionapi.Token(apiKey))
	return &NotionService{
		client: client,
		db:     db,
	}
}

// SyncPosts 同步文章
func (s *NotionService) SyncPosts(ctx context.Context, adminUser *models.User, pageID string) error {
	if s == nil {
		return fmt.Errorf("notion API Key not configured")
	}

	var pages []*notionapi.Page

	if pageID != "" {
		// Sync single page
		page, err := s.client.Page.Get(ctx, notionapi.PageID(pageID))
		if err != nil {
			return fmt.Errorf("failed to get page %s: %w", pageID, err)
		}
		pages = append(pages, page)
	} else {
		// Sync all pages
		req := &notionapi.SearchRequest{
			Filter: notionapi.SearchFilter{
				Property: "object",
				Value:    "page",
			},
			Sort: &notionapi.SortObject{
				Direction: notionapi.SortOrderDESC,
				Timestamp: notionapi.TimestampLastEdited,
			},
		}

		res, err := s.client.Search.Do(ctx, req)
		if err != nil {
			return fmt.Errorf("search failed: %w", err)
		}

		for _, result := range res.Results {
			if page, ok := result.(*notionapi.Page); ok {
				pages = append(pages, page)
			}
		}
	}

	for _, page := range pages {
		if err := s.processPage(ctx, page, adminUser); err != nil {
			fmt.Printf("Error processing page %s: %v\n", page.ID, err)
			continue
		}
	}

	return nil
}

// NotionPageMeta 包含Notion页面的基本信息
type NotionPageMeta struct {
	ID           string
	Title        string
	LastEditedAt time.Time
	URL          string
}

// ListPages 获取所有文章列表（仅元数据）
func (s *NotionService) ListPages(ctx context.Context) ([]*NotionPageMeta, error) {
	if s == nil {
		return nil, fmt.Errorf("notion API Key not configured")
	}

	req := &notionapi.SearchRequest{
		Filter: notionapi.SearchFilter{
			Property: "object",
			Value:    "page",
		},
		Sort: &notionapi.SortObject{
			Direction: notionapi.SortOrderDESC,
			Timestamp: notionapi.TimestampLastEdited,
		},
	}

	res, err := s.client.Search.Do(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}

	var pages []*NotionPageMeta
	for _, result := range res.Results {
		if page, ok := result.(*notionapi.Page); ok {
			title := "Untitled"
			if len(page.Properties) > 0 {
				for _, prop := range page.Properties {
					if prop.GetType() == notionapi.PropertyTypeTitle {
						if titleProp, ok := prop.(*notionapi.TitleProperty); ok {
							if len(titleProp.Title) > 0 {
								title = titleProp.Title[0].PlainText
							}
						}
					}
				}
			}

			pages = append(pages, &NotionPageMeta{
				ID:           page.ID.String(),
				Title:        title,
				LastEditedAt: page.LastEditedTime,
				URL:          page.URL,
			})
		}
	}

	return pages, nil
}

// processPage 处理单个Page的转换和存储
func (s *NotionService) processPage(ctx context.Context, page *notionapi.Page, adminUser *models.User) error {
	// 获取标题
	title, err := s.getPageTitle(page)
	if err != nil {
		return err // 没有标题跳过
	}

	// 检查是否已存在
	var post models.BlogPost
	result := s.db.Where("notion_page_id = ?", page.ID).First(&post)

	// 如果找到了，检查最后编辑时间
	notionLastEdited := page.LastEditedTime
	if result.Error == nil {
		if post.NotionLastEdit != nil && post.NotionLastEdit.Equal(notionLastEdited) {
			return nil // 没有变化，跳过
		}
	}

	// 获取 Blocks 并转换为 Markdown
	markdown, err := s.getPageContent(ctx, page.ID)
	if err != nil {
		return err
	}

	// 准备数据
	now := time.Now()
	slug := s.generateSlug(title)

	if result.Error == gorm.ErrRecordNotFound {
		// 创建新文章
		newPost := models.BlogPost{
			Title:          title,
			Slug:           slug,
			Content:        markdown,
			AuthorID:       adminUser.ID,
			Status:         "PUBLISHED", // 默认直接发布
			AccessLevel:    "PUBLIC",
			PublishedAt:    &now,
			LastEditedAt:   &now,
			NotionPageID:   page.ID.String(),
			NotionLastEdit: &notionLastEdited,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := s.db.Create(&newPost).Error; err != nil {
			return err
		}

		// 创建默认统计数据
		newStats := models.BlogPostStats{
			BlogPostID:   newPost.ID,
			ViewCount:    0,
			LikeCount:    0,
			ShareCount:   0,
			CommentCount: 0,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		return s.db.Create(&newStats).Error
	} else {
		// 更新现有文章
		post.Title = title
		post.Content = markdown
		post.LastEditedAt = &now
		post.NotionLastEdit = &notionLastEdited
		post.Status = "PUBLISHED" // 确保是发布状态
		return s.db.Save(&post).Error
	}
}

func (s *NotionService) getPageTitle(page *notionapi.Page) (string, error) {
	if page.Properties == nil {
		return "", fmt.Errorf("no properties")
	}

	// 遍历属性找到 Title 类型
	for _, prop := range page.Properties {
		if prop.GetType() == notionapi.PropertyTypeTitle {
			if titleProp, ok := prop.(*notionapi.TitleProperty); ok {
				var titleParts []string
				for _, t := range titleProp.Title {
					titleParts = append(titleParts, t.PlainText)
				}
				fullTitle := strings.Join(titleParts, "")
				if fullTitle == "" {
					return "", fmt.Errorf("empty title")
				}
				return fullTitle, nil
			}
		}
	}
	return "Untitled", nil // Default to Untitled if no title found
}

func (s *NotionService) getPageContent(ctx context.Context, pageID notionapi.ObjectID) (string, error) {
	return s.fetchAndConvertChildren(ctx, notionapi.BlockID(pageID), 0)
}

func (s *NotionService) fetchAndConvertChildren(ctx context.Context, blockID notionapi.BlockID, depth int) (string, error) {
	var blocks []notionapi.Block
	cursor := notionapi.Cursor("")

	for {
		res, err := s.client.Block.GetChildren(ctx, blockID, &notionapi.Pagination{
			StartCursor: cursor,
			PageSize:    100,
		})
		if err != nil {
			return "", err
		}
		blocks = append(blocks, res.Results...)
		if !res.HasMore {
			break
		}
		cursor = notionapi.Cursor(res.NextCursor)
	}

	var mdBuilder strings.Builder
	for i, block := range blocks {
		content, err := s.blockToMarkdown(ctx, block, depth)
		if err != nil {
			return "", err
		}
		mdBuilder.WriteString(content)

		// Add appropriate spacing
		if i < len(blocks)-1 {
			nextBlock := blocks[i+1]
			if isListBlock(block) && isListBlock(nextBlock) {
				mdBuilder.WriteString("\n")
			} else {
				mdBuilder.WriteString("\n\n")
			}
		}
	}

	return mdBuilder.String(), nil
}

func (s *NotionService) convertTable(ctx context.Context, block *notionapi.TableBlock) (string, error) {
	var rows []notionapi.TableRowBlock
	cursor := notionapi.Cursor("")
	for {
		res, err := s.client.Block.GetChildren(ctx, block.ID, &notionapi.Pagination{
			StartCursor: cursor,
			PageSize:    100,
		})
		if err != nil {
			return "", err
		}
		for _, child := range res.Results {
			if row, ok := child.(*notionapi.TableRowBlock); ok {
				rows = append(rows, *row)
			}
		}
		if !res.HasMore {
			break
		}
		cursor = notionapi.Cursor(res.NextCursor)
	}

	if len(rows) == 0 {
		return "", nil
	}

	var sb strings.Builder

	// Determine column count from the first row
	colCount := 0
	if len(rows) > 0 {
		colCount = len(rows[0].TableRow.Cells)
	}

	for i, row := range rows {
		sb.WriteString("|")
		for _, cell := range row.TableRow.Cells {
			sb.WriteString(" ")
			sb.WriteString(strings.ReplaceAll(s.richTextToMarkdown(cell), "\n", "<br>")) // Handle newlines in cells
			sb.WriteString(" |")
		}
		sb.WriteString("\n")

		// Add header separator if it's the first row and has_column_header is true
		// Or if has_column_header is false, markdown table still needs a separator after first row to be a table?
		// Actually standard GFM requires a header row. If Notion says no header, we still expect the first row to be treated as header
		// because MD tables always have headers.
		if i == 0 {
			sb.WriteString("|")
			for j := 0; j < colCount; j++ {
				sb.WriteString(" --- |")
			}
			sb.WriteString("\n")
		}
	}
	return sb.String(), nil
}

func isListBlock(block notionapi.Block) bool {
	switch block.(type) {
	case *notionapi.BulletedListItemBlock, *notionapi.NumberedListItemBlock, *notionapi.ToDoBlock:
		return true
	default:
		return false
	}
}

func (s *NotionService) blockToMarkdown(ctx context.Context, block notionapi.Block, depth int) (string, error) {
	indent := strings.Repeat("    ", depth)

	handleChildren := func(b notionapi.Block) (string, error) {
		if b.GetHasChildren() {
			childrenContent, err := s.fetchAndConvertChildren(ctx, b.GetID(), depth+1)
			if err != nil {
				return "", err
			}
			return "\n" + childrenContent, nil
		}
		return "", nil
	}

	switch b := block.(type) {
	case *notionapi.ParagraphBlock:
		text := s.richTextToMarkdown(b.Paragraph.RichText)
		children, err := handleChildren(b)
		if err != nil {
			return "", err
		}
		return indent + text + children, nil

	case *notionapi.Heading1Block:
		return "# " + s.richTextToMarkdown(b.Heading1.RichText), nil
	case *notionapi.Heading2Block:
		return "## " + s.richTextToMarkdown(b.Heading2.RichText), nil
	case *notionapi.Heading3Block:
		return "### " + s.richTextToMarkdown(b.Heading3.RichText), nil

	case *notionapi.BulletedListItemBlock:
		text := s.richTextToMarkdown(b.BulletedListItem.RichText)
		children, err := handleChildren(b)
		if err != nil {
			return "", err
		}
		return indent + "- " + text + children, nil

	case *notionapi.NumberedListItemBlock:
		text := s.richTextToMarkdown(b.NumberedListItem.RichText)
		children, err := handleChildren(b)
		if err != nil {
			return "", err
		}
		return indent + "1. " + text + children, nil

	case *notionapi.ToDoBlock:
		text := s.richTextToMarkdown(b.ToDo.RichText)
		checked := " "
		if b.ToDo.Checked {
			checked = "x"
		}
		children, err := handleChildren(b)
		if err != nil {
			return "", err
		}
		return indent + fmt.Sprintf("- [%s] %s", checked, text) + children, nil

	case *notionapi.ToggleBlock:
		summary := s.richTextToMarkdown(b.Toggle.RichText)
		children, err := handleChildren(b)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("%s<details><summary>%s</summary>\n%s\n%s</details>", indent, summary, children, indent), nil

	case *notionapi.QuoteBlock:
		text := s.richTextToMarkdown(b.Quote.RichText)
		children, err := handleChildren(b)
		if err != nil {
			return "", err
		}
		return indent + "> " + text + children, nil

	case *notionapi.CalloutBlock:
		text := s.richTextToMarkdown(b.Callout.RichText)
		icon := ""
		if b.Callout.Icon != nil {
			if b.Callout.Icon.Type == "emoji" && b.Callout.Icon.Emoji != nil {
				icon = string(*b.Callout.Icon.Emoji) + " "
			}
		}
		children, err := handleChildren(b)
		if err != nil {
			return "", err
		}
		return indent + "> " + icon + text + children, nil

	case *notionapi.DividerBlock:
		return "---", nil

	case *notionapi.CodeBlock:
		lang := b.Code.Language
		code := s.richTextToMarkdown(b.Code.RichText)
		caption := s.richTextToMarkdown(b.Code.Caption)
		if caption != "" {
			caption = "\n*" + caption + "*" // Add caption as italic text below code
		}
		return fmt.Sprintf("```%s\n%s\n```%s", lang, code, caption), nil

	case *notionapi.ImageBlock:
		url := ""
		switch b.Image.Type {
		case "external":
			url = b.Image.External.URL
		case "file":
			url = b.Image.File.URL
		}
		caption := s.richTextToMarkdown(b.Image.Caption)
		if caption == "" {
			caption = "image"
		}
		return fmt.Sprintf("![%s](%s)", caption, url), nil

	case *notionapi.VideoBlock:
		url := ""
		switch b.Video.Type {
		case "external":
			url = b.Video.External.URL
		case "file":
			url = b.Video.File.URL
		}
		caption := s.richTextToMarkdown(b.Video.Caption)
		if caption == "" {
			caption = "Video"
		}
		return fmt.Sprintf("[%s](%s)", caption, url), nil

	case *notionapi.FileBlock:
		url := ""
		switch b.File.Type {
		case "external":
			url = b.File.External.URL
		case "file":
			url = b.File.File.URL
		}
		caption := s.richTextToMarkdown(b.File.Caption)
		if caption == "" {
			caption = "File"
		}
		return fmt.Sprintf("[%s](%s)", caption, url), nil

	case *notionapi.PdfBlock:
		url := ""
		switch b.Pdf.Type {
		case "external":
			url = b.Pdf.External.URL
		case "file":
			url = b.Pdf.File.URL
		}
		caption := s.richTextToMarkdown(b.Pdf.Caption)
		if caption == "" {
			caption = "PDF"
		}
		return fmt.Sprintf("[%s](%s)", caption, url), nil

	case *notionapi.BookmarkBlock:
		url := b.Bookmark.URL
		caption := s.richTextToMarkdown(b.Bookmark.Caption)
		if caption == "" {
			caption = url
		}
		return fmt.Sprintf("[%s](%s)", caption, url), nil

	case *notionapi.TableBlock:
		return s.convertTable(ctx, b)
	}
	return "", nil
}

func (s *NotionService) richTextToMarkdown(richText []notionapi.RichText) string {
	var sb strings.Builder
	for _, rt := range richText {
		text := rt.PlainText
		if rt.Annotations != nil {
			if rt.Annotations.Bold {
				text = "**" + text + "**"
			}
			if rt.Annotations.Italic {
				text = "*" + text + "*"
			}
			if rt.Annotations.Strikethrough {
				text = "~~" + text + "~~"
			}
			if rt.Annotations.Code {
				text = "`" + text + "`"
			}
		}
		if rt.Href != "" {
			text = fmt.Sprintf("[%s](%s)", text, rt.Href)
		}
		sb.WriteString(text)
	}
	return sb.String()
}

func (s *NotionService) generateSlug(title string) string {
	// 简单的 Slug 生成逻辑，实际项目中可以使用库如 go-slug
	// 这里简单替换空格为 -
	return strings.ReplaceAll(title, " ", "-") + "-" + fmt.Sprintf("%d", time.Now().Unix())
}
