const localtunnel = require('localtunnel');
(async () => {
  try {
    const tunnel = await localtunnel({ port: 3004, subdomain: 'giai-bong-da-tung-thien' });
    console.log(`Tunnel URL: ${tunnel.url}`);
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
  } catch (err) {
    console.error('Failed to start tunnel:', err);
  }
})();
