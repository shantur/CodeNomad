# OpenCode Client

A cross-platform desktop application for interacting with OpenCode servers, built with Electron and SolidJS.

## Overview

OpenCode Client provides a multi-instance, multi-session interface for working with AI-powered coding assistants. It manages OpenCode server processes, handles real-time message streaming, and provides an intuitive UI for coding with AI.

**🎯 MVP Focus:** This project prioritizes functionality over performance. Performance optimization is intentionally deferred to post-MVP phases. See [docs/MVP-PRINCIPLES.md](docs/MVP-PRINCIPLES.md) for details.

## Features

### Core Capabilities

- **Multi-Instance Management**: Work on multiple projects simultaneously
- **Session Persistence**: Resume conversations across app restarts
- **Real-time Streaming**: Live message updates via Server-Sent Events
- **Tool Execution Visibility**: See bash commands, file edits, and other tool calls
- **Agent & Model Switching**: Easily switch between different AI agents and models
- **Markdown Rendering**: Beautiful code highlighting and formatting

### Advanced Features (Planned)

- Virtual scrolling for large conversations
- Full-text search across sessions
- Workspace management
- Custom themes
- Plugin system

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

### High-Level Overview

```
Electron App
├── Main Process (Node.js)
│   ├── Window management
│   ├── OpenCode server spawning
│   └── IPC communication
├── Renderer Process (SolidJS)
│   ├── UI components
│   ├── State management (stores)
│   └── SDK client communication
└── Multiple OpenCode Servers
    └── One per instance/project folder
```

## Prerequisites

- Node.js 18+
- Bun package manager
- OpenCode CLI installed and in PATH

## Installation

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Build distributable binaries
bun run build:mac      # macOS (Universal)
bun run build:win      # Windows (x64)
bun run build:linux    # Linux (x64)
bun run build:all      # All platforms

# See BUILD.md for more build options
```

## Development

### Project Structure

```
packages/opencode-client/
├── docs/              # Documentation
├── tasks/             # Task management
│   ├── todo/          # Pending tasks
│   └── done/          # Completed tasks
├── electron/          # Electron main process
│   ├── main/          # Main process code
│   ├── preload/       # Preload scripts
│   └── resources/     # App icons, etc.
└── src/               # Renderer (UI) code
    ├── components/    # UI components
    ├── stores/        # State management
    ├── lib/           # Utilities
    ├── hooks/         # SolidJS hooks
    └── types/         # TypeScript types
```

### Tech Stack

- **Electron** - Desktop wrapper
- **SolidJS** - Reactive UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Kobalte** - Accessible UI primitives
- **OpenCode SDK** - API client

### Scripts

```bash
bun run dev          # Start dev server with hot reload
bun run build        # Build for production
bun run typecheck    # Run TypeScript type checking
bun run preview      # Preview production build
```

## Usage

### Starting an Instance

1. Launch the app
2. Click "Select Folder" or press Cmd/Ctrl+N
3. Choose a project folder
4. Wait for OpenCode server to start
5. Select an existing session or create new one

### Working with Sessions

- **Switch sessions**: Click session tab at bottom
- **Create session**: Click "+" button or Cmd/Ctrl+T
- **Change agent**: Use agent dropdown
- **Change model**: Use model dropdown

### Sending Messages

- Type in the input box at bottom
- Press Enter for new line (Cmd+Enter on macOS, Ctrl+Enter on Windows/Linux)
- Use `/` for commands
- Use `@` to mention files

## Documentation

- [Architecture](docs/architecture.md) - System design and structure
- [User Interface](docs/user-interface.md) - UI specifications
- [Technical Implementation](docs/technical-implementation.md) - Implementation details
- [Build Roadmap](docs/build-roadmap.md) - Development plan and phases
- [Tasks](tasks/README.md) - Task breakdown and tracking

## Build Phases

The project is built in phases:

1. **Phase 1**: Foundation (Tasks 001-005)
2. **Phase 2**: Core Chat (Tasks 006-010)
3. **Phase 3**: Essential Features (Tasks 011-015)
4. **Phase 4**: Multi-Instance (Tasks 016-020)
5. **Phase 5**: Advanced Input (Tasks 021-025)
6. **Phase 6**: Polish & UX (Tasks 026-030)
7. **Phase 7**: System Integration (Tasks 031-035)
8. **Phase 8**: Advanced Features (Tasks 036-040)

See [docs/build-roadmap.md](docs/build-roadmap.md) for detailed phase information.

## Contributing

### Getting Started

1. Read the documentation in `docs/`
2. Check `tasks/todo/` for available tasks
3. Pick a task and create a feature branch
4. Follow the task steps
5. Submit PR when complete

### Code Style

- Use TypeScript for all code
- Follow existing patterns and conventions
- Write clear, descriptive commit messages
- Add comments for complex logic
- Keep components small and focused

### Testing

- Test manually at minimum window size (800x600)
- Test on multiple platforms (macOS, Windows, Linux)
- Verify keyboard navigation works
- Check accessibility with screen readers

## Troubleshooting

### Server Won't Start

- Verify `opencode` is in PATH: `which opencode`
- Check folder permissions
- Review server logs in Logs tab
- Try restarting the instance

### Connection Issues

- Check if server is running: `ps aux | grep opencode`
- Verify port is correct in instance metadata
- Check for firewall blocking localhost
- Try killing and restarting server

### Performance Issues

- Check number of messages in session
- Monitor memory usage in Activity Monitor
- Consider enabling virtual scrolling (Phase 8)
- Close unused instances

## License

[License TBD]

## Credits

Built with ❤️ for the OpenCode project.
