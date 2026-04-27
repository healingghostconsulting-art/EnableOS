import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

const baseUrl = process.argv[2];

if (!baseUrl) {
  throw new Error('Base URL argument is required');
}

const appHtml = await fetch(`${baseUrl}/?from_webdev=1`).then(async (response) => ({
  status: response.status,
  body: await response.text(),
}));

const trpc = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      fetch: (url, options) => fetch(url, { ...options, credentials: 'omit' }),
    }),
  ],
});

const output = {
  homepageStatus: appHtml.status,
  homepageShowsPublicHero: appHtml.body.includes('Enterprise enablement and coaching intelligence built to move performance.'),
  viewerAccess: null,
  secureLibraryError: null,
  secureTrainingError: null,
};

try {
  output.viewerAccess = await trpc.demo.viewerAccess.query();
} catch (error) {
  output.viewerAccess = { error: error instanceof Error ? error.message : String(error) };
}

try {
  await trpc.demo.secureLibrary.query({ tenantId: 'atlas-operations', role: 'all' });
} catch (error) {
  output.secureLibraryError = error instanceof Error ? error.message : String(error);
}

try {
  await trpc.demo.secureTraining.query({ tenantId: 'atlas-operations' });
} catch (error) {
  output.secureTrainingError = error instanceof Error ? error.message : String(error);
}

console.log(JSON.stringify(output, null, 2));
