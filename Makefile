SHELL := /bin/zsh

.PHONY: install build test lint typecheck verify dev

install:
	pnpm install

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

verify:
	pnpm verify

dev:
	pnpm dev
