import axios from 'axios';
import Fastify from 'fastify';
import { exchangeNpssoForAccessCode, exchangeAccessCodeForAuthTokens } from 'psn-api';

export let cancel = false;

const sleep = (time: number) => {
    return new Promise((resolve) => setTimeout(resolve, time));
};

export async function getToken(npsso: string) {
    const accessCode = await exchangeNpssoForAccessCode(npsso);
    return (await exchangeAccessCodeForAuthTokens(accessCode)).accessToken;
}

export async function getFriendsList(token: string): Promise<Array<string>> {
    try {
        const list = await axios.get('https://m.np.playstation.com/api/userProfile/v1/internal/users/me/friends', {
            params: {
                limit: 1000,
            },
            headers: {
                'Content-Type': 'application/json',
                'accept-language': 'en-US',
                'user-agent': 'okhttp/4.12.0',
                Authorization: `Bearer ${token}`,
            },
        });
        return list.data.friends;
    } catch (error) {
        return [];
    }
}

interface APIProfile {
    onlineId: string;
    personalDetail: { firstName: string; middleName?: string; lastName: string } | undefined;
    aboutMe: string;
    avatars: Array<{ size: string; url: string }>;
    languages: Array<string>;
    isPlus: boolean;
    isOfficiallyVerified: boolean;
}

export async function profileIDsToNamesChunked(token: string, IDs: Array<string>, offset?: number): Promise<Array<APIProfile>> {
    offset = offset ?? 0;
    try {
        const profiles = await axios.get('https://m.np.playstation.com/api/userProfile/v1/internal/users/profiles', {
            params: {
                accountIds: IDs.slice(offset, offset + 100).join(','),
            },
            headers: {
                'Content-Type': 'application/json',
                'accept-language': 'en-US',
                'user-agent': 'okhttp/4.12.0',
                Authorization: `Bearer ${token}`,
            },
        });
        return profiles.data.profiles;
    } catch (error) {
        return [];
    }
}

export async function profileIDsToNames(token: string, IDs: Array<string>): Promise<Array<APIProfile>> {
    try {
        const data: Array<APIProfile> = [];
        const chunkSize = 100;
        const numberOfChunks = Math.floor(IDs.length / chunkSize);
        for (const i of Array(numberOfChunks + 1).keys()) {
            const startIndex = i * chunkSize;
            if (IDs[0]) {
                data.push(...(await profileIDsToNamesChunked(token, IDs, startIndex)));
            }
        }
        return data;
    } catch (error) {
        return [];
    }
}

export async function removeFriend(token: string, ID: string) {
    try {
        const response = await axios.delete(`https://m.np.playstation.com/api/userProfile/v1/internal/users/me/friends/${ID}`, {
            headers: {
                'Content-Type': 'application/json',
                'accept-language': 'en-US',
                'user-agent': 'okhttp/4.12.0',
                Authorization: `Bearer ${token}`,
            },
        });
        return response;
    } catch (error) {
        console.log(error);
        return undefined;
    }
}

import routes from './routes.js';

const webPort = 9320;
const fastify = Fastify({ logger: { level: 'error' }, ignoreTrailingSlash: true, forceCloseConnections: true });
fastify.register(routes);

try {
    await fastify.listen({ port: webPort });
    console.log(`Port ${webPort} open.`);
} catch (err) {
    console.log(err);
}

export async function removeFriends(token: string, IDs: Array<string>) {
    for (const index in IDs) {
        const ID = IDs[index];
        if (cancel) break;
        await removeFriend(token, ID);
        await sleep(3500);
        console.log(+index + 1, '/', IDs.length);
    }
}
