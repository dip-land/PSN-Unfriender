import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { constructPage } from './constants.js';
import path from 'path';
import { getFriendsList, getToken, profileIDsToNames, removeFriends } from './index.js';

export const root = '/src/public';

function routes(fastify: FastifyInstance) {
    fastify.register(fastifyStatic, { root: path.join(process.cwd(), root), prefix: '/static/' });
    fastify.setNotFoundHandler({ preValidation: (req, res, done) => done(), preHandler: (req, res, done) => done() }, async function (req, res) {
        constructPage(res, {
            language: 'en-US',
            head: {
                title: 'Page Not Found',
                description: 'Error 404, Page Not Found.',
                files: [`${root}/head.html`],
            },
            body: { files: [`${root}/nav.html`, `${root}/404.html`] },
        });
        return res;
    });
    fastify.all('/', (req, reply) => {
        const npsso = (req.query as { npsso: string | undefined })?.npsso;
        if (npsso) {
            constructPage(reply, {
                language: 'en-US',
                head: { title: 'Home', description: '', files: [`${root}/head.html`] },
                body: { files: [`${root}/nav.html`, `${root}/friends.html`] },
            });
            return reply;
        } else {
            constructPage(reply, {
                language: 'en-US',
                head: { title: 'Home', description: '', files: [`${root}/head.html`] },
                body: { files: [`${root}/nav.html`, `${root}/index.html`] },
            });
            return reply;
        }
    });

    fastify.register(apiRoutes, { prefix: '/api' });
}

async function apiRoutes(fastify: FastifyInstance) {
    fastify.get('/friends', async (req, reply) => {
        if (!req.headers.token) return reply.code(401);
        const token = await getToken(req.headers.token as string);
        const IDs = await getFriendsList(token);
        const profiles = await profileIDsToNames(token, IDs);
        const combinedData = profiles.map((value, index) => ({ ...value, id: IDs[index] }));
        return reply.send(combinedData);
    });
    fastify.post('/friends', async (req, reply) => {
        if (!req.headers.token) return reply.code(401);
        if (!req.body) return reply.code(500);
        const token = await getToken(req.headers.token as string);
        const IDs = JSON.parse(req.body as string);
        const profiles = await profileIDsToNames(token, IDs);
        const combinedData = profiles.map((value, index) => ({ ...value, id: IDs[index] }));
        return reply.send(combinedData);
    });
    fastify.delete('/friends', async (req, reply) => {
        if (!req.headers.token) return reply.code(401);
        if (!req.body) return reply.code(500);
        const token = await getToken(req.headers.token as string);
        const IDs = JSON.parse(req.body as string);
        await removeFriends(token, IDs);
        return reply.send({ success: true });
    });
}

export default routes;
