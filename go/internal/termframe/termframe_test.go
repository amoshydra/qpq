package termframe

import (
	"strings"
	"testing"
)

func TestParsePlainText(t *testing.T) {
	frame := Parse([]byte("hello\r\nworld"), 10, 3)

	if got, want := frame.Text(), "hello\nworld"; got != want {
		t.Fatalf("Text() = %q, want %q", got, want)
	}
}

func TestParseCursorPosition(t *testing.T) {
	frame := Parse([]byte("abc\r\n\x1b[2;2HX"), 5, 3)

	if got, want := frame.Text(), "abc\n X"; got != want {
		t.Fatalf("Text() = %q, want %q", got, want)
	}
}

func TestParseEraseLine(t *testing.T) {
	frame := Parse([]byte("abcdef\x1b[1;3H\x1b[K"), 8, 2)

	if got, want := frame.Text(), "ab"; got != want {
		t.Fatalf("Text() = %q, want %q", got, want)
	}
}

func TestParseEraseDisplay(t *testing.T) {
	frame := Parse([]byte("one\r\ntwo\r\nthree\x1b[2J\x1b[H"), 8, 3)

	if got := frame.Text(); got != "" {
		t.Fatalf("Text() = %q, want empty", got)
	}
}

func TestParseStyles(t *testing.T) {
	frame := Parse([]byte("\x1b[1;7;31;42mX\x1b[0mY"), 4, 1)

	styled := frame.At(0, 0)
	if !styled.Style.Reverse {
		t.Error("X is not reversed")
	}
	if !styled.Style.Bold {
		t.Error("X is not bold")
	}
	if styled.Style.Foreground != 1 {
		t.Errorf("X foreground = %d, want 1", styled.Style.Foreground)
	}
	if styled.Style.Background != 2 {
		t.Errorf("X background = %d, want 2", styled.Style.Background)
	}

	plain := frame.At(0, 1)
	if plain.Style.Foreground != DefaultColor || plain.Style.Background != DefaultColor {
		t.Errorf("Y style = %+v, want default colors", plain.Style)
	}
	if plain.Style.Reverse || plain.Style.Bold {
		t.Errorf("Y style = %+v, want no attributes", plain.Style)
	}
}

func TestParseAlternateScreen(t *testing.T) {
	frame := Parse([]byte("main\r\n\x1b[?1049hALT\x1b[?1049lout"), 10, 4)

	if got, want := frame.Text(), "main\nout"; got != want {
		t.Fatalf("Text() = %q, want %q", got, want)
	}
}

func TestParseCursorAndAlternateScreen(t *testing.T) {
	frame := Parse([]byte("abc"), 5, 2)
	row, column := frame.Cursor()
	if row != 0 || column != 3 {
		t.Errorf("Cursor() = (%d, %d), want (0, 3)", row, column)
	}
	if frame.Alternate() {
		t.Error("frame is marked as the alternate screen")
	}

	alternate := Parse([]byte("\x1b[?1049hx"), 5, 2)
	if !alternate.Alternate() {
		t.Error("frame is not marked as the alternate screen")
	}
}

func TestParseScrolling(t *testing.T) {
	frame := Parse([]byte("one\r\ntwo\r\nthree\r\nfour"), 8, 3)

	if got, want := frame.Text(), "two\nthree\nfour"; got != want {
		t.Fatalf("Text() = %q, want %q", got, want)
	}
}

func TestSVG(t *testing.T) {
	frame := Parse([]byte("\x1b[36mcyan\x1b[0m plain"), 12, 1)
	document := frame.SVG("test")

	for _, fragment := range []string{
		"<svg",
		"<title>test</title>",
		"#56b6c2",
		">cyan<",
		">plain<",
	} {
		if !strings.Contains(document, fragment) {
			t.Errorf("SVG is missing %q\n%s", fragment, document)
		}
	}
}

func TestSVGWithSize(t *testing.T) {
	frame := Parse([]byte("hi"), 10, 3)
	document := frame.SVGWithSize("test", 20, 5)

	if !strings.Contains(document, `width="192" height="114"`) {
		t.Errorf("SVGWithSize did not use the requested grid size\n%s", document)
	}
}

func TestSVGEscapesText(t *testing.T) {
	frame := Parse([]byte("a<b&c"), 8, 1)
	document := frame.SVG("test")

	if !strings.Contains(document, "a&lt;b&amp;c") {
		t.Errorf("SVG did not escape text\n%s", document)
	}
}
