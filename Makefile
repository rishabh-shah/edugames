SHELL := /bin/zsh

.PHONY: install build test lint typecheck verify dev test-playwright test-sample-game validate-sample-game

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

test-playwright:
	pnpm test:playwright

test-sample-game:
	pnpm test:sample-game

validate-sample-game:
	pnpm --filter @edugames/game-validator validate ../../games/shape-match
