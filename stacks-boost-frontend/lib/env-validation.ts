/**
 * Validates required environment variables at startup
 */
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_STACKS_NETWORK',
    'NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS',
    'NEXT_PUBLIC_STACKS_CONTRACT_NAME',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please create a .env.local file with these variables.\n` +
      `See .env.example for reference.`
    );
  }

  // Validate contract address format
  const address = process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS!;
  if (!address.startsWith('SP') && !address.startsWith('ST')) {
    throw new Error(
      `Invalid NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS: ${address}\n` +
      `Must start with SP (mainnet) or ST (testnet)`
    );
  }

  // Validate network
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK!.toLowerCase();
  if (network !== 'mainnet' && network !== 'testnet') {
    throw new Error(
      `Invalid NEXT_PUBLIC_STACKS_NETWORK: ${network}\n` +
      `Must be 'mainnet' or 'testnet'`
    );
  }

  console.log('✅ Environment variables validated');
  console.log(`   Network: ${network}`);
  console.log(`   Contract: ${address}.${process.env.NEXT_PUBLIC_STACKS_CONTRACT_NAME}`);
}
