# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | ✓         |

## Reporting a Vulnerability

If you discover a security vulnerability in Seen, please **do not** open a public GitHub issue.

Instead, report it privately via [GitHub's private vulnerability reporting](../../security/advisories/new).

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

You can expect an acknowledgement within **48 hours** and a resolution or status update within **7 days**.

## Scope

Seen is a local-only Electron desktop app. All data is stored on the user's device and never transmitted to external servers (unless the user explicitly configures the Anthropic AI provider).

Security reports are most relevant for:
- Electron renderer/main process privilege escalation
- IPC handler input validation bypasses
- Insecure handling of user-supplied AI API keys
- Dependency vulnerabilities with exploitable attack vectors

## Out of Scope

- Attacks requiring physical access to the user's machine
- Self-XSS (user injecting into their own notes)
- Denial of service against a single local process
