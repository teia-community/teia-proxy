async function getTokenDetails(tokenId) {
  const response = await fetch('https://api-v5.teia.rocks/v1/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query GetTokenInfos {
            token: token_by_pk(id: ${tokenId}) {
                id
                title
                description
                display_uri
            }
        }
      `,
    }),
  });

  const json = await response.json();
  return json && json.data && json.data.token;
}

function clean(str) {
  return str.replace('"', '');
}

function injectOpenGraphTags(body, token) {
  let newBody = body;

  // remove existing og tags
  newBody = newBody.replace(/<meta.*?property="og.*?\/>/gm, '');
  newBody = newBody.replace(/<meta.*?name="twitter.*?\/>/gm, '');

  const title = clean(token.title);
  const description = clean(token.description);
  const image = clean(token.display_uri.replace('ipfs://', 'https://nftstorage.link/ipfs/'));
  const url = `https://teia.art/objkt/${token.id}`;

  const openGraphTags = `
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="${url}" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@TeiaCommunity" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />
    `;

  return newBody.replace('<head>', `<head>${openGraphTags}`);
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  url.hostname = 'teia.art';

  try {
    const detailPageMatch = url.pathname.match(/\/objkt\/([0-9]+)/);

    if (detailPageMatch) {
      const tokenId = detailPageMatch[1];

      // TODO: set the correct headers.
      const teiaRequest = new Request(request, { headers: { 'Cache-Control': 'no-cache' } });
      const [response, token] = await Promise.all([fetch(url.toString(), teiaRequest), getTokenDetails(tokenId)]);

      if (!token) {
        throw new Error(`could not fetch token ${tokenId}`);
      }

      const body = await response.text();

      return new Response(injectOpenGraphTags(body, token), response);
    }
  } catch (err) {
    console.log('failed to process token metadata', err);
  }

  return await fetch(url.toString(), request);
}
