BINARY := qpq
VERSION ?= $(shell sed -n 's/.*"version": "\([^"]*\)".*/\1/p' ../package.json | head -n 1)
VERSION := $(if $(VERSION),$(VERSION),dev)
LDFLAGS := -s -w -X main.version=$(VERSION)
PREFIX ?= $(HOME)/.local

.PHONY: build test vet check install cross clean

build:
	CGO_ENABLED=0 go build -trimpath -ldflags="$(LDFLAGS)" -o $(BINARY) .

test:
	go test ./...

vet:
	go vet ./...

check: test vet
	test -z "$$(gofmt -l .)"

install: build
	mkdir -p "$(PREFIX)/bin"
	rm -f "$(PREFIX)/bin/$(BINARY)"
	cp "$(BINARY)" "$(PREFIX)/bin/$(BINARY)"
	chmod 755 "$(PREFIX)/bin/$(BINARY)"

cross:
	rm -rf dist
	mkdir -p dist
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="$(LDFLAGS)" -o dist/qpq-linux-amd64 .
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags="$(LDFLAGS)" -o dist/qpq-linux-arm64 .
	CGO_ENABLED=0 GOOS=linux GOARCH=arm GOARM=7 go build -trimpath -ldflags="$(LDFLAGS)" -o dist/qpq-linux-armv7 .
	CGO_ENABLED=0 GOOS=linux GOARCH=arm GOARM=6 go build -trimpath -ldflags="$(LDFLAGS)" -o dist/qpq-linux-armv6 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags="$(LDFLAGS)" -o dist/qpq-darwin-amd64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags="$(LDFLAGS)" -o dist/qpq-darwin-arm64 .
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="$(LDFLAGS)" -o dist/qpq-windows-amd64.exe .
	cp dist/qpq-linux-arm64 dist/qpq-android-arm64

clean:
	rm -rf $(BINARY) dist
