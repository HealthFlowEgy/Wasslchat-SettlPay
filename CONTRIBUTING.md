# Contributing to WasslChat

Thank you for your interest in contributing to WasslChat. This document provides guidelines and instructions for contributing to this project.

## Development Setup

1. Fork the repository and clone your fork.
2. Copy `.env.example` to `.env` and configure your environment variables.
3. Start the infrastructure services:
   ```bash
   docker compose up -d
   ```
4. Install dependencies and set up the database:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Branch Naming

- `feature/<description>` for new features
- `fix/<description>` for bug fixes
- `docs/<description>` for documentation updates
- `refactor/<description>` for code refactoring

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for adding or updating tests
- `chore:` for maintenance tasks

## Pull Requests

1. Create a feature branch from `develop`.
2. Make your changes with clear, descriptive commits.
3. Ensure all tests pass (`npm test`).
4. Submit a pull request to the `develop` branch.

## Code Style

- Follow the existing code patterns and conventions.
- Use TypeScript strict mode where possible.
- All API responses should follow the standard response format.
- Arabic strings should be provided alongside English where applicable.
