# Contributing

Thanks for helping improve ScreenFlow AI.

## Development

```bash
npm install
cd server && npm install && npx prisma db push && cd ..
npm.cmd run build
cd server && npm.cmd run build
```

Use `npm.cmd` on Windows if PowerShell blocks `npm` scripts.

## Pull Requests

- Keep changes scoped to one feature or fix.
- Do not commit `.env`, local databases, build output, logs, screenshots with private data, or credentials.
- Run the frontend and server builds before opening a pull request.
- For UI changes, include screenshots or a short description of the affected screen.

## Security

Never include real API keys, OAuth secrets, JWT secrets, TURN credentials, server IPs, or private deployment files in issues or pull requests.
