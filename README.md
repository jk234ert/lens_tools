# Lens Tools CLI

A command-line interface for Lens Protocol authentication and operations.

## Installation

```bash
npm install
npm run build
```

## Authentication

Complete the Lens authentication flow to obtain access tokens.

### Usage

```bash
npm run dev -- auth \
  --app 0xC75A89145d765c396fd75CbD16380Eb184Bd2ca7 \
  --account <ACCOUNT_ADDRESS> \
  --owner <OWNER_ADDRESS> \
  --private-key <PRIVATE_KEY> \
  --network testnet
```

### Parameters

- `-a, --app <address>`: Lens App address (required)
  - Mainnet: `0x8A5Cc31180c37078e1EbA2A23c861Acf351a97cE`
  - Testnet: `0xC75A89145d765c396fd75CbD16380Eb184Bd2ca7`
- `-u, --account <address>`: Account address (required)
- `-o, --owner <address>`: Owner address (required)
- `-p, --private-key <key>`: Private key for signing (required)
- `-n, --network <network>`: Network - `mainnet`, `staging`, or `testnet` (default: `testnet`)

### Output

Returns authentication tokens in JSON format:

```json
{
  "accessToken": "eyJhbGciOiJS...",
  "refreshToken": "eyJhbGciOiJS...",
  "idToken": "eyJhbGciOiJS..."
}
```

### Token Information

- **Access Token**: Valid for 10 minutes, used for API requests
- **ID Token**: Valid for 10 minutes, verifies user identity
- **Refresh Token**: Valid for 7 days, used to obtain new tokens

## Development

```bash
# Run in development mode
npm run dev -- auth --help

# Build the project
npm run build

# Run the built version
npm start auth --help
```

## Project Structure

```text
lens_tools/
├── src/
│   ├── cli.ts                    # CLI entry point
│   └── commands/
│       └── authenticate.ts       # Authentication flow implementation
├── dist/                         # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Authentication Flow

The authentication process consists of three steps:

1. **Challenge Generation**: Requests an authentication challenge from Lens API
2. **Message Signing**: Signs the SIWE (Sign-In with Ethereum) message using viem
3. **Token Retrieval**: Submits the signed challenge to receive authentication tokens

## API Endpoints

- **Mainnet**: `https://api.lens.xyz`
- **Staging**: `https://api.staging.lens.dev`
- **Testnet**: `https://api.testnet.lens.xyz`

## Security

⚠️ **Never commit your private keys to version control**. Use environment variables or secure key management solutions in production.
