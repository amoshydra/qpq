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

func TestSVGEscapesText(t *testing.T) {
	frame := Parse([]byte("a<b&c"), 8, 1)
	document := frame.SVG("test")

	if !strings.Contains(document, "a&lt;b&amp;c") {
		t.Errorf("SVG did not escape text\n%s", document)
	}
}
