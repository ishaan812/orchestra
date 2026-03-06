.PHONY: dev build install clean test test-watch typecheck clippy check fmt pr

# Install all dependencies
install:
	pnpm install
	cd src-tauri && cargo fetch

# Run dev server (frontend only)
dev:
	pnpm dev

# Run full Tauri dev (frontend + backend)
tauri-dev:
	pnpm tauri dev

# Build frontend
build-frontend:
	pnpm build

# Build backend
build-backend:
	cd src-tauri && cargo build --release

# Build full Tauri app
build:
	pnpm tauri build

# Run frontend tests
test:
	pnpm test

# Run frontend tests in watch mode
test-watch:
	pnpm test:watch

# Run backend tests
test-backend:
	cd src-tauri && cargo test

# Run all tests
test-all: test test-backend

# TypeScript type checking
typecheck:
	pnpm typecheck

# Run clippy on Rust code
clippy:
	cd src-tauri && cargo clippy -- -D warnings

# Run rustfmt
fmt:
	cd src-tauri && cargo fmt

# Check rustfmt without modifying
fmt-check:
	cd src-tauri && cargo fmt -- --check

# Run all checks (CI-style)
check: typecheck clippy fmt-check test test-backend

# Clean build artifacts
clean:
	rm -rf node_modules dist
	cd src-tauri && cargo clean
