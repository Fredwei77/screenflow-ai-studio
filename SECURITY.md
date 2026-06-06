# Security Policy

## Supported Versions

The `master` branch is the actively maintained development branch.

## Reporting a Vulnerability

Please do not open a public issue for security-sensitive reports.

Send a private report to the project maintainer with:

- A clear description of the issue.
- Steps to reproduce.
- Impact assessment.
- Any relevant logs or screenshots with secrets removed.

## Secret Handling

Before publishing a fork or deployment:

- Rotate any API key that has ever appeared in local `.env*` files.
- Generate a strong `JWT_SECRET`.
- Replace default TURN credentials.
- Keep production `.env` files outside git.
