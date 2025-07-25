import { exec } from 'node:child_process';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import * as net from 'node:net';

export async function findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        
        server.listen(startPort, () => {
            const port = (server.address() as net.AddressInfo)?.port;
            server.close(() => {
                resolve(port);
            });
        });
        
        server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

export async function openBrowser(url: string): Promise<void> {
    const command = `open "${url}"`;
    exec(command, (error) => {
        if (error) {
            console.log(`Please manually open: ${url}`);
        }
    });
}

export async function waitForOAuthCallback(callbackPort: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const server = createServer((req: any, res: any) => {
            if (req.url === '/favicon.ico') {
                res.writeHead(404);
                res.end();
                return;
            }
            
            const parsedUrl = new URL(req.url || '', 'http://localhost');
            const code = parsedUrl.searchParams.get('code');
            const error = parsedUrl.searchParams.get('error');
            
            const closeServer = () => {
                if (server.listening) {
                    server.close((err) => {
                        if (err && (err as any).code !== 'ERR_SERVER_NOT_RUNNING') {
                            console.error('Error closing server:', err);
                        }
                    });
                }
            };
            
            if (code) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                      <body>
                        <h1>Authorization Successful!</h1>
                        <p>You can close this window and return to the terminal.</p>
                        <script>setTimeout(() => window.close(), 2000);</script>
                      </body>
                    </html>
                `);
                resolve(code);
                setTimeout(closeServer, 1000);
            } else if (error) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                      <body>
                        <h1>Authorization Failed</h1>
                        <p>Error: ${error}</p>
                      </body>
                    </html>
                `);
                setTimeout(closeServer, 1000);
                reject(new Error(`OAuth authorization failed: ${error}`));
            } else {
                res.writeHead(400);
                res.end('Bad request');
                setTimeout(closeServer, 1000);
                reject(new Error('No authorization code provided'));
            }
        });

        server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                server.listen(callbackPort + 1);
            } else {
                reject(err);
            }
        });

        server.listen(callbackPort);
    });
}
