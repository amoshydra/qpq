BINARY := qpq-go
PREFIX ?= $(HOME)/.local

.PHONY: build test vet check install cross clean

build:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BINARY) .

test:
	go test ./...

vet:
	go vet ./...

check: test vet

install: build
	mkdir -p "$(PREFIX)/bin"
	cp "$(BINARY)" "$(PREFIX)/bin/$(BINARY)"
	chmod 755 "$(PREFIX)/bin/$(BINARY)"

cross:
	mkdir -p dist
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/qpq-go-linux-amd64 .
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags="-s -w" -o dist/qpq-go-linux-arm64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/qpq-go-darwin-amd64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags="-s -w" -o dist/qpq-go-darwin-arm64 .
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o dist/qpq-go-windows-amd64.exe .

clean:
	rm -rf $(BINARY) dist
