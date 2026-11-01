// Package termframe renders recorded terminal output into a character grid
// and into standalone SVG images.
package termframe

import (
	"fmt"
	"strconv"
	"strings"
	"unicode/utf8"
)

// DefaultColor marks a cell that uses the terminal's default foreground or
// background color.
const DefaultColor = -1

// Style is the visual state of a terminal cell.
type Style struct {
	Foreground int
	Background int
	Bold       bool
	Dim        bool
	Reverse    bool
}

// Cell is one character position in a frame.
type Cell struct {
	Rune  rune
	Style Style
}

// Frame is a fixed-size character grid.
type Frame struct {
	columns int
	rows    int
	cells   [][]Cell

	cursorRow    int
	cursorColumn int

	savedCells  [][]Cell
	savedRow    int
	savedColumn int
}

// New returns a blank frame.
func New(columns, rows int) *Frame {
	if columns < 1 {
		columns = 1
	}
	if rows < 1 {
		rows = 1
	}

	frame := &Frame{columns: columns, rows: rows}
	frame.clear()
	return frame
}

// Parse replays terminal output and returns the resulting screen.
func Parse(data []byte, columns, rows int) *Frame {
	frame := New(columns, rows)
	frame.parse(data)
	return frame
}

// Columns reports the frame width.
func (f *Frame) Columns() int { return f.columns }

// Rows reports the frame height.
func (f *Frame) Rows() int { return f.rows }

// At returns the cell at the given position.
func (f *Frame) At(row, column int) Cell {
	if row < 0 || row >= f.rows || column < 0 || column >= f.columns {
		return Cell{Rune: ' ', Style: Style{Foreground: DefaultColor, Background: DefaultColor}}
	}
	return f.cells[row][column]
}

// Text renders the frame as plain text with trailing whitespace removed.
func (f *Frame) Text() string {
	lines := make([]string, 0, f.rows)
	for _, row := range f.cells {
		var builder strings.Builder
		builder.Grow(f.columns)
		for _, cell := range row {
			builder.WriteRune(cell.Rune)
		}
		lines = append(lines, strings.TrimRight(builder.String(), " "))
	}

	for len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}

	return strings.Join(lines, "\n")
}

func (f *Frame) clear() {
	f.cells = make([][]Cell, f.rows)
	for row := range f.cells {
		f.cells[row] = make([]Cell, f.columns)
		for column := range f.cells[row] {
			f.cells[row][column] = Cell{Rune: ' ', Style: Style{Foreground: DefaultColor, Background: DefaultColor}}
		}
	}
}

func (f *Frame) set(row, column int, value rune, style Style) {
	if row < 0 || row >= f.rows || column < 0 || column >= f.columns {
		return
	}
	f.cells[row][column] = Cell{Rune: value, Style: style}
}

func (f *Frame) scroll() {
	copy(f.cells, f.cells[1:])
	last := make([]Cell, f.columns)
	for column := range last {
		last[column] = Cell{Rune: ' ', Style: Style{Foreground: DefaultColor, Background: DefaultColor}}
	}
	f.cells[len(f.cells)-1] = last
}

func (f *Frame) parse(data []byte) {
	row, column := 0, 0
	style := Style{Foreground: DefaultColor, Background: DefaultColor}
	savedRow, savedColumn := 0, 0

	for index := 0; index < len(data); {
		switch data[index] {
		case 0x1b:
			consumed := f.escape(data[index:], &row, &column, &style, &savedRow, &savedColumn)
			index += consumed
		case '\r':
			column = 0
			index++
		case '\n':
			row++
			if row >= f.rows {
				f.scroll()
				row = f.rows - 1
			}
			index++
		case '\b':
			if column > 0 {
				column--
			}
			index++
		case '\t':
			column += 8 - column%8
			if column >= f.columns {
				column = f.columns - 1
			}
			index++
		default:
			if data[index] < 0x20 {
				index++
				continue
			}
			value, size := utf8.DecodeRune(data[index:])
			if value == utf8.RuneError && size == 1 {
				index++
				continue
			}
			f.set(row, column, value, style)
			column++
			if column >= f.columns {
				column = 0
				row++
				if row >= f.rows {
					f.scroll()
					row = f.rows - 1
				}
			}
			index += size
		}
	}

	f.cursorRow = clamp(row, 0, f.rows-1)
	f.cursorColumn = clamp(column, 0, f.columns-1)
}

// Cursor reports the cursor position left by the recorded output.
func (f *Frame) Cursor() (row, column int) {
	return f.cursorRow, f.cursorColumn
}

// Alternate reports whether the recorded output ended on the alternate screen.
func (f *Frame) Alternate() bool {
	return f.savedCells != nil
}

func (f *Frame) escape(data []byte, row, column *int, style *Style, savedRow, savedColumn *int) int {
	if len(data) < 2 {
		return len(data)
	}

	switch data[1] {
	case '[':
		return f.controlSequence(data, row, column, style, savedRow, savedColumn)
	case ']':
		for index := 2; index < len(data); index++ {
			if data[index] == 0x07 {
				return index + 1
			}
			if data[index] == 0x1b && index+1 < len(data) && data[index+1] == '\\' {
				return index + 2
			}
		}
		return len(data)
	case '(', ')':
		if len(data) >= 3 {
			return 3
		}
		return len(data)
	case '7':
		*savedRow, *savedColumn = *row, *column
		return 2
	case '8':
		*row, *column = *savedRow, *savedColumn
		return 2
	case 'c':
		f.clear()
		*row, *column = 0, 0
		*style = Style{Foreground: DefaultColor, Background: DefaultColor}
		return 2
	default:
		return 2
	}
}

func (f *Frame) controlSequence(data []byte, row, column *int, style *Style, savedRow, savedColumn *int) int {
	end := 2
	for end < len(data) {
		if data[end] >= 0x40 && data[end] <= 0x7e {
			break
		}
		end++
	}
	if end >= len(data) {
		return len(data)
	}

	parameters := string(data[2:end])
	f.apply(data[end], parameters, row, column, style, savedRow, savedColumn)
	return end + 1
}

func (f *Frame) apply(command byte, parameters string, row, column *int, style *Style, savedRow, savedColumn *int) {
	if strings.HasPrefix(parameters, ">") {
		return
	}
	if strings.HasPrefix(parameters, "?") {
		if command == 'h' || command == 'l' {
			f.applyPrivateMode(command, parameters[1:], row, column)
		}
		return
	}

	values := parseParameters(parameters)
	value := func(index, fallback int) int {
		if index < len(values) {
			return values[index]
		}
		return fallback
	}

	switch command {
	case 'H', 'f':
		*row = value(0, 1) - 1
		*column = value(1, 1) - 1
	case 'A':
		*row -= value(0, 1)
	case 'B':
		*row += value(0, 1)
	case 'C':
		*column += value(0, 1)
	case 'D':
		*column -= value(0, 1)
	case 'E':
		*row += value(0, 1)
		*column = 0
	case 'F':
		*row -= value(0, 1)
		*column = 0
	case 'G':
		*column = value(0, 1) - 1
	case 'd':
		*row = value(0, 1) - 1
	case 'J':
		f.eraseDisplay(value(0, 0), *row, *column)
	case 'K':
		f.eraseLine(value(0, 0), *row, *column)
	case 'X':
		count := value(0, 1)
		for offset := 0; offset < count; offset++ {
			f.set(*row, *column+offset, ' ', *style)
		}
	case 's':
		*savedRow, *savedColumn = *row, *column
	case 'u':
		*row, *column = *savedRow, *savedColumn
	case 'm':
		applySGR(values, style)
	}

	*row = clamp(*row, 0, f.rows-1)
	*column = clamp(*column, 0, f.columns-1)
}

func (f *Frame) applyPrivateMode(command byte, parameters string, row, column *int) {
	for _, mode := range parseParameters(parameters) {
		if mode != 47 && mode != 1047 && mode != 1049 {
			continue
		}
		if command == 'h' {
			f.enterAltScreen(row, column)
		} else {
			f.exitAltScreen(row, column)
		}
	}
}

func (f *Frame) enterAltScreen(row, column *int) {
	if f.savedCells != nil {
		return
	}

	f.savedCells = make([][]Cell, len(f.cells))
	for index := range f.cells {
		f.savedCells[index] = append([]Cell(nil), f.cells[index]...)
	}
	f.savedRow, f.savedColumn = *row, *column

	f.clear()
	*row, *column = 0, 0
}

func (f *Frame) exitAltScreen(row, column *int) {
	if f.savedCells == nil {
		return
	}

	f.cells = f.savedCells
	f.savedCells = nil
	*row, *column = f.savedRow, f.savedColumn
}

func (f *Frame) eraseDisplay(mode, row, column int) {
	switch mode {
	case 1:
		for r := 0; r < row; r++ {
			f.eraseLine(2, r, 0)
		}
		f.eraseLine(1, row, column)
	case 2, 3:
		for r := 0; r < f.rows; r++ {
			f.eraseLine(2, r, 0)
		}
	default:
		f.eraseLine(0, row, column)
		for r := row + 1; r < f.rows; r++ {
			f.eraseLine(2, r, 0)
		}
	}
}

func (f *Frame) eraseLine(mode, row, column int) {
	if row < 0 || row >= f.rows {
		return
	}

	blank := Cell{Rune: ' ', Style: Style{Foreground: DefaultColor, Background: DefaultColor}}
	switch mode {
	case 1:
		for c := 0; c <= column && c < f.columns; c++ {
			f.cells[row][c] = blank
		}
	case 2:
		for c := range f.cells[row] {
			f.cells[row][c] = blank
		}
	default:
		for c := column; c < f.columns; c++ {
			f.cells[row][c] = blank
		}
	}
}

func parseParameters(parameters string) []int {
	if parameters == "" {
		return nil
	}

	parts := strings.Split(parameters, ";")
	values := make([]int, 0, len(parts))
	for _, part := range parts {
		if part == "" {
			values = append(values, 0)
			continue
		}
		number, err := strconv.Atoi(part)
		if err != nil {
			values = append(values, 0)
			continue
		}
		values = append(values, number)
	}

	return values
}

func applySGR(values []int, style *Style) {
	if len(values) == 0 {
		style.Foreground = DefaultColor
		style.Background = DefaultColor
		style.Bold = false
		style.Dim = false
		style.Reverse = false
		return
	}

	for index := 0; index < len(values); index++ {
		switch value := values[index]; {
		case value == 0:
			*style = Style{Foreground: DefaultColor, Background: DefaultColor}
		case value == 1:
			style.Bold = true
		case value == 2:
			style.Dim = true
		case value == 7:
			style.Reverse = true
		case value == 22:
			style.Bold = false
			style.Dim = false
		case value == 27:
			style.Reverse = false
		case value >= 30 && value <= 37:
			style.Foreground = value - 30
		case value == 39:
			style.Foreground = DefaultColor
		case value >= 40 && value <= 47:
			style.Background = value - 40
		case value == 49:
			style.Background = DefaultColor
		case value >= 90 && value <= 97:
			style.Foreground = value - 90 + 8
		case value >= 100 && value <= 107:
			style.Background = value - 100 + 8
		case value == 38 || value == 48:
			if index+1 < len(values) {
				switch values[index+1] {
				case 5:
					index += 2
				case 2:
					index += 4
				default:
					index++
				}
			}
		}
	}
}

func clamp(value, minimum, maximum int) int {
	if value < minimum {
		return minimum
	}
	if value > maximum {
		return maximum
	}
	return value
}

// UsedRows reports how many rows contain visible content.
func (f *Frame) UsedRows() int {
	for row := f.rows - 1; row >= 0; row-- {
		for _, cell := range f.cells[row] {
			if cell.Rune != ' ' {
				return row + 1
			}
		}
	}
	return 0
}

// UsedColumns reports how many columns contain visible content.
func (f *Frame) UsedColumns() int {
	for column := f.columns - 1; column >= 0; column-- {
		for row := 0; row < f.rows; row++ {
			if f.cells[row][column].Rune != ' ' {
				return column + 1
			}
		}
	}
	return 0
}

// SVG renders the frame as a standalone SVG image sized to its content.
func (f *Frame) SVG(title string) string {
	return f.SVGWithSize(title, f.UsedColumns(), f.UsedRows())
}

// SVGWithSize renders the frame as a standalone SVG image with a fixed
// character grid size, so a set of screenshots can share dimensions.
func (f *Frame) SVGWithSize(title string, columns, rows int) string {
	const (
		cellWidth  = 8.4
		cellHeight = 18.0
		padding    = 12.0
		fontSize   = 14.0
	)

	if columns < 1 {
		columns = 1
	}
	if rows < 1 {
		rows = 1
	}

	width := padding*2 + float64(columns)*cellWidth
	height := padding*2 + float64(rows)*cellHeight

	var builder strings.Builder
	fmt.Fprintf(&builder, `<svg xmlns="http://www.w3.org/2000/svg" width="%.0f" height="%.0f" viewBox="0 0 %.0f %.0f" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', monospace" font-size="%.0f">`, width, height, width, height, fontSize)
	builder.WriteString("\n<title>")
	builder.WriteString(escapeXML(title))
	builder.WriteString("</title>\n")
	fmt.Fprintf(&builder, `<rect width="%.0f" height="%.0f" fill="%s"/>`, width, height, paletteBackground)
	builder.WriteString("\n")

	drawRows := rows
	if drawRows > f.rows {
		drawRows = f.rows
	}
	for row := 0; row < drawRows; row++ {
		baseline := padding + float64(row)*cellHeight + fontSize
		f.writeBackgrounds(&builder, row, baseline, padding, cellWidth, cellHeight)
		f.writeText(&builder, row, baseline, padding, cellWidth)
	}

	builder.WriteString("</svg>\n")
	return builder.String()
}

func (f *Frame) writeBackgrounds(builder *strings.Builder, row int, baseline, padding, cellWidth, cellHeight float64) {
	column := 0
	for column < f.columns {
		start := column
		_, background := colors(f.cells[row][column].Style)
		for column < f.columns {
			_, next := colors(f.cells[row][column].Style)
			if next != background {
				break
			}
			column++
		}

		if background != paletteBackground && column > start {
			fmt.Fprintf(
				builder,
				`<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>`+"\n",
				padding+float64(start)*cellWidth,
				baseline-float64(cellHeight)+3,
				float64(column-start)*cellWidth,
				cellHeight,
				background,
			)
		}
	}
}

func (f *Frame) writeText(builder *strings.Builder, row int, baseline, padding, cellWidth float64) {
	column := 0
	for column < f.columns {
		cell := f.cells[row][column]
		if cell.Rune == ' ' {
			column++
			continue
		}

		start := column
		foreground, _ := colors(cell.Style)
		bold := cell.Style.Bold
		var text strings.Builder
		for column < f.columns {
			current := f.cells[row][column]
			if current.Rune == ' ' {
				break
			}
			nextForeground, _ := colors(current.Style)
			if nextForeground != foreground || current.Style.Bold != bold {
				break
			}
			text.WriteRune(current.Rune)
			column++
		}

		if text.Len() == 0 {
			column++
			continue
		}

		weight := ""
		if bold {
			weight = ` font-weight="bold"`
		}

		fmt.Fprintf(
			builder,
			`<text x="%.1f" y="%.1f" fill="%s"%s textLength="%.1f" lengthAdjust="spacingAndGlyphs" xml:space="preserve">%s</text>`+"\n",
			padding+float64(start)*cellWidth,
			baseline,
			foreground,
			weight,
			float64(column-start)*cellWidth,
			escapeXML(text.String()),
		)
	}
}

func colors(style Style) (string, string) {
	foreground := colorValue(style.Foreground, paletteForeground)
	background := colorValue(style.Background, paletteBackground)
	if style.Reverse {
		foreground, background = background, foreground
	}
	return foreground, background
}

func colorValue(index int, fallback string) string {
	if index < 0 || index >= len(palette) {
		return fallback
	}
	return palette[index]
}

func escapeXML(value string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
		"'", "&apos;",
	)
	return replacer.Replace(value)
}

// Palette returns the 16 ANSI colors used by SVG rendering.
func Palette() []string {
	return append([]string(nil), palette...)
}

// Background returns the default background color used by SVG rendering.
func Background() string { return paletteBackground }

// Foreground returns the default foreground color used by SVG rendering.
func Foreground() string { return paletteForeground }

const (
	paletteBackground = "#101014"
	paletteForeground = "#d5c4a1"
)

var palette = []string{
	"#1c1c1c", "#e06c75", "#98c379", "#e5c07b",
	"#61afef", "#c678dd", "#56b6c2", "#d0d0d0",
	"#6c6c6c", "#e06c75", "#98c379", "#e5c07b",
	"#61afef", "#c678dd", "#56b6c2", "#ffffff",
}
