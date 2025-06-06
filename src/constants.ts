import { FastifyReply } from 'fastify';
import { createReadStream, readFileSync } from 'fs';
import { DOMWindow, JSDOM } from 'jsdom';
import path from 'path';

export async function sendHtml(reply: FastifyReply, file: string) {
    reply.type('text/html').send(createReadStream(path.join(process.cwd(), file)));
    return reply;
}

export async function constructPage(
    reply: FastifyReply,
    options: {
        language: string;
        head: {
            url?: string;
            title?: string;
            description?: string;
            keywords?: string[];
            image?: string;
            video?: string;
            largeMedia?: boolean;
            files?: Array<string>;
        };
        body: { files?: Array<string> };
    },
    document?: (window: DOMWindow, document: Document) => Promise<unknown | void>
) {
    const headBuffers: Buffer[] = [];
    const bodyBuffers: Buffer[] = [];
    for (const file of options?.head?.files ?? []) {
        try {
            headBuffers.push(readFileSync(path.join(process.cwd(), file)));
        } catch (error) {
            headBuffers.push(Buffer.from(''));
        }
    }
    for (const file of options?.body?.files ?? []) {
        try {
            bodyBuffers.push(readFileSync(path.join(process.cwd(), file)));
        } catch (error) {
            bodyBuffers.push(Buffer.from(''));
        }
    }
    headBuffers.push(
        Buffer.from(`
            <meta property="og:type" content="website" />
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            ${options.head.description ? `<meta name="description" content="${options.head.description}" />` : ''}
            ${options.head.description ? `<meta property="og:description" content="${options.head.description}" />` : ''}
            ${options.head.description ? `<meta property="twitter:description" content="${options.head.description}" />` : ''}
            ${options.head.image ? `<meta property="og:image" content="${options.head.image}" />` : ''}
            ${options.head.image ? `<meta property="twitter:image" content="${options.head.image}" />` : ''}
            ${(options.head.keywords ?? []).length > 0 ? `<meta property="keywords" content="${options.head.keywords}" />` : ''}
            ${options.head.largeMedia ? `<meta property="twitter:card" content="summary_large_image" />` : ''}
            ${options.head.title ? `<title>${options.head.title}</title>` : ''}
            ${options.head.title ? `<meta name="title" content="${options.head.title}" />` : ''}
            ${options.head.title ? `<meta property="og:title" content="${options.head.title}" />` : ''}
            ${options.head.title ? `<meta property="twitter:title" content="${options.head.title}" />` : ''}
            ${options.head.url ? `<meta property="og:url" content="${options.head.url}" />` : ''}
            ${options.head.url ? `<meta property="twitter:url" content="${options.head.url}" />` : ''}
            ${options.head.video ? `<meta property="og:video" content="${options.head.video}" />` : ''}
            ${options.head.video ? `<meta property="twitter:video" content="${options.head.video}" />` : ''}
            
        `)
    );

    try {
        const dom = new JSDOM(`<!DOCTYPE html><html lang="${options.language}"><head>${headBuffers.join('')}</head><body>${bodyBuffers.join('')}</body></html>`);
        if (document) await document(dom.window, dom.window.document);
        reply.type('text/html').send(dom.serialize());
    } catch (error) {
        console.log(error);
        reply.type('text/html').send(`<!DOCTYPE html><html lang="${options.language}"><head>${headBuffers.join('')}</head><body>${bodyBuffers.join('')}</body></html>`);
    }

    return reply;
}

export function paramToArray(param: any) {
    if (!param) return [];
    return [...new Set(param.split(/\s|,|\+/g))];
}
