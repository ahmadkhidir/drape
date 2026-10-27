.PHONY: install build test lint dev clean

install:
	pnpm install

build:
	pnpm run build

test:
	pnpm run test

lint:
	pnpm run lint

dev:
	pnpm run dev

clean:
	pnpm run clean
