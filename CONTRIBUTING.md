# Contributing to Kathy

Thank you for your interest in contributing to Kathy! 🎉

## Getting Started

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/kathy.git
   cd kathy
   ```
3. **Install dependencies:**
   ```bash
   npm install
   cd kathy-cloud && npm install
   ```
4. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Extension Development
```bash
npm run dev  # Hot reload development mode
npm run build  # Production build
```

### Backend Development
```bash
cd kathy-cloud
npm run dev  # Next.js dev server
npx prisma studio  # Database GUI
```

### Testing
- Load extension in Chrome: `chrome://extensions/` → Developer mode → Load unpacked → Select `build/chrome-mv3-dev`
- Test backend: `http://localhost:3000/dashboard`

## Code Style

- **TypeScript** for all new code
- **ESLint** configuration provided
- **Prettier** for formatting
- Use **meaningful commit messages** (Conventional Commits)

## Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Testing
- `chore`: Maintenance

**Examples:**
```
feat(panel): Add payment history tab
fix(webhook): Handle missing organization ID
docs: Update installation guide
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG.md**
5. **Submit PR** with clear description

## Adding Support for New Applications

Want to add Kathy support for another app (Clio, Salesforce, etc.)?

1. Create new content script: `src/contents/your-app.tsx`
2. Configure selectors for invoice detection
3. Add app-specific styling
4. Update documentation
5. Submit PR with demo video

## Questions?

- Open an issue
- Email: support@kathy.dev
- Discord: [Coming soon]

---

**Thank you for making Kathy better!** 🚀



