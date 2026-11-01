//go:build !windows

package main

import (
	"flag"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"

	"github.com/amoshydra/qpq/go/internal/termframe"
)

var updateDemo = flag.Bool("update-demo", false, "rewrite docs/demo.gif")

const (
	demoColumns = 80
	demoRows    = 11

	demoCellWidth  = 7
	demoCellHeight = 13

	demoPadding     = 8
	demoKeyUnit     = 40
	demoKeyGap      = 2
	demoKeyboardGap = 10
)

type demoKey struct {
	label string
	units int
}

type demoStep struct {
	highlight string
	send      string
	waitFor   string
	hold      time.Duration
}

type demoCapture struct {
	frame     *termframe.Frame
	highlight string
	hold      time.Duration
}

type demoTheme struct {
	palette    color.Palette
	background color.Color
	foreground color.Color
	ansi       []color.Color

	key            color.Color
	keyBorder      color.Color
	keyText        color.Color
	keyPressed     color.Color
	keyPressedText color.Color
}

func TestGenerateDemo(t *testing.T) {
	if !*updateDemo {
		t.Skip("run with -update-demo to regenerate docs/demo.gif")
	}

	home := t.TempDir()
	t.Setenv("HOME", home)
	configFile, err := configPath()
	if err != nil {
		t.Fatalf("resolve config path: %v", err)
	}
	if err := saveConfig(configFile, demoConfig()); err != nil {
		t.Fatalf("save config: %v", err)
	}

	path := filepath.Dir(testBinary) + string(os.PathListSeparator) + os.Getenv("PATH")
	session := startPTYCommand(t, home, []string{"/bin/sh"}, demoColumns, demoRows, map[string]string{
		"PS1":  "$ ",
		"PATH": path,
	})

	captures := make([]demoCapture, 0, 24)
	capture := func(highlight string, hold time.Duration) {
		captures = append(captures, demoCapture{
			frame:     parseDemoFrame(session),
			highlight: highlight,
			hold:      hold,
		})
	}

	session.waitFor("$ ", 10*time.Second)
	time.Sleep(150 * time.Millisecond)
	capture("", 700*time.Millisecond)

	for _, key := range []string{"q", "p", "q"} {
		session.send(key)
		time.Sleep(150 * time.Millisecond)
		capture(key, 160*time.Millisecond)
	}

	session.send("\r")
	session.waitFor("My Commands", 10*time.Second)
	time.Sleep(150 * time.Millisecond)
	capture("enter", 900*time.Millisecond)

	steps := []demoStep{
		// First run: browse the default list and execute List Files.
		{highlight: "j", send: "j", hold: 450 * time.Millisecond},
		{highlight: "j", send: "j", hold: 450 * time.Millisecond},
		{highlight: "j", send: "j", hold: 450 * time.Millisecond},
		{highlight: "k", send: "k", hold: 450 * time.Millisecond},
		{highlight: "j", send: "j", hold: 450 * time.Millisecond},
		{highlight: "enter", send: "\r", waitFor: "total", hold: 1500 * time.Millisecond},
		// Back at the shell, start qpq again.
		{highlight: "q", send: "q", hold: 160 * time.Millisecond},
		{highlight: "p", send: "p", hold: 160 * time.Millisecond},
		{highlight: "q", send: "q", hold: 160 * time.Millisecond},
		{highlight: "enter", send: "\r", waitFor: "1. List Files", hold: 900 * time.Millisecond},
		// Second run: search, fill a template, execute.
		{highlight: "/", send: "/", waitFor: "Search Commands", hold: 700 * time.Millisecond},
		{highlight: "d", send: "d", hold: 130 * time.Millisecond},
		{highlight: "e", send: "e", hold: 130 * time.Millisecond},
		{highlight: "p", send: "p", hold: 130 * time.Millisecond},
		{highlight: "l", send: "l", hold: 130 * time.Millisecond},
		{highlight: "o", send: "o", hold: 130 * time.Millisecond},
		{highlight: "y", send: "y", waitFor: "> deploy", hold: 600 * time.Millisecond},
		{highlight: "enter", send: "\r", waitFor: "Template Variables", hold: 900 * time.Millisecond},
		{highlight: "m", send: "m", hold: 130 * time.Millisecond},
		{highlight: "a", send: "a", hold: 130 * time.Millisecond},
		{highlight: "i", send: "i", hold: 130 * time.Millisecond},
		{highlight: "n", send: "n", hold: 600 * time.Millisecond},
		{highlight: "enter", send: "\r", hold: 1600 * time.Millisecond},
	}

	for index, step := range steps {
		session.send(step.send)
		if step.waitFor != "" {
			session.waitFor(step.waitFor, 10*time.Second)
		}
		if index == len(steps)-1 {
			session.waitFor("Deployed main", 5*time.Second)
			time.Sleep(250 * time.Millisecond)
		}
		time.Sleep(150 * time.Millisecond)
		capture(step.highlight, step.hold)
	}

	session.send("exit\r")
	if err := session.waitExit(5 * time.Second); err != nil {
		t.Fatalf("shell exited with %v", err)
	}

	animation := &gif.GIF{LoopCount: 0}
	theme := newDemoTheme()
	for _, capture := range captures {
		animation.Image = append(animation.Image, theme.render(capture.frame, capture.highlight))
		delay := int(capture.hold / (10 * time.Millisecond))
		animation.Delay = append(animation.Delay, delay)
		animation.Disposal = append(animation.Disposal, gif.DisposalNone)
	}

	output := filepath.Join("..", "docs", "demo.gif")
	file, err := os.Create(output)
	if err != nil {
		t.Fatalf("create %s: %v", output, err)
	}
	if err := gif.EncodeAll(file, animation); err != nil {
		file.Close()
		t.Fatalf("encode %s: %v", output, err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close %s: %v", output, err)
	}

	width, height := demoImageSize()
	t.Logf("wrote %s: %d frames, %dx%d", output, len(animation.Image), width, height)
}

func demoConfig() Config {
	return Config{
		Commands: []Command{
			{ID: 1, Name: "Deploy", Command: "printf 'Deployed %s\\n' {target}", Description: "Deploy the current build", Tags: []string{"deploy"}},
			{ID: 2, Name: "Disk Usage", Command: "df -h", Description: "Show disk usage", Tags: []string{"disk"}},
			{ID: 3, Name: "Git Status", Command: "git status", Description: "Show working tree status", Tags: []string{"git"}},
			{ID: 4, Name: "List Files", Command: "ls -la", Description: "List all files", Tags: []string{"files"}},
		},
		NextID: 5,
	}
}

func parseDemoFrame(session *ptySession) *termframe.Frame {
	return termframe.Parse([]byte(session.Output()), demoColumns, demoRows)
}

func demoImageSize() (int, int) {
	width := demoPadding*2 + demoColumns*demoCellWidth
	height := demoPadding*2 + demoRows*demoCellHeight + demoKeyboardGap + len(keyboardLayout())*demoKeyUnit
	return width, height
}

func keyboardLayout() [][]demoKey {
	return [][]demoKey{
		{
			{"1", 1}, {"2", 1}, {"3", 1}, {"4", 1}, {"5", 1}, {"6", 1},
			{"7", 1}, {"8", 1}, {"9", 1}, {"0", 1}, {"-", 1}, {"=", 1}, {"del", 2},
		},
		{
			{"q", 1}, {"w", 1}, {"e", 1}, {"r", 1}, {"t", 1}, {"y", 1},
			{"u", 1}, {"i", 1}, {"o", 1}, {"p", 1}, {"[", 1}, {"]", 1},
		},
		{
			{"a", 1}, {"s", 1}, {"d", 1}, {"f", 1}, {"g", 1}, {"h", 1},
			{"j", 1}, {"k", 1}, {"l", 1}, {";", 1}, {"'", 1}, {"enter", 2},
		},
		{
			{"shift", 2}, {"z", 1}, {"x", 1}, {"c", 1}, {"v", 1}, {"b", 1},
			{"n", 1}, {"m", 1}, {",", 1}, {".", 1}, {"/", 1}, {"shift", 2},
		},
		{
			{"ctrl", 2}, {"alt", 2}, {"space", 6}, {"alt", 2}, {"ctrl", 2},
		},
	}
}

func newDemoTheme() *demoTheme {
	theme := &demoTheme{
		foreground: hexColor(termframe.Foreground()),
		background: hexColor(termframe.Background()),
		key:        color.RGBA{0x26, 0x26, 0x2e, 0xff},
		keyBorder:  color.RGBA{0x3a, 0x3a, 0x44, 0xff},
		keyText:    color.RGBA{0xc9, 0xc9, 0xc9, 0xff},
	}

	for _, value := range termframe.Palette() {
		theme.ansi = append(theme.ansi, hexColor(value))
	}

	theme.keyPressed = theme.foreground
	theme.keyPressedText = theme.background

	theme.palette = color.Palette{theme.background, theme.foreground}
	theme.palette = append(theme.palette, theme.ansi...)
	theme.palette = append(theme.palette, theme.key, theme.keyBorder, theme.keyText)

	return theme
}

func (t *demoTheme) render(frame *termframe.Frame, highlight string) *image.Paletted {
	width, height := demoImageSize()
	img := image.NewPaletted(image.Rect(0, 0, width, height), t.palette)
	draw.Draw(img, img.Bounds(), &image.Uniform{t.background}, image.Point{}, draw.Src)

	for row := 0; row < demoRows; row++ {
		for column := 0; column < demoColumns; column++ {
			cell := frame.At(row, column)
			foreground := t.color(cell.Style.Foreground, t.foreground)
			background := t.color(cell.Style.Background, t.background)
			if cell.Style.Reverse {
				foreground, background = background, foreground
			}

			x := demoPadding + column*demoCellWidth
			y := demoPadding + row*demoCellHeight
			if background != t.background {
				fillRect(img, image.Rect(x, y, x+demoCellWidth, y+demoCellHeight), background)
			}
			if cell.Rune != ' ' {
				t.drawCell(img, x, y, cell.Rune, foreground)
			}
		}
	}

	top := demoPadding + demoRows*demoCellHeight + demoKeyboardGap
	t.drawKeyboard(img, top, highlight)

	if !frame.Alternate() {
		row, column := frame.Cursor()
		if row >= 0 && row < demoRows && column >= 0 && column < demoColumns {
			x := demoPadding + column*demoCellWidth
			y := demoPadding + row*demoCellHeight
			fillRect(img, image.Rect(x, y, x+demoCellWidth, y+demoCellHeight), t.foreground)
		}
	}

	return img
}

func (t *demoTheme) color(index int, fallback color.Color) color.Color {
	if index < 0 || index >= len(t.ansi) {
		return fallback
	}
	return t.ansi[index]
}

func (t *demoTheme) drawCell(img *image.Paletted, x, y int, value rune, fill color.Color) {
	switch value {
	case '█':
		fillRect(img, image.Rect(x, y, x+demoCellWidth, y+demoCellHeight), fill)
	case '↑':
		drawArrow(img, x, y, true, fill)
	case '↓':
		drawArrow(img, x, y, false, fill)
	case '…':
		for offset := 1; offset < demoCellWidth; offset += 2 {
			fillRect(img, image.Rect(x+offset, y+demoCellHeight-3, x+offset+1, y+demoCellHeight-2), fill)
		}
	default:
		drawText(img, x, y+11, string(value), fill)
	}
}

func (t *demoTheme) drawKeyboard(img *image.Paletted, top int, highlight string) {
	width := demoColumns * demoCellWidth

	for rowIndex, row := range keyboardLayout() {
		totalUnits := 0
		for _, key := range row {
			totalUnits += key.units
		}

		x := demoPadding + (width-totalUnits*demoKeyUnit)/2
		y := top + rowIndex*demoKeyUnit

		for _, key := range row {
			keyWidth := key.units * demoKeyUnit
			rect := image.Rect(x+demoKeyGap, y+demoKeyGap, x+keyWidth-demoKeyGap, y+demoKeyUnit-demoKeyGap)

			background := t.key
			text := t.keyText
			if strings.EqualFold(key.label, highlight) {
				background = t.keyPressed
				text = t.keyPressedText
			}

			fillRect(img, rect, background)
			strokeRect(img, rect, t.keyBorder)

			labelWidth := len(key.label) * demoCellWidth
			labelX := rect.Min.X + (rect.Dx()-labelWidth)/2
			labelY := rect.Min.Y + (rect.Dy()-demoCellHeight)/2 + 11
			drawText(img, labelX, labelY, key.label, text)

			x += keyWidth
		}
	}
}

func hexColor(value string) color.RGBA {
	number, err := strconv.ParseUint(strings.TrimPrefix(value, "#"), 16, 32)
	if err != nil {
		return color.RGBA{0, 0, 0, 0xff}
	}
	return color.RGBA{uint8(number >> 16), uint8(number >> 8), uint8(number), 0xff}
}

func fillRect(img *image.Paletted, rect image.Rectangle, fill color.Color) {
	draw.Draw(img, rect.Intersect(img.Bounds()), &image.Uniform{fill}, image.Point{}, draw.Src)
}

func strokeRect(img *image.Paletted, rect image.Rectangle, stroke color.Color) {
	fillRect(img, image.Rect(rect.Min.X, rect.Min.Y, rect.Max.X, rect.Min.Y+1), stroke)
	fillRect(img, image.Rect(rect.Min.X, rect.Max.Y-1, rect.Max.X, rect.Max.Y), stroke)
	fillRect(img, image.Rect(rect.Min.X, rect.Min.Y, rect.Min.X+1, rect.Max.Y), stroke)
	fillRect(img, image.Rect(rect.Max.X-1, rect.Min.Y, rect.Max.X, rect.Max.Y), stroke)
}

func drawText(img *image.Paletted, x, baseline int, value string, fill color.Color) {
	drawer := font.Drawer{
		Dst:  img,
		Src:  image.NewUniform(fill),
		Face: basicfont.Face7x13,
		Dot:  fixed.P(x, baseline),
	}
	drawer.DrawString(value)
}

func drawArrow(img *image.Paletted, x, y int, up bool, fill color.Color) {
	middle := x + demoCellWidth/2
	top := y + 2
	bottom := y + demoCellHeight - 3

	for step := 0; step < 3; step++ {
		width := 1 + 2*step
		row := top + step
		if !up {
			row = bottom - step
		}
		fillRect(img, image.Rect(middle-width/2, row, middle+width/2+1, row+1), fill)
	}

	shaftTop := top + 3
	shaftBottom := bottom + 1
	if !up {
		shaftTop = top
		shaftBottom = bottom - 2
	}
	fillRect(img, image.Rect(middle, shaftTop, middle+1, shaftBottom), fill)
}
